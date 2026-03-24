'use client';

import { use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useProduct } from '@/lib/queries/products';
import { useCartStore } from '@/lib/store/cart';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="aspect-square animate-pulse rounded-lg bg-muted" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-20 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-lg text-muted-foreground">Producto no encontrado</p>
        <Button variant="ghost" asChild className="mt-4">
          <Link href="/">Volver al catálogo</Link>
        </Button>
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

  const categoryLabel: Record<string, string> = {
    ropa: 'Ropa',
    calzado: 'Calzado',
    accesorios: 'Accesorios',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/">
          <ArrowLeft className="size-4" />
          Volver al catálogo
        </Link>
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Sin imagen
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {categoryLabel[product.category] || product.category}
            </Badge>
            {product.stock <= 0 ? (
              <Badge variant="destructive">Agotado</Badge>
            ) : product.stock <= 5 ? (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Quedan {product.stock}
              </Badge>
            ) : (
              <Badge variant="outline">{product.stock} en stock</Badge>
            )}
          </div>

          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-2xl font-bold">{product.price.toFixed(2)}&euro;</p>
          <p className="text-muted-foreground leading-relaxed">
            {product.description}
          </p>

          <Button
            size="lg"
            className="w-full md:w-auto"
            onClick={handleAdd}
            disabled={product.stock <= 0}
          >
            <ShoppingCart className="size-5" />
            Añadir al carrito
          </Button>
        </div>
      </div>
    </div>
  );
}
