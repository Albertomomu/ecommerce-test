'use client';

import Link from 'next/link';
import { useCartStore } from '@/lib/store/cart';

export function CartSummary({ onClose }: { onClose: () => void }) {
  const totalPrice = useCartStore((s) => s.totalPrice);

  return (
    <div className="border-t border-[#e3e2df] px-8 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground">
          Total
        </span>
        <span className="font-label text-base font-medium text-foreground">
          {totalPrice().toFixed(2)}&euro;
        </span>
      </div>
      <Link
        href="/checkout"
        onClick={onClose}
        className="block w-full bg-foreground text-background py-3.5 font-label text-[11px] font-medium tracking-[0.2em] uppercase text-center transition-all duration-200 hover:bg-[#1b1b1b]"
      >
        Ir al checkout
      </Link>
    </div>
  );
}
