'use client';

import { useCartStore } from '@/lib/store/cart';
import { CheckoutForm } from '@/components/features/checkout/CheckoutForm';
import { OrderSummary } from '@/components/features/checkout/OrderSummary';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 gap-4">
        <ShoppingBag className="size-16 text-muted-foreground opacity-20" />
        <p className="text-lg text-muted-foreground">Tu carrito está vacío</p>
        <Button asChild>
          <Link href="/">Ir al catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Checkout</h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <CheckoutForm />
        <OrderSummary />
      </div>
    </div>
  );
}
