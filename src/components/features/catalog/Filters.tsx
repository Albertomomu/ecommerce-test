'use client';

type FiltersState = {
  category?: string;
  min_price?: number;
  max_price?: number;
};

type Props = {
  filters: FiltersState;
  onChange: (filters: FiltersState) => void;
};

const CATEGORIES = [
  { value: undefined, label: 'Todo' },
  { value: 'ropa', label: 'Ropa' },
  { value: 'calzado', label: 'Calzado' },
  { value: 'accesorios', label: 'Accesorios' },
] as const;

const PRICE_RANGES = [
  { label: 'Todos', min: undefined, max: undefined },
  { label: '< 50\u20AC', min: undefined, max: 50 },
  { label: '50\u20AC - 100\u20AC', min: 50, max: 100 },
  { label: '100\u20AC - 200\u20AC', min: 100, max: 200 },
  { label: '> 200\u20AC', min: 200, max: undefined },
] as const;

export function Filters({ filters, onChange }: Props) {
  const activeCategory = filters.category;
  const activePriceMin = filters.min_price;
  const activePriceMax = filters.max_price;

  return (
    <div className="flex flex-wrap items-center gap-8">
      {/* Category chips */}
      <div className="flex items-center gap-6">
        {CATEGORIES.map((c) => {
          const isActive = activeCategory === c.value;
          return (
            <button
              key={c.label}
              onClick={() =>
                onChange({ ...filters, category: c.value })
              }
              className={`font-label text-[11px] font-medium tracking-[0.12em] uppercase pb-1 transition-all duration-200 ${
                isActive
                  ? 'text-foreground border-b border-foreground'
                  : 'text-muted-foreground hover:text-foreground border-b border-transparent'
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Price range chips */}
      <div className="flex items-center gap-6">
        {PRICE_RANGES.map((p) => {
          const isActive =
            activePriceMin === p.min && activePriceMax === p.max;
          return (
            <button
              key={p.label}
              onClick={() =>
                onChange({
                  ...filters,
                  min_price: p.min,
                  max_price: p.max,
                })
              }
              className={`font-label text-[11px] font-medium tracking-[0.12em] uppercase pb-1 transition-all duration-200 ${
                isActive
                  ? 'text-foreground border-b border-foreground'
                  : 'text-muted-foreground hover:text-foreground border-b border-transparent'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
