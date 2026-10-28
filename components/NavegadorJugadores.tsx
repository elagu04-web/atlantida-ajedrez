"use client";

import Link from 'next/link';
import {useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {nombreVisible} from '@/lib/players';
import {retratoJugador} from '@/lib/retratosJugadores';
import type {JugadorEnVivo} from '@/lib/elo';
import s from './NavegadorJugadores.module.css';

export function NavegadorJugadores({jugadores,actual}:{jugadores:JugadorEnVivo[];actual:string}){
 const router=useRouter();
 const lista=useMemo(()=>[...jugadores].sort((a,b)=>b.eloAtlantida-a.eloAtlantida||a.nombre.localeCompare(b.nombre,'es')),[jugadores]);
 const indice=lista.findIndex(j=>j.id===actual);
 if(lista.length<2||indice<0)return null;
 const anterior=lista[(indice-1+lista.length)%lista.length],siguiente=lista[(indice+1)%lista.length];
 function vecino(j:JugadorEnVivo,atras:boolean){
  const foto=retratoJugador(j).miniatura,nombre=nombreVisible(j);
  return <Link className={`${s.vecino} ${atras?s.anterior:s.siguiente}`} href={'/jugadores/'+j.id} scroll={false} aria-label={`${atras?'Jugador anterior':'Jugador siguiente'}: ${nombre}`}>
   <span className={s.flecha} aria-hidden="true">{atras?'←':'→'}</span>
   {foto?// eslint-disable-next-line @next/next/no-img-element
    <img src={foto} alt="" width={36} height={36}/>:<span className={s.inicial} aria-hidden="true">{nombre.charAt(0)}</span>}
   <span className={s.nombre}><small>{atras?'Anterior':'Siguiente'}</small><strong>{nombre}</strong></span>
  </Link>;
 }
 return <nav className={s.navegador} aria-label="Recorrer los perfiles de jugadores">
  {vecino(anterior,true)}
  <div className={s.selector}>
   <label htmlFor="perfil-jugador">Explorá el plantel <span>{indice+1} / {lista.length}</span></label>
   <select id="perfil-jugador" value={actual} onChange={e=>{if(lista.some(j=>j.id===e.target.value))router.push('/jugadores/'+e.target.value,{scroll:false});}}>
    {lista.map(j=><option key={j.id} value={j.id}>{nombreVisible(j)} · {j.eloAtlantida}</option>)}
   </select>
   <p>Todos los jugadores · por Elo</p>
  </div>
  {vecino(siguiente,false)}
 </nav>;
}
