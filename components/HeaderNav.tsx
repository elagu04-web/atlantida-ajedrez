"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthWidget } from "./AuthWidget";
import { useAuth } from "@/context/AuthContext";
import { LogoClub } from "./LogoClub";
import { BusquedaRapida } from "./BusquedaRapida";
import { Icono } from "./Icono";
const navLinks = [{href:"/",label:"Inicio"},{href:"/torneos",label:"Torneos"},{href:"/jugadores",label:"Jugadores"},{href:"/estadisticas",label:"Estadísticas"},{href:"/transmision",label:"En directo"},{href:"/actividad",label:"Actividad"}];
const gestion = [{href:"/colegio",label:"Colegio Pinares"},{href:"/epico",label:"Épico"},{href:"/entrenamiento",label:"Entrenamiento"}];
export function HeaderNav() {
  const [abierto,setAbierto]=useState(false);const pathname=usePathname();const {esAdmin}=useAuth();
  const activo=(href:string)=>href==="/"?pathname==="/":pathname===href||pathname.startsWith(`${href}/`);
  useEffect(()=>{function cerrar(e:KeyboardEvent){if(e.key==="Escape")setAbierto(false);}document.addEventListener("keydown",cerrar);return()=>document.removeEventListener("keydown",cerrar);},[]);
  const links=esAdmin?[...navLinks,...gestion]:navLinks;
  return <div className="site-width">
    <div className="flex min-h-20 items-center justify-between gap-4">
      <Link href="/" className="brand" onClick={()=>setAbierto(false)}><span className="brand-mark"><LogoClub claseTam="h-8 w-8" /></span><span><span className="block text-sm font-bold tracking-tight sm:text-base">Atlántida Ajedrez</span><span className="mt-0.5 block text-[9px] font-medium uppercase tracking-[0.2em] text-zinc-400">El club, jugada a jugada</span></span></Link>
      <nav aria-label="Navegación principal" className="hidden items-center gap-0.5 lg:flex">{navLinks.map(link=><Link key={link.href} href={link.href} aria-current={activo(link.href)?"page":undefined} className={`nav-link ${activo(link.href)?"nav-active":""}`}>{link.label}</Link>)}</nav>
      <div className="flex items-center gap-2"><BusquedaRapida /><div className="hidden lg:block"><AuthWidget /></div><button type="button" onClick={()=>setAbierto(v=>!v)} aria-label={abierto?"Cerrar menú":"Abrir menú"} aria-expanded={abierto} aria-controls="menu-movil" className="icon-button lg:hidden"><Icono nombre={abierto?"cerrar":"menu"} /></button></div>
    </div>
    {esAdmin&&<nav aria-label="Gestión del club" className="hidden items-center gap-2 border-t border-white/8 py-2 lg:flex"><span className="mr-2 text-[10px] uppercase tracking-widest text-zinc-500">Gestión</span>{gestion.map(link=><Link key={link.href} href={link.href} className={`nav-link ${activo(link.href)?"nav-active":""}`} aria-current={activo(link.href)?"page":undefined}>{link.label}</Link>)}</nav>}
    {abierto&&<nav id="menu-movil" aria-label="Navegación móvil" className="mobile-menu lg:hidden">{links.map(link=><Link key={link.href} href={link.href} onClick={()=>setAbierto(false)} aria-current={activo(link.href)?"page":undefined} className={`nav-link ${activo(link.href)?"nav-active":""}`}>{link.label}<Icono nombre="flecha" className="h-4 w-4" /></Link>)}<div className="mt-3 border-t border-white/10 pt-4"><AuthWidget /></div></nav>}
  </div>;
}
