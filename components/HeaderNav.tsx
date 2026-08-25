"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthWidget } from "@/components/AuthWidget";
import { useAuth } from "@/context/AuthContext";

const navLinks = [
  { href: "/jugadores", label: "Jugadores" },
  { href: "/torneos", label: "Torneos" },
  { href: "/estadisticas", label: "Estadísticas" },
  { href: "/transmision", label: "Transmisión" },
  { href: "/actividad", label: "Actividad" },
];

export function HeaderNav() {
  const [abierto, setAbierto] = useState(false);
  const pathname = usePathname();
  const { esAdmin } = useAuth();
  const links = esAdmin
    ? [
        ...navLinks,
        { href: "/colegio", label: "Colegio Pinares" },
        { href: "/epico", label: "Épico" },
        { href: "/entrenamiento", label: "Entrenamiento" },
      ]
    : navLinks;

  return (
    <div className="mx-auto max-w-5xl px-6">
      <div className="flex items-center justify-between py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight" onClick={() => setAbierto(false)}>
          ♞ Atlántida Ajedrez
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-medium text-zinc-600 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                pathname === link.href
                  ? "font-semibold text-zinc-900"
                  : "hover:text-zinc-900"
              }
            >
              {link.label}
            </Link>
          ))}
          <AuthWidget />
        </nav>

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 md:hidden"
        >
          {abierto ? "✕" : "☰"}
        </button>
      </div>

      {abierto && (
        <nav className="flex flex-col gap-1 border-t border-zinc-200 pb-4 pt-2 text-sm font-medium text-zinc-600 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setAbierto(false)}
              className={
                pathname === link.href
                  ? "rounded-md px-2 py-2 font-semibold text-zinc-900"
                  : "rounded-md px-2 py-2 hover:bg-zinc-50 hover:text-zinc-900"
              }
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 border-t border-zinc-100 px-2 pt-3">
            <AuthWidget />
          </div>
        </nav>
      )}
    </div>
  );
}
