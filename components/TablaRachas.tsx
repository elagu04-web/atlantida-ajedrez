"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Icono } from "./Icono";

type FilaRacha = {nombre: string; racha_actual: number; mejor_racha: number; total: number; ultimo_dia: string};
type Orden = "actual" | "record" | "total";

export function TablaRachas({compacta = false}: {compacta?: boolean}) {
  const [filas, setFilas] = useState<FilaRacha[]>([]);
  const [estado, setEstado] = useState<"cargando" | "listo" | "preparando" | "error">("cargando");
  const [orden, setOrden] = useState<Orden>("actual");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let cancelado = false, pendiente = false, repetir = false;
    const abort = new AbortController();
    async function cargar() {
      if (cancelado) return;
      if (pendiente) {repetir = true; return;}
      pendiente = true;repetir = false;
      try {
        const {data, error} = await supabase.rpc("tabla_rachas_desafios").abortSignal(AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]));
        if (cancelado) return;
        if (error) {setEstado(error.code === "PGRST202" ? "preparando" : "error"); return;}
        setFilas(data ?? []);setEstado("listo");
      } catch {if (!cancelado) setEstado("error");}
      finally {pendiente = false;if (repetir && !cancelado) void cargar();}
    }
    const actualizar = () => void cargar();
    const visible = () => {if (document.visibilityState === "visible") actualizar();};
    actualizar();const intervalo = setInterval(actualizar, 30000);
    window.addEventListener("desafio-resuelto", actualizar);
    window.addEventListener("online", actualizar);
    document.addEventListener("visibilitychange", visible);
    return () => {cancelado = true;abort.abort();clearInterval(intervalo);window.removeEventListener("desafio-resuelto", actualizar);window.removeEventListener("online", actualizar);document.removeEventListener("visibilitychange", visible);};
  }, [intento]);

  const clave = orden === "actual" ? "racha_actual" : orden === "record" ? "mejor_racha" : "total";
  const activas = filas.filter(f => f.racha_actual > 0);
  const lista = [...(orden === "actual" ? activas : filas)].sort((a, b) => b[clave] - a[clave] || b.mejor_racha - a.mejor_racha || b.total - a.total || a.nombre.localeCompare(b.nombre, "es"));
  const visibles = compacta ? lista.slice(0, 5) : lista;
  const columnaRecord = orden === "record" ? "" : "hidden sm:table-cell";
  const columnaTotal = orden === "total" ? "" : "hidden md:table-cell";

  return <section id="rachas" className="panel min-w-0 overflow-hidden scroll-mt-24" aria-labelledby="titulo-rachas">
    <div className="p-5 sm:p-6">
      <p className="eyebrow text-amber-200">El desafío diario del club</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-rachas" className="text-2xl font-semibold">Quién está en racha</h2>
        {compacta && <Link href="/desafios#rachas" className="text-link">Ver la tabla completa<Icono nombre="flecha" className="h-4 w-4"/></Link>}
      </div>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">Un problema cada día. Sumá días consecutivos y competí por la racha más larga.</p>
      {estado === "listo" && <div className="mt-5 grid grid-cols-3 gap-3 border-y border-white/10 py-4">
        {[{valor: activas.length, texto: "En racha"}, {valor: Math.max(0, ...filas.map(f => f.mejor_racha)), texto: "Récord · días"}, {valor: filas.length, texto: "En la tabla"}].map(m => <div key={m.texto}><p className="font-mono text-xl font-semibold text-amber-100">{m.valor}</p><p className="mt-1 text-[11px] text-zinc-500">{m.texto}</p></div>)}
      </div>}
      <div className="segmented-control mt-5" role="group" aria-label="Ordenar tabla de rachas">
        {([{id: "actual", texto: "En racha"}, {id: "record", texto: "Récords"}, {id: "total", texto: "Resueltos"}] as const).map(o => <button type="button" key={o.id} aria-pressed={orden === o.id} onClick={() => setOrden(o.id)}>{o.texto}</button>)}
      </div>
    </div>
    {estado === "cargando" ? <p role="status" className="px-6 pb-6 text-sm text-zinc-400">Cargando las rachas…</p>
      : estado === "preparando" ? <div role="status" className="border-t border-white/10 p-6"><p className="text-sm text-amber-200">La clasificación todavía no está habilitada.</p><p className="mt-2 text-xs text-zinc-400">Por ahora podés practicar el desafío. Los nombres y las rachas aparecerán cuando el club active el registro.</p></div>
      : estado === "error" ? <div className="border-t border-white/10 p-6"><p role="status" className="text-sm text-zinc-400">No se pudieron actualizar las rachas. Comprobá tu conexión y volvé a intentar.</p><button type="button" className="text-link mt-3" onClick={() => setIntento(v => v + 1)}>Reintentar</button></div>
      : !lista.length ? <div className="border-t border-white/10 p-6 text-center"><Icono nombre="trofeo" className="mx-auto h-7 w-7 text-amber-200/70"/><h3 className="mt-3 font-semibold">{filas.length ? "Hoy no hay rachas activas" : "La primera racha puede ser tuya"}</h3><p className="mt-2 text-sm text-zinc-400">Iniciá sesión y resolvé el desafío sin errores para sumar un día.</p>{filas.length > 0 && <button type="button" className="text-link mt-3" onClick={() => setOrden("record")}>Ver los récords del club</button>}</div>
      : <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Clasificación de desafíos diarios por {orden === "actual" ? "racha activa" : orden === "record" ? "mejor racha" : "total resuelto"}</caption><thead className="border-y border-white/10 bg-black/10 text-xs text-zinc-400"><tr>
        <th scope="col" className="px-3 py-3 text-left sm:px-5">#</th><th scope="col" className="px-3 py-3 text-left">Jugador</th><th scope="col" className="px-3 py-3 text-center">Racha</th><th scope="col" className={`${columnaRecord} px-3 py-3 text-center`}>Récord</th><th scope="col" className={`${columnaTotal} px-3 py-3 text-center`}>Resueltos</th>{!compacta && <th scope="col" className="hidden px-3 py-3 text-center lg:table-cell">Último día</th>}
      </tr></thead><tbody className="divide-y divide-white/5">{visibles.map((f, indice) => {
        const puesto = lista.findIndex(x => x[clave] === f[clave] && x.mejor_racha === f.mejor_racha && x.total === f.total) + 1;
        return <tr key={`${f.nombre}:${indice}`} className="hover:bg-white/[0.025]"><td className={`px-3 py-4 sm:px-5 ${puesto === 1 ? "text-amber-200" : "text-zinc-500"}`}>{puesto}</td><th scope="row" className="max-w-52 break-words px-3 py-4 text-left font-medium">{f.nombre}</th><td className="px-3 py-4 text-center font-mono text-lg text-amber-200">{f.racha_actual}<span className="ml-1 text-[10px] text-zinc-500">d</span></td><td className={`${columnaRecord} px-3 py-4 text-center font-mono`}>{f.mejor_racha}</td><td className={`${columnaTotal} px-3 py-4 text-center font-mono`}>{f.total}</td>{!compacta && <td className="hidden whitespace-nowrap px-3 py-4 text-center text-xs text-zinc-400 lg:table-cell">{f.ultimo_dia}</td>}</tr>;
      })}</tbody></table></div>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-6"><p className="max-w-2xl text-xs leading-relaxed text-zinc-500">Un error o un día sin resolver corta la racha. El récord se conserva. El día cambia a medianoche de Uruguay.</p>{compacta && <Link href="/desafios" className="text-link">Jugar el desafío<Icono nombre="flecha" className="h-4 w-4"/></Link>}</div>
  </section>;
}
