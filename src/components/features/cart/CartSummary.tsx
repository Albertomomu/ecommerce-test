'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '@/lib/store/cart';

export function CartSummary({ onClose }: { onClose: () => void }) {
  const totalPrice = useCartStore((s) => s.totalPrice);

  return (
    <div className="border-t px-6 py-4 space-y-3">
      <Separator />
      <div className="flex items-center justify-between text-base font-bold">
        <span>Total</span>
        <span>{totalPrice().toFixed(2)}&euro;</span>
      </div>
      <Button className="w-full" size="lg" asChild onClick={onClose}>
        <Link href="/checkout">Ir al checkout</Link>
      </Button>
    </div>
  );
}
