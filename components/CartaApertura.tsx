/* eslint-disable @next/next/no-img-element -- Piezas SVG locales Cburnett, igual que los tableros del club. */
'use client';
import {useMemo} from 'react';
import {Chess} from 'chess.js';
import {CartaBrillante} from './CartaBrillante';
import type {CartaApertura as DatosCarta} from '@/lib/albumAperturas';
import s from './AlbumAperturas.module.css';

export function CartaApertura({carta,seleccionar}:{carta:DatosCarta;seleccionar?:()=>void}){
 const casillas=useMemo(()=>new Chess(carta.fen).board().flat(),[carta.fen]);
 const singular={apertura:'Apertura',defensa:'Defensa',gambito:'Gambito',sistema:'Sistema'}[carta.tipo];
 const interior=<>
  <div className={s.identidad}><span>{carta.rareza==='mitica'?'MÍTICA · RAMA COMPLETA':carta.rareza==='rara'?`RARA${carta.acabado==='foil'?' · FOIL':''}`:'COMÚN · SIN BRILLO'}</span><b>{carta.eco??'CLUB'}</b></div>
  <div className={s.arte} aria-hidden="true"><span className={s.orbita}/><span className={s.emblema}>♞</span><div className={s.miniTablero}>{casillas.map((p,i)=><span key={i} className={(Math.floor(i/8)+i%8)%2?s.oscura:s.clara}>{p&&<img src={`/piezas/cburnett/${p.color}${p.type.toUpperCase()}.svg`} alt="" loading="lazy" draggable={false}/>}<small className={s.coordenada}>{i%8===0?8-Math.floor(i/8):''}{i>=56?'abcdefgh'[i%8]:''}</small></span>)}</div><small>{carta.eco?'LA POSICIÓN QUE DEFINE ESTA CARTA':'TU FORMACIÓN EN LA PARTIDA'}</small></div>
  <div className={s.datosCarta}><span className={s.tipo}>{singular} · colección personal</span><h3>{carta.nombre}</h3><p className={s.lineaCarta} title={carta.pgn}>{carta.ramaCompleta?`Rama completa · ${carta.ramaCompleta.cartas} posiciones`:carta.pgn}</p><div className={s.cifras}><span><b>{carta.partidas.length}</b> {carta.partidas.length===1?'partida':'partidas'}</span><span><b>{carta.victorias}</b> {carta.victorias===1?'victoria':'victorias'}</span></div><p>{carta.blancas>0&&`♔ ${carta.blancas} con blancas`}{carta.blancas>0&&carta.negras>0?' · ':''}{carta.negras>0&&`♚ ${carta.negras} con negras`}</p><span className={s.firmaCarta}>JUGADA A JUGADA <span>✦</span> EL ÁLBUM DEL CLUB</span></div>
 </>;
 const contenido=seleccionar?<button type="button" className={s.carta} onClick={seleccionar} aria-label={`Ver ${carta.nombre}, ${carta.partidas.length} ${carta.partidas.length===1?'partida':'partidas'}`}>{interior}</button>:<div className={s.carta}>{interior}</div>;
 const clases=`${s.inclinable} ${s[carta.tipo]} ${carta.rareza==='mitica'?s.mitica:carta.rareza==='comun'?s.comun:''}`;
 return carta.acabado==='foil'?<CartaBrillante className={clases} inclinacion={12} acabado="foil" distinciones={carta.rareza==='mitica'?['Rama completa']:[]} tactil>{contenido}</CartaBrillante>:<div className={clases}>{contenido}</div>;
}
