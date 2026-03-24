'use client';

import {
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import type { Product, ProductsResponse } from '@/types';

type ProductFilters = {
  search?: string;
  category?: string;
  min_price?: number;
  max_price?: number;
};

async function fetchProducts(
  filters: ProductFilters,
  cursor?: string
): Promise<ProductsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category) params.set('category', filters.category);
  if (filters.min_price !== undefined)
    params.set('min_price', String(filters.min_price));
  if (filters.max_price !== undefined)
    params.set('max_price', String(filters.max_price));
  if (cursor) params.set('cursor', cursor);

  const res = await fetch(`/api/v1/products?${params.toString()}`);
  if (!res.ok) throw new Error('Error al cargar productos');
  return res.json();
}

export function useInfiniteProducts(filters: ProductFilters) {
  return useInfiniteQuery({
    queryKey: ['products', filters],
    queryFn: ({ pageParam }) => fetchProducts(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

async function fetchProduct(id: string): Promise<Product> {
  const res = await fetch(`/api/v1/products/${id}`);
  if (!res.ok) throw new Error('Producto no encontrado');
  return res.json();
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  });
}
