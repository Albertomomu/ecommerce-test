'use client';

import { useCartStore } from '@/lib/store/cart';
import { CheckoutForm } from '@/components/features/checkout/CheckoutForm';
import { OrderSummary } from '@/components/features/checkout/OrderSummary';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-8 gap-6">
        <ShoppingBag className="size-12 text-muted-foreground opacity-15" />
        <p className="text-sm text-muted-foreground">Tu carrito está vacío</p>
        <Link
          href="/"
          className="bg-foreground text-background px-8 py-3 font-label text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-200 hover:bg-[#1b1b1b]"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-12">
      <h1 className="text-3xl font-bold tracking-[-0.01em] mb-12">Checkout</h1>
      <div className="grid gap-16 lg:grid-cols-[1fr_400px]">
        <CheckoutForm />
        <OrderSummary />
      </div>
    </div>
  );
}
