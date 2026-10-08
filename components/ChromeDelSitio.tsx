"use client";
import { usePathname } from "next/navigation";
import { HeaderNav } from "./HeaderNav";
import Link from "next/link";
import { LogoClub } from "./LogoClub";
export function ChromeDelSitio({children}:{children:React.ReactNode}) {
  const pathname=usePathname();
  if(pathname?.endsWith("/pantalla"))return <>{children}</>;
  return <div className="site-shell flex min-h-screen flex-col">
    <a href="#contenido" className="skip-link">Saltar al contenido</a>
    <header className="site-header"><HeaderNav /></header>
    <main id="contenido" tabIndex={-1} className="site-content site-width flex-1 py-8 sm:py-10">{children}</main>
    <footer className="site-footer"><div className="site-width flex flex-col justify-between gap-5 py-7 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><LogoClub claseTam="h-8 w-8" /><div><p className="text-sm font-semibold text-zinc-200">Atlántida Ajedrez</p><p className="mt-1 text-xs text-zinc-500">Una comunidad alrededor del tablero.</p></div></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-zinc-400"><Link href="/jugar">Jugar</Link><Link href="/noticias">Noticias</Link><Link href="/torneos">Torneos</Link><Link href="/jugadores">Jugadores</Link><Link href="/privacidad">Privacidad y contacto</Link></div></div></footer>
  </div>;
}
