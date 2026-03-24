# Documento de Decisiones Técnicas

**Proyecto:** Plataforma E-Commerce Full Stack  
**Autor:** Alberto  
**Fecha:** Marzo 2026

---

## 1. Arquitectura general

### Monolito vs modular

Se ha optado por un **monolito modular** en un único repositorio Next.js.

La separación no es a nivel de servicios independientes sino a nivel de capas internas bien definidas:

- `/app/api/v1/` — capa de API (BFF)
- `/components/features/` — lógica de UI por dominio
- `/lib/queries/` — data fetching
- `/lib/store/` — estado cliente
- `/lib/validations/` — schemas Zod

**Justificación:** El scope del proyecto no justifica la complejidad operacional de microservicios (despliegues independientes, comunicación entre servicios, distributed tracing). Un monolito modular ofrece la misma separación de responsabilidades con mucho menos overhead. Si el sistema creciera x100, la separación por capas ya establecida facilitaría extraer servicios independientes sin reescribir lógica.

**Trade-off asumido:** Acoplamiento de despliegue entre frontend y backend. Aceptable dado el scope.

---

### BFF (Backend For Frontend)

**Decisión: Sí, implementado con Next.js Route Handlers.**

Los Route Handlers en `/app/api/v1/` actúan como capa intermedia entre el cliente React y Supabase:

```
Browser (React)
    ↓  fetch /api/v1/...
Next.js Route Handlers  ←  validación Zod, lógica de negocio, transacciones
    ↓  supabase-js (service_role)
Supabase PostgreSQL     ←  RLS como segunda capa de seguridad
```

**Justificación:**
- El `SUPABASE_SERVICE_ROLE_KEY` nunca llega al browser
- Permite lógica transaccional compleja (stock atómico, idempotencia) que no puede hacerse en el cliente
- Validación centralizada de inputs con Zod
- RLS actúa como segunda línea de defensa, no como única protección

**Trade-off asumido:** Acoplamiento entre frontend y backend al estar en el mismo proceso. En un escenario con múltiples clientes (móvil, terceros) se plantearía una API independiente.

---

## 2. Base de datos

### Plataforma: Supabase (PostgreSQL)

**Justificación:** Supabase proporciona PostgreSQL gestionado con Auth, Row Level Security y SDK oficial. Elimina la necesidad de gestionar infraestructura de base de datos, autenticación y almacenamiento por separado, lo que reduce drásticamente el tiempo de desarrollo sin sacrificar robustez.

---

### Estrategia de IDs: UUID v4

**Decisión:** Todos los IDs son `UUID` generados con `gen_random_uuid()`.

**Justificación:**
- Los IDs incrementales exponen información sensible (volumen de pedidos, secuencia de usuarios) y son el vector más común de ataques IDOR (Insecure Direct Object Reference)
- Los UUIDs son impredecibles, eliminando este vector de ataque incluso si RLS fallara
- Permiten generación de IDs en el cliente sin coordinación con el servidor (útil para `idempotency_key`)

**Trade-off asumido:** Los UUIDs ocupan más espacio en índices y son menos legibles en logs. Se asume como costo aceptable frente a la mejora de seguridad.

---

### Normalización: 3NF

El schema está en Tercera Forma Normal:

- `profiles` — datos del usuario, separados de `auth.users`
- `products` — catálogo independiente
- `orders` — cabecera del pedido con referencia al usuario
- `order_items` — líneas de pedido con referencia a `orders` y `products`

**Decisión de modelado clave — `unit_price` en `order_items`:**  
Cada línea de pedido almacena el precio en el momento de la compra como snapshot. Esto es intencionado: si el precio de un producto cambia en el futuro, los pedidos históricos mantienen el precio original. Referenciar `products.price` a posteriori sería un error de modelado.

---

### Control de concurrencia en stock

El stock se decrementa mediante una función SQL atómica `decrement_stock()` que ejecuta el `UPDATE` con verificación en una sola operación. Esto evita race conditions en escenarios de alta concurrencia donde múltiples usuarios compran el mismo producto simultáneamente.

```sql
UPDATE products
SET stock = stock - qty
WHERE id = p_id AND stock >= qty;
```

