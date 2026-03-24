'use client';

import { useEffect, useRef } from 'react';

type Props = {
  onTrigger: () => void;
  hasMore: boolean;
  isLoading: boolean;
};

export function InfiniteScrollTrigger({ onTrigger, hasMore, isLoading }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onTrigger();
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [onTrigger, hasMore, isLoading]);

  if (!hasMore) return null;

  return (
    <div ref={ref} className="flex justify-center py-8">
      {isLoading && (
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      )}
    </div>
  );
}
