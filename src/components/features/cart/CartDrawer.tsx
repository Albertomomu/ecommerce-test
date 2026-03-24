'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useCartStore } from '@/lib/store/cart';
import { CartItem } from './CartItem';
import { CartSummary } from './CartSummary';
import { ShoppingBag } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CartDrawer({ open, onOpenChange }: Props) {
  const items = useCartStore((s) => s.items);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 bg-[#faf9f6] border-l border-[#e3e2df] [&>button]:hidden">
        <SheetHeader className="px-8 py-6">
          <SheetTitle className="font-label text-[11px] font-medium tracking-[0.2em] uppercase">
            Carrito ({items.length})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
            <ShoppingBag className="size-10 opacity-15" />
            <p className="text-sm">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
              {items.map((item) => (
                <CartItem key={item.product_id} item={item} />
              ))}
            </div>
            <CartSummary onClose={() => onOpenChange(false)} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
