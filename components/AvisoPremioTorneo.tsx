"use client";

import Link from "next/link";
import { useMiJugador } from "@/context/useMiJugador";
import { usePremiosTorneo } from "@/context/usePremiosTorneo";
import { nombreVisible } from "@/lib/players";
import { Icono } from "./Icono";

export function AvisoPremioTorneo() {
  const identidad = useMiJugador();
  const { premios, cargando, error } = usePremiosTorneo();
  if (cargando || error || identidad.cargando || identidad.error || identidad.ambigua || !identidad.jugador) return null;
  const propios = premios.filter(p => p.jugadorId === identidad.jugador!.id);
  const disponibles = propios.filter(p => p.estado === "disponible");
  const reservado = propios.find(p => p.destino?.estado === "armado" || p.destino?.estado === "en_curso");
  const premio = disponibles[0] ?? reservado;
  if (!premio) return null;
  const nombre = nombreVisible(identidad.jugador);
  const destino = disponibles.length > 0 ? "/torneos" : "/torneos/" + premio.destino!.id;
  return (
    <aside aria-label="Tu premio de campeón" className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4 sm:gap-4">
      <span className="rounded-xl bg-amber-300/10 p-2.5 text-amber-200"><Icono nombre="trofeo" className="h-6 w-6" /></span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-100">{disponibles.length > 1 ? nombre + ", tenés " + disponibles.length + " torneos gratis" : disponibles.length ? nombre + ", tu próximo torneo es gratis" : nombre + ", jugás gratis en " + premio.destino!.nombre}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-400">Premio por ganar <Link href={"/torneos/" + premio.origen.id} className="text-amber-200 underline decoration-amber-200/30 underline-offset-2">{premio.origen.nombre}</Link>. {disponibles.length ? "Se aplica al anotarte." : premio.estado === "reservado" ? "Ya está reservado en tu inscripción." : "El beneficio ya está aplicado."}</p>
      </div>
      <Link href={destino} className="rounded-lg border border-amber-300/25 px-3 py-2 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-300/10">{disponibles.length ? "Ver próximos torneos" : "Ver mi torneo"} →</Link>
    </aside>
  );
}