'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Order } from '@/types';

async function fetchOrders(): Promise<Order[]> {
  const res = await fetch('/api/v1/orders');
  if (!res.ok) throw new Error('Error al cargar pedidos');
  return res.json();
}

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: fetchOrders,
  });
}

type CreateOrderInput = {
  items: { product_id: string; quantity: number }[];
  idempotency_key: string;
};

async function createOrder(input: CreateOrderInput): Promise<Order> {
  const res = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Error al crear pedido');
  }
  return res.json();
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
