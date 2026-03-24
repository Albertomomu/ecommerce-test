'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const AUTH_ERRORS: Record<string, string> = {
  'Email not confirmed': 'Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
  'Invalid login credentials': 'Email o contraseña incorrectos.',
  'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos.',
  'User not found': 'No existe una cuenta con ese email.',
};

function translateError(msg: string): string {
  return AUTH_ERRORS[msg] || msg;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(translateError(error.message));
      setLoading(false);
      return;
    }

    toast.success('Sesión iniciada');
    router.push('/');
    router.refresh();
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/api/v1/auth/callback`,
      },
    });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-8">
      <div className="w-full max-w-[360px] space-y-10">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-[-0.01em]">Iniciar sesión</h1>
          <p className="text-sm text-muted-foreground">
            Accede a tu cuenta para gestionar pedidos
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent border-b border-[#cfc4c5] pb-2 text-sm text-foreground placeholder:text-[#cfc4c5] focus:border-foreground focus:outline-none transition-colors duration-200"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent border-b border-[#cfc4c5] pb-2 text-sm text-foreground focus:border-foreground focus:outline-none transition-colors duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-foreground text-background py-3.5 font-label text-[11px] font-medium tracking-[0.2em] uppercase transition-all duration-200 hover:bg-[#1b1b1b] disabled:opacity-40"
          >
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="relative py-1">
          <div className="border-t border-[#e3e2df]" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 font-label text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
            o continúa con
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => handleOAuth('google')}
            className="border border-[#e3e2df] py-2.5 font-label text-[10px] font-medium tracking-[0.15em] uppercase text-foreground hover:bg-surface-container-low transition-colors duration-200"
          >
            Google
          </button>
          <button
            onClick={() => handleOAuth('github')}
            className="border border-[#e3e2df] py-2.5 font-label text-[10px] font-medium tracking-[0.15em] uppercase text-foreground hover:bg-surface-container-low transition-colors duration-200"
          >
            GitHub
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="font-medium text-foreground border-b border-foreground pb-0.5">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
