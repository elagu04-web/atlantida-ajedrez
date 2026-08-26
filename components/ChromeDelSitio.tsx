"use client";

import { usePathname } from "next/navigation";
import { HeaderNav } from "@/components/HeaderNav";

/**
 * Decide si se muestra el header/menú y el contenedor angosto de siempre,
 * o si la página ocupa toda la pantalla sin nada alrededor (pensado para
 * /pantalla, que se muestra en una TV y no debería tener márgenes ni menú).
 */
export function ChromeDelSitio({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pantallaCompleta = pathname?.endsWith("/pantalla") ?? false;

  if (pantallaCompleta) {
    return <>{children}</>;
  }

  return (
    <>
      <header className="border-b border-white/10 bg-white/5">
        <HeaderNav />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </>
  );
}
