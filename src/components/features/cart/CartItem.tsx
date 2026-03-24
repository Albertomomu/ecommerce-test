'use client';

import Image from 'next/image';
import { Minus, Plus, X } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';
import type { CartItem as CartItemType } from '@/types';

export function CartItem({ item }: { item: CartItemType }) {
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  return (
    <div className="flex gap-4">
      <div className="relative size-20 shrink-0 overflow-hidden bg-surface-container-low">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.name}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            N/A
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-tight line-clamp-2 text-foreground">
            {item.name}
          </p>
          <button
            onClick={() => removeItem(item.product_id)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <p className="font-label text-sm font-medium text-foreground mt-1">
          {item.price.toFixed(2)}&euro;
        </p>

        <div className="flex items-center gap-3 mt-auto pt-2">
          <button
            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
            className="size-6 flex items-center justify-center border border-[#e3e2df] text-muted-foreground hover:text-foreground hover:border-foreground transition-all duration-200"
          >
            <Minus className="size-3" />
          </button>
          <span className="font-label text-xs font-medium w-4 text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
            disabled={item.quantity >= item.stock}
            className="size-6 flex items-center justify-center border border-[#e3e2df] text-muted-foreground hover:text-foreground hover:border-foreground transition-all duration-200 disabled:opacity-30"
          >
            <Plus className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
