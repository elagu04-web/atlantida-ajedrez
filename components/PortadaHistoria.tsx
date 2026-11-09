"use client";
import {useEffect,useState,useSyncExternalStore} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type {FotoHistoria} from '@/lib/historiaClub';
import s from './HistoriaClub.module.css';

export type RecuerdoPortada={foto:FotoHistoria;anio:number;descripcion:string;ruta:string};
function suscribirMovimiento(cb:()=>void){const m=window.matchMedia('(prefers-reduced-motion: reduce)');m.addEventListener('change',cb);return()=>m.removeEventListener('change',cb);}
export function PortadaHistoria({recuerdos}:{recuerdos:RecuerdoPortada[]}){
 const [indice,setIndice]=useState(0),[pausa,setPausa]=useState(false);
 const reducir=useSyncExternalStore(suscribirMovimiento,()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches,()=>false);
 const avanzar=()=>setIndice(i=>recuerdos.length<2?i:(i+1+Math.floor(Math.random()*(recuerdos.length-1)))%recuerdos.length);
 useEffect(()=>{
  if(pausa||reducir||recuerdos.length<2)return;
  const timer=window.setInterval(()=>{if(!document.hidden)setIndice(i=>(i+1+Math.floor(Math.random()*(recuerdos.length-1)))%recuerdos.length);},30000);
  return()=>window.clearInterval(timer);
 },[pausa,reducir,recuerdos.length,indice]);
 const recuerdo=recuerdos[indice];if(!recuerdo)return null;
 return <div className={s.collage}>
  <Image key={recuerdo.foto.src} className={s.fotoRotativa} src={recuerdo.foto.src} alt={recuerdo.descripcion.replace(/\.$/,'')+', '+recuerdo.anio} width={recuerdo.foto.ancho} height={recuerdo.foto.alto} unoptimized loading={indice===0?'eager':'lazy'}/>
  <div className={s.controlPortada}>{!reducir&&<button type="button" aria-pressed={pausa} onClick={()=>setPausa(v=>!v)} aria-label={pausa?'Continuar recorrido de fotos':'Pausar recorrido de fotos'}>{pausa?'▶ Continuar':'Ⅱ Pausar'}</button>}<button type="button" onClick={avanzar} aria-label="Mostrar otra foto del archivo">Otra foto →</button></div>
  <div className={s.selloFoto}><strong>{recuerdo.anio}</strong><Link href={recuerdo.ruta}>{recuerdo.descripcion}<small>Ver este recuerdo ↗</small></Link></div>
  {!reducir&&!pausa&&<div key={'tiempo-'+indice} className={s.progresoPortada} aria-hidden="true"/>}
 </div>;
}
