'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  return (
    <Suspense>
      <CatalogContent />
    </Suspense>
  );
}

function CatalogContent() {
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get('category') || undefined;

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<FiltersState>({
    category: urlCategory,
  });
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, category: urlCategory }));
  }, [urlCategory]);

  useEffect(() => {
    const handler = () => {
      setShowSearch(true);
      setTimeout(() => searchRef.current?.focus(), 100);
    };
    window.addEventListener('open-search', handler);
    return () => window.removeEventListener('open-search', handler);
  }, []);

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
    <div>
      {/* Hero Section */}
      <section className="mx-auto max-w-[1400px] px-8 pt-20 pb-16">
        <div className="max-w-[720px]">
          <p className="font-label text-[10px] font-medium tracking-[0.25em] uppercase text-muted-foreground mb-6">
            Colección Primavera / Verano 2026
          </p>
          <h1 className="text-[3.5rem] font-bold leading-[1.05] tracking-[-0.02em] text-foreground">
            Un estudio en materiales duraderos y siluetas refinadas
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-[540px]">
            Una colección curada de piezas atemporales diseñadas para la longevidad y la utilidad sin esfuerzo.
          </p>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="mx-auto max-w-[1400px] px-8 pb-12">
        <div className="flex items-center justify-between gap-8">
          <Filters filters={filters} onChange={setFilters} />

          <button
            onClick={() => setShowSearch(!showSearch)}
            className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            {showSearch ? 'Cerrar' : 'Buscar'}
          </button>
        </div>

        {showSearch && (
          <div className="mt-6">
            <SearchBar ref={searchRef} value={search} onChange={setSearch} />
          </div>
        )}
      </section>

      {/* Product Grid */}
      <section className="mx-auto max-w-[1400px] px-8 pb-16">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-[2px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] animate-pulse bg-surface-container-low"
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
      </section>
    </div>
  );
}
