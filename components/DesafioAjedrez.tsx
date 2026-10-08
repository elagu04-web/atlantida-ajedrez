"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Chessboard } from "react-chessboard";
import { useMiJugador } from "@/context/useMiJugador";
import { nombreVisible } from "@/lib/players";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { Icono } from "./Icono";
import { PiezaAjedrez } from "./PiezaAjedrez";
import { aplicarUci, fechaMontevideo, validarDesafio, type Desafio } from "@/lib/desafios";
import reserva from "@/data/desafio-reserva.json";
import Link from "next/link";
import { GuardarRacha } from "./GuardarRacha";
import { useAuth } from "@/context/AuthContext";
import { claveIntentoDesafio } from "@/lib/identidadJugador";

const nombres:Record<PieceSymbol,string>={k:"rey",q:"dama",r:"torre",b:"alfil",n:"caballo",p:"peón"};
const notacion:Record<string,string>={K:"R",Q:"D",R:"T",B:"A",N:"C"};
const sanEsp=(san:string)=>san.replace(/^[KQRBN]/,s=>notacion[s]??s).replace(/=([QRBN])/,(_,s:string)=>`=${notacion[s]??s}`);
export function DesafioAjedrez({ampliado=false}:{ampliado?:boolean}) {
  const {session,cargando}=useAuth();
  const [desafio,setDesafio]=useState<Desafio|null>(null);
  useEffect(()=>{
    let cancelado=false,fechaConsultada="",reintentoEn=0;
    const abort=new AbortController();
    async function actualizar(){
      const fecha=fechaMontevideo(); if(fechaConsultada===fecha&&Date.now()<reintentoEn) return;fechaConsultada=fecha;reintentoEn=Infinity;
      try { const r=await fetch("/api/desafio-diario",{signal:abort.signal,cache:"no-store"});if(!r.ok)throw new Error("Sin conexión");const datos=validarDesafio(await r.json());reintentoEn=datos.reserva?Date.now()+600000:Infinity;if(!cancelado)setDesafio(datos); }
      catch { reintentoEn=Date.now()+600000;if(!cancelado)setDesafio({...reserva,reserva:true}); }
    }
    void actualizar();const intervalo=setInterval(()=>void actualizar(),60000);
    const visible=()=>{if(document.visibilityState==="visible")void actualizar();};
    document.addEventListener("visibilitychange",visible);
    return()=>{cancelado=true;abort.abort();clearInterval(intervalo);document.removeEventListener("visibilitychange",visible);};
  },[]);
  return desafio&&!cargando?<TableroDesafio key={claveIntentoDesafio(session?.user.id,desafio.fecha,desafio.id)} desafio={desafio} ampliado={ampliado}/>:<section className="puzzle-card"><p className="eyebrow text-amber-200">Desafío del día · ≈1800</p><div className="skeleton mt-4 aspect-square rounded-xl"/><p role="status" className="mt-4 text-xs text-zinc-400">Buscando tu próxima buena jugada…</p></section>;
}

