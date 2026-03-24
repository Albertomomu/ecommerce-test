'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useProduct } from '@/lib/queries/products';
import { useCartStore } from '@/lib/store/cart';
import { toast } from 'sonner';

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: product, isLoading, error } = useProduct(id);
  const addItem = useCartStore((s) => s.addItem);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] px-8 py-12">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="aspect-[3/4] animate-pulse bg-surface-container-low" />
          <div className="p-12 space-y-6">
            <div className="h-4 w-1/4 animate-pulse bg-surface-container-low" />
            <div className="h-10 w-2/3 animate-pulse bg-surface-container-low" />
            <div className="h-6 w-1/4 animate-pulse bg-surface-container-low" />
            <div className="h-24 animate-pulse bg-surface-container-low" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-[1400px] px-8 py-24 text-center">
        <p className="text-lg text-muted-foreground">Producto no encontrado</p>
        <Link
          href="/"
          className="inline-block mt-6 font-label text-[11px] font-medium tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground border-b border-transparent hover:border-foreground transition-all duration-200"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const handleAdd = () => {
    if (product.stock <= 0) {
      toast.error('Producto sin stock');
      return;
    }
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      stock: product.stock,
    });
    toast.success('Añadido al carrito');
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Back link */}
      <div className="px-8 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-label text-[11px] font-medium tracking-[0.12em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          <ArrowLeft className="size-3.5" />
          Volver
        </Link>
      </div>

      <div className="grid md:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>

        {/* Product info */}
        <div className="px-8 md:px-16 py-12 flex flex-col">
          <p className="font-label text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
            {product.category}
          </p>

          <h1 className="mt-4 text-3xl font-bold tracking-[-0.01em] text-foreground leading-tight">
            {product.name}
          </h1>

          <p className="mt-4 font-label text-xl font-medium text-foreground">
            {product.price.toFixed(2)}&euro;
          </p>

          <p className="mt-6 text-sm text-muted-foreground leading-relaxed">
            {product.description}
          </p>

          {/* Stock info */}
          <div className="mt-6">
            {product.stock <= 0 ? (
              <p className="font-label text-[10px] tracking-[0.15em] uppercase text-[#ba1a1a]">
                Agotado
              </p>
            ) : product.stock <= 5 ? (
              <p className="font-label text-[10px] tracking-[0.15em] uppercase text-[#ba1a1a]">
                Quedan {product.stock} unidades
              </p>
            ) : (
              <p className="font-label text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
                {product.stock} en stock
              </p>
            )}
          </div>

          {/* Add to cart button - strict square, black */}
          <button
            onClick={handleAdd}
            disabled={product.stock <= 0}
            className="mt-8 w-full bg-foreground text-background py-4 font-label text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-200 hover:bg-[#1b1b1b] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {product.stock <= 0 ? 'Sin stock' : 'Añadir al carrito'}
          </button>

          {/* Product details accordion-style */}
          <div className="mt-auto pt-12 space-y-0">
            <div className="border-t border-[#e3e2df] py-4">
              <p className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground">
                Envío gratuito en pedidos +50&euro;
              </p>
            </div>
            <div className="border-t border-[#e3e2df] py-4">
              <p className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground">
                Devoluciones gratuitas en 30 días
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
