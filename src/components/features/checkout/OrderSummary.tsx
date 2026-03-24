'use client';

import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/lib/store/cart';

export function OrderSummary() {
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);

  return (
    <div className="rounded-lg border p-6 space-y-4 h-fit">
      <h2 className="text-lg font-bold">Resumen del pedido</h2>
      <Separator />

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.product_id} className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded bg-muted">
              {item.image_url && (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">x{item.quantity}</p>
            </div>
            <span className="text-sm font-medium">
              {(item.price * item.quantity).toFixed(2)}&euro;
            </span>
          </div>
        ))}
      </div>

      <Separator />
      <div className="flex items-center justify-between text-lg font-bold">
        <span>Total</span>
        <span>{totalPrice().toFixed(2)}&euro;</span>
      </div>
    </div>
  );
}
