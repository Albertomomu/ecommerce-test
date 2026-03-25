import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { productIdSchema } from '@/lib/validations/product';
import { createRequestLogger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const log = createRequestLogger(request);
  const { id } = await params;
  const parsed = productIdSchema.safeParse({ id });

  if (!parsed.success) {
    log.done(400, 'Invalid product ID', { id });
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    log.done(404, 'Product not found', { id });
    return NextResponse.json(
      { error: 'Producto no encontrado' },
      { status: 404 }
    );
  }

  log.done(200, 'Product fetched', { productId: id });
  return NextResponse.json(data);
}
