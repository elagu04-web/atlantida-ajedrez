"use client";
import {useEffect,useRef} from 'react';
import {useSearchParams} from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {aniosHistoria,publicacionesHistoria,rutaHistoria,hitosHistoria} from '@/lib/historiaClub';
import s from './HistoriaClub.module.css';

const resumenes:Record<number,string>={2010:'Los primeros torneos y los matches con el Club Solís de Pando.',2011:'El club sigue creciendo y llega la afiliación definitiva a la FUA.',2012:'Torneos internos, encuentros y un Nacional Sub 20 en Atlántida.',2013:'El Interdepartamental, nuevos socios y muchos tableros compartidos.',2014:'La actividad en la Casa de la Cultura y nuevas generaciones que se acercan.',2015:'Torneos, simultáneas y encuentros en la Biblioteca Idea Vilariño.',2016:'Ajedrez en Parque del Plata y los torneos de Atlántida.',2017:'Los torneos de verano e invierno siguen reuniendo al club.',2018:'Encuentros, talleres y participaciones de nuestros jugadores.',2019:'Atlántida recibe al Nacional Amateur y el club sigue compitiendo.',2020:'Encuentros en la plaza, partidas a distancia y cambios en la actividad.',2021:'Volver a encontrarnos alrededor del tablero.',2022:'Más torneos, análisis de partidas y ajedrez gigante en la plaza.',2023:'Nuevos torneos y el Abierto por el aniversario de LIFA.'};
export function LineaTiempoHistoria(){
 const parametros=useSearchParams(),solicitado=Number(parametros.get('anio'));
 const anio=aniosHistoria.includes(solicitado)?solicitado:aniosHistoria[0],indice=aniosHistoria.indexOf(anio);
 const carril=useRef<HTMLDivElement>(null),botones=useRef(new Map<number,HTMLButtonElement>());
 const entradas=publicacionesHistoria.filter(p=>p.anio===anio),ordenadas=[...entradas].reverse();
 const destacado=(anio===2010?entradas.find(p=>p.id==='8714087108985587595'):undefined)||ordenadas.find(p=>p.fotos.length)||ordenadas[0],foto=destacado?.fotos[0],hito=hitosHistoria.find(h=>Number(h.anio)===anio);
 function seleccionar(valor:string){const q=new URLSearchParams(window.location.search);if(valor)q.set('anio',valor);else q.delete('anio');window.history.replaceState(null,'','/historia'+(q.size?'?'+q:'')+'#recorrido-historia');}
 useEffect(()=>{
  const r=carril.current,b=botones.current.get(anio);if(!r||!b)return;
  const centrar=()=>r.scrollTo({left:b.offsetLeft-r.clientWidth/2+b.clientWidth/2,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  centrar();const cambios=new ResizeObserver(centrar);cambios.observe(r);return()=>cambios.disconnect();
 },[anio]);
 return <section className={s.lineaTiempo} id="recorrido-historia" aria-labelledby="titulo-linea-tiempo">
  <div className={s.tituloSeccion}><div><p className="eyebrow">De 2010 en adelante</p><h2 id="titulo-linea-tiempo">Nuestra historia, <em>año por año.</em></h2></div><p>Elegí un año para recorrer sus encuentros, fotos y noticias. En el celular también podés deslizar la línea de tiempo.</p></div>
  <div className={s.controlesLinea}><button type="button" disabled={!indice} onClick={()=>seleccionar(String(aniosHistoria[indice-1]))} aria-label="Ir al año anterior">←</button><button type="button" onClick={()=>seleccionar('')} aria-pressed={!parametros.get('anio')}>Todo el recorrido</button><button type="button" disabled={indice===aniosHistoria.length-1} onClick={()=>seleccionar(String(aniosHistoria[indice+1]))} aria-label="Ir al año siguiente">→</button></div>
  <div ref={carril} className={s.carrilTiempo} role="group" aria-label="Años de la historia del club">{aniosHistoria.map(a=><button type="button" key={a} ref={el=>{if(el)botones.current.set(a,el);else botones.current.delete(a);}} onClick={()=>seleccionar(String(a))} aria-pressed={a===anio}><span className={s.puntoTiempo}/><strong>{a}</strong><small>{publicacionesHistoria.filter(p=>p.anio===a).length} recuerdos</small></button>)}</div>
  <div className={s.recuerdoAnual}>
   {foto?<Link href={rutaHistoria(destacado)} className={s.imagenAnual}><Image src={foto.mini} alt={destacado.titulo+', '+anio} width={foto.ancho} height={foto.alto} unoptimized/></Link>:<div className={s.anioSinFoto} aria-hidden="true">{anio}</div>}
   <div><p className="eyebrow">{anio} · {entradas.length} recuerdos del club</p><h3>{hito?.titulo||resumenes[anio]}</h3>{hito&&<p>{hito.texto}</p>}<Link href={rutaHistoria(destacado)} className={s.recuerdoDestacado}>{destacado.titulo} ↗</Link><a className={s.verAnio} href="#archivo-historia" onClick={()=>seleccionar(String(anio))}>Ver las noticias de {anio} ↓</a></div>
  </div>
 </section>;
}
