# Seguridad RLS — Políticas de Base de Datos

**Proyecto:** PLOOT E-Commerce
**Fecha:** Marzo 2026

---

## Principios

1. **RLS activado en TODAS las tablas** — ninguna tabla accesible sin policy explícita
2. **Mínimo privilegio** — cada policy permite solo lo estrictamente necesario
3. **Doble capa de seguridad** — RLS en DB + validación en API Routes (BFF)
4. **`service_role` solo en servidor** — el BFF usa service_role (bypassa RLS), pero RLS protege ante accesos directos a Supabase o errores en el BFF

---

## Tabla: `profiles`

Datos personales del usuario (nombre, avatar). Cada usuario solo puede ver y modificar su propio perfil.

| Operación | Policy | Regla | Justificación |
|---|---|---|---|
| **SELECT** | `usuario ve su perfil` | `auth.uid() = id` | Un usuario solo ve su propio perfil |
| **INSERT** | `usuario crea su perfil` | `auth.uid() = id` | Solo puede crear un perfil con su propio `id`. Necesario para que el trigger `handle_new_user()` funcione vía `SECURITY DEFINER` |
| **UPDATE** | `usuario actualiza su perfil` | `auth.uid() = id` | Solo puede modificar su nombre/avatar |
| **DELETE** | — | No permitido | Los perfiles se borran en cascada al eliminar el usuario de `auth.users` |

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario ve su perfil" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "usuario crea su perfil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "usuario actualiza su perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

**Nota sobre el trigger:** La función `handle_new_user()` usa `SECURITY DEFINER`, lo que significa que se ejecuta con los permisos del owner de la función (normalmente `postgres`), no del usuario que hace signup. Esto permite que el INSERT funcione incluso con RLS activado. La policy de INSERT es una capa adicional de seguridad para cualquier otro camino de acceso.

---

## Tabla: `products`

Catálogo público. Nadie excepto un admin debería poder modificar productos.

| Operación | Policy | Regla | Justificación |
|---|---|---|---|
| **SELECT** | `productos visibles para todos` | `true` | El catálogo es público, cualquiera puede ver productos |
| **INSERT** | — | No permitido | Solo el BFF (service_role) o un admin pueden crear productos |
| **UPDATE** | — | No permitido | Solo el BFF (service_role) actualiza stock vía `decrement_stock()` |
| **DELETE** | — | No permitido | No se eliminan productos desde el cliente |

```sql
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "productos visibles para todos" ON products
  FOR SELECT USING (true);
```

**Sin policies de escritura = escritura bloqueada para clientes.** Solo `service_role` (usado por el BFF) puede insertar, actualizar o eliminar productos.

---

## Tabla: `orders`

Pedidos del usuario. Cada usuario solo ve y crea sus propios pedidos.

| Operación | Policy | Regla | Justificación |
|---|---|---|---|
| **SELECT** | `usuario ve sus pedidos` | `auth.uid() = user_id` | Un usuario solo ve pedidos donde es el propietario |
| **INSERT** | `usuario crea sus pedidos` | `auth.uid() = user_id` | Solo puede crear pedidos a su nombre. Previene crear pedidos a nombre de otro usuario |
| **UPDATE** | — | No permitido | Los cambios de estado los hace el BFF (service_role). Un usuario no puede cambiar el estado de su pedido |
| **DELETE** | — | No permitido | Los pedidos son inmutables por diseño |

```sql
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario ve sus pedidos" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usuario crea sus pedidos" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## Tabla: `order_items`

Líneas de pedido. Accesibles solo si el usuario es propietario del pedido padre.

| Operación | Policy | Regla | Justificación |
|---|---|---|---|
| **SELECT** | `usuario ve items de sus pedidos` | Existe un pedido con ese `order_id` donde `user_id = auth.uid()` | Scoped por ownership del pedido padre. Previene enumerar items de pedidos ajenos |
| **INSERT** | — | No permitido | Solo el BFF crea order_items dentro de la transacción de checkout |
| **UPDATE** | — | No permitido | Las líneas de pedido son inmutables (snapshot de precio) |
| **DELETE** | — | No permitido | Se borran en cascada si se elimina el pedido |

```sql
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario ve items de sus pedidos" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );
```

---

## Resumen visual

```
┌─────────────┬─────────┬─────────┬─────────┬─────────┐
│   Tabla      │ SELECT  │ INSERT  │ UPDATE  │ DELETE  │
├─────────────┼─────────┼─────────┼─────────┼─────────┤
│ profiles    │ owner   │ owner   │ owner   │ —       │
│ products    │ público │ —       │ —       │ —       │
│ orders      │ owner   │ owner   │ —       │ —       │
│ order_items │ owner*  │ —       │ —       │ —       │
└─────────────┴─────────┴─────────┴─────────┴─────────┘

owner  = auth.uid() = user_id/id
owner* = via JOIN con orders.user_id
—      = bloqueado (solo service_role desde BFF)
```

---

## Función `handle_new_user()` — Trigger de signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

`SECURITY DEFINER` = se ejecuta con permisos del owner (postgres), bypassa RLS. Esto es seguro porque:
- El trigger solo se dispara desde `auth.users` (controlado por Supabase Auth)
- El INSERT solo usa datos del propio `NEW` record
- No hay input del usuario que pueda manipular la query

---

## Función `decrement_stock()` — Control de concurrencia

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

Solo invocable desde el BFF con `service_role`. La verificación `stock >= qty` en el WHERE es atómica — previene race conditions en compras concurrentes.

---

## SQL completo para ejecutar en Supabase

Copiar y pegar este bloque en el SQL Editor de Supabase para aplicar todas las policies:

```sql
-- ============================================
-- PROFILES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar policies existentes si las hay
DROP POLICY IF EXISTS "usuario ve su perfil" ON profiles;
DROP POLICY IF EXISTS "usuario crea su perfil" ON profiles;
DROP POLICY IF EXISTS "usuario actualiza su perfil" ON profiles;

CREATE POLICY "usuario ve su perfil" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "usuario crea su perfil" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "usuario actualiza su perfil" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PRODUCTS
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "productos visibles para todos" ON products;

CREATE POLICY "productos visibles para todos" ON products
  FOR SELECT USING (true);

-- ============================================
-- ORDERS
-- ============================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario ve sus pedidos" ON orders;
DROP POLICY IF EXISTS "usuario crea sus pedidos" ON orders;

CREATE POLICY "usuario ve sus pedidos" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "usuario crea sus pedidos" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ORDER_ITEMS
-- ============================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usuario ve items de sus pedidos" ON order_items;

CREATE POLICY "usuario ve items de sus pedidos" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS Y FUNCIONES
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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
