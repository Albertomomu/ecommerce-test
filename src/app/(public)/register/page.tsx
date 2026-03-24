'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success('Cuenta creada. Revisa tu email para confirmar.');
    router.push('/login');
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] items-center justify-center px-8">
      <div className="w-full max-w-[360px] space-y-10">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-[-0.01em]">Crear cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Regístrate para empezar a comprar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="fullName"
              className="font-label text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground"
            >
              Nombre completo
            </label>
            <input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full bg-transparent border-b border-[#cfc4c5] pb-2 text-sm text-foreground focus:border-foreground focus:outline-none transition-colors duration-200"
            />
          </div>
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
              minLength={6}
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
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="font-medium text-foreground border-b border-foreground pb-0.5">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