Si el stock es insuficiente, la función lanza una excepción que aborta la transacción completa.

---

### Idempotencia en creación de pedidos

Cada pedido incluye un `idempotency_key` único generado en el cliente con `crypto.randomUUID()` antes de hacer el POST. Si la request llega duplicada (reintento de red, doble click), el servidor detecta la clave existente y devuelve el pedido ya creado sin crear uno nuevo ni decrementar el stock dos veces.

---

### Row Level Security (RLS)

RLS está habilitado en todas las tablas como segunda línea de defensa:

- `products` — lectura pública, sin escritura desde cliente
- `orders` — cada usuario solo ve y crea sus propios pedidos (`auth.uid() = user_id`)
- `order_items` — accesibles solo si el usuario es propietario del pedido padre

Aunque el BFF usa `service_role` (que bypassa RLS), las políticas protegen ante accesos directos a la API de Supabase o errores de configuración del BFF.

---

### Índices

| Tabla | Columna | Tipo | Razón |
|---|---|---|---|
| `products` | `category` | B-tree | Filtrado por categoría |
| `products` | `name` | GIN (full-text) | Búsqueda de texto |
| `products` | `price` | B-tree | Filtrado y ordenación por precio |
| `orders` | `user_id` | B-tree | Scoping por usuario |
| `orders` | `idempotency_key` | B-tree UNIQUE | Lookup de idempotencia |
| `order_items` | `order_id` | B-tree | JOIN con orders |

---

## 3. Frontend

### Framework: Next.js 16 (App Router)

Next.js 16 cubre el requisito de React 19 e incorpora el BFF en el mismo proyecto. La elección de App Router sobre Pages Router permite colocación de Server Components, layouts anidados y streaming nativo.

---

### Gestión de estado

**Estado servidor: TanStack Query (React Query v5)**

TanStack Query gestiona el ciclo de vida de los datos que viven en el servidor: caché automático, revalidación en background, deduplicación de requests, estados de loading/error, e infinite scroll. Sustituye el patrón manual de `useState` + `useEffect` + fetch con una solución declarativa y predecible.

**Estado cliente (carrito): Zustand**

El carrito es estado puramente cliente. Zustand ofrece una API mínima sin boilerplate, con middleware `persist` para sincronización automática con `localStorage`. El carrito se sincroniza con la DB únicamente en el momento del checkout.

**Separación clara UI / lógica / data fetching:**
- `components/ui/` — componentes visuales sin lógica de negocio (shadcn)
- `components/features/` — componentes con lógica de dominio
- `lib/queries/` — hooks de TanStack Query (data fetching)
- `lib/store/` — Zustand stores (estado cliente)

---

### Estrategia de rendering

| Página | Estrategia | Justificación |
|---|---|---|
| Catálogo `/` | SSR | Stock y precios frescos, SEO crítico para e-commerce |
| Detalle producto `/products/[id]` | SSR | Mismo motivo, datos frescos por visita |
| Carrito | CSR | Estado local, sin SEO, altamente interactivo |
| Checkout | CSR | Flujo interactivo puro, datos privados |
| Mis pedidos `/orders` | SSR | Auth check en servidor, datos privados del usuario |

---

### Catálogo: Infinite Scroll

Implementado con `useInfiniteQuery` de TanStack Query. Más natural para una experiencia de compra que la paginación clásica. Carga páginas adicionales al detectar scroll al final del listado.

---

## 4. Backend

### Framework: Next.js Route Handlers (BFF)

Como se explica en la sección de arquitectura, los Route Handlers de Next.js actúan como backend. Esta decisión permite:
- Un único repositorio y proceso de despliegue
- Compartir tipos TypeScript entre frontend y API
- Acceso directo al contexto de autenticación de Next.js

**Para un escenario con múltiples clientes o equipo de backend independiente**, la elección habría sido NestJS por su estructura modular, inyección de dependencias y ecosistema enterprise.

---

### Estructura de carpetas (API)

```
src/app/api/v1/
├── products/
│   ├── route.ts          # GET /api/v1/products (filtros, búsqueda, paginación)
│   └── [id]/
│       └── route.ts      # GET /api/v1/products/:id
└── orders/
    └── route.ts          # GET + POST /api/v1/orders
```

