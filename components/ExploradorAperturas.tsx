'use client';
import {useState} from 'react';
import {Chess} from 'chess.js';
import {crearArbolAperturas,posicionDeRuta,progresoRama} from '@/lib/arbolAperturas';
import type {CartaApertura} from '@/lib/albumAperturas';
import {gradoApertura} from '@/lib/recompensasAperturas';
import {TableroApertura} from './TableroApertura';
import s from './ExploradorAperturas.module.css';

const normalizar=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function ExploradorAperturas({cartas,nombreJugador,verCarta,inicioId}:{cartas:CartaApertura[];nombreJugador?:string;verCarta:(c:CartaApertura)=>void;inicioId?:string|null}){
 const [arbol]=useState(()=>crearArbolAperturas()),[ruta,setRuta]=useState(()=>inicioId?arbol.rutasPorCarta.get(inicioId.replace('mitica:',''))??'':''),[busqueda,setBusqueda]=useState(''),[soloJugadas,setSoloJugadas]=useState(false),[color,setColor]=useState<'w'|'b'>('w'),[aviso,setAviso]=useState('');
 const propias=new Map(cartas.map(c=>[c.id,c])),ids=new Set(propias.keys());
 const nodo=arbol.nodos.get(ruta)!,chess=posicionDeRuta(ruta),historial=chess.history(),progreso=progresoRama(nodo,ids);
 let ancestro=nodo;while(!ancestro.carta&&ancestro.padre!==null)ancestro=arbol.nodos.get(ancestro.padre)!;
 const familia=ancestro.carta?.nombre??'Elegí tu primera jugada';
 const siguientes=nodo.hijos.map(r=>{const hijo=arbol.nodos.get(r)!,c=new Chess(chess.fen()),u=hijo.uci,m=c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});return {hijo,san:m.san,progreso:progresoRama(hijo,ids)};}).sort((a,b)=>b.progreso.conseguidas-a.progreso.conseguidas||b.progreso.total-a.progreso.total||a.san.localeCompare(b.san));
 const consulta=normalizar(busqueda.trim()),resultados=consulta?[...arbol.nodos.values()].filter(n=>n.carta&&normalizar(n.carta.nombre+' '+n.carta.original+' '+n.carta.eco).includes(consulta)).slice(0,30):[];
 const cambiar=(r:string)=>{setRuta(r);setAviso('');setBusqueda('');};
 function mover(from:string,to:string,promocion?:string){const u=from+to+(promocion??''),destino=nodo.hijos.find(r=>arbol.nodos.get(r)!.uci===u);if(!destino){setAviso('Esa jugada no está en esta rama del catálogo. Elegí una de las continuaciones para seguir explorando.');return false;}cambiar(destino);return true;}
 const conseguida=nodo.carta?propias.get(nodo.carta.id):null;
 const victoriaPropia=!!conseguida?.partidas.some(p=>gradoApertura(conseguida,p)===2);
 const jugadas=siguientes.filter(h=>!soloJugadas||h.progreso.conseguidas>0);
 return <div className={s.explorador}>
  <div className={s.intro}><div><p className={s.kicker}>EL MAPA DE LAS APERTURAS</p><h3>Una jugada abre otro camino.</h3><p>Recorré las continuaciones en el tablero. Cada posición con nombre que alcances en una partida oficial se convierte en una carta, desde la apertura hasta sus variantes.</p></div><div className={s.global}><strong>{progresoRama(arbol.nodos.get('')!,ids).conseguidas}<small> / {arbol.nodos.get('')!.descendientes.length}</small></strong><span>posiciones del catálogo conseguidas</span></div></div>
  <label className={s.buscador}><span>Buscar una apertura o variante</span><input type="search" placeholder="Siciliana, Najdorf, Londres, B90…" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></label>
  {busqueda.trim()&&<div className={s.resultados} aria-label="Resultados de aperturas">{resultados.length?resultados.map(n=><button key={n.ruta} onClick={()=>cambiar(n.ruta)}><span>{n.carta!.nombre}</span><small>{n.carta!.eco} · {ids.has(n.carta!.id)?'✓ Conseguida':'Por descubrir'} · {n.carta!.pgn}</small></button>):<p>No encontramos esa apertura. Probá otro nombre o su código ECO.</p>}{resultados.length===30&&<p>Mostrando 30 coincidencias. Escribí un nombre más específico para afinar la búsqueda.</p>}</div>}
  <div className={s.recorrido}>
   <div className={s.zonaTablero}><div className={s.controles}><button onClick={()=>cambiar('')} disabled={!ruta}>↶ Inicio</button><button onClick={()=>cambiar(nodo.padre??'')} disabled={!ruta}>← Atrás</button><button onClick={()=>setColor(c=>c==='w'?'b':'w')}>Girar tablero ↻</button></div><TableroApertura chess={chess} color={color} habilitado mover={mover}/><p className={s.ayuda}>Arrastrá una pieza, tocá origen y destino o elegí una continuación.</p><div className={s.jugadas} aria-label="Jugadas de esta apertura"><button aria-current={!ruta?'step':undefined} onClick={()=>cambiar('')}>Inicio</button>{historial.map((san,i)=>{const r=ruta.split(' ').slice(0,i+1).join(' ');return <button key={r} aria-current={r===ruta?'step':undefined} onClick={()=>cambiar(r)}>{i%2===0?`${Math.floor(i/2)+1}. `:''}{san}</button>;})}</div><p role="status" className={s.aviso}>{aviso}</p></div>
   <div className={s.rama}>
    <header><p className={s.kicker}>{nodo.carta?.eco??'EXPLORAR'} · {nodo.profundidad?`PASO ${nodo.profundidad}`:'POSICIÓN INICIAL'}</p><h3>{familia}</h3>{nodo.carta?<div className={conseguida?s.obtenida:s.pendiente}><span>{conseguida?'✦ Carta conseguida':'♧ Carta por descubrir'}</span>{conseguida?<><p>Apareció en {conseguida.partidas.length} {conseguida.partidas.length===1?'partida':'partidas'}{nombreJugador?` de ${nombreJugador}`:''}.</p><button onClick={()=>verCarta(conseguida)}>Ver carta y partidas →</button></>:<p>{nombreJugador?`${nombreJugador} todavía no la tiene.`:'Todavía no la tenés.'} Se consigue al alcanzar esta posición en una partida por Elo con jugadas guardadas.</p>}</div>:<p className={s.ayuda}>{ruta?'Posición de paso. Seguí avanzando para descubrir otra variante con su propia carta.':'Comenzá por 1.e4, 1.d4 u otra primera jugada.'}</p>}</header>
    <div className={s.progreso}><div><strong>{progreso.conseguidas} de {progreso.total}</strong><span>cartas en esta rama</span></div><progress max={progreso.total||1} value={progreso.conseguidas}/><small>{progreso.total&&progreso.conseguidas===progreso.total?'¡Rama completa!':`Faltan ${progreso.total-progreso.conseguidas} posiciones por descubrir.`}</small></div>
    {nodo.carta&&progreso.total>=3&&<div className={s.premio}><strong>{progreso.conseguidas===progreso.total&&victoriaPropia?'✦ Mítica conseguida':'✧ La mítica de esta rama'}</strong><p>{progreso.conseguidas} / {progreso.total} posiciones · {victoriaPropia?'✓ Victoria con tu apertura':'Falta una victoria con tu apertura'}</p><small>Completá esta rama y ganá una partida haciendo la jugada que la define.</small></div>}
    <div className={s.tituloContinuaciones}><h4>Continuaciones</h4><label><input type="checkbox" checked={soloJugadas} onChange={e=>setSoloJugadas(e.target.checked)}/> {nombreJugador?'Con cartas suyas':'Con mis cartas'}</label></div>
    <div className={s.continuaciones}>{jugadas.map(({hijo,san,progreso:p})=><button key={hijo.ruta} onClick={()=>cambiar(hijo.ruta)}><b>{chess.turn()==='w'?`${chess.moveNumber()}.`:`${chess.moveNumber()}…`} {san}</b><span><strong>{hijo.carta?.nombre??'Hacia nuevas variantes'}</strong><small>{ids.has(hijo.carta?.id??'')?'✓ Conseguida · ':''}{p.conseguidas} / {p.total} cartas en esta rama</small></span><i aria-hidden="true">→</i></button>)}</div>
    {!jugadas.length&&<p className={s.final}>{nodo.hijos.length?'Esta rama todavía no tiene cartas conseguidas. Desmarcá el filtro para explorar.':'Llegaste al final de esta variante en nuestro catálogo. Podés volver atrás y descubrir otro camino.'}</p>}
   </div>
  </div>
  <p className={s.nota}>Explorar no entrega cartas. Se incorporan con las partidas guardadas, también las anteriores. El progreso cuenta las posiciones con nombre de este catálogo; una transposición puede conseguir una carta por un orden de jugadas diferente.</p>
 </div>;
}
