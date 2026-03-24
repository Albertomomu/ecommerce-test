'use client';

import { useState, useCallback } from 'react';
import { useInfiniteProducts } from '@/lib/queries/products';
import { SearchBar } from '@/components/features/catalog/SearchBar';
import { Filters } from '@/components/features/catalog/Filters';
import { ProductGrid } from '@/components/features/catalog/ProductGrid';
import { InfiniteScrollTrigger } from '@/components/features/catalog/InfiniteScrollTrigger';

type FiltersState = {
  category?: string;
  min_price?: number;
  max_price?: number;
};

export default function CatalogPage() {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FiltersState>({});

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteProducts({ search, ...filters });

  const products = data?.pages.flatMap((p) => p.products) ?? [];

  const handleFetchNext = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Catálogo</h1>
        <p className="text-muted-foreground">
          Explora nuestra colección de moda, calzado y accesorios
        </p>
      </div>

      <div className="space-y-4">
        <SearchBar value={search} onChange={setSearch} />
        <Filters filters={filters} onChange={setFilters} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : (
        <ProductGrid products={products} />
      )}

      <InfiniteScrollTrigger
        onTrigger={handleFetchNext}
        hasMore={!!hasNextPage}
        isLoading={isFetchingNextPage}
      />
    </div>
  );
}
