'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
import s from './NavegadorPartidas.module.css';
type Navegacion={posicion:number;total:number;anterior:string|null;siguiente:string|null};
export function NavegadorPartidas({jugador,partida}:{jugador:string;partida:string}) {
 const [estado,setEstado]=useState<{datos:Navegacion|null;error:boolean;listo:boolean}>({datos:null,error:false,listo:false}),[revision,setRevision]=useState(0);
 useEffect(()=>{let vivo=true;const control=new AbortController();void Promise.resolve(supabase.rpc('navegacion_partidas_jugador',{p_jugador:jugador,p_partida:partida}).abortSignal(control.signal)).then(({data,error})=>{if(vivo)setEstado({datos:error?null:data,error:!!error,listo:true});}).catch(()=>{if(vivo)setEstado({datos:null,error:true,listo:true});});return()=>{vivo=false;control.abort();};},[jugador,partida,revision]);
 if(!estado.listo)return <span className={s.estado} role="status">Buscando otras partidas…</span>;
 if(estado.error)return <div className={s.estado}><span>No pudimos cargar las otras partidas.</span><button onClick={()=>{setEstado({datos:null,error:false,listo:false});setRevision(n=>n+1);}}>Reintentar</button></div>;
 const n=estado.datos;if(!n)return null;
 return <nav className={s.navegacion} aria-label="Otras partidas de este jugador">
  {n.anterior?<Link aria-label="Partida anterior" href={`/partidas/${n.anterior}?jugador=${jugador}`}>← Anterior</Link>:<button aria-label="Partida anterior" disabled>← Anterior</button>}
  <span>Partida <strong>{n.posicion}</strong> de {n.total}</span>
  {n.siguiente?<Link aria-label="Partida siguiente" href={`/partidas/${n.siguiente}?jugador=${jugador}`}>Siguiente →</Link>:<button aria-label="Partida siguiente" disabled>Siguiente →</button>}
 </nav>;
}
