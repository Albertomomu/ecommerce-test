import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { Header } from "@/components/features/catalog/Header";
import { Footer } from "@/components/features/catalog/Footer";
import { AuthCodeHandler } from "@/components/features/auth/AuthCodeHandler";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PLOOT | El Archivo Digital",
  description: "Una colección curada de piezas atemporales diseñadas para la longevidad y la utilidad sin esfuerzo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Suspense>
            <AuthCodeHandler />
          </Suspense>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster richColors position="bottom-right" />
        </Providers>
      </body>
    </html>
  );
}
