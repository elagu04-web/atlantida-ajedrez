"use client";
import { useState } from "react";
import Link from "next/link";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useJugadores } from "@/context/JugadoresContext";
import { useTorneos } from "@/context/TorneosContext";
import { nombreVisible } from "@/lib/players";
import { DesafioAjedrez } from "@/components/DesafioAjedrez";
import { TarjetaRetoCaballo } from "@/components/TarjetaRetoCaballo";
import { CarruselNoticias } from "@/components/CarruselNoticias";
import { noticiasRecientes } from "@/lib/noticias";
import { TarjetaTorneo } from "@/components/TarjetaTorneo";
import { Icono, type NombreIcono } from "@/components/Icono";
import { AgendaClub } from "@/components/AgendaClub";
import { MesaEstudioClub } from "@/components/MesaEstudioClub";
import { PrimeraVisitaClub } from "@/components/PrimeraVisitaClub";
import { CompartirInvitacion } from "@/components/CompartirInvitacion";
export function PaginaInicio() {
  const jugadores=useJugadoresEnVivo();
  const {cargando:cargandoJugadores,errorCarga:errorJugadores}=useJugadores();
  const {torneos,cargando:cargandoTorneos,errorCarga:errorTorneos}=useTorneos();
  const [vista,setVista]=useState<string | null>(null);
  const cargando=cargandoJugadores||cargandoTorneos;
  const recientes=[...torneos].sort((a,b)=>(b.iniciadoEn??b.creadoEn).localeCompare(a.iniciadoEn??a.creadoEn));
  const enCurso=torneos.filter(t=>t.estado==="en_curso").length;
  const proximos=torneos.filter(t=>t.estado==="armado").length;
  const vistaActiva=vista??(proximos>0?"armado":enCurso>0?"en_curso":"todos");
  const destacados=recientes.filter(t=>vistaActiva==="todos"||t.estado===vistaActiva).slice(0,3);
  const partidas=torneos.reduce((s,t)=>s+t.rondas.reduce((n,r)=>n+r.emparejamientos.filter(e=>e.negrasId&&e.resultado).length,0),0);
  const nombreJugador=(id:string)=>{const j=jugadores.find(j=>j.id===id);return j?nombreVisible(j):"Jugador";};
  return <div className="flex flex-col gap-10 sm:gap-14">
    <section className="home-hero home-welcome">
      <div className="hero-copy"><p className="eyebrow text-blue-300">Atlántida, jugada a jugada</p><h1>El ajedrez nos <span>mueve.</span></h1><p className="hero-description">Encontrá tu próximo torneo, seguí al club y jugá desde casa.</p></div>
      <div className="home-welcome-actions"><Link href="#competencia" className="button-primary">Ver torneos<Icono nombre="flecha" className="h-4 w-4"/></Link><Link href="/jugar" className="button-secondary">Jugar contra los bots</Link><p className="home-welcome-note">{cargandoTorneos?"Cargando torneos…":proximos?`${proximos} ${proximos===1?"torneo con inscripción abierta":"torneos con inscripción abierta"}`:enCurso?`${enCurso} ${enCurso===1?"torneo en curso":"torneos en curso"}`:"Nos vemos en el tablero."}</p><Link href="#sumate" className="text-link text-xs">¿Es tu primera vez? Te contamos cómo sumarte →</Link></div>
    </section>
    {(errorJugadores||errorTorneos)&&<p role="status" className="panel border-amber-500/30 p-4 text-sm text-amber-200">{errorJugadores||errorTorneos}</p>}
    <div className="home-main-grid">
    <section id="competencia" className="home-competition" aria-labelledby="titulo-competencia"><div className="section-heading"><div><p className="eyebrow mb-2 text-zinc-500">Tu próxima partida</p><h2 id="titulo-competencia">Torneos del club</h2></div><Link href="/torneos" className="text-link">Todos los torneos<Icono nombre="flecha" className="h-4 w-4" /></Link></div>
      <div className="segmented-control mb-5" role="group" aria-label="Torneos destacados">{[{id:"armado",texto:"Próximos"},{id:"en_curso",texto:"En curso"},{id:"todos",texto:"Últimos torneos"}].map(v=><button type="button" key={v.id} aria-pressed={vistaActiva===v.id} onClick={()=>setVista(v.id)}>{v.texto}{v.id==="en_curso"&&enCurso>0&&<span>{enCurso}</span>}</button>)}</div>
      {cargandoTorneos?<div className="home-tournament-list">{[0,1,2].map(i=><div key={i} className="panel h-56 p-6" aria-hidden="true"><div className="skeleton h-5 w-20" /><div className="skeleton mt-8 h-6 w-3/4" /><div className="skeleton mt-3 h-3 w-1/2" /></div>)}<span className="sr-only" role="status">Cargando torneos</span></div>:destacados.length?<div className="home-tournament-list">{destacados.map(t=><TarjetaTorneo key={t.id} torneo={t} nombreJugador={nombreJugador} accion={t.estado==="armado"?<div className="home-tournament-actions"><CompartirInvitacion titulo={t.nombre} texto={`¿Te sumás a ${t.nombre}? El torneo de Atlántida Ajedrez tiene la inscripción abierta.`} ruta={`/torneos/${t.id}`} etiqueta="Invitar"/><Link href={`/torneos/${t.id}/inscribirse`} className="button-primary text-xs">Anotarme<Icono nombre="flecha" className="h-3.5 w-3.5"/></Link></div>:undefined}/>)}</div>:<div className="empty-state"><Icono nombre="trofeo" className="h-8 w-8 text-zinc-500" /><h3>{vistaActiva==="armado"?"La próxima competencia se está preparando":"No hay torneos en curso"}</h3><p>Podés consultar los resultados de los torneos anteriores.</p><button type="button" onClick={()=>setVista("todos")} className="text-link">Ver últimos torneos<Icono nombre="flecha" className="h-4 w-4" /></button></div>}
    </section>
    <div className="home-agenda"><AgendaClub/></div>
    <aside className="home-daily" aria-label="Problema diario"><DesafioAjedrez/></aside>
    <div className="home-knight"><TarjetaRetoCaballo/></div>
    </div>
    <CarruselNoticias noticias={noticiasRecientes()} portada/>
    <MesaEstudioClub/>
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="panel ranking-panel" aria-labelledby="titulo-ranking"><div className="section-heading"><div><p className="eyebrow mb-2 text-zinc-500">Los protagonistas</p><h2 id="titulo-ranking">Ranking Atlántida</h2></div><Link href="/jugadores" className="text-link">Ver todos<Icono nombre="flecha" className="h-4 w-4" /></Link></div><ol className="ranking-list">{jugadores.slice(0,5).map((j,i)=><li key={j.id}><Link href={`/jugadores/${j.id}`}><span className={`ranking-position ${i===0?"ranking-first":""}`}>{String(i+1).padStart(2,"0")}</span><span className="player-avatar">{j.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={j.fotoUrl} alt="" loading="lazy" />
      ) : nombreVisible(j).charAt(0)}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{nombreVisible(j)}</span><span className="mt-1 block text-xs text-zinc-500">{j.jugadas} partidas registradas</span></span><span className="text-right"><span className="block font-mono text-lg font-semibold text-blue-200">{j.eloAtlantida}</span><span className="block text-[9px] uppercase tracking-widest text-zinc-500">Elo</span></span><Icono nombre="flecha" className="h-4 w-4 text-zinc-500" /></Link></li>)}</ol>{!cargando&&jugadores.length===0&&<p className="py-8 text-sm text-zinc-400">El ranking aparecerá cuando se carguen los jugadores.</p>}</section>
      <div className="flex flex-col gap-4"><Link href="/transmision" className="broadcast-card group"><span className="feature-icon mb-6"><Icono nombre="directo" /></span><p className="eyebrow text-blue-300">Primera fila</p><h2>La partida,<br />en directo.</h2><p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">Seguí el tablero, las jugadas y el análisis de la transmisión del club.</p><span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-200">Abrir transmisión<Icono nombre="flecha" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link><Link href="/estadisticas" className="panel flex items-center gap-4 p-5 transition-colors hover:border-blue-400/40"><span className="feature-icon"><Icono nombre="grafico" /></span><span className="flex-1"><span className="block font-semibold">Más allá del resultado</span><span className="mt-1 block text-xs text-zinc-400">Evolución de Elo, rendimiento y campeones.</span></span><Icono nombre="flecha" className="h-4 w-4 text-zinc-400" /></Link></div>
    </div>
    <PrimeraVisitaClub/>
    <div className="club-metrics">{[
      {valor:jugadores.length,texto:"Jugadores en el club",icono:"personas"},
      {valor:torneos.length,texto:"Torneos registrados",icono:"trofeo"},
      {valor:partidas,texto:"Partidas con historia",icono:"actividad"},
    ].map(m=><div key={m.texto} className="metric"><Icono nombre={m.icono as NombreIcono} className="h-5 w-5 text-blue-300" /><div><p className="metric-value">{cargando?<span className="skeleton inline-block h-7 w-12" />:m.valor}</p><p className="mt-1 text-xs text-zinc-400">{m.texto}</p></div></div>)}</div>
  </div>;
}
