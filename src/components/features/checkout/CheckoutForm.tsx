'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/store/cart';
import { useCreateOrder } from '@/lib/queries/orders';
import { toast } from 'sonner';
import { z } from 'zod';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Nombre requerido'),
  address: z.string().min(5, 'Dirección requerida'),
  city: z.string().min(2, 'Ciudad requerida'),
  postalCode: z.string().min(4, 'Código postal requerido'),
});

export function CheckoutForm() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const createOrder = useCreateOrder();

  const [form, setForm] = useState({
    fullName: '',
    address: '',
    city: '',
    postalCode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    const idempotency_key = crypto.randomUUID();

    createOrder.mutate(
      {
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
        idempotency_key,
      },
      {
        onSuccess: () => {
          clearCart();
          toast.success('Pedido creado correctamente');
          router.push('/orders');
        },
        onError: (err) => {
          toast.error(err.message);
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <p className="font-label text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
        Datos de envío
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <label
            htmlFor="fullName"
            className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground"
          >
            Nombre completo
          </label>
          <input
            id="fullName"
            value={form.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            className="w-full bg-transparent border-b border-[#cfc4c5] pb-2 text-sm text-foreground focus:border-foreground focus:outline-none transition-colors duration-200"
          />
          {errors.fullName && (
            <p className="text-[10px] text-[#ba1a1a]">{errors.fullName}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="address"
            className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground"
          >
            Dirección
          </label>
          <input
            id="address"
            value={form.address}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full bg-transparent border-b border-[#cfc4c5] pb-2 text-sm text-foreground focus:border-foreground focus:outline-none transition-colors duration-200"
          />
          {errors.address && (
            <p className="text-[10px] text-[#ba1a1a]">{errors.address}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div className="space-y-2">
            <label
              htmlFor="city"
              className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground"
            >
              Ciudad
            </label>
            <input
              id="city"
              value={form.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="w-full bg-transparent border-b border-[#cfc4c5] pb-2 text-sm text-foreground focus:border-foreground focus:outline-none transition-colors duration-200"
            />
            {errors.city && (
              <p className="text-[10px] text-[#ba1a1a]">{errors.city}</p>
            )}
          </div>
          <div className="space-y-2">
            <label
              htmlFor="postalCode"
              className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground"
            >
              Código postal
            </label>
            <input
              id="postalCode"
              value={form.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              className="w-full bg-transparent border-b border-[#cfc4c5] pb-2 text-sm text-foreground focus:border-foreground focus:outline-none transition-colors duration-200"
            />
            {errors.postalCode && (
              <p className="text-[10px] text-[#ba1a1a]">{errors.postalCode}</p>
            )}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={createOrder.isPending}
        className="w-full bg-foreground text-background py-4 font-label text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-200 hover:bg-[#1b1b1b] disabled:opacity-40"
      >
        {createOrder.isPending ? 'Procesando...' : 'Confirmar pedido'}
      </button>
    </form>
  );
}
