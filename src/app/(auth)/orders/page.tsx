'use client';

import { useOrders } from '@/lib/queries/orders';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  shipped: { label: 'Enviado', variant: 'outline' },
  delivered: { label: 'Entregado', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Mis pedidos</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 gap-4">
        <Package className="size-16 text-muted-foreground opacity-20" />
        <p className="text-lg text-muted-foreground">No tienes pedidos aún</p>
        <Button asChild>
          <Link href="/">Ir al catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Mis pedidos</h1>

      <div className="space-y-4">
        {orders.map((order) => {
          const status = statusLabels[order.status] || {
            label: order.status,
            variant: 'secondary' as const,
          };

          return (
            <div key={order.id} className="rounded-lg border p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-sm text-muted-foreground">
                    Pedido #{order.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <span className="text-lg font-bold">
                    {Number(order.total).toFixed(2)}&euro;
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                {order.order_items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3"
                  >
                    <div className="relative size-10 shrink-0 overflow-hidden rounded bg-muted">
                      {item.product?.image_url && (
                        <Image
                          src={item.product.image_url}
                          alt={item.product?.name || ''}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.product?.name || 'Producto'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x {Number(item.unit_price).toFixed(2)}&euro;
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {(item.quantity * Number(item.unit_price)).toFixed(2)}&euro;
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
