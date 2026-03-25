import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { createOrderSchema } from '@/lib/validations/order';
import { createRequestLogger } from '@/lib/logger';
import { rateLimit } from '@/lib/rate-limit';

const orderRateLimiter = rateLimit({
  interval: 60_000, // 1 minuto
  uniqueTokenPerInterval: 500,
});

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: NextRequest) {
  const log = createRequestLogger(request);
  const user = await getAuthUser();

  if (!user) {
    log.done(401, 'No autenticado');
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  log.info('Fetching orders', { userId: user.id });
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(name, image_url))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    log.done(500, 'Error fetching orders', { error: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log.done(200, 'Orders fetched', { count: data.length });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const log = createRequestLogger(request);
  const user = await getAuthUser();

  if (!user) {
    log.done(401, 'No autenticado');
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  // Rate limiting: 5 requests por minuto por usuario
  const { success: withinLimit, remaining } = orderRateLimiter.check(5, user.id);
  if (!withinLimit) {
    log.done(429, 'Rate limit exceeded', { userId: user.id });
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Inténtalo de nuevo en un momento.' },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    log.done(400, 'Validation failed', { errors: parsed.error.flatten() });
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { items, idempotency_key } = parsed.data;
  const supabase = createAdminClient();

  // Idempotency check
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('*')
    .eq('idempotency_key', idempotency_key)
    .single();

  if (existingOrder) {
    log.done(200, 'Idempotent hit — returning existing order', {
      orderId: existingOrder.id,
    });
    return NextResponse.json(existingOrder);
  }

  // Fetch products and verify stock
  const productIds = items.map((i) => i.product_id);
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, price, stock, name')
    .in('id', productIds);

  if (productsError || !products) {
    log.done(500, 'Error verifying products', { error: productsError?.message });
    return NextResponse.json(
      { error: 'Error al verificar productos' },
      { status: 500 }
    );
  }

  const productMap = new Map(products.map((p) => [p.id, p]));

  // Validate all items have valid products and sufficient stock
  for (const item of items) {
    const product = productMap.get(item.product_id);
    if (!product) {
      log.done(400, 'Product not found', { productId: item.product_id });
      return NextResponse.json(
        { error: `Producto ${item.product_id} no encontrado` },
        { status: 400 }
      );
    }
    if (product.stock < item.quantity) {
      log.done(400, 'Insufficient stock', {
        productId: item.product_id,
        requested: item.quantity,
        available: product.stock,
      });
      return NextResponse.json(
        {
          error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}`,
        },
        { status: 400 }
      );
    }
  }

  // Calculate total
  const total = items.reduce((sum, item) => {
    const product = productMap.get(item.product_id)!;
    return sum + product.price * item.quantity;
  }, 0);

  // Create order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      user_id: user.id,
      total: Math.round(total * 100) / 100,
      idempotency_key,
    })
    .select()
    .single();

  if (orderError) {
    log.done(500, 'Error creating order', { error: orderError.message });
    return NextResponse.json(
      { error: 'Error al crear pedido' },
      { status: 500 }
    );
  }

  // Create order items
  const orderItems = items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    quantity: item.quantity,
    unit_price: productMap.get(item.product_id)!.price,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    log.done(500, 'Error creating order items — rolled back', {
      error: itemsError.message,
    });
    return NextResponse.json(
      { error: 'Error al crear items del pedido' },
      { status: 500 }
    );
  }

  // Decrement stock
  for (const item of items) {
    const { error: stockError } = await supabase.rpc('decrement_stock', {
      p_id: item.product_id,
      qty: item.quantity,
    });

    if (stockError) {
      // Rollback: delete order (cascades to items)
      await supabase.from('orders').delete().eq('id', order.id);
      log.done(400, 'Stock decrement failed — rolled back', {
        productId: item.product_id,
      });
      return NextResponse.json(
        { error: `Stock insuficiente para un producto` },
        { status: 400 }
      );
    }
  }

  log.done(201, 'Order created', {
    orderId: order.id,
    total: order.total,
    itemCount: items.length,
    rateLimitRemaining: remaining,
  });
  return NextResponse.json(order, { status: 201 });
}
