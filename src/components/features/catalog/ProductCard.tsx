'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '@/lib/store/cart';
import type { Product } from '@/types';
import { toast } from 'sonner';

export function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);

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

  const categoryLabel: Record<string, string> = {
    ropa: 'Ropa',
    calzado: 'Calzado',
    accesorios: 'Accesorios',
  };

  return (
    <div className="group rounded-lg border bg-card overflow-hidden flex flex-col">
      <Link href={`/products/${product.id}`} className="relative aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Sin imagen
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1 gap-2">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary" className="text-xs">
            {categoryLabel[product.category] || product.category}
          </Badge>
          {product.stock <= 0 && (
            <Badge variant="destructive" className="text-xs">
              Agotado
            </Badge>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
              Quedan {product.stock}
            </Badge>
          )}
        </div>

        <Link href={`/products/${product.id}`}>
          <h3 className="font-medium leading-tight line-clamp-2 hover:underline">
            {product.name}
          </h3>
        </Link>

        <p className="text-sm text-muted-foreground line-clamp-1">
          {product.description}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-lg font-bold">{product.price.toFixed(2)}&euro;</span>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={product.stock <= 0}
          >
            <ShoppingCart className="size-4" />
            Añadir
          </Button>
        </div>
      </div>
    </div>
  );
}
