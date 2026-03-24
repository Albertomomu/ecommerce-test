import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { productQuerySchema } from '@/lib/validations/product';

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = productQuerySchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Parámetros inválidos', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { search, category, min_price, max_price, cursor, limit } =
    parsed.data;

  const supabase = createAdminClient();

  let query = supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(limit + 1);

  if (search) {
    query = query.textSearch('name', search, {
      type: 'websearch',
      config: 'spanish',
    });
  }

  if (category) {
    query = query.eq('category', category);
  }

  if (min_price !== undefined) {
    query = query.gte('price', min_price);
  }

  if (max_price !== undefined) {
    query = query.lte('price', max_price);
  }

  if (cursor) {
    query = query.gt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const hasMore = data.length > limit;
  const products = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore
    ? products[products.length - 1].created_at
    : null;

  return NextResponse.json({ products, nextCursor });
}
