# PLOOT — E-Commerce de Moda y Accesorios

Plataforma de e-commerce con catálogo, carrito, checkout y área autenticada.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **Supabase** (PostgreSQL + Auth + RLS)
- **TanStack Query v5** (fetching + cache)
- **Zustand** (estado del carrito con persistencia localStorage)
- **Zod** (validación de inputs)
- **Tailwind CSS + shadcn/ui** (UI components)
- **Sonner** (notificaciones toast)

## Instalación

```bash
git clone https://github.com/Albertomomu/ecommerce-test.git
cd ecommerce-test
npm install
```

## Configuración

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Copia `.env.local.example` a `.env.local` y rellena las variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

3. Ejecuta las migraciones SQL en el editor SQL de Supabase:
   - `supabase/migrations/001_schema.sql` — schema completo
   - `supabase/seed.sql` — 50 productos de ejemplo

4. En Supabase Dashboard > Authentication > Providers, habilita:
   - Email/Password
   - Google (opcional)
   - GitHub (opcional)

## Ejecución

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Estructura del proyecto

```
src/
├── app/
│   ├── (public)/          # Catálogo, detalle, login, register
│   ├── (auth)/            # Checkout, mis pedidos (protegidas)
│   └── api/v1/            # BFF — Route Handlers
├── components/
│   ├── ui/                # shadcn components
│   └── features/          # Catalog, Cart, Checkout
├── lib/
│   ├── supabase/          # Clientes (browser, server, admin)
│   ├── validations/       # Zod schemas
│   ├── queries/           # TanStack Query hooks
│   └── store/             # Zustand cart store
└── types/                 # Tipos TypeScript
```

## Decisiones técnicas

Ver [DECISIONES_TECNICAS.md](./DECISIONES_TECNICAS.md) para el detalle completo de las decisiones arquitectónicas.
