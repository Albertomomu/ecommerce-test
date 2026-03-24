# PLOOT — E-Commerce de Moda y Accesorios

Plataforma de e-commerce full stack con catálogo, carrito, checkout y área autenticada. Prueba técnica para posición Full Stack Developer (Senior).

**Demo en producción:** [ecommerce-test.vercel.app](https://ecommerce-test-anqysdhit-albertomomus-projects.vercel.app/)

---

## Stack

| Capa | Tecnología | Propósito |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack) | SSR/CSR, BFF integrado, React 19 |
| Base de datos | Supabase (PostgreSQL) | DB gestionada + Auth + RLS |
| Auth | Supabase Auth | Email/Password + Google + GitHub |
| Fetching | TanStack Query v5 | Cache, revalidación, infinite scroll |
| Estado cliente | Zustand | Carrito persistente (localStorage) |
| Validación | Zod | Validación de inputs en API y formularios |
| UI | Tailwind CSS + shadcn/ui | Componentes accesibles, diseño editorial |
| Notificaciones | Sonner | Toasts ligeros |
| Deploy | Vercel | Producción con CI/CD automático |

---

## Instalación

```bash
git clone https://github.com/Albertomomu/ecommerce-test.git
cd ecommerce-test
npm install
```

---

## Configuración

### 1. Variables de entorno

```bash
cp .env.local.example .env.local
```

Rellena con tus claves de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

Las claves están en **Supabase Dashboard → Settings → API**.

### 2. Migraciones SQL

En el **SQL Editor** de Supabase, ejecuta en orden:

1. `supabase/migrations/001_schema.sql` — Schema completo (tablas, índices, funciones, RLS, triggers)
2. `supabase/seed.sql` — 50 productos de ejemplo del dataset

### 3. Auth providers

En **Supabase Dashboard → Authentication → Providers**:

- **Email/Password** — habilitado por defecto
- **Google** — requiere Client ID y Secret de [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- **GitHub** — requiere OAuth App de [GitHub Developer Settings](https://github.com/settings/developers)

Redirect URI para ambos proveedores:
```
https://<TU-PROJECT-REF>.supabase.co/auth/v1/callback
```

### 4. Configuración de URLs (Supabase)

En **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL:** tu dominio de Vercel (o `http://localhost:3000` en local)
- **Redirect URLs:** `https://tu-dominio.vercel.app/**` y `http://localhost:3000/**`

---

## Ejecución

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Funcionalidades

### Catálogo
- Grid de productos con infinite scroll (cursor-based pagination)
- Filtros combinables: categoría + rango de precio
- Búsqueda full-text en español con debounce (300ms)
- Indicador de stock bajo ("Quedan X")

### Carrito
- Drawer lateral persistente (Zustand + localStorage)
- Añadir / eliminar / cambiar cantidad
- Validación de stock al añadir
- Badge reactivo en el header con cantidad de items

### Checkout
- Formulario con validación Zod (nombre, dirección, ciudad, CP)
- Resumen del pedido con subtotales
- Creación de pedido transaccional e idempotente
- Vaciado automático del carrito tras éxito

### Autenticación
- Login con Email/Password, Google y GitHub
- Registro con confirmación de email
- Protección de rutas `/checkout` y `/orders` via `proxy.ts`
- Errores de auth traducidos al español

### Mis pedidos
- Lista de pedidos con estado (pending, confirmed, shipped, delivered, cancelled)
- Detalle de cada pedido con items, precios unitarios y total

---

## API Endpoints

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| GET | `/api/v1/products` | Catálogo con filtros, búsqueda y paginación | No |
| GET | `/api/v1/products/:id` | Detalle de producto | No |
| POST | `/api/v1/orders` | Crear pedido (transaccional, idempotente) | Sí |
| GET | `/api/v1/orders` | Pedidos del usuario autenticado | Sí |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── globals.css                    # Design system (colores, tipografía, radii)
│   ├── layout.tsx                     # Layout global (Inter + Space Grotesk)
│   ├── (public)/
│   │   ├── page.tsx                   # Catálogo con hero + filtros + infinite scroll
│   │   ├── products/[id]/page.tsx     # Detalle de producto
│   │   ├── login/page.tsx             # Login (email + OAuth)
│   │   └── register/page.tsx          # Registro
│   ├── (auth)/
│   │   ├── checkout/page.tsx          # Checkout (protegida)
│   │   └── orders/page.tsx            # Mis pedidos (protegida)
│   └── api/v1/
│       ├── products/route.ts          # GET con filtros y cursor pagination
│       ├── products/[id]/route.ts     # GET por UUID
│       ├── orders/route.ts            # GET + POST (transaccional)
│       └── auth/callback/route.ts     # Callback OAuth
├── components/
│   ├── ui/                            # shadcn/ui (Button, Input, Sheet, Badge...)
│   └── features/
│       ├── catalog/                   # Header, ProductCard, ProductGrid, Filters, SearchBar
│       ├── cart/                      # CartDrawer, CartItem, CartSummary
│       └── checkout/                  # CheckoutForm, OrderSummary
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # Browser client (anon key)
│   │   ├── server.ts                  # Server client (cookies)
│   │   └── admin.ts                   # Service role (solo API routes)
│   ├── validations/
│   │   ├── product.ts                 # Zod schemas para productos
│   │   └── order.ts                   # Zod schemas para pedidos
│   ├── queries/
│   │   ├── products.ts                # useInfiniteProducts, useProduct
│   │   └── orders.ts                  # useOrders, useCreateOrder
│   └── store/
│       └── cart.ts                    # Zustand store (persist middleware)
├── proxy.ts                           # Protección de rutas (auth)
└── types/
    └── index.ts                       # Tipos globales (Product, Order, CartItem...)
```

---

## Base de datos

4 tablas + `auth.users` (gestionada por Supabase):

- **profiles** — datos del usuario (FK → auth.users)
- **products** — catálogo con stock
- **orders** — cabecera de pedido con estado e idempotency_key
- **order_items** — líneas de pedido con `unit_price` como snapshot

RLS habilitado en todas las tablas. Detalle en [`SEGURIDAD_RLS.md`](./SEGURIDAD_RLS.md).

---

## Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` solo en servidor (nunca en el bundle del cliente)
- Validación Zod en todos los endpoints antes de tocar la DB
- RLS como segunda capa de defensa en todas las tablas
- Control de concurrencia en stock con `decrement_stock()` atómico
- Idempotencia en pedidos con `idempotency_key` (UNIQUE constraint)
- UUIDs en todas las PKs (prevención de IDOR)
- Protección de rutas con `proxy.ts`

---

## Decisiones técnicas

Ver [DECISIONES_TECNICAS.md](./DECISIONES_TECNICAS.md) para el documento completo con:

- Arquitectura (monolito modular, BFF)
- Modelado de datos (3NF, trade-offs)
- Estrategias de rendering (SSR/CSR justificadas)
- Escalabilidad (qué haría si crece x100)
- Bonus (event-driven, webhooks, observabilidad, feature flags)

---

## Scripts

```bash
npm run dev      # Desarrollo con Turbopack
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # ESLint
```
