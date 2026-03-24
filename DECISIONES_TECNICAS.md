# Documento de Decisiones Técnicas

**Proyecto:** PLOOT — Plataforma E-Commerce Full Stack
**Autor:** Alberto
**Fecha:** Marzo 2026
**Deploy:** Vercel (producción) + Supabase (base de datos, auth)

---

## Índice

1. [Arquitectura general](#1-arquitectura-general)
2. [Diseño de sistema y base de datos](#2-diseño-de-sistema-y-base-de-datos)
3. [Frontend](#3-frontend)
4. [Backend](#4-backend)
5. [Autenticación y seguridad](#5-autenticación-y-seguridad)
6. [Performance](#6-performance)
7. [Escalabilidad — ¿Qué haría si esto crece x100?](#7-escalabilidad)
8. [Bonus — Event-driven, webhooks, observabilidad, feature flags](#8-bonus)
9. [Resumen de trade-offs](#9-resumen-de-trade-offs)

---

## 1. Arquitectura general

### Monolito modular

Se ha optado por un **monolito modular** en un único repositorio Next.js. La separación no es a nivel de servicios independientes sino a nivel de capas internas bien definidas:

```
src/
├── app/api/v1/           → Capa de API (BFF)
├── components/ui/        → Componentes visuales puros (shadcn)
├── components/features/  → Componentes con lógica de dominio
├── lib/queries/          → Data fetching (TanStack Query)
├── lib/store/            → Estado cliente (Zustand)
├── lib/validations/      → Schemas de validación (Zod)
├── lib/supabase/         → Clientes de base de datos
└── types/                → Tipos TypeScript compartidos
```

**¿Por qué no microservicios?** El scope del proyecto no justifica la complejidad operacional que implican: despliegues independientes, comunicación entre servicios, distributed tracing, service discovery. Un monolito modular ofrece la misma separación de responsabilidades con mucho menos overhead.

**¿Por qué no un monolito sin estructura?** La separación por capas permite que, si el sistema crece, se puedan extraer servicios independientes sin reescribir lógica. Por ejemplo, `/app/api/v1/` se podría migrar a un servicio NestJS standalone cambiando solo la capa de transporte.

**Trade-off asumido:** Acoplamiento de despliegue entre frontend y backend. El frontend y la API escalan juntos en Vercel. Aceptable para el scope actual.

---

### BFF (Backend For Frontend)

**Decisión: Sí, implementado con Next.js Route Handlers.**

```
Browser (React)
    ↓  fetch /api/v1/...
Next.js Route Handlers    ← validación Zod, lógica de negocio, transacciones
    ↓  supabase-js (service_role)
Supabase PostgreSQL       ← RLS como segunda capa de seguridad
```

**¿Por qué un BFF y no acceso directo a Supabase desde el cliente?**

1. **Seguridad:** El `SUPABASE_SERVICE_ROLE_KEY` nunca llega al browser. Si un atacante inspecciona el código del cliente, solo ve llamadas a `/api/v1/...`
2. **Lógica transaccional:** El checkout requiere verificar stock, crear pedido, crear líneas de pedido y decrementar stock — todo en una transacción. Esto no puede hacerse desde el cliente con la `anon_key`
3. **Validación centralizada:** Zod valida todos los inputs antes de que toquen la base de datos
4. **Idempotencia:** El servidor verifica `idempotency_key` antes de crear un pedido duplicado

**Trade-off asumido:** Acoplamiento entre frontend y backend al estar en el mismo proceso. Para múltiples clientes (app móvil, terceros), se necesitaría una API independiente.

---

## 2. Diseño de sistema y base de datos

### Plataforma: Supabase (PostgreSQL)

**Justificación:** PostgreSQL gestionado con Auth, Row Level Security y SDK oficial incluidos. Elimina la necesidad de gestionar infraestructura de base de datos, autenticación y almacenamiento por separado.

**¿Por qué no otra base de datos?**
- **MongoDB:** El modelo de datos es relacional (pedidos → líneas de pedido → productos). Un documento anidado complicaría las queries de stock y consistencia
- **PlanetScale/MySQL:** PostgreSQL ofrece `SECURITY DEFINER`, RLS nativo y funciones PL/pgSQL que son clave para la arquitectura
- **Firebase:** Vendor lock-in más fuerte, menos control sobre queries complejas y transacciones

---

### Schema relacional

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  auth.users  │────→│   profiles   │     │   products   │     │              │
│  (Supabase)  │     │              │     │              │     │              │
└──────┬───────┘     └──────────────┘     └──────┬───────┘     │              │
       │                                         │              │              │
       │         ┌──────────────┐     ┌──────────┴───────┐     │              │
       └────────→│    orders    │────→│   order_items    │←────┘              │
                 │              │     │  (unit_price =   │                    │
                 │              │     │   snapshot)      │                    │
                 └──────────────┘     └──────────────────┘
```

**4 tablas + auth.users (gestionada por Supabase):**

| Tabla | Propósito | Relaciones |
|---|---|---|
| `profiles` | Datos del usuario (nombre, avatar) | FK → `auth.users(id)` con CASCADE |
| `products` | Catálogo de productos | Independiente |
| `orders` | Cabecera de pedido | FK → `auth.users(id)` |
| `order_items` | Líneas de pedido | FK → `orders(id)` CASCADE, FK → `products(id)` |

---

### Normalización: Tercera Forma Normal (3NF)

El schema cumple 3NF — cada atributo no-clave depende de la clave, de toda la clave y de nada más que la clave:

- **1NF:** Todos los campos son atómicos (sin arrays ni JSON en columnas de negocio)
- **2NF:** No hay dependencias parciales (cada tabla tiene una PK simple UUID)
- **3NF:** No hay dependencias transitivas — por ejemplo, `order_items.unit_price` es un snapshot independiente de `products.price`

**Decisión de modelado clave — `unit_price` como snapshot:**

Cada línea de pedido almacena el precio en el momento de la compra. Si el precio de un producto cambia en el futuro, los pedidos históricos mantienen el precio original. Referenciar `products.price` a posteriori sería un error de modelado que causaría inconsistencias contables.

```sql
-- order_items guarda el precio del momento de compra
unit_price NUMERIC(10,2) NOT NULL  -- snapshot, NO referencia a products.price
```

---

### Estrategia de IDs: UUID v4

**Decisión:** Todos los IDs son `UUID` generados con `gen_random_uuid()` en PostgreSQL.

**¿Por qué UUID y no incremental?**

| Aspecto | UUID | Incremental |
|---|---|---|
| Seguridad | Impredecible — elimina IDOR | Predecible — expone volumen y secuencia |
| Concurrencia | Sin coordinación — generables en cliente y servidor | Requiere secuencia centralizada |
| Idempotencia | El cliente puede generar `idempotency_key` con `crypto.randomUUID()` | Necesita otro mecanismo |
| Tamaño en índice | 16 bytes | 4-8 bytes |
| Legibilidad en logs | Baja | Alta |

**Trade-off asumido:** Mayor espacio en índices y menor legibilidad en logs. Aceptable frente a la mejora de seguridad, especialmente en un e-commerce donde los IDs de pedido aparecen en URLs.

---

### Control de concurrencia en stock

**Problema:** Dos usuarios compran el último producto al mismo tiempo. Sin control, ambos pedidos se crean y el stock queda negativo.

**Solución:** Función SQL atómica `decrement_stock()`:

```sql
CREATE OR REPLACE FUNCTION decrement_stock(p_id UUID, qty INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock = stock - qty
  WHERE id = p_id AND stock >= qty;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuficiente para producto %', p_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

**¿Por qué funciona?** El `UPDATE ... WHERE stock >= qty` es atómico en PostgreSQL. Si dos transacciones intentan decrementar el mismo producto simultáneamente, una de ellas verá `NOT FOUND` y su transacción se abortará. No se necesita lock explícito — el row-level lock implícito del `UPDATE` es suficiente.

**¿Por qué no un SELECT + UPDATE separado?** Porque entre el SELECT y el UPDATE otro proceso puede modificar el stock (race condition TOCTOU — Time of Check, Time of Use).

---

### Idempotencia en creación de pedidos

**Problema:** El usuario hace click dos veces en "Confirmar pedido", o hay un reintento de red. Sin protección, se crean dos pedidos y el stock se decrementa dos veces.

**Solución:** `idempotency_key` único por pedido.

```
1. Cliente genera idempotency_key = crypto.randomUUID()
2. POST /api/v1/orders { items: [...], idempotency_key: "abc-123" }
3. Servidor: ¿existe un pedido con idempotency_key = "abc-123"?
   → SÍ: devuelve el pedido existente (HTTP 200)
   → NO: crea nuevo pedido, decrementa stock (HTTP 201)
```

La columna tiene constraint `UNIQUE` en base de datos — incluso si la lógica del BFF fallara, PostgreSQL rechazaría el duplicado.

---

### Row Level Security (RLS)

RLS está habilitado en **todas las tablas** como segunda línea de defensa. Aunque el BFF usa `service_role` (que bypassa RLS), las políticas protegen ante:

- Accesos directos a la API REST de Supabase (si alguien obtiene la `anon_key` del frontend)
- Errores de configuración en el BFF
- Futuras rutas que olviden verificar permisos

**Resumen de políticas:**

```
┌─────────────┬──────────┬──────────┬──────────┬──────────┐
│   Tabla      │ SELECT   │ INSERT   │ UPDATE   │ DELETE   │
├─────────────┼──────────┼──────────┼──────────┼──────────┤
│ profiles    │ owner    │ owner    │ owner    │ —        │
│ products    │ público  │ —        │ —        │ —        │
│ orders      │ owner    │ owner    │ —        │ —        │
│ order_items │ owner(*) │ —        │ —        │ —        │
└─────────────┴──────────┴──────────┴──────────┴──────────┘

owner    = auth.uid() = user_id (o id en profiles)
owner(*) = via JOIN con orders.user_id
—        = bloqueado (solo service_role desde BFF)
```

Detalle completo de las políticas en [`SEGURIDAD_RLS.md`](./SEGURIDAD_RLS.md).

---

### Índices

| Tabla | Columna | Tipo | Justificación |
|---|---|---|---|
| `products` | `category` | B-tree | Filtrado por categoría — query frecuente en el catálogo |
| `products` | `name` | GIN (full-text, config `spanish`) | Búsqueda de texto con stemming en español |
| `products` | `price` | B-tree | Filtrado por rango de precio y ordenación |
| `orders` | `user_id` | B-tree | Scoping de pedidos por usuario — query en cada visita a `/orders` |
| `orders` | `idempotency_key` | B-tree UNIQUE | Lookup O(log n) para verificación de idempotencia |
| `order_items` | `order_id` | B-tree | JOIN con orders al cargar detalle de pedido |
| `order_items` | `product_id` | B-tree | JOIN con products para mostrar datos del producto en el pedido |

**¿Por qué GIN para búsqueda full-text?** Un índice B-tree sobre `name` solo sirve para búsquedas por prefijo (`LIKE 'camisa%'`). El índice GIN con `to_tsvector('spanish', name)` soporta búsqueda full-text con stemming (buscar "camisas" encuentra "camisa"), ranking de relevancia y operadores booleanos.

---

## 3. Frontend

### Framework: Next.js 16 (App Router)

**¿Por qué Next.js y no React puro (Vite)?**

| Aspecto | Next.js | React + Vite |
|---|---|---|
| SSR/SSG | Nativo | Requiere configuración manual |
| BFF integrado | Route Handlers | Necesita servidor separado |
| SEO | Server-side rendering out of the box | Requiere pre-rendering adicional |
| Routing | File-system based, layouts anidados | React Router manual |
| Streaming | Nativo con Suspense | Manual |

Next.js 16 con App Router permite colocar Server Components, layouts anidados, streaming, y el BFF en el mismo proyecto. React 19 incluido.

---

### Gestión de estado

**Dos stores separados por naturaleza del dato:**

| Dato | Herramienta | Justificación |
|---|---|---|
| Datos del servidor (productos, pedidos) | **TanStack Query v5** | Cache automático, revalidación, deduplicación, infinite scroll, estados loading/error |
| Estado cliente (carrito) | **Zustand** | API mínima, middleware `persist` para localStorage, sin boilerplate |

**¿Por qué no Redux?** Redux requiere boilerplate significativo (actions, reducers, slices, middleware) para un caso de uso que Zustand resuelve en 60 líneas. TanStack Query reemplaza la parte de "server state" que tradicionalmente se gestionaba con Redux.

**¿Por qué no Context API para el carrito?** Context provoca re-renders en todos los consumidores cuando cambia cualquier parte del estado. Zustand permite suscripciones selectivas (`useCartStore(s => s.items)`) — solo re-renderiza los componentes que usan el dato que cambió.

**Separación clara UI / lógica / data fetching:**

```
components/ui/        → Componentes visuales puros (shadcn/ui — Button, Input, Sheet...)
components/features/  → Componentes con lógica de dominio (ProductCard, CartDrawer, CheckoutForm)
lib/queries/          → Hooks de TanStack Query (useInfiniteProducts, useOrders, useCreateOrder)
lib/store/            → Zustand stores (useCartStore)
lib/validations/      → Schemas Zod (productQuerySchema, createOrderSchema)
```

Un componente de `features/` nunca hace fetch directamente — siempre usa un hook de `queries/`. Un componente de `ui/` nunca accede a stores ni queries — solo recibe props.

---

### Estrategia de rendering (SSR / CSR)

| Página | Estrategia | Justificación |
|---|---|---|
| Catálogo `/` | CSR con `useInfiniteQuery` | Infinite scroll interactivo, filtros dinámicos, datos cacheados en cliente |
| Detalle producto `/products/[id]` | SSR | SEO crítico (cada producto debe ser indexable), datos frescos de stock |
| Login / Register | CSR | Formularios interactivos, sin SEO |
| Carrito | CSR (drawer lateral) | Estado local (Zustand), sin SEO, altamente interactivo |
| Checkout `/checkout` | CSR | Flujo interactivo puro, datos privados, formulario con validación |
| Mis pedidos `/orders` | CSR con `useOrders` | Auth check en cliente, datos privados del usuario |

**¿Por qué CSR en el catálogo y no SSR?** El catálogo usa infinite scroll con filtros dinámicos. SSR renderizaría la primera página en servidor, pero las siguientes se cargan por el cliente de todas formas. Con TanStack Query el primer render muestra un skeleton y los datos llegan en ~200ms — la UX es equivalente a SSR pero con mejor experiencia de filtrado.

---

### Catálogo: Infinite Scroll

Implementado con `useInfiniteQuery` de TanStack Query + `IntersectionObserver`:

```
1. Primera carga: GET /api/v1/products?limit=12
2. API devuelve { products: [...12], nextCursor: "2024-03-24T10:00:00|uuid-abc" }
3. Usuario hace scroll → IntersectionObserver detecta el trigger
4. Segunda carga: GET /api/v1/products?limit=12&cursor=2024-03-24T10:00:00|uuid-abc
5. Repite hasta que nextCursor = null
```

**Cursor compuesto (`created_at|id`):** Los 50 productos del seed se insertaron al mismo tiempo, así que comparten `created_at`. El cursor usa `created_at|id` para desempatar — si dos productos tienen el mismo timestamp, se pagina por `id`. Esto garantiza que ningún producto se pierda ni se repita entre páginas.

**¿Por qué cursor y no offset?** Con offset (`?page=2&limit=12`), si se inserta un producto nuevo entre peticiones, los productos se desplazan y uno se duplica o se pierde. Con cursor, cada página empieza exactamente donde terminó la anterior, independientemente de inserciones o eliminaciones.

---

### Carrito: Edge cases

| Edge case | Solución |
|---|---|
| **Producto sin stock** | `addItem` verifica `stock > 0` antes de añadir. Si `stock <= 0`, muestra toast "Producto sin stock" |
| **Cambio de precio** | `unit_price` en `order_items` es snapshot del momento del checkout, no referencia a `products.price`. El carrito local puede tener un precio desactualizado, pero al crear el pedido el BFF usa el precio actual de la DB |
| **Cantidad > stock** | `updateQuantity` aplica `Math.min(quantity, stock)`. No permite exceder el stock disponible |
| **Persistencia** | Zustand con middleware `persist` sincroniza automáticamente con `localStorage`. El carrito sobrevive a recargas y cierres de pestaña |

---

## 4. Backend

### Framework: Next.js Route Handlers (BFF)

Los Route Handlers de Next.js actúan como backend. Esta decisión permite:

- **Un único repositorio y proceso de despliegue** — reducción de complejidad operacional
- **Tipos TypeScript compartidos** entre frontend y API — `Product`, `Order`, `CartItem` definidos una vez en `types/index.ts`
- **Acceso al contexto de autenticación** de Next.js sin configuración adicional

**Si el proyecto necesitara un backend independiente**, la elección sería **NestJS** por su estructura modular, inyección de dependencias, decoradores para validación y ecosistema enterprise (guards, interceptors, pipes).

---

### Estructura de carpetas (API)

```
src/app/api/v1/
├── products/
│   ├── route.ts          # GET /api/v1/products — filtros, búsqueda full-text, cursor pagination
│   └── [id]/
│       └── route.ts      # GET /api/v1/products/:id
├── orders/
│   └── route.ts          # GET /api/v1/orders (scoped por usuario)
│                          # POST /api/v1/orders (transaccional, idempotente)
└── auth/
    └── callback/
        └── route.ts      # GET — callback OAuth (Google, GitHub)
```

---

### Versionado: `/api/v1/`

Todos los endpoints bajo `/api/v1/`. Permite introducir `/api/v2/` con breaking changes sin afectar clientes existentes. En un proyecto con clientes móviles o terceros, esto es crítico para no romper versiones antiguas.

---

### Validación con Zod

**Todos los inputs se validan con Zod antes de tocar la base de datos.** Los schemas están en `lib/validations/`:

```typescript
// productQuerySchema — GET /api/v1/products
{
  search: z.string().optional(),
  category: z.enum(['ropa', 'calzado', 'accesorios']).optional(),
  min_price: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().min(0).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(12),
}

// createOrderSchema — POST /api/v1/orders
{
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  idempotency_key: z.string().uuid(),
}
```

**¿Por qué Zod y no Joi/Yup?** Zod es TypeScript-native — infiere los tipos automáticamente desde el schema (`z.infer<typeof schema>`). No necesita mantener tipos y validaciones por separado.

---

### Manejo de errores estructurado

Todas las respuestas de error siguen el mismo formato:

```json
{ "error": "STOCK_INSUFICIENTE", "message": "No hay stock suficiente para el producto X" }
```

Esto permite al frontend parsear errores de forma consistente y mostrar mensajes localizados al usuario.

---

### Endpoints en detalle

**`GET /api/v1/products`** — Catálogo con filtros

- Parámetros: `search`, `category`, `min_price`, `max_price`, `cursor`, `limit`
- Búsqueda full-text en español con `websearch` (soporta operadores como `camisa negra`)
- Filtros combinables (categoría + rango de precio + búsqueda)
- Cursor-based pagination con cursor compuesto `created_at|id`

**`GET /api/v1/products/:id`** — Detalle de producto

- Validación de UUID con Zod
- 404 si el producto no existe

**`POST /api/v1/orders`** — Crear pedido (transaccional, idempotente)

```
1. Validar auth (token de Supabase)
2. Validar body con Zod
3. Verificar idempotency_key → si existe, devolver pedido existente
4. Para cada item:
   a. Obtener precio actual del producto
   b. Verificar stock disponible
5. Calcular total
6. Crear order
7. Crear order_items (con unit_price = precio actual)
8. Decrementar stock con decrement_stock() para cada item
9. Si algo falla → rollback automático (transacción)
```

**`GET /api/v1/orders`** — Pedidos del usuario

- Requiere auth
- Filtra por `user_id` del token
- Incluye `order_items` con datos del producto (JOIN)

---

## 5. Autenticación y seguridad

### Proveedor: Supabase Auth

Integrado nativamente con PostgreSQL. Soporta:

- **Email/Password** — con confirmación de email obligatoria
- **Social Login** — Google y GitHub (OAuth 2.0)
- **JWT** — tokens manejados automáticamente por Supabase SDK

### Protección de rutas

**`proxy.ts`** (Next.js 16, sucesor de `middleware.ts`) intercepta las rutas del grupo `(auth)`:

- `/checkout` y `/orders` requieren sesión activa
- Si no hay sesión, redirige a `/login?next=/checkout` (preserva la URL de destino)
- Verifica el token de Supabase en el servidor, no en el cliente

### Protección de endpoints API

Los endpoints que requieren auth (`POST /orders`, `GET /orders`) verifican el token JWT:

```typescript
const supabase = createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
```

### Validación de ownership

**Doble capa de verificación:**

1. **BFF:** Antes de crear/consultar un pedido, el Route Handler verifica que `user_id` del pedido coincide con el `auth.uid()` del token
2. **RLS:** Incluso si el BFF tuviera un bug, las políticas de PostgreSQL bloquean el acceso a recursos de otros usuarios

### Seguridad del service_role

- `SUPABASE_SERVICE_ROLE_KEY` solo se usa en `lib/supabase/admin.ts`
- Solo se importa desde archivos dentro de `app/api/` (Route Handlers)
- Nunca se importa desde componentes React
- La variable NO lleva prefijo `NEXT_PUBLIC_`, así que Next.js no la incluye en el bundle del cliente

---

## 6. Performance

### Caching

- **TanStack Query** cachea los datos del servidor en el cliente con `staleTime` configurable. Las navegaciones entre páginas no re-fetchean datos que ya están en cache
- **Deduplicación automática** — si dos componentes hacen la misma query simultáneamente, TanStack Query solo ejecuta un fetch

### Minimizar overfetching

- **Cursor pagination** — cada página carga solo 12 productos, no el catálogo completo
- **Filtros en servidor** — la query SQL filtra por categoría/precio/búsqueda, no se descargan todos los productos para filtrar en cliente
- **Selección de campos** — las queries seleccionan solo las columnas necesarias

### Lazy loading

- **Imágenes** — `loading="lazy"` en todas las imágenes del catálogo via `next/image`
- **Infinite scroll** — los productos se cargan solo cuando el usuario hace scroll (IntersectionObserver)

### Debounce en búsqueda

300ms de debounce antes de lanzar la query de búsqueda. Evita un request por cada tecla pulsada. Implementado con `useEffect` + `setTimeout` en `SearchBar.tsx`.

### Índices en DB

6 índices estratégicos sobre las columnas más consultadas (detallados en la sección de base de datos). Destacable el índice GIN para búsqueda full-text que permite búsqueda por stemming en español.

---

## 7. Escalabilidad

### ¿Qué haría si esto crece x100?

#### Base de datos

| Medida | Cuándo | Impacto |
|---|---|---|
| **Read replicas** | > 10k lecturas/seg | Distribuir carga de catálogo (lecturas) a réplicas, escrituras al primario |
| **Connection pooling** (PgBouncer) | > 100 conexiones concurrentes | Ya incluido en Supabase. Reutiliza conexiones en vez de crear/destruir |
| **Particionado de `orders`** | > 10M pedidos | Particionar por fecha (`created_at`). Las queries de "mis pedidos" solo escanean la partición relevante |
| **Cache con Redis** | > 1k req/seg al catálogo | Cache de productos populares con TTL de 60s. Invalida al actualizar stock |
| **Búsqueda con Elasticsearch** | > 100k productos | Full-text search dedicado. PostgreSQL GIN funciona bien hasta ~100k registros |

#### Backend

- **Extraer API a servicio independiente** — NestJS o Fastify para escalar backend y frontend por separado
- **Cola de mensajes** — BullMQ + Redis (o AWS SQS) para procesar pedidos de forma asíncrona. El usuario ve "Pedido en proceso" y se desacopla la experiencia del procesamiento real
- **Rate limiting** — Proteger `POST /orders` contra abuso. Implementable con Redis (sliding window) o un servicio como Upstash Ratelimit
- **CDN para imágenes** — Supabase Storage o Cloudflare R2 con transformaciones on-the-fly

#### Infraestructura

- **CI/CD** — GitHub Actions con tests automáticos, lint y build antes de merge. Deploy a staging automático en PR, producción en merge a main
- **Monitorización** — Alertas en latencia P99, tasa de errores 5xx, y métricas de negocio (conversion rate, carritos abandonados)

---

## 8. Bonus

### Event-driven (order events)

Al crear un pedido se emitiría un evento `order.created` que dispararía de forma asíncrona:

```
POST /api/v1/orders (síncrono)
    ↓ emite evento
order.created (asíncrono)
    ├── Email de confirmación al usuario
    ├── Actualización de inventario en sistemas externos (ERP)
    ├── Notificación al equipo de logística
    └── Webhooks a integraciones de terceros
```

**Implementación:** Supabase Database Webhooks (trigger en `INSERT ON orders` que llama a un endpoint) o un servicio de mensajería como AWS EventBridge.

**Beneficio:** El usuario no espera a que se envíe el email o se actualice el ERP. La respuesta del checkout es inmediata.

### Webhooks

Endpoint `POST /api/v1/webhooks/orders` para notificar a sistemas externos cuando cambia el estado de un pedido:

```json
{
  "event": "order.status_changed",
  "data": {
    "order_id": "uuid",
    "old_status": "pending",
    "new_status": "confirmed",
    "timestamp": "2026-03-24T10:00:00Z"
  },
  "signature": "sha256=abc123..."
}
```

Cada evento incluye firma HMAC-SHA256 para que el receptor pueda verificar la autenticidad. Reintentos con backoff exponencial si el receptor no responde con 2xx.

### Observabilidad

| Capa | Herramienta | Qué mide |
|---|---|---|
| **Logs estructurados** | Pino/Winston → Datadog o Loki | Cada request con `user_id`, `order_id`, duración, status code |
| **Distributed tracing** | OpenTelemetry → Jaeger | Latencia entre Next.js → Supabase, identificar cuellos de botella |
| **Métricas de negocio** | Custom events → Mixpanel o PostHog | Conversion rate, abandono de carrito, tiempo de checkout |
| **Alertas** | Datadog/PagerDuty | P99 latencia > 2s, error rate > 1%, stock negativo |

### Feature flags

Integración con un sistema de feature flags (LaunchDarkly, Unleash o Vercel Edge Config):

- **Canary releases** — activar features por porcentaje de usuarios
- **A/B testing** — probar flujos de checkout alternativos midiendo conversion
- **Kill switches** — desactivar funcionalidades en producción sin deploy (ej: desactivar social login si Google tiene downtime)

---

## 9. Resumen de trade-offs principales

| Decisión | Ventaja | Trade-off asumido |
|---|---|---|
| Next.js como BFF | Un solo repo, despliegue único, tipos compartidos | Acoplamiento frontend/backend. No escalan independientemente |
| UUID como IDs | Elimina IDOR, generables en cliente | 16 bytes vs 4 bytes en índices. Menor legibilidad en logs |
| Supabase | Setup rápido, Auth + DB + RLS integrados | Vendor lock-in. Migrar a PostgreSQL autohosteado requiere reconfigurar auth |
| TanStack Query | Cache, deduplicación, infinite scroll declarativo | Dependencia de librería. Curva de aprendizaje para el equipo |
| Zustand para carrito | Simple, sin boilerplate, persist incluido | Sin sync entre pestañas en tiempo real (mitigado con `persist`) |
| SSR selectivo | SEO donde importa, CSR donde la interactividad prima | Mayor complejidad de razonamiento sobre dónde vive cada dato |
| Cursor pagination | Consistente ante inserciones/eliminaciones | Más complejo que offset. No permite "ir a página N" directamente |
| RLS como segunda capa | Protección ante bugs en el BFF | Duplicación de lógica de autorización (BFF + RLS) |
