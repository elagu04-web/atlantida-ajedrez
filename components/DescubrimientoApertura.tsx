'use client';
import {useEffect,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
import {useMiJugador} from '@/context/useMiJugador';
import {useAlbumAperturas} from '@/context/useAlbumAperturas';
import {colorOnline,type PartidaOnline} from '@/lib/partidaOnline';
import {SobresAperturas} from './SobresAperturas';
import s from './AlbumAperturas.module.css';

export function DescubrimientoApertura({partida}:{partida:PartidaOnline}){
 const {session}=useAuth(),{jugador}=useMiJugador();
 const elegible=!!session&&!!colorOnline(partida,session.user.id)&&partida.estado.fase==='terminada'&&partida.estado.movimientos.length>=4;
 if(!elegible||!jugador)return null;
 return <CartasDePartida key={session.user.id+':'+jugador.id+':'+partida.id} partidaId={partida.id} jugadorId={jugador.id}/>;
}
export function CartasDePartida({partidaId,jugadorId}:{partidaId:string;jugadorId:string}){
 const {cartas,miticas,partidas,cargando,error,refrescar}=useAlbumAperturas(jugadorId),[intentos,setIntentos]=useState(0);
 const guardada=partidas.some(p=>p.id===partidaId);
 useEffect(()=>{if(cargando||error||guardada||intentos>=4)return;const t=setTimeout(()=>{setIntentos(n=>n+1);refrescar();},2000*(intentos+1));return()=>clearTimeout(t);},[cargando,error,guardada,intentos,refrescar]);
 if(cargando)return <p className={s.nota} role="status">Preparando el sobre de esta partida…</p>;
 if(error)return <p className={s.nota}>Tus aperturas se pueden consultar en el álbum. <button onClick={refrescar}>Reintentar</button></p>;
 if(!guardada)return <p className={s.nota} role="status">Esperando que el resultado quede registrado para preparar tu sobre. <button onClick={()=>{setIntentos(0);refrescar();}}>Volver a comprobar</button></p>;
 return <SobresAperturas cartas={cartas} miticas={miticas} partidaId={partidaId}/>;
}
