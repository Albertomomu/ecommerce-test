'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  { value: 'all', label: 'Todas' },
  { value: 'ropa', label: 'Ropa' },
  { value: 'calzado', label: 'Calzado' },
  { value: 'accesorios', label: 'Accesorios' },
];

export function Filters({ filters, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label>Categoría</Label>
        <Select
          value={filters.category || 'all'}
          onValueChange={(v) =>
            onChange({ ...filters, category: v === 'all' ? undefined : v })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Precio mín.</Label>
        <Input
          type="number"
          placeholder="0"
          className="w-[100px]"
          value={filters.min_price ?? ''}
          onChange={(e) =>
            onChange({
              ...filters,
              min_price: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>

      <div className="space-y-1.5">
        <Label>Precio máx.</Label>
        <Input
          type="number"
          placeholder="999"
          className="w-[100px]"
          value={filters.max_price ?? ''}
          onChange={(e) =>
            onChange({
              ...filters,
              max_price: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>

      {(filters.category || filters.min_price || filters.max_price) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
