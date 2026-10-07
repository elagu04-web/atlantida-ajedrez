"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Desafio } from "@/lib/desafios";
import { AuthWidget } from "./AuthWidget";

export function GuardarRacha({desafio,resuelto}:{desafio:Desafio;resuelto:boolean}) {
  const {session,cargando}=useAuth();
  const [nombre,setNombre]=useState("");const [guardado,setGuardado]=useState(false);
  const [enviando,setEnviando]=useState(false);const [mensaje,setMensaje]=useState("");
  useEffect(()=>{let cancelado=false;if(session&&desafio.registrable)void supabase.rpc("mi_desafio_resuelto").then(({data})=>{if(!cancelado&&data){setNombre(data.nombre??"");setGuardado(data.resuelto===true);}});return()=>{cancelado=true;};},[session,desafio.registrable]);
  async function guardar(e:React.FormEvent) {
    e.preventDefault();if(!session||!resuelto||!desafio.registrable||enviando)return;
    setEnviando(true);setMensaje("");
    try{const {data,error}=await supabase.rpc("registrar_desafio_resuelto",{p_dia:desafio.fecha,p_puzzle_id:desafio.id,p_nombre:nombre.trim(),p_solucion:desafio.solution});if(error||data!==true)throw error??new Error("Sin confirmación");setGuardado(true);window.dispatchEvent(new Event("desafio-resuelto"));}
    catch(error){const codigo=(error as {code?:string})?.code;setMensaje(codigo==="23505"?"Ese nombre público ya está en uso. Elegí otro.":"No se pudo guardar. Comprobá tu conexión y que el problema siga siendo el de hoy.");}finally{setEnviando(false);}
  }
  if(cargando)return null;
  if(!desafio.registrable)return resuelto?<p className="mt-3 text-xs text-zinc-400">Por ahora este desafío es de práctica; la tabla de rachas se está preparando.</p>:null;
  if(!session)return <div className="mt-3 rounded-lg border border-white/10 p-3"><p className="mb-2 text-xs text-zinc-400">Iniciá sesión para que el desafío cuente en tu racha.</p><AuthWidget/></div>;
  if(guardado)return <p role="status" className="mt-3 text-xs text-emerald-300">Ya sumaste el desafío de hoy. Volvé mañana para seguir la racha.</p>;
  if(!resuelto)return <p className="mt-3 text-xs text-zinc-400">Resolvé la secuencia completa para sumar un día a tu racha.</p>;
  return <form onSubmit={guardar} className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3"><label className="text-xs text-zinc-400">Tu nombre en la tabla pública<input type="text" required minLength={2} maxLength={40} value={nombre} onChange={e=>setNombre(e.target.value)} autoComplete="nickname" className="mt-1 w-full rounded-lg border border-white/15 p-2" placeholder="Tu nombre o apodo"/></label><button type="submit" disabled={enviando} className="button-primary justify-center">{enviando?"Guardando…":"Sumar a mi racha"}</button>{mensaje&&<p role="alert" className="text-xs text-amber-300">{mensaje}</p>}</form>;
}
