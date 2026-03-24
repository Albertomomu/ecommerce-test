'use client';

import { useEffect, useState, forwardRef } from 'react';
import { Search } from 'lucide-react';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export const SearchBar = forwardRef<HTMLInputElement, Props>(function SearchBar({ value, onChange }, ref) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 300);
    return () => clearTimeout(timer);
  }, [local, value, onChange]);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <div className="relative">
      <Search className="absolute left-0 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <input
        ref={ref}
        placeholder="Buscar productos..."
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="w-full bg-transparent border-b border-[#cfc4c5] pl-7 pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none transition-colors duration-200"
      />
    </div>
  );
});
