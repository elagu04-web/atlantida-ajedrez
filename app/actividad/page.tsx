"use client";
import { useState } from "react";
import { useActividad } from "@/context/ActividadContext";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";
import { Icono, type NombreIcono } from "@/components/Icono";
const iconos:Record<string,NombreIcono>={jugador:"personas",torneo:"trofeo",resultado:"actividad"};
export default function ActividadPage() {
  const {actividades,cargando}=useActividad();const [tipo,setTipo]=useState("todos");
  const lista=actividades.filter(a=>tipo==="todos"||a.tipo===tipo);
  return <div className="flex flex-col gap-6"><EncabezadoPagina titulo="La vida del club" subtitulo="Resultados, torneos y novedades. Una mirada a lo que pasa alrededor del tablero." />
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="segmented-control" role="group" aria-label="Filtrar actividad">{[{id:"todos",texto:"Todo"},{id:"resultado",texto:"Resultados"},{id:"torneo",texto:"Torneos"},{id:"jugador",texto:"Jugadores"}].map(t=><button type="button" key={t.id} aria-pressed={tipo===t.id} onClick={()=>setTipo(t.id)}>{t.texto}</button>)}</div><span className="text-xs text-zinc-500">Últimos {actividades.length} eventos</span></div>
    <div className="panel overflow-hidden">{cargando?<p role="status" className="p-8 text-center text-sm text-zinc-400">Cargando actividad…</p>:lista.length===0?<div className="empty-state border-0"><Icono nombre="actividad" className="h-8 w-8 text-zinc-500" /><h2>No hay eventos en esta categoría</h2><p>La actividad aparecerá a medida que avance la competencia.</p></div>:<ol className="activity-timeline">{lista.map(a=><li key={a.id}><span className="feature-icon"><Icono nombre={iconos[a.tipo]??"actividad"} /></span><div className="min-w-0 flex-1"><span className="eyebrow text-zinc-500">{a.tipo==="jugador"?"Jugadores":a.tipo==="torneo"?"Torneo":"Resultado"}</span><p className="mt-2 text-sm leading-relaxed text-zinc-200">{a.descripcion}</p><time dateTime={a.creadoEn} className="mt-2 block text-xs text-zinc-500">{new Date(a.creadoEn).toLocaleString("es-UY",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</time></div></li>)}</ol>}</div>
  </div>;
}
