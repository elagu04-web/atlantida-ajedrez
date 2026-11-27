'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useAuth} from '@/context/AuthContext';
import {useMiJugador} from '@/context/useMiJugador';
import {useAlbumAperturas} from '@/context/useAlbumAperturas';
import {colorOnline,type PartidaOnline} from '@/lib/partidaOnline';
import {CartaApertura} from './CartaApertura';
import s from './AlbumAperturas.module.css';

export function DescubrimientoApertura({partida}:{partida:PartidaOnline}){
 const {session}=useAuth(),{jugador}=useMiJugador();
 const elegible=!!session&&!!colorOnline(partida,session.user.id)&&partida.estado.fase==='terminada'&&partida.estado.porElo===true&&partida.estado.movimientos.length>=4;
 if(!elegible||!jugador)return null;
 return <CartasDePartida key={session.user.id+':'+jugador.id+':'+partida.id} partidaId={partida.id} jugadorId={jugador.id}/>;
}
export function CartasDePartida({partidaId,jugadorId}:{partidaId:string;jugadorId:string}){
 const {cartas,cargando,error,refrescar}=useAlbumAperturas(jugadorId);
 const [indice,setIndice]=useState(0);
 const reconocidas=cartas.filter(c=>c.partidas.some(p=>p.id===partidaId)).sort((a,b)=>Number(b.partidas[0].id===partidaId)-Number(a.partidas[0].id===partidaId));
 const carta=reconocidas[indice%Math.max(1,reconocidas.length)];
 if(cargando)return <p className={s.nota} role="status">Buscando la carta de esta partida…</p>;
 if(error)return <p className={s.nota}>Tus aperturas se pueden consultar en el álbum. <button onClick={refrescar}>Reintentar</button></p>;
 if(!carta)return null;
 const nueva=carta.partidas[0].id===partidaId;
 return <section className={s.descubrimiento} aria-label="Aperturas de esta partida"><div aria-live="polite"><p className={s.kicker}>{nueva?'✦ PRIMERA APARICIÓN EN TU ÁLBUM':'OTRA PARTIDA PARA TU COLECCIÓN'}</p><h3>{nueva?'Descubriste una carta.':'Tu apertura tiene una nueva historia.'}</h3><p>{carta.nombre} · {reconocidas.length} {reconocidas.length===1?'carta reconocida':'cartas reconocidas'} en esta partida.</p></div><div key={carta.id} className={s.revelacion}><CartaApertura carta={carta}/></div>{reconocidas.length>1&&<div className={s.pasar}><button type="button" onClick={()=>setIndice(i=>(i+reconocidas.length-1)%reconocidas.length)} aria-label="Carta anterior">←</button><span>{indice%reconocidas.length+1} / {reconocidas.length}</span><button type="button" onClick={()=>setIndice(i=>(i+1)%reconocidas.length)} aria-label="Carta siguiente">→</button></div>}<Link className="text-link" href="/album?seccion=aperturas#mis-aperturas">Ver mis aperturas en el álbum →</Link></section>;
}
