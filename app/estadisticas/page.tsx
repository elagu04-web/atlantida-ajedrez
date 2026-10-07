"use client";

import { useState } from "react";
import Link from "next/link";
import { useTorneos } from "@/context/TorneosContext";
import { useJugadores } from "@/context/JugadoresContext";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { determinarCampeon } from "@/lib/tournaments";
import { agruparTorneosPorPeriodo, calcularTablaGeneral, etiquetaPeriodo, evolucionEloPorPeriodo } from "@/lib/tablaGeneral";
import { filasRendimiento, resumenClub } from "@/lib/rendimiento";
import { ELO_MINIMO } from "@/lib/elo";
import { nombreVisible } from "@/lib/players";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";
import { GraficoMultiLinea, colorDeSerie } from "@/components/GraficoMultiLinea";
import { GraficoBarras } from "@/components/GraficoBarras";

const porcentaje = (valor: number | null) => valor === null ? "—" : `${valor.toFixed(1)}%`;
const delta = (valor: number) => `${valor>0?"+":""}${valor}`;
export default function EstadisticasPage() {
  const { torneos, cargando: cargandoTorneos, errorCarga } = useTorneos();
  const { jugadores: bases, cargando: cargandoJugadores, errorCarga: errorJugadores } = useJugadores();
  const jugadores = useJugadoresEnVivo();
  const [modo, setModo] = useState<"mes"|"anio">("mes");
  const [periodo, setPeriodo] = useState<string|null>(null);
  const [minimo, setMinimo] = useState(5);
  const [orden, setOrden] = useState<"puntos"|"rendimiento"|"elo"|"partidas">("puntos");
  const [comparacion, setComparacion] = useState<string[]|null>(null);
  const [jugadorElegido, setJugadorElegido] = useState<string|null>(null);
  const cargando = cargandoTorneos || cargandoJugadores;
  const grupos = agruparTorneosPorPeriodo(torneos.filter(t=>resumenClub([t]).partidas>0),modo);
  const periodos = [...grupos.keys()].sort().reverse();
  const activo = periodo && periodos.includes(periodo) ? periodo : periodos[0];
  const delPeriodo = (activo ? grupos.get(activo) ?? [] : []);
  const resumen = resumenClub(delPeriodo);
  const tabla = calcularTablaGeneral(delPeriodo);
  const filas = (activo ? filasRendimiento(jugadores,bases,activo) : []);
  const ordenadas = [...filas].sort((a,b)=>(orden==="rendimiento" ? (b.rendimiento??0)-(a.rendimiento??0) : orden==="elo" ? b.variacion-a.variacion : orden==="partidas" ? b.partidas-a.partidas : b.puntos-a.puntos) || b.partidas-a.partidas || a.nombre.localeCompare(b.nombre,"es"));
  const elegibles = filas.filter(f=>f.partidas>=minimo);
  const mejores = [...elegibles].sort((a,b)=>(b.rendimiento??0)-(a.rendimiento??0) || b.partidas-a.partidas).slice(0,8);
  const subidas = [...elegibles].filter(f=>f.variacion>0).sort((a,b)=>b.variacion-a.variacion).slice(0,5);
  const elegido = filas.find(f=>f.jugadorId===jugadorElegido) ?? ordenadas[0];
  const meses = [...agruparTorneosPorPeriodo(torneos,"mes").keys()].filter(m=>activo && m.slice(0,activo.length)<=activo).sort().slice(-12);
  const ids = comparacion ?? jugadores.filter(j=>j.jugadas>0).slice(0,3).map(j=>j.id);
  const comparados = jugadores.filter(j=>ids.includes(j.id));
  const series = evolucionEloPorPeriodo(comparados,meses);
  const campeones = delPeriodo.filter(t=>t.estado==="finalizado").map(t=>({torneo:t,resultado:determinarCampeon(t)}));
  const nombreDe = (id:string)=>{const j=jugadores.find(j=>j.id===id);return j?nombreVisible(j):"Jugador no disponible";};
  function alternar(id:string) { const actuales=ids; setComparacion(actuales.includes(id)?actuales.filter(i=>i!==id):actuales.length<3?[...actuales,id]:actuales); }
  function exportar() {
    const celda = (v:string|number)=>`"${(typeof v==="string"?v.replace(/^[=+@-]/,"'$&"):String(v)).replaceAll('"','""')}"`;
    const csv = [["Jugador","Período","PJ","Victorias","Tablas","Derrotas","Puntos jugados","Rendimiento %","Elo inicio","Elo cierre","Variación Elo"],...ordenadas.map(f=>[f.nombre,activo,f.partidas,f.victorias,f.empates,f.derrotas,f.puntos,f.rendimiento?.toFixed(1)??"",f.eloInicial,f.eloFinal,f.variacion])].map(f=>f.map(v=>celda(v??"")).join(";")).join("\r\n");
    const url=URL.createObjectURL(new Blob(["\ufeff",csv],{type:"text/csv;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download=`atlantida-${activo}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <div className="flex flex-col gap-6">
    <EncabezadoPagina titulo="Estadísticas que cuentan" subtitulo="Actividad, resultados y progreso. Elegí un período para ver qué pasó en el club." />
    {(errorCarga||errorJugadores)&&<p role="status" className="panel p-4 text-sm text-amber-300">{errorCarga||errorJugadores}</p>}
    <div className="panel flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="flex flex-wrap items-center gap-3"><div className="segmented-control" aria-label="Agrupar estadísticas" role="group">{(["mes","anio"] as const).map(m=><button key={m} aria-pressed={modo===m} onClick={()=>{setModo(m);setPeriodo(null);}}>{m==="mes"?"Por mes":"Por año"}</button>)}</div><select aria-label="Período de estadísticas" value={activo??""} onChange={e=>setPeriodo(e.target.value)} disabled={!periodos.length}>{!periodos.length&&<option value="">Sin resultados</option>}{periodos.map(p=><option key={p} value={p}>{etiquetaPeriodo(p)}</option>)}</select></div>
      <button className="button-secondary" disabled={!filas.length} onClick={exportar}>Descargar CSV</button>
    </div>
    <p className="text-xs leading-relaxed text-zinc-400">{activo?etiquetaPeriodo(activo):"Sin período disponible"} · Las partidas se agrupan por la fecha de inicio del torneo. El rendimiento usa resultados contra un rival: los descansos y byes no cuentan como partidas jugadas.</p>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{valor:resumen.partidas,texto:"Partidas jugadas"},{valor:resumen.jugadores,texto:"Jugadores con actividad"},{valor:resumen.torneos,texto:"Torneos con resultados"},{valor:resumen.partidas?`${(resumen.tablas/resumen.partidas*100).toFixed(0)}%`:"—",texto:`Tablas · ${resumen.tablas} partidas`}].map(m=><div key={m.texto} className="panel p-4 sm:p-5"><p className="text-2xl font-semibold tabular-nums">{cargando?"…":m.valor}</p><p className="mt-2 text-xs text-zinc-400">{m.texto}</p></div>)}</div>
    {!cargando&&!filas.length?<div className="empty-state"><h2>Sin partidas para analizar</h2><p>Las estadísticas aparecerán cuando haya resultados contra un rival.</p></div>:<>
      <section className="panel overflow-hidden" aria-labelledby="titulo-rendimiento">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 id="titulo-rendimiento" className="font-semibold">Rendimiento por jugador</h2><p className="mt-1 text-xs text-zinc-400">Puntos obtenidos en partidas reales. V = victoria, T = tablas, D = derrota.</p></div><select aria-label="Ordenar estadísticas" value={orden} onChange={e=>setOrden(e.target.value as typeof orden)}><option value="puntos">Más puntos jugados</option><option value="rendimiento">Mejor rendimiento</option><option value="elo">Mayor subida de Elo</option><option value="partidas">Más partidas</option></select></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="px-4 py-3 text-left">Jugador</th><th className="px-3 py-3">PJ</th><th className="px-3 py-3">V / T / D</th><th className="px-3 py-3">Puntos</th><th className="px-3 py-3">Rendimiento</th><th className="px-3 py-3">Elo del período</th></tr></thead><tbody>{ordenadas.map(f=><tr key={f.jugadorId}><td className="px-4 py-3"><Link href={`/jugadores/${f.jugadorId}`} className="font-medium hover:text-blue-300">{f.nombre}</Link>{f.partidas<5&&<span className="mt-1 block text-[10px] text-zinc-500">Pocas partidas</span>}</td><td className="px-3 py-3 text-center tabular-nums">{f.partidas}</td><td className="whitespace-nowrap px-3 py-3 text-center"><span className="text-emerald-300">{f.victorias}</span> / {f.empates} / <span className="text-red-300">{f.derrotas}</span></td><td className="px-3 py-3 text-center tabular-nums">{f.puntos}</td><td className="px-3 py-3 text-center tabular-nums">{porcentaje(f.rendimiento)}</td><td className="whitespace-nowrap px-3 py-3 text-center"><span className="block text-xs text-zinc-400">{f.eloInicial} → {f.eloFinal}</span><span className={f.variacion>0?"text-emerald-300":f.variacion<0?"text-red-300":"text-zinc-500"}>{delta(f.variacion)}</span></td></tr>)}</tbody></table></div>
      </section>
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-zinc-400">Comparaciones con una muestra mínima de partidas en el período.</p><label className="flex items-center gap-2 text-xs">Mínimo de partidas<select aria-label="Mínimo de partidas para comparar" value={minimo} onChange={e=>setMinimo(Number(e.target.value))}>{[1,5,10].map(n=><option key={n} value={n}>{n}</option>)}</select></label></div>
      <div className="grid gap-5 lg:grid-cols-2"><section className="panel p-5"><h2 className="mb-2 font-semibold">Mejor rendimiento</h2><p className="mb-5 text-xs text-zinc-400">(Victorias + ½ tablas) / partidas. Mínimo {minimo} partidas.</p>{mejores.length?<GraficoBarras datos={mejores.map(f=>({etiqueta:`${f.nombre} · ${f.partidas} PJ`,valor:f.rendimiento??0}))} formatoValor={v=>`${v.toFixed(1)}%`} />:<p className="py-5 text-sm text-zinc-400">Nadie llega al mínimo en este período. Bajá el mínimo o elegí un período más amplio.</p>}</section><section className="panel p-5"><h2 className="mb-2 font-semibold">Subidas de Elo</h2><p className="mb-5 text-xs text-zinc-400">Cambio de Elo Atlántida en el período. Mínimo {minimo} partidas. El mínimo del club es {ELO_MINIMO}: alcanzar ese piso también puede generar una subida.</p>{subidas.length?<ul className="flex flex-col gap-4">{subidas.map(f=><li key={f.jugadorId} className="flex items-center justify-between gap-3"><Link href={`/jugadores/${f.jugadorId}`} className="text-sm hover:text-blue-300">{f.nombre}<span className="mt-1 block text-xs text-zinc-500">{f.partidas} partidas · {f.eloInicial} → {f.eloFinal}</span></Link><span className="font-mono text-lg text-emerald-300">+{f.variacion}</span></li>)}</ul>:<p className="py-5 text-sm text-zinc-400">Sin subidas de Elo con esta muestra. Los torneos históricos excluidos de Elo no generan ganancias.</p>}</section></div>
      {elegido&&<section className="panel p-5"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Con blancas y con negras</h2><select aria-label="Jugador para comparar colores" value={elegido.jugadorId} onChange={e=>setJugadorElegido(e.target.value)}>{filas.map(f=><option key={f.jugadorId} value={f.jugadorId}>{f.nombre}</option>)}</select></div><div className="grid gap-3 sm:grid-cols-2">{[{label:"Blancas",dato:elegido.blancas},{label:"Negras",dato:elegido.negras}].map(c=><div key={c.label} className="rounded-xl border border-white/10 p-4"><p className="text-sm font-medium">{c.label}</p><p className="mt-3 text-2xl font-semibold">{porcentaje(c.dato.rendimiento)}</p><p className="mt-2 text-xs text-zinc-400">{c.dato.partidas} partidas · {c.dato.victorias} victorias · {c.dato.empates} tablas · {c.dato.derrotas} derrotas</p></div>)}</div><p className="mt-3 text-xs text-zinc-500">Compará el rendimiento junto con la cantidad de partidas; una muestra pequeña puede dar porcentajes extremos.</p></section>}
    </>}
    <section className="panel p-5"><h2 className="font-semibold">Comparar evolución de Elo</h2><p className="mt-2 text-xs text-zinc-400">Elegí hasta tres jugadores. Elo al cierre de los últimos 12 meses con torneos, hasta el período seleccionado.</p><div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Jugadores para comparar Elo">{jugadores.filter(j=>j.jugadas>0).map(j=><button key={j.id} aria-pressed={ids.includes(j.id)} disabled={!ids.includes(j.id)&&ids.length>=3} onClick={()=>alternar(j.id)} className={`comparison-chip ${ids.includes(j.id)?"comparison-selected":""}`}>{nombreVisible(j)}</button>)}</div><div className="mt-6">{comparados.length?<GraficoMultiLinea categorias={meses.map(etiquetaPeriodo)} series={series.map((s,i)=>({id:s.jugadorId,nombre:s.nombre,color:colorDeSerie(i),valores:s.valores}))} />:<p className="text-sm text-zinc-400">Seleccioná un jugador para ver su evolución.</p>}</div></section>
    <section className="panel p-5"><h2 className="mb-4 font-semibold">Campeones del período</h2>{campeones.length?<ul className="flex flex-col gap-4">{campeones.map(({torneo,resultado})=><li key={torneo.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3 text-sm"><Link href={`/torneos/${torneo.id}`} className="text-zinc-300 hover:text-blue-300">{torneo.nombre}</Link><span className="font-medium">{resultado?.tipo==="campeon"?nombreDe(resultado.jugadorId):resultado?"Título pendiente de desempate":"Sin campeón definido"}</span></li>)}</ul>:<p className="text-sm text-zinc-400">No hay torneos finalizados en el período.</p>}</section>
    <details className="panel p-5"><summary className="font-semibold">Tabla general por torneos</summary><p className="my-4 text-xs leading-relaxed text-zinc-400">Esta clasificación conserva los puntos oficiales, incluidos byes suizos. El rendimiento y PJ se calculan sobre partidas contra un rival. No incluye la final de desempate registrada aparte.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="px-3 py-2">#</th><th className="px-3 py-2 text-left">Jugador</th>{tabla.columnas.map((c,i)=><th key={c.id} className="px-3 py-2" title={c.nombre}>T{i+1}</th>)}<th className="px-3 py-2">Total oficial</th><th className="px-3 py-2">PJ</th><th className="px-3 py-2">Rendimiento</th></tr></thead><tbody>{tabla.filas.map(f=><tr key={f.jugadorId}><td className="px-3 py-2 text-center">{f.posicion}</td><td className="px-3 py-2"><Link href={`/jugadores/${f.jugadorId}`}>{nombreDe(f.jugadorId)}</Link></td>{f.puntosPorTorneo.map((p,i)=><td key={i} className="px-3 py-2 text-center">{p??"—"}</td>)}<td className="px-3 py-2 text-center">{f.total}</td><td className="px-3 py-2 text-center">{f.partidasJugadas}</td><td className="px-3 py-2 text-center">{f.partidasJugadas?porcentaje(f.rendimiento):"—"}</td></tr>)}</tbody></table></div><ul className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-400">{tabla.columnas.map((c,i)=><li key={c.id}><Link href={`/torneos/${c.id}`} className="hover:text-blue-300">T{i+1} · {c.nombre}</Link></li>)}</ul></details>
  </div>;
}
