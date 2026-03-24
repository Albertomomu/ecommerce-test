'use client';

import Link from 'next/link';
import { ShoppingBag, User, LogOut, Search } from 'lucide-react';
import { useCartStore } from '@/lib/store/cart';
import { CartDrawer } from '@/components/features/cart/CartDrawer';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function Header() {
  const totalItems = useCartStore((s) => s.totalItems);
  const [cartOpen, setCartOpen] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-50 bg-[#faf9f6]/80 backdrop-blur-[20px]">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-8">
        <Link
          href="/"
          className="font-label text-xs font-medium tracking-[0.3em] uppercase text-foreground"
        >
          PLOOT
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          <Link
            href="/?category=ropa"
            className="font-label text-[11px] font-medium tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Ropa
          </Link>
          <Link
            href="/?category=calzado"
            className="font-label text-[11px] font-medium tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Calzado
          </Link>
          <Link
            href="/?category=accesorios"
            className="font-label text-[11px] font-medium tracking-[0.15em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Accesorios
          </Link>
        </nav>

        <div className="flex items-center gap-6">
          <Search className="size-[18px] text-muted-foreground hover:text-foreground cursor-pointer transition-colors duration-200" />

          {user ? (
            <>
              <Link
                href="/orders"
                className="font-label text-[11px] font-medium tracking-[0.1em] uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Pedidos
              </Link>
              <button
                onClick={handleSignOut}
                className="text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                <LogOut className="size-[18px]" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <User className="size-[18px]" />
            </Link>
          )}

          <button
            className="relative text-muted-foreground hover:text-foreground transition-colors duration-200"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingBag className="size-[18px]" />
            {mounted && totalItems() > 0 && (
              <span className="absolute -top-2 -right-2 flex size-4 items-center justify-center bg-foreground text-[9px] font-label font-bold text-background">
                {totalItems()}
              </span>
            )}
          </button>

          <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
        </div>
      </div>
    </header>
  );
}
