'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function AuthCodeHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    if (!code) return;

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!error) {
        // Limpiar el code de la URL y refrescar
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        router.replace(url.pathname + url.search);
        router.refresh();
      }
    });
  }, [code, router]);

  return null;
}
