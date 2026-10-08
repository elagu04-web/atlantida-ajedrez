"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Desafio } from "@/lib/desafios";
import { IdentidadJugador } from "./IdentidadJugador";
import { useMiJugador } from "@/context/useMiJugador";
import { nombreVisible } from "@/lib/players";
import { claveIntentoDesafio } from "@/lib/identidadJugador";

export function GuardarRacha({desafio,resuelto,fallado}:{desafio:Desafio;resuelto:boolean;fallado:boolean}) {
  const {session}=useAuth();
  return <div className="racha-identity"><IdentidadJugador/><RegistroRacha key={claveIntentoDesafio(session?.user.id,desafio.fecha,desafio.id)} desafio={desafio} resuelto={resuelto} fallado={fallado}/></div>;
}
function RegistroRacha({desafio,resuelto,fallado}:{desafio:Desafio;resuelto:boolean;fallado:boolean}) {
  const {session,cargando}=useAuth();
  const {jugador,cargando:cargandoJugador,error:errorJugador,ambigua}=useMiJugador();
  const claveError=`atlantida-desafio-error:${session?.user.id??"anon"}:${desafio.fecha}:${desafio.id}`;
  const [errorLocal]=useState(()=>{try{return typeof window!=="undefined"&&localStorage.getItem(claveError)==="1";}catch{return false;}});
  const intentoFallado=fallado||errorLocal;
  const [guardado,setGuardado]=useState(false);
  const [revisada,setRevisada]=useState(false),[reintentoGuardado,setReintentoGuardado]=useState(0);
  const usuario=session?.user.id;
  const jugadorId=jugador?.id;
  const nombre=jugador?nombreVisible(jugador):"";
  const [enviando,setEnviando]=useState(false);const [mensaje,setMensaje]=useState("");
  const [cortada,setCortada]=useState(false),[reintentoError,setReintentoError]=useState(0);
  useEffect(()=>{let cancelado=false;if(usuario&&desafio.registrable)void supabase.rpc("mi_desafio_resuelto").abortSignal(AbortSignal.timeout(10000)).then(({data})=>{if(!cancelado){if(data){setGuardado(actual=>actual||data.resuelto===true);setCortada(actual=>actual||data.fallado===true);}setRevisada(true);}});return()=>{cancelado=true;};},[usuario,desafio.registrable,desafio.fecha,desafio.id]);
  useEffect(()=>{let cancelado=false;if(intentoFallado&&session&&desafio.registrable){try{localStorage.setItem(claveError,"1");}catch{}void supabase.rpc("registrar_desafio_error",{p_dia:desafio.fecha,p_puzzle_id:desafio.id}).then(({data,error})=>{if(cancelado)return;if(error){setMensaje("No se pudo guardar el error. Reintentá para actualizar la racha.");return;}setMensaje("");if(data===false)setGuardado(true);else {setCortada(true);window.dispatchEvent(new Event("desafio-resuelto"));}});}return()=>{cancelado=true;};},[intentoFallado,session,desafio.registrable,desafio.fecha,desafio.id,reintentoError,claveError]);
  useEffect(()=>{
    if(!usuario||!jugadorId||cargandoJugador||errorJugador||ambigua||!revisada||!resuelto||intentoFallado||cortada||guardado||!desafio.registrable)return;
    let cancelado=false;
    void (async()=>{
      await Promise.resolve();if(cancelado)return;
      setEnviando(true);setMensaje("");
      try{
        const {data,error}=await supabase.rpc("registrar_desafio_resuelto",{p_dia:desafio.fecha,p_puzzle_id:desafio.id,p_nombre:nombre,p_solucion:desafio.solution}).abortSignal(AbortSignal.timeout(10000));
        if(error||data!==true)throw error??new Error("Sin confirmación");
        if(!cancelado){setGuardado(true);window.dispatchEvent(new Event("desafio-resuelto"));}
      }catch(error){if(!cancelado){const codigo=(error as {code?:string})?.code;setMensaje(codigo==="23505"?"Hay otro jugador con el mismo nombre en las rachas. Avisale al club para habilitar ambos perfiles.":"Tu resolución todavía no se pudo guardar. Comprobá la conexión y reintentá.");}}
      finally{if(!cancelado)setEnviando(false);}
    })();
    return()=>{cancelado=true;};
  },[usuario,jugadorId,nombre,cargandoJugador,errorJugador,ambigua,revisada,resuelto,intentoFallado,cortada,guardado,desafio.registrable,desafio.fecha,desafio.id,desafio.solution,reintentoGuardado]);
  if(cargando)return null;
  if(!desafio.registrable)return resuelto?<p className="mt-3 text-xs text-zinc-400">Por ahora este desafío es de práctica; la tabla de rachas se está preparando.</p>:null;
  if(!session)return <p className="text-xs text-zinc-400">Sin sesión, el desafío es de práctica. Al iniciar sesión empieza un intento nuevo con tu cuenta.</p>;
  if(guardado)return <p role="status" className="mt-3 text-xs text-emerald-300">Ya sumaste el desafío de hoy. Volvé mañana para seguir la racha.</p>;
  if(cortada||intentoFallado)return <div className="mt-3 text-xs text-amber-200"><p role="status">{cortada?"Un error cortó tu racha. El récord se conserva; mañana podés empezar otra.":"Registrando el error. Este desafío ya no suma a la racha."}</p>{mensaje&&<><p role="alert" className="mt-2">{mensaje}</p><button type="button" className="mt-2 underline" onClick={()=>setReintentoError(v=>v+1)}>Reintentar guardar el error</button></>}</div>;
  if(!jugador||cargandoJugador||errorJugador||ambigua)return <p className="text-xs text-zinc-400">Vinculá tu jugador para guardar el desafío con tu nombre del club.</p>;
  if(!resuelto)return <p className="mt-3 text-xs text-zinc-400">Resolvé la secuencia completa para sumar un día a tu racha.</p>;
  return <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3"><p className="text-xs text-zinc-400">Se guarda automáticamente para <strong className="text-zinc-200">{nombreVisible(jugador)}</strong> con tu cuenta actual.</p><p role="status" className="text-xs text-amber-200">{!revisada?"Comprobando tu desafío de hoy…":enviando?"Guardando tu resolución…":mensaje?"Falta confirmar el guardado.":"Preparando el guardado…"}</p>{mensaje&&<button type="button" disabled={enviando} onClick={()=>setReintentoGuardado(v=>v+1)} className="button-primary justify-center">Reintentar guardar</button>}{mensaje&&<p role="alert" className="text-xs text-amber-300">{mensaje}</p>}</div>;
}
