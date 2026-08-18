import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { JugadoresProvider } from "@/context/JugadoresContext";
import { TorneosProvider } from "@/context/TorneosContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlántida Ajedrez",
  description: "Torneos, jugadores y estadísticas del club de ajedrez Atlántida",
};

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/jugadores", label: "Jugadores" },
  { href: "/torneos", label: "Torneos" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/transmision", label: "Transmisión" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              ♞ Atlántida Ajedrez
            </Link>
            <nav className="flex gap-5 text-sm font-medium text-zinc-600">
              {navLinks.slice(1).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="hover:text-zinc-900"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
          <JugadoresProvider>
            <TorneosProvider>{children}</TorneosProvider>
          </JugadoresProvider>
        </main>
      </body>
    </html>
  );
}
