"use client";
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {supabase} from '@/lib/supabase';
import {colorOnline,type PartidaOnline} from '@/lib/partidaOnline';
export function PartidasOnlineEntrenamiento({usuario,elegir,disabled}:{usuario:string;elegir:(pgn:string,color:'w'|'b')=>void;disabled:boolean}){
 const [partidas,setPartidas]=useState<PartidaOnline[]>([]),[mensaje,setMensaje]=useState('Buscando tus partidas online…');
 const llamada=useRef(elegir),cargada=useRef('');
 useEffect(()=>{llamada.current=elegir;},[elegir]);
 useEffect(()=>{
  let vivo=true;
  void supabase.from('online_partidas').select('*').or(`creador_id.eq.${usuario},rival_id.eq.${usuario}`).eq('estado->>fase','terminada').order('actualizada',{ascending:false}).limit(30).then(({data,error})=>{
   if(!vivo)return;if(error){setMensaje('No pudimos consultar las partidas online. Podés descargar su PGN desde la sala.');return;}setPartidas((data??[]) as PartidaOnline[]);setMensaje('Las partidas entre usuarios terminadas se guardan en tu cuenta.');
  });return()=>{vivo=false;};
 },[usuario]);
 useEffect(()=>{
  const solicitada=new URLSearchParams(window.location.search).get('partidaOnline');if(!solicitada||disabled||cargada.current===solicitada)return;
  const p=partidas.find(x=>x.id===solicitada),color=p&&colorOnline(p,usuario);
  if(p&&color){cargada.current=solicitada;llamada.current(p.estado.pgn,color);return;}
  if(!/^[0-9a-f-]{36}$/i.test(solicitada))return;
  let vivo=true;void supabase.from('online_partidas').select('*').eq('id',solicitada).eq('estado->>fase','terminada').maybeSingle().then(({data,error})=>{if(!vivo||cargada.current===solicitada)return;const c=data&&colorOnline(data as PartidaOnline,usuario);if(error||!data||!c){setMensaje('No encontramos esa partida en tu cuenta. Podés elegir otra de tu historial.');return;}cargada.current=solicitada;llamada.current(data.estado.pgn,c);});return()=>{vivo=false;};
 },[partidas,disabled,usuario]);
 return <section className="training-bot-games"><p className="eyebrow">Contra tus compañeros</p><h3>Tus partidas online</h3><p>{mensaje}</p><Link className="text-link" href="/jugar/partidas">Ver todas mis partidas guardadas →</Link>{partidas.length>0&&<div className="training-bot-game-list">{partidas.slice(0,10).map(p=><article key={p.id} className="training-bot-game"><strong>{p.estado.blancas} · {p.estado.negras}</strong><p>{p.estado.ritmo} · {p.estado.porElo?"Por Elo Atlántida":"Amistosa"} · {p.estado.resultado}</p><button className="button-secondary" disabled={disabled} onClick={()=>{const color=colorOnline(p,usuario);if(color)elegir(p.estado.pgn,color);}}>Revisar mi partida online →</button></article>)}</div>}</section>;
}
