/* eslint-disable @next/next/no-img-element -- Piezas SVG locales Cburnett, igual que los tableros del club. */
'use client';
import {useMemo} from 'react';
import {Chess} from 'chess.js';
import {CartaBrillante} from './CartaBrillante';
import type {CartaApertura as DatosCarta} from '@/lib/albumAperturas';
import s from './AlbumAperturas.module.css';

export function CartaApertura({carta,seleccionar}:{carta:DatosCarta;seleccionar?:()=>void}){
 const color=carta.partidas[0]?.color??'w';
 const casillas=useMemo(()=>{const filas=new Chess(carta.fen).board().flat();return color==='b'?filas.reverse():filas;},[carta.fen,color]);
 const singular={apertura:'Apertura',defensa:'Defensa',gambito:'Gambito',sistema:'Sistema'}[carta.tipo];
 const interior=<>
  <div className={s.identidad}><span>ATLÁNTIDA AJEDREZ</span><b>{carta.eco??'CLUB'}</b></div>
  <div className={s.arte} aria-hidden="true"><span className={s.orbita}/><span className={s.emblema}>♞</span><div className={s.miniTablero}>{casillas.map((p,i)=><span key={i} className={(Math.floor(i/8)+i%8)%2?s.oscura:s.clara}>{p&&<img src={`/piezas/cburnett/${p.color}${p.type.toUpperCase()}.svg`} alt="" loading="lazy" draggable={false}/>}</span>)}</div><small>{color==='w'?'MIRADA DE BLANCAS':'MIRADA DE NEGRAS'}</small></div>
  <div className={s.datosCarta}><span className={s.tipo}>{singular} · colección personal</span><h3>{carta.nombre}</h3><div className={s.cifras}><span><b>{carta.partidas.length}</b> {carta.partidas.length===1?'partida':'partidas'}</span><span><b>{carta.victorias}</b> {carta.victorias===1?'victoria':'victorias'}</span></div><p>{carta.blancas>0&&`♔ ${carta.blancas} con blancas`}{carta.blancas>0&&carta.negras>0?' · ':''}{carta.negras>0&&`♚ ${carta.negras} con negras`}</p><span className={s.firmaCarta}>JUGADA A JUGADA <span>✦</span> EL ÁLBUM DEL CLUB</span></div>
 </>;
 return <CartaBrillante className={`${s.inclinable} ${s[carta.tipo]}`} inclinacion={12} acabado="foil" tactil>{seleccionar?<button type="button" className={s.carta} onClick={seleccionar} aria-label={`Ver ${carta.nombre}, ${carta.partidas.length} ${carta.partidas.length===1?'partida':'partidas'}`}>{interior}</button>:<div className={s.carta}>{interior}</div>}</CartaBrillante>;
}
