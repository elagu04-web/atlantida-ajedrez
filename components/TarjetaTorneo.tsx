"use client";
import Link from "next/link";
import type { Torneo } from "@/lib/tournaments";
import { rondaActualDelTorneo, standingsConDesempates } from "@/lib/tournaments";
import { Icono } from "./Icono";

export function TarjetaTorneo({ torneo, nombreJugador, accion }: { torneo: Torneo; nombreJugador: (id: string) => string; accion?: React.ReactNode }) {
  const ronda = rondaActualDelTorneo(torneo);
  const huboJuego = torneo.rondas.some(r => r.emparejamientos.some(e => e.negrasId && e.resultado));
  const lider = huboJuego ? standingsConDesempates(torneo)[0] : null;
  const formato = torneo.formato === "round-robin" ? "Round robin" : torneo.formato === "suizo" ? "Sistema suizo" : "Match";
  return <article className="tournament-card group">
    <div className="flex items-start justify-between gap-3"><span className={`status-badge status-${torneo.estado}`}>{torneo.estado === "en_curso" && <span className="live-dot" />}{torneo.estado === "en_curso" ? "En curso" : torneo.estado === "armado" ? "Inscripción abierta" : "Finalizado"}</span><span className="text-xs text-zinc-400">{new Date(torneo.iniciadoEn ?? torneo.creadoEn).toLocaleDateString("es-UY",{day:"numeric",month:"short",year:"numeric"})}</span></div>
    <Link href={`/torneos/${torneo.id}`} className="card-main-link mt-5 block"><h3 className="text-lg font-semibold leading-snug tracking-tight text-white transition-colors group-hover:text-blue-300">{torneo.nombre}</h3><p className="mt-2 text-xs text-zinc-400">{formato}{torneo.formato === "round-robin" && torneo.idaYVuelta ? " · Ida y vuelta" : ""}</p></Link>
    <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-zinc-300"><span className="inline-flex items-center gap-1.5"><Icono nombre="personas" className="h-3.5 w-3.5 text-zinc-500" />{torneo.jugadoresIds.length} jugadores</span>{ronda && <span className="inline-flex items-center gap-1.5"><Icono nombre="reloj" className="h-3.5 w-3.5 text-zinc-500" />Ronda {ronda.numero}{torneo.formato !== "suizo" ? ` de ${torneo.rondas.length}` : ""}</span>}</div>
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/8 pt-4">
      <span className="min-w-0 text-xs text-zinc-400">{lider ? <><span className="text-amber-200">{nombreJugador(lider.jugadorId)}</span><span className="ml-2">{lider.puntos} pts · {torneo.estado === "finalizado" ? "1.ª posición" : "en la punta"}</span></> : torneo.estado === "armado" ? "Preparando la próxima competencia" : "Esperando los primeros resultados"}</span>
      <Icono nombre="flecha" className="h-4 w-4 shrink-0 text-blue-300 transition-transform group-hover:translate-x-1" />
    </div>
    {accion && <div className="relative z-10 mt-3 self-end">{accion}</div>}
  </article>;
}
