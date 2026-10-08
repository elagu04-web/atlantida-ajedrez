"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useTorneos } from "@/context/TorneosContext";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { nombreVisible } from "@/lib/players";
import { Icono } from "./Icono";

const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function BusquedaRapida() {
  const dialogo = useRef<HTMLDialogElement>(null);
  const campo = useRef<HTMLInputElement>(null);
  const [consulta, setConsulta] = useState("");
  const id = useId();
  const { torneos } = useTorneos();
  const jugadores = useJugadoresEnVivo();
  function abrir() { setConsulta(""); dialogo.current?.showModal(); campo.current?.focus(); }
  useEffect(() => {
    function atajo(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setConsulta(""); dialogo.current?.showModal(); campo.current?.focus(); }
    }
    document.addEventListener("keydown", atajo);
    return () => document.removeEventListener("keydown", atajo);
  }, []);
  const q = normalizar(consulta.trim());
  const resultados = q ? [
    ...jugadores.filter(j => normalizar(`${j.nombre} ${j.apodo ?? ""}`).includes(q)).map(j => ({href:`/jugadores/${j.id}`, titulo:nombreVisible(j), detalle:`Jugador · Elo ${j.eloAtlantida}`, icono:"personas" as const})),
    ...torneos.filter(t => normalizar(t.nombre).includes(q)).map(t => ({href:`/torneos/${t.id}`, titulo:t.nombre, detalle:"Torneo",icono:"trofeo" as const})),
  ].slice(0, 8) : [
    {href:"/jugar",titulo:"Jugar contra el bot",detalle:"Práctica, pistas y revancha",icono:"idea" as const},
    {href:"/torneos",titulo:"Explorar torneos",detalle:"Calendarios y posiciones",icono:"trofeo" as const},
    {href:"/jugadores",titulo:"Ver jugadores",detalle:"Ranking e historial Elo",icono:"personas" as const},
    {href:"/estadisticas",titulo:"Consultar estadísticas",detalle:"Evolución y campeones",icono:"grafico" as const},
  ];
  return <>
    <button type="button" onClick={abrir} aria-label="Buscar jugadores y torneos" className="search-trigger"><Icono nombre="buscar" className="h-4 w-4" /><span className="hidden xl:inline">Buscar</span><kbd className="hidden xl:inline">Ctrl K</kbd></button>
    <dialog ref={dialogo} aria-labelledby={`${id}-titulo`} className="search-dialog" onClick={e => { if(e.target === e.currentTarget) dialogo.current?.close(); }}>
      <div className="flex items-center justify-between px-5 pb-3 pt-5"><h2 id={`${id}-titulo`} className="text-sm font-semibold">Encontrá tu próxima partida</h2><button type="button" aria-label="Cerrar búsqueda" onClick={() => dialogo.current?.close()} className="icon-button"><Icono nombre="cerrar" className="h-4 w-4" /></button></div>
      <div className="mx-5 flex items-center gap-3 rounded-xl border border-white/15 bg-zinc-950 px-4"><Icono nombre="buscar" className="h-5 w-5 text-blue-300" /><input ref={campo} aria-label="Nombre de jugador o torneo" value={consulta} onChange={e => setConsulta(e.target.value)} placeholder="Jugador, apodo o torneo…" className="min-w-0 flex-1 border-0 bg-transparent py-4 text-sm outline-none" onKeyDown={e => { if(e.key === "ArrowDown") { e.preventDefault(); dialogo.current?.querySelector<HTMLAnchorElement>("a")?.focus(); } }} /></div>
      <div className="p-3" aria-live="polite">{resultados.length ? resultados.map(r => <Link key={r.href} href={r.href} onClick={() => dialogo.current?.close()} className="search-result"><span className="feature-icon"><Icono nombre={r.icono} /></span><span className="min-w-0 flex-1"><span className="block font-medium">{r.titulo}</span><span className="text-xs text-zinc-400">{r.detalle}</span></span><Icono nombre="flecha" className="h-4 w-4 text-zinc-400" /></Link>) : <p className="p-6 text-center text-sm text-zinc-400">Sin coincidencias. Probá otro nombre.</p>}</div>
      <p className="border-t border-white/8 px-5 py-3 text-xs text-zinc-500">Tab para recorrer · Enter para abrir · Esc para cerrar</p>
    </dialog>
  </>;
}
