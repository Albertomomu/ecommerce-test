'use client';

import Image from 'next/image';
import { useCartStore } from '@/lib/store/cart';

export function OrderSummary() {
  const items = useCartStore((s) => s.items);
  const totalPrice = useCartStore((s) => s.totalPrice);

  return (
    <div className="bg-surface-container-low p-8 h-fit space-y-6">
      <p className="font-label text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
        Resumen del pedido
      </p>

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.product_id} className="flex items-center gap-4">
            <div className="relative size-14 shrink-0 overflow-hidden bg-surface-container-high">
              {item.image_url && (
                <Image
                  src={item.image_url}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-foreground">
                {item.name}
              </p>
              <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
                x{item.quantity}
              </p>
            </div>
            <span className="font-label text-sm font-medium text-foreground">
              {(item.price * item.quantity).toFixed(2)}&euro;
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-[#e3e2df] pt-6 flex items-center justify-between">
        <span className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground">
          Total
        </span>
        <span className="font-label text-lg font-medium text-foreground">
          {totalPrice().toFixed(2)}&euro;
        </span>
      </div>
    </div>
  );
}
