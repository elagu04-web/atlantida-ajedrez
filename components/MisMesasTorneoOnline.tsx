"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
import {rpcDeCuenta} from '@/lib/rpcCuenta';
import {miMesaDeTorneo,type MiMesaDeTorneo} from '@/lib/mesaTorneoOnline';
import type {TorneoOnline,DatosTorneoOnline} from '@/lib/torneosOnline';
import s from './SalaOnline.module.css';
export function MisMesasTorneoOnline({usuario}:{usuario:string}){
 const [mesas,setMesas]=useState<MiMesaDeTorneo[]>([]),[error,setError]=useState(''),[cargando,setCargando]=useState(true);
 useEffect(()=>{
  let vigente=true,consultando=false;const abort=new AbortController();
  async function cargar(){
   if(consultando)return;consultando=true;
   try{
    const r=await rpcDeCuenta(supabase,usuario,'listar_torneos_online',{},abort.signal);if(r.error)throw r.error;
    const torneos=(r.data as TorneoOnline[]).filter(t=>t.anotado&&t.estado==='en_curso');
    const resultados=await Promise.all(torneos.map(async t=>{const r=await rpcDeCuenta(supabase,usuario,'obtener_torneo_online',{p_id:t.id},abort.signal);if(r.error)throw r.error;return miMesaDeTorneo(r.data as DatosTorneoOnline,usuario);}));
    if(vigente){setMesas(resultados.filter((m):m is MiMesaDeTorneo=>m!==null));setError('');}
   }catch{if(vigente)setError('No pudimos comprobar tus cruces. Entrá a Torneos online para ver tu mesa.');}
   finally{consultando=false;if(vigente)setCargando(false);}
  }
  void cargar();const foco=()=>{if(document.visibilityState==='visible')void cargar();};const timer=setInterval(foco,15000);window.addEventListener('focus',foco);
  return()=>{vigente=false;abort.abort();clearInterval(timer);window.removeEventListener('focus',foco);};
 },[usuario]);
 return <section className={s.mesasTorneo} aria-label="Tus partidas del torneo"><p className={s.sello}>¿Venís a jugar el torneo?</p>{cargando?<p role="status">Buscando tu mesa asignada…</p>:error?<><p role="status">{error}</p><Link className="button-primary" href="/torneos/online">Ir a mis torneos →</Link></>:mesas.length?<><h2>Tu rival y el ritmo ya están definidos.</h2><p>Entrá por tu mesa. No hace falta crear una invitación ni elegir minutos o colores.</p><div className={s.lista}>{mesas.map(m=><article className={s.mesaAsignada} key={m.torneoId}><div><small>{m.nombre} · Ronda {m.ronda}</small><h3>{m.rival?'Vos vs. '+m.rival:'Esta ronda tenés libre'}</h3><p><strong>{m.ritmo}</strong> · {m.color==='w'?'Blancas':'Negras'}{m.terminada?' · Partida terminada':''}</p></div><Link className="button-primary" href={m.href}>{m.terminada?'Ver mi partida':m.rival?'Entrar a mi mesa':'Ver el torneo'} →</Link></article>)}</div></>:<><h2>La partida del torneo se abre desde su ronda.</h2><p>El torneo prepara el rival, el color y el tiempo automáticamente.</p><Link className="button-secondary" href="/torneos/online">Buscar mi torneo →</Link></>}</section>;
}
