'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-surface-container-low mt-24">
      <div className="mx-auto max-w-[1400px] px-8 py-16">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          <div className="space-y-4">
            <p className="font-label text-xs font-medium tracking-[0.3em] uppercase">
              PLOOT
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[240px]">
              Una colección curada de piezas atemporales diseñadas para la longevidad y la utilidad sin esfuerzo.
            </p>
          </div>

          <div className="space-y-4">
            <p className="font-label text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
              Colecciones
            </p>
            <div className="flex flex-col gap-2.5">
              <Link href="/?category=ropa" className="text-sm text-foreground hover:text-muted-foreground transition-colors duration-200">
                Ropa
              </Link>
              <Link href="/?category=calzado" className="text-sm text-foreground hover:text-muted-foreground transition-colors duration-200">
                Calzado
              </Link>
              <Link href="/?category=accesorios" className="text-sm text-foreground hover:text-muted-foreground transition-colors duration-200">
                Accesorios
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <p className="font-label text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
              Información
            </p>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm text-foreground">Envíos y devoluciones</span>
              <span className="text-sm text-foreground">Guía de tallas</span>
              <span className="text-sm text-foreground">Cuidado de prendas</span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="font-label text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground">
              Contacto
            </p>
            <div className="flex flex-col gap-2.5">
              <span className="text-sm text-foreground">info@ploot.com</span>
              <span className="text-sm text-foreground">+34 900 000 000</span>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[#e3e2df]">
          <p className="font-label text-[10px] tracking-[0.15em] uppercase text-muted-foreground">
            &copy; {new Date().getFullYear()} PLOOT. El Archivo Digital.
          </p>
        </div>
      </div>
    </footer>
  );
}
