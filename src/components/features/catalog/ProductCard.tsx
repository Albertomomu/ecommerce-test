'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/store/cart';
import type { Product } from '@/types';
import { toast } from 'sonner';

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <Link href={`/products/${product.id}`} className="group block">
      {/* Image container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Sin imagen
          </div>
        )}

        {/* Quick add on hover */}
        <button
          onClick={handleAdd}
          disabled={product.stock <= 0}
          className="absolute bottom-4 left-4 right-4 bg-foreground text-background py-2.5 font-label text-[10px] font-medium tracking-[0.15em] uppercase text-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 disabled:opacity-50"
        >
          {product.stock <= 0 ? 'Agotado' : 'Añadir al carrito'}
        </button>
      </div>

      {/* Product info */}
      <div className="pt-4 pb-6 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-medium leading-tight line-clamp-2 text-foreground">
            {product.name}
          </h3>
          <span className="font-label text-sm font-medium text-foreground shrink-0">
            {product.price.toFixed(2)}&euro;
          </span>
        </div>
        <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
          {product.category}
        </p>
        {product.stock > 0 && product.stock <= 5 && (
          <p className="font-label text-[10px] tracking-[0.1em] uppercase text-[#ba1a1a]">
            Quedan {product.stock}
          </p>
        )}
      </div>
    </Link>
  );
}
