'use client';

import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/lib/store/cart';
import type { CartItem as CartItemType } from '@/types';

export function CartItem({ item }: { item: CartItemType }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="flex gap-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            N/A
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1">
        <p className="text-sm font-medium leading-tight line-clamp-2">
          {item.name}
        </p>
        <p className="text-sm font-bold">{item.price.toFixed(2)}&euro;</p>

        <div className="flex items-center gap-1 mt-auto">
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
          >
            <Minus className="size-3" />
          </Button>
          <span className="w-8 text-center text-sm font-medium">
            {item.quantity}
          </span>
          <Button
            variant="outline"
            size="icon-xs"
            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
            disabled={item.quantity >= item.stock}
          >
            <Plus className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-auto text-destructive"
            onClick={() => removeItem(item.product_id)}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
