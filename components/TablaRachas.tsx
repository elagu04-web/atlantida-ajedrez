"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type FilaRacha={nombre:string;racha_actual:number;mejor_racha:number;total:number;ultimo_dia:string};
export function TablaRachas() {
  const [filas,setFilas]=useState<FilaRacha[]>([]);
  const [estado,setEstado]=useState<"cargando"|"listo"|"error">("cargando");
  const [orden,setOrden]=useState<"actual"|"record"|"total">("actual");
  useEffect(()=>{
    let cancelado=false,pendiente=false;
    async function cargar(){if(pendiente)return;pendiente=true;try{const {data,error}=await supabase.rpc("tabla_rachas_desafios");if(error)throw error;if(!cancelado){setFilas(data??[]);setEstado("listo");}}catch{if(!cancelado)setEstado("error");}finally{pendiente=false;}}
    const actualizar=()=>void cargar();const visible=()=>{if(document.visibilityState==="visible")actualizar();};
    actualizar();const intervalo=setInterval(actualizar,30000);window.addEventListener("desafio-resuelto",actualizar);document.addEventListener("visibilitychange",visible);
    return()=>{cancelado=true;clearInterval(intervalo);window.removeEventListener("desafio-resuelto",actualizar);document.removeEventListener("visibilitychange",visible);};
  },[]);
  const clave=orden==="actual"?"racha_actual":orden==="record"?"mejor_racha":"total";
  const lista=[...filas].sort((a,b)=>b[clave]-a[clave]||b.mejor_racha-a.mejor_racha||b.total-a.total||a.nombre.localeCompare(b.nombre,"es"));

  return <section id="rachas" className="panel overflow-hidden" aria-labelledby="titulo-rachas"><div className="p-5 sm:p-6"><p className="eyebrow text-amber-200">Día a día, jugada a jugada</p><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><h2 id="titulo-rachas" className="text-2xl font-semibold">Quién llega más lejos</h2><div className="segmented-control" role="group" aria-label="Ordenar tabla de rachas">{[{id:"actual",texto:"Racha actual"},{id:"record",texto:"Mejor racha"},{id:"total",texto:"Resueltos"}].map(o=><button key={o.id} aria-pressed={orden===o.id} onClick={()=>setOrden(o.id as typeof orden)}>{o.texto}</button>)}</div></div><p className="mt-3 max-w-2xl text-xs leading-relaxed text-zinc-400">Un problema por día. Los días consecutivos resueltos alargan tu racha; si salteás un día, se reinicia. Tu mejor racha se conserva. El día cambia a medianoche de Uruguay.</p></div>
    {estado==="cargando"?<p role="status" className="p-6 text-sm text-zinc-400">Cargando las rachas…</p>:estado==="error"?<p role="status" className="border-t border-white/10 p-6 text-sm text-zinc-400">Las rachas se están preparando. Mientras tanto, el desafío está disponible para practicar.</p>:!lista.length?<div className="border-t border-white/10 p-8 text-center"><h3 className="font-semibold">La primera racha puede ser tuya</h3><p className="mt-2 text-sm text-zinc-400">Iniciá sesión, resolvé el desafío de hoy y guardá tu resultado.</p></div>:<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Jugador</th><th className="px-4 py-3 text-center">Racha actual</th><th className="px-4 py-3 text-center">Mejor racha</th><th className="px-4 py-3 text-center">Resueltos</th><th className="px-4 py-3 text-center">Último día</th></tr></thead><tbody>{lista.map((f)=>{const puesto=lista.findIndex(x=>x[clave]===f[clave]&&x.mejor_racha===f.mejor_racha&&x.total===f.total)+1;return <tr key={f.nombre}><td className="px-4 py-4 text-zinc-500">{puesto}</td><td className="px-4 py-4 font-medium">{f.nombre}</td><td className="px-4 py-4 text-center font-mono text-lg text-amber-200">{f.racha_actual}<span className="ml-1 text-[10px] text-zinc-500">días</span></td><td className="px-4 py-4 text-center tabular-nums">{f.mejor_racha}</td><td className="px-4 py-4 text-center tabular-nums">{f.total}</td><td className="whitespace-nowrap px-4 py-4 text-center text-xs text-zinc-400">{f.ultimo_dia}</td></tr>;})}</tbody></table></div>}
  </section>;
}
