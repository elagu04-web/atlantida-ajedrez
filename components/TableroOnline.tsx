"use client";
import {memo,useEffect,useMemo,useState,type CSSProperties} from 'react';
import {Chess,type Square} from 'chess.js';
import {Chessboard} from 'react-chessboard';
import {destinoTablero} from '@/lib/interaccionTablero';
import {destinosPremovimiento,normalizarPremovimiento,resolverPremovimiento,type PremovimientoOnline} from '@/lib/premovimientoOnline';
import styles from './TallerAperturas.module.css';
type Props={mesa:string;ply:number;chess:Chess;visible:Chess;color:'w'|'b';habilitado:boolean;puedePremover:boolean;mover:(from:string,to:string,promotion?:string)=>boolean};
export const TableroOnline=memo(function TableroOnline({mesa,ply,chess,visible,color,habilitado,puedePremover,mover}:Props){
 const [seleccion,setSeleccion]=useState<{square:Square;fen:string}|null>(null);
 const [promocion,setPromocion]=useState<{from:string;to:string;fen:string}|null>(null);
 const [pre,setPre]=useState<PremovimientoOnline|null>(null),[aviso,setAviso]=useState('');
 const fen=chess.fen(),seleccionActual=seleccion?.fen===fen?seleccion.square:null,promocionActual=promocion?.fen===fen?promocion:null;
 const interactivo=habilitado||puedePremover;
 useEffect(()=>{
  const cancelar=()=>{setPre(null);setSeleccion(null);setPromocion(null);};
  const ocultar=()=>{if(document.visibilityState==='hidden')cancelar();};
  window.addEventListener('offline',cancelar);document.addEventListener('visibilitychange',ocultar);
  return()=>{window.removeEventListener('offline',cancelar);document.removeEventListener('visibilitychange',ocultar);};
 },[]);
 useEffect(()=>{
  if(!pre)return;
  const decision=resolverPremovimiento(pre,mesa,ply,chess,color);
  let vigente=true;
  // Never replay a queued move after a disconnect, resync failure or stale ply.
  void Promise.resolve().then(()=>{
   if(!vigente)return;
   if(!interactivo||decision==='cancelar'){setPre(null);setAviso('Premove cancelado. Revisá la posición.');return;}
   if(decision==='ejecutar'&&habilitado&&document.visibilityState==='visible'&&navigator.onLine){
    setPre(null);setSeleccion(null);setAviso('');mover(pre.uci.slice(0,2),pre.uci.slice(2,4),pre.uci[4]);
   }
  });
  return()=>{vigente=false;};
 },[pre,mesa,ply,chess,color,habilitado,interactivo,mover]);
 const estilos=useMemo(()=>{
  const s:Record<string,CSSProperties>={};
  if(pre&&pre.mesa===mesa)for(const sq of [pre.uci.slice(0,2),pre.uci.slice(2,4)])s[sq]={backgroundColor:'#986de477',boxShadow:'inset 0 0 0 3px #d4b3ff'};
  if(seleccionActual&&interactivo){
   s[seleccionActual]={backgroundColor:puedePremover?'#986de490':'#e4be7180'};
   const destinos=puedePremover?destinosPremovimiento(chess,color,seleccionActual):chess.moves({square:seleccionActual,verbose:true}).map(m=>m.to);
   for(const to of destinos)s[to]={...s[to],backgroundImage:'radial-gradient(circle, #173f3baa 0 15%, transparent 17%)'};
  }
  return s;
 },[chess,color,interactivo,mesa,pre,puedePremover,seleccionActual]);
 function cancelar(){setPre(null);setSeleccion(null);setPromocion(null);setAviso('');}
 function confirmar(from:string,to:string,promotion?:string){
  setPromocion(null);setSeleccion(null);setAviso('');
  if(puedePremover){setPre({mesa,ply,uci:from+to+(promotion??'')});return false;}
  cancelar();return habilitado?mover(from,to,promotion):false;
 }
 function elegir(from:string,to:string){
  const destino=puedePremover?normalizarPremovimiento(chess,color,from,to):destinoTablero(chess,from,to);
  if(!destino)return false;
  if(chess.get(from as Square)?.type==='p'&&[1,8].includes(Number(destino[1]))){setPromocion({from,to:destino,fen});setSeleccion(null);return false;}
  return confirmar(from,destino);
 }
 return <div onKeyDown={ev=>{if(ev.key==='Escape')cancelar();}} onContextMenu={ev=>{ev.preventDefault();cancelar();}}>
  <div className={`${styles.tablero} training-board play-board`}><Chessboard options={{id:'online-'+mesa,position:visible.fen(),boardOrientation:color==='w'?'white':'black',allowDragging:interactivo&&!promocionActual,allowAutoScroll:false,animationDurationInMs:100,lightSquareStyle:{backgroundColor:'#f0e6ce'},darkSquareStyle:{backgroundColor:'#638480'},squareStyles:estilos,allowDrawingArrows:false,
   canDragPiece:({square})=>interactivo&&!promocionActual&&!!square&&chess.get(square as Square)?.color===color,
   onPieceDrop:({sourceSquare,targetSquare})=>interactivo&&targetSquare&&!promocionActual?elegir(sourceSquare,targetSquare):false,
   onSquareClick:({square})=>{if(!interactivo||promocionActual)return;if(seleccionActual&&(puedePremover?normalizarPremovimiento(chess,color,seleccionActual,square):destinoTablero(chess,seleccionActual,square))){elegir(seleccionActual,square);return;}setSeleccion(chess.get(square as Square)?.color===color?{square:square as Square,fen}:null);},
   squareRenderer:({square,children})=><button type="button" className="play-square" disabled={!interactivo||!!promocionActual} aria-label={`Casilla ${square}`}>{children}</button>
  }}/></div>
  {promocionActual&&<div role="group" aria-label="Elegir promoción">{(['q','r','b','n'] as const).map(p=><button className="button-secondary" type="button" key={p} disabled={!interactivo} onClick={()=>confirmar(promocionActual.from,promocionActual.to,p)}>{({q:'Dama',r:'Torre',b:'Alfil',n:'Caballo'})[p]}</button>)}<button className="text-link" onClick={cancelar}>Cancelar</button></div>}
  {pre?<div className="online-premove" role="status"><span>Premove: {pre.uci.slice(0,2)} → {pre.uci.slice(2,4)}{pre.uci[4]?' · promoción':''}</span><button type="button" className="text-link" onClick={cancelar}>Cancelar premove ×</button></div>:<p className="online-premove-help" role="status">{aviso||(puedePremover?'Podés dejar tu próxima jugada preparada. Se juega si sigue siendo legal.':'')}</p>}
 </div>;
});