function TableroDesafio({desafio,ampliado}:{desafio:Desafio;ampliado:boolean}) {
  const {jugador}=useMiJugador();
  const mesa=useRef<HTMLElement>(null);
  useEffect(()=>{if(ampliado&&window.innerWidth>900)requestAnimationFrame(()=>mesa.current?.scrollIntoView({block:"start",behavior:"instant"}));},[ampliado]);
  const [fen,setFen]=useState(desafio.fen);
  const [paso,setPaso]=useState(0);
  const [seleccion,setSeleccion]=useState<Square|null>(null);
  const [mensaje,setMensaje]=useState("Elegí la mejor jugada y continuá la secuencia.");
  const [promocion,setPromocion]=useState<Square|null>(null);
  const [ultimoDestino,setUltimoDestino]=useState<Square|null>(null);
  const [foco,setFoco]=useState(0);
  const [fallado,setFallado]=useState(false);
  const casillas=useRef<(HTMLButtonElement|null)[]>([]);
  const partida=new Chess(fen);
  const color=new Chess(desafio.fen).turn();
  const resuelto=paso>=desafio.solution.length;
  const legales=seleccion?partida.moves({square:seleccion,verbose:true}):[];
  const destinos=legales.map(m=>m.to);
  const tablero=color==="b"?[...partida.board()].reverse().map(f=>[...f].reverse()):partida.board();
  const linea=new Chess(desafio.fen);
  const solucion=desafio.solution.map(uci=>sanEsp(aplicarUci(linea,uci).san));
  function mover(origen:Square,destino:Square,piezaPromocion?:string) {
    if(resuelto||partida.turn()!==color)return false;
    const posible=partida.moves({square:origen,verbose:true}).find(m=>m.to===destino&&(!m.promotion||m.promotion===piezaPromocion));
    if(!posible){if(partida.moves({square:origen,verbose:true}).some(m=>m.to===destino&&m.promotion)){setSeleccion(origen);setPromocion(destino);setMensaje("Elegí la pieza para coronar.");}return false;}
    const intento=new Chess(fen);
    const uci=`${origen}${destino}${piezaPromocion??""}`;
    const movimiento=intento.move({from:origen,to:destino,promotion:piezaPromocion});
    setPromocion(null);
    if(uci!==desafio.solution[paso]&&!intento.isCheckmate()){setFallado(true);setMensaje("Esa jugada no es la mejor continuación. El intento de hoy ya no suma racha; podés seguir practicando.");setSeleccion(null);return false;}
    let siguiente=paso+1;
    let texto=`Bien: ${sanEsp(movimiento.san)}.`;
    let destinoFinal=movimiento.to;
    if(intento.isCheckmate()) siguiente=desafio.solution.length;
    else if(siguiente<desafio.solution.length){const respuesta=aplicarUci(intento,desafio.solution[siguiente]);siguiente++;texto+=` El rival responde ${sanEsp(respuesta.san)}. Encontrá la continuación.`;destinoFinal=respuesta.to;}
    if(siguiente>=desafio.solution.length) texto="¡Desafío resuelto! Encontraste la secuencia táctica.";
    setFen(intento.fen());setPaso(siguiente);setMensaje(texto);setSeleccion(null);setUltimoDestino(destinoFinal);return true;
  }
  function elegir(casilla:Square) {
    if(resuelto)return;
    if(partida.get(casilla)?.color===color){setSeleccion(casilla);setPromocion(null);setMensaje("Elegí una de las casillas marcadas.");return;}
    if(!seleccion||!destinos.includes(casilla)){setMensaje("Elegí una pieza de tu color y un destino válido.");return;}
    if(legales.some(m=>m.to===casilla&&m.promotion)){setPromocion(casilla);setMensaje("Elegí la pieza para coronar.");return;}
    mover(seleccion,casilla);
  }
  function pista(){const uci=desafio.solution[paso];if(!uci)return;setSeleccion(uci.slice(0,2) as Square);setMensaje(`Pista: mové ${nombres[partida.get(uci.slice(0,2) as Square)!.type]} de ${uci.slice(0,2)} a ${uci.slice(2,4)}${uci[4]?` y coroná ${nombres[uci[4] as PieceSymbol]}`:""}.`);}
  const estilos:Record<string,CSSProperties>={};
  if(ultimoDestino)estilos[ultimoDestino]={backgroundColor:"#e4be7170"};
  if(seleccion){estilos[seleccion]={backgroundColor:"#668ed4b0"};for(const m of legales)estilos[m.to]={backgroundImage:partida.get(m.to)?"radial-gradient(transparent 55%, #25426da0 56%)":"radial-gradient(#25426d80 19%, transparent 21%)"};}
  if(partida.isCheck())for(const fila of partida.board())for(const p of fila)if(p?.type==="k"&&p.color===partida.turn())estilos[p.square]={backgroundColor:"#dc6c6c"};
  const tableroInteractivo=<div className="play-board"><Chessboard options={{id:"desafio-diario",position:fen,boardOrientation:color==="w"?"white":"black",allowDragging:!resuelto,allowDragOffBoard:false,allowDrawingArrows:false,allowAutoScroll:false,showNotation:true,animationDurationInMs:180,lightSquareStyle:{backgroundColor:"#f0e6ce"},darkSquareStyle:{backgroundColor:"#638480"},squareStyles:estilos,canDragPiece:({piece})=>!resuelto&&piece.pieceType.startsWith(color),onPieceDrop:({sourceSquare,targetSquare})=>targetSquare?mover(sourceSquare as Square,targetSquare as Square):false,onSquareClick:({square})=>elegir(square as Square),squareRenderer:({piece,square,children})=>{const archivo="abcdefgh".indexOf(square[0]);const rango=Number(square[1]);const indice=color==="w"?(8-rango)*8+archivo:(rango-1)*8+7-archivo;return <button type="button" className="play-square" ref={el=>{casillas.current[indice]=el;}} tabIndex={foco===indice?0:-1} onFocus={()=>setFoco(indice)} aria-label={`${square}${piece?`, ${nombres[piece.pieceType[1].toLowerCase() as PieceSymbol]} ${piece.pieceType[0]==="w"?"blanco":"negro"}`: ", vacía"}`} onKeyDown={e=>{const siguiente:Record<string,number>={ArrowRight:Math.min(63,indice+1),ArrowLeft:Math.max(0,indice-1),ArrowDown:Math.min(63,indice+8),ArrowUp:Math.max(0,indice-8)};if(e.key in siguiente){e.preventDefault();casillas.current[siguiente[e.key]]?.focus();}}}>{children}</button>;}}}/></div>;
  const coronacion=promocion&&<div className="puzzle-promotion" role="group" aria-label="Elegir coronación">{(["q","r","b","n"] as const).map(p=><button type="button" key={p} className="button-secondary" onClick={()=>seleccion&&mover(seleccion,promocion,p)}>{nombres[p]}</button>)}</div>;
  const controles=<div className="play-controls"><button type="button" disabled={resuelto} onClick={pista} className="button-secondary"><Icono nombre="idea" className="h-4 w-4"/>Ver pista</button><button type="button" onClick={()=>{setFen(desafio.fen);setPaso(0);setSeleccion(null);setPromocion(null);setUltimoDestino(null);setMensaje("Elegí la mejor jugada y continuá la secuencia.");}} className="button-secondary"><Icono nombre="reiniciar" className="h-4 w-4"/>Reiniciar</button></div>;
  const pasos=Math.ceil(desafio.solution.length/2),completados=Math.min(Math.ceil(paso/2),pasos);
  const progreso=<div className="puzzle-progress"><div><span>Tu secuencia</span><strong>{completados} / {pasos}</strong></div><progress value={completados} max={pasos} aria-label="Jugadas correctas del desafío"/></div>;
  const detalles=<><details className="play-engine-details"><summary>Ver solución</summary><p>{solucion.join(" · ")}</p></details><p className="puzzle-source">Dificultad de problemas Lichess · {desafio.fecha}{desafio.reserva?" · problema de reserva":""} · <a href={`https://lichess.org/training/${desafio.id}`} target="_blank" rel="noopener noreferrer">Original ↗</a></p><Link href="/desafios#rachas" className="text-link">Ver tabla de rachas →</Link></>;
  if(ampliado)return <div className="play-layout puzzle-layout" data-activa="true"><section ref={mesa} className="play-table" aria-label="Desafío diario"><div className="play-player"><span className="play-avatar" aria-hidden="true">♞</span><div><strong>El desafío del día</strong><span>≈{desafio.rating} · Jugás con {color==="w"?"blancas":"negras"}</span></div><span className="play-presence">{resuelto?"Resuelto":"Tu momento"}</span></div>{tableroInteractivo}{coronacion}<div className="play-player"><span className="play-avatar play-avatar-you" aria-hidden="true">♟</span><div><strong>{jugador?nombreVisible(jugador):"Vos"}</strong><span>{fallado?"Seguí practicando":resuelto?"¡Buena táctica!":"Encontrá la mejor continuación"}</span></div></div><p className="play-status" role="status" aria-live="polite">{mensaje}</p><p className="play-board-help">Arrastrá o tocá una pieza y su destino. Con teclado: flechas y Enter.</p></section><aside className="play-sidebar"><section className="play-rival-card puzzle-mission"><p className="eyebrow">Un día. Una buena idea.</p><h2>Tu próximo movimiento<br/><span>puede cambiar todo.</span></h2><p>Encontrá la táctica y seguí la respuesta del rival hasta completar la secuencia.</p>{progreso}</section><div className="play-side-content"><section className="panel play-tools"><p className="eyebrow text-amber-200">Tu desafío</p>{controles}<GuardarRacha desafio={desafio} resuelto={resuelto} fallado={fallado}/></section><section className="play-note"><Icono nombre="idea" className="h-5 w-5 text-amber-200"/><div><strong>La constancia también gana.</strong><p>Con tu sesión iniciada y tu jugador vinculado, la resolución sin errores se guarda automáticamente.</p><p>Una jugada legal incorrecta corta la racha de hoy. Reiniciar permite practicar; mañana podés empezar otra.</p></div></section>{detalles}</div></aside></div>;
  return <section className="puzzle-card" aria-labelledby="titulo-desafio"><p className="eyebrow text-amber-200">Desafío del día · {desafio.rating}</p><div className="mb-3 mt-1 flex items-center justify-between gap-3"><h2 id="titulo-desafio" className="text-lg font-semibold">Juegan {color==="w"?"blancas":"negras"}.</h2><span className="text-xs text-zinc-500">{completados}/{pasos}</span></div><div className="puzzle-board" role="group" aria-label="Tablero del desafío. Usá las flechas para recorrer y Enter para elegir.">{tablero.flatMap((fila,r)=>fila.map((pieza,c)=>{
      const archivo=color==="w"?c:7-c,rango=color==="w"?8-r:r+1;
      const casilla=`${"abcdefgh"[archivo]}${rango}` as Square;const indice=r*8+c;
      const femenino=pieza&&["q","r"].includes(pieza.type);
      return <button key={casilla} ref={el=>{casillas.current[indice]=el;}} type="button" tabIndex={foco===indice?0:-1} onFocus={()=>setFoco(indice)} aria-label={`${casilla}${pieza?`, ${nombres[pieza.type]} ${pieza.color==="w"?(femenino?"blanca":"blanco"):(femenino?"negra":"negro")}`:", vacía"}${destinos.includes(casilla)?", destino posible":""}`} aria-pressed={seleccion===casilla} className={`puzzle-square ${(r+c)%2?"square-dark":"square-light"} ${seleccion===casilla?"square-selected":""} ${ultimoDestino===casilla?"square-last":""}`} onClick={()=>elegir(casilla)} onKeyDown={e=>{const siguiente:Record<string,number>={ArrowRight:Math.min(63,indice+1),ArrowLeft:Math.max(0,indice-1),ArrowDown:Math.min(63,indice+8),ArrowUp:Math.max(0,indice-8)};if(e.key in siguiente){e.preventDefault();casillas.current[siguiente[e.key]]?.focus();}}}>{pieza&&<PiezaAjedrez tipo={pieza.type} color={pieza.color}/>} {destinos.includes(casilla)&&!pieza&&<span className="legal-dot"/>}{c===0&&<span className="board-rank">{rango}</span>}{r===7&&<span className="board-file">{"abcdefgh"[archivo]}</span>}</button>;
    }))}</div>{coronacion}<p role="status" className="play-status">{mensaje}</p><GuardarRacha desafio={desafio} resuelto={resuelto} fallado={fallado}/>{controles}{detalles}</section>;
}
