'use client';

import { useOrders } from '@/lib/queries/orders';
import Image from 'next/image';
import Link from 'next/link';
import { Package } from 'lucide-react';

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1400px] px-8 py-12 space-y-6">
        <h1 className="text-3xl font-bold tracking-[-0.01em]">Mis pedidos</h1>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse bg-surface-container-low" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="mx-auto max-w-[1400px] flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-8 gap-6">
        <Package className="size-12 text-muted-foreground opacity-15" />
        <p className="text-sm text-muted-foreground">No tienes pedidos aún</p>
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
    <div className="mx-auto max-w-[1400px] px-8 py-12 space-y-10">
      <h1 className="text-3xl font-bold tracking-[-0.01em]">Mis pedidos</h1>

      <div className="space-y-6">
        {orders.map((order) => {
          const statusLabel =
            statusLabels[order.status] || order.status;

          return (
            <div key={order.id} className="bg-surface-container-low p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground">
                    Pedido #{order.id.slice(0, 8)}
                  </p>
                  <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground">
                    {statusLabel}
                  </span>
                  <span className="font-label text-lg font-medium text-foreground">
                    {Number(order.total).toFixed(2)}&euro;
                  </span>
                </div>
              </div>

              <div className="border-t border-[#e3e2df] pt-6 space-y-4">
                {order.order_items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4"
                  >
                    <div className="relative size-12 shrink-0 overflow-hidden bg-surface-container-high">
                      {item.product?.image_url && (
                        <Image
                          src={item.product.image_url}
                          alt={item.product?.name || ''}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
                        {item.product?.name || 'Producto'}
                      </p>
                      <p className="font-label text-[10px] tracking-[0.1em] uppercase text-muted-foreground">
                        {item.quantity} x {Number(item.unit_price).toFixed(2)}&euro;
                      </p>
                    </div>
                    <span className="font-label text-sm font-medium text-foreground">
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