### Versionado

Todos los endpoints bajo `/api/v1/`. Permite introducir `/api/v2/` con breaking changes sin afectar clientes existentes.

### Validación

Zod en todos los endpoints. Los inputs no validados nunca llegan a la capa de base de datos.

### Manejo de errores

Respuestas estructuradas consistentes:
```json
{ "error": "STOCK_INSUFICIENTE", "message": "No hay stock suficiente para el producto X" }
```

---

## 5. Autenticación y seguridad

### Proveedor: Supabase Auth

Integrado nativamente con la base de datos. Soporta Email/Password y Social Login (Google, GitHub) sin infraestructura adicional.

### Protección de rutas

`proxy.ts` (Next.js 16, sucesor de `middleware.ts`) intercepta las rutas del grupo `(auth)` y redirige a login si no hay sesión activa.

### Ownership de recursos

Doble verificación: RLS en base de datos + comprobación explícita de `user_id` en los Route Handlers antes de operar sobre pedidos.

---

## 6. Performance

- **Caché en TanStack Query** — los productos se cachean en cliente, evitando refetches innecesarios
- **Debounce en búsqueda** — 300ms antes de lanzar la query, evita un request por tecla pulsada
- **Infinite scroll** — carga incremental, no se descarga el catálogo completo
- **Índices en DB** — sobre las columnas más consultadas (category, name, user_id)
- **SSR con streaming** — el catálogo empieza a renderizar antes de tener todos los datos
- **Lazy loading de imágenes** — `loading="lazy"` en todas las imágenes del catálogo

---

## 7. Escalabilidad — ¿Qué haría si esto crece x100?

### Base de datos
- **Read replicas** en Supabase para distribuir carga de lecturas (catálogo)
- **Connection pooling** con PgBouncer (incluido en Supabase)
- **Particionado** de la tabla `orders` por fecha si el volumen lo requiere
- **Caché de segundo nivel** con Redis para productos populares (evitar queries repetidas a PostgreSQL)

### Backend
- Extraer los Route Handlers a un servicio independiente (NestJS o Fastify) para escalar backend y frontend de forma independiente
- Introducir una **cola de mensajes** (BullMQ + Redis o AWS SQS) para procesar pedidos de forma asíncrona, desacoplando la experiencia del usuario del procesamiento real

### Event-driven (bonus)
Al crear un pedido se emitiría un evento `order.created` que dispararía de forma asíncrona:
- Email de confirmación al usuario
- Actualización de inventario en sistemas externos
- Notificación al equipo de logística
- Webhooks a integraciones de terceros

### Webhooks
Endpoint `/api/v1/webhooks/orders` para notificar a sistemas externos (ERP, logística, email marketing) cuando cambia el estado de un pedido. Cada evento incluye firma HMAC para verificar autenticidad.

### Observabilidad
- **Logs estructurados** en JSON con contexto (user_id, order_id, duración) — enviados a Datadog o Loki
- **Distributed tracing** con OpenTelemetry para identificar cuellos de botella entre servicios
- **Métricas de negocio** en tiempo real: conversion rate, abandono de carrito, tiempo de checkout

### Feature flags
Integración con un sistema de feature flags (LaunchDarkly o Unleash) para:
- Activar nuevas features por porcentaje de usuarios (canary releases)
- A/B testing de flujos de checkout
- Kill switches para desactivar funcionalidades en producción sin deploy

---

## Resumen de trade-offs principales

| Decisión | Ventaja | Trade-off asumido |
|---|---|---|
| Next.js como BFF | Un solo repo, despliegue único | Acoplamiento frontend/backend |
| UUID como IDs | Elimina IDOR, más seguro | Mayor tamaño en índices |
| Supabase | Setup rápido, Auth+DB integrados | Vendor lock-in |
| Zustand para carrito | Simple, sin boilerplate | Sin sincronización en tiempo real entre pestañas (resuelto con `persist`) |
| SSR en catálogo | SEO + datos frescos | Mayor carga en servidor vs SSG |