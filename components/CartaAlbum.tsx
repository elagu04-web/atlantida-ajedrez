/* eslint-disable @next/next/no-img-element -- Retratos y escudo originales del club. */
'use client';
import {useState} from 'react';
import {useDatosFiguritas} from '@/context/DatosFiguritasContext';
import {arteFigurita} from '@/lib/arteFiguritas';
import {nombreRareza,nombreVersion,type Figurita} from '@/lib/album';
import {CartaBrillante} from './CartaBrillante';
import s from './CartaAlbum.module.css';

function Retrato({f}:{f:Figurita}) {
  const [fallo,setFallo]=useState(false);
  const arte=arteFigurita(f);
  const escena=['especial:momento-historico','especial:ludoarte','especial:torneo-en-juego'].includes(f.baseId);
  return <div className={`${s.retrato} ${escena?s.escena:''}`} style={{backgroundImage:`url(${escena?f.foto:arte.fondo})`}} aria-hidden="true">
    <svg className={s.firma} viewBox="0 0 100 100"><polyline points={arte.puntos}/></svg>
    {!fallo?<img src={f.foto} alt="" loading="lazy" onError={()=>setFallo(true)}/>:<span className={s.iniciales}>{f.nombre.split(/\s+/).slice(0,2).map(n=>n[0]).join('')}</span>}
  </div>;
}

export function CartaAlbum({f,cantidad,seleccionar,modo='coleccion',propietario}:{f:Figurita;cantidad:number;seleccionar?:()=>void;modo?:'coleccion'|'detalle'|'sobre';propietario?:string}) {
  const obtenida=cantidad>0;
  const datos=useDatosFiguritas().get(f.jugadorId??'');
  const charly=f.baseId==='especial:charly-suerte';
  const full=obtenida&&f.version==='full-art';
  const numero=String(f.numero).padStart(2,'0');
  const subtitulo=f.serie==='Jugadores'?datos?.nombre:f.detalle;
  const interior=obtenida?<>
    <Retrato f={f}/>
    <div className={s.encabezado}><span className={s.identidad}><img src="/imagenes/logo-club.png" alt=""/><span>ATLÁNTIDA<small>AJEDREZ · EL ÁLBUM</small></span></span><span className={s.numero}>N.º {numero}</span></div>
    {full&&datos&&<div className={s.eloFull}><small>ELO ACTUAL</small><strong>{datos.elo}</strong></div>}
    <div className={s.cuerpo}>
      <span className={s.serie}>{charly?'EL AMULETO DEL CLUB':f.serie==='Campeones'?'HISTORIAS DE CAMPEONES':f.serie==='Especiales'?'HISTORIAS Y PERSONAJES':'JUGADORES DEL CLUB'}</span>
      <strong className={s.nombre}>{f.nombre}</strong>
      {!charly&&subtitulo&&subtitulo.toLocaleLowerCase('es')!==f.nombre.toLocaleLowerCase('es')&&<span className={s.subtitulo}>{subtitulo}</span>}
      {!full&&(datos?<div className={s.datos}><span className={s.elo}><small>ELO ACTUAL</small><strong>{datos.elo}</strong></span><span><small>RANKING</small><strong>{datos.ranking?`#${datos.ranking}`:'—'}</strong></span><span><small>PARTIDAS</small><strong>{datos.partidas}</strong></span></div>:<p className={s.sinDatos}>{f.jugadorId?'Actualizando datos…':charly?'Una sonrisa para acompañar cada sobre.':'Una historia de Atlántida Ajedrez.'}</p>)}
      <div className={s.pie}><span className={s.rareza}><i aria-hidden="true"/>{nombreRareza[f.rareza]}</span><span>{f.version==='normal'?'EDICIÓN CLUB':nombreVersion[f.version]}</span></div>
    </div>
  </>:<><span className={s.numero}>N.º {numero}</span><div className={s.secreto} aria-hidden="true"><span>♞</span><small>UNA HISTORIA<br/>POR DESCUBRIR</small></div><div className={s.cuerpo}><span className={s.serie}>EL ÁLBUM DEL CLUB</span><strong className={s.nombre}>{f.nombre}</strong><span className={s.subtitulo}>Todavía por encontrar</span></div></>;
  const clases=`${s.carta} ${obtenida?s[f.rareza]:s.oculta} ${full?s.fullArt:''} ${obtenida&&charly?s.charly:''}`;
  const carta=seleccionar?<button type="button" className={clases} onClick={seleccionar} aria-label={`${f.nombre}, número ${f.numero}. ${obtenida?`${nombreRareza[f.rareza]}, ${nombreVersion[f.version]}, ${cantidad} copia(s)`:'Sin descubrir'}`}>{interior}</button>:<div className={clases}>{interior}</div>;
  return <div className={`${s.contenedor} ${s[modo]}`} data-figurita={obtenida?'obtenida':'oculta'}>
    {obtenida?<CartaBrillante className={s.inclinable} inclinacion={14} acabado={f.version} tactil>{carta}</CartaBrillante>:carta}
    {modo!=='sobre'&&<div className={s.estado}><span>{obtenida?(propietario?`✓ Álbum de ${propietario}`:'✓ En tu álbum'):'POR DESCUBRIR'}</span>{cantidad>1&&<span>{cantidad-1} repetida{cantidad>2?'s':''}</span>}</div>}
  </div>;
}
