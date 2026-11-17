"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Chessboard } from "react-chessboard";
import { MarcoTablero } from "./MarcoTablero";
import { useMiJugador } from "@/context/useMiJugador";
import { nombreVisible } from "@/lib/players";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import {useSonidoPiezas} from '@/lib/useSonidoPiezas';
import { Icono } from "./Icono";
import { aplicarUci, fechaMontevideo, validarDesafio, type Desafio } from "@/lib/desafios";
import reserva from "@/data/desafio-reserva.json";
import { BotonTablaDesafio, RevisionDesafio } from "./RevisionDesafio";
import { GuardarRacha, type EstadoRacha } from "./GuardarRacha";
import { LogroDesafio } from "./LogroDesafio";
import { useAuth } from "@/context/AuthContext";
import { claveIntentoDesafio } from "@/lib/identidadJugador";
import { AuthWidget } from "./AuthWidget";
import { supabase } from "@/lib/supabase";
import { claveErrorDesafio, leerErrorDesafio, marcarErrorDesafio } from "@/lib/intentoDesafio";

const nombres:Record<PieceSymbol,string>={k:"rey",q:"dama",r:"torre",b:"alfil",n:"caballo",p:"peón"};
const notacion:Record<string,string>={K:"R",Q:"D",R:"T",B:"A",N:"C"};
const sanEsp=(san:string)=>san.replace(/^[KQRBN]/,s=>notacion[s]??s).replace(/=([QRBN])/,(_,s:string)=>`=${notacion[s]??s}`);
export function DesafioAjedrez({ampliado=false}:{ampliado?:boolean}) {
  const {session,cargando}=useAuth();
  if(cargando)return ampliado?<p role="status">Comprobando tu sesión…</p>:null;
  if(!session)return ampliado?<section className="panel p-6"><h2 className="mb-3 text-xl font-semibold">Iniciá sesión para ver el desafío de hoy</h2><p className="mb-5 text-sm text-zinc-400">Tenés un intento diario sin errores ni pistas para sumar a tu racha.</p><AuthWidget/></section>:null;
  return <DesafioConCuenta key={session.user.id} usuario={session.user.id} ampliado={ampliado}/>;
}
function DesafioConCuenta({usuario,ampliado}:{usuario:string;ampliado:boolean}) {
  const [desafio,setDesafio]=useState<Desafio|null>(null);
  const [sesionVencida,setSesionVencida]=useState(false);
  useEffect(()=>{
    let cancelado=false,fechaConsultada="",reintentoEn=0;
    const abort=new AbortController();
    async function actualizar(){
      const fecha=fechaMontevideo(); if(fechaConsultada===fecha&&Date.now()<reintentoEn) return;fechaConsultada=fecha;reintentoEn=Infinity;
      try { const {data}=await supabase.auth.getSession();if(!data.session||data.session.user.id!==usuario)return;const r=await fetch("/api/desafio-diario",{signal:abort.signal,cache:"no-store",headers:{Authorization:`Bearer ${data.session.access_token}`}});if(r.status===401){if(!cancelado){setSesionVencida(true);setDesafio(null);}return;}if(!r.ok)throw new Error("Sin conexión");const datos=validarDesafio(await r.json());reintentoEn=datos.reserva||!datos.registrable?Date.now()+600000:Infinity;if(!cancelado){setSesionVencida(false);setDesafio(datos);} }
      catch { reintentoEn=Date.now()+600000;if(!cancelado)setDesafio({...reserva,reserva:true}); }
    }
    void actualizar();const intervalo=setInterval(()=>void actualizar(),60000);
    const visible=()=>{if(document.visibilityState==="visible")void actualizar();};
    document.addEventListener("visibilitychange",visible);
    return()=>{cancelado=true;abort.abort();clearInterval(intervalo);document.removeEventListener("visibilitychange",visible);};
  },[usuario]);
  if(sesionVencida)return <section className="panel p-6"><p role="alert" className="mb-4">Tu sesión venció. Volvé a iniciar sesión para ver el desafío.</p><AuthWidget/></section>;
  return desafio?<TableroDesafio key={claveIntentoDesafio(usuario,desafio.fecha,desafio.id)} desafio={desafio} ampliado={ampliado}/>:<section className="puzzle-card"><p className="eyebrow text-amber-200">Desafío del día</p><div className="skeleton mt-4 aspect-square rounded-xl"/><p role="status" className="mt-4 text-xs text-zinc-400">Buscando tu próxima buena jugada…</p></section>;
}

function TableroDesafio({desafio,ampliado}:{desafio:Desafio;ampliado:boolean}) {
  const {session}=useAuth();
  const {jugador}=useMiJugador(),sonido=useSonidoPiezas();
  const mesa=useRef<HTMLElement>(null);
  useEffect(()=>{if(ampliado&&window.innerWidth>900)requestAnimationFrame(()=>mesa.current?.scrollIntoView({block:"start",behavior:"instant"}));},[ampliado]);
  const [fen,setFen]=useState(desafio.fen);
  const [paso,setPaso]=useState(0);
  const [seleccion,setSeleccion]=useState<Square|null>(null);
  const [mensaje,setMensaje]=useState("Elegí la mejor jugada y continuá la secuencia.");
  const [promocion,setPromocion]=useState<Square|null>(null);
  const [ultimoDestino,setUltimoDestino]=useState<Square|null>(null);
  const [foco,setFoco]=useState(0);
  const claveError=claveErrorDesafio(session?.user.id,desafio.fecha,desafio.id);
  const [fallado,setFallado]=useState(()=>leerErrorDesafio(claveError));
  const falloDetectado=useRef(fallado);
  const [estadoCuenta,setEstadoCuenta]=useState<EstadoRacha>({resuelto:false,fallado:false,revisada:false});
  useEffect(()=>{const cambio=(e:StorageEvent)=>{if(e.key===claveError&&e.newValue==="1"){falloDetectado.current=true;setFallado(true);}};window.addEventListener("storage",cambio);return()=>window.removeEventListener("storage",cambio);},[claveError]);
  const casillas=useRef<(HTMLButtonElement|null)[]>([]);
  const partida=new Chess(fen);
  const color=new Chess(desafio.fen).turn();
  const resuelto=paso>=desafio.solution.length;
  const logrado=estadoCuenta.resuelto;
  const enPractica=fallado||estadoCuenta.fallado||!desafio.registrable;
  const habilitado=estadoCuenta.revisada||!desafio.registrable;
  const terminado=logrado||resuelto||fallado||estadoCuenta.fallado;
  const accesoTabla=terminado&&<BotonTablaDesafio/>;
  const avisoLogro=(logrado||resuelto&&enPractica)&&<LogroDesafio guardado={logrado} practica={!logrado}/>;
  const legales=seleccion?partida.moves({square:seleccion,verbose:true}):[];
  const destinos=legales.map(m=>m.to);
  const linea=new Chess(desafio.fen);
  const solucion=desafio.solution.map(uci=>sanEsp(aplicarUci(linea,uci).san));
  function mover(origen:Square,destino:Square,piezaPromocion?:string) {
    if(!habilitado||resuelto||partida.turn()!==color)return false;
    if(leerErrorDesafio(claveError)){falloDetectado.current=true;setFallado(true);}
    const posible=partida.moves({square:origen,verbose:true}).find(m=>m.to===destino&&(!m.promotion||m.promotion===piezaPromocion));
    if(!posible){if(partida.moves({square:origen,verbose:true}).some(m=>m.to===destino&&m.promotion)){setSeleccion(origen);setPromocion(destino);setMensaje("Elegí la pieza para coronar.");}return false;}
    const intento=new Chess(fen);
    const uci=`${origen}${destino}${piezaPromocion??""}`;
    const movimiento=intento.move({from:origen,to:destino,promotion:piezaPromocion});
    setPromocion(null);
    if(uci!==desafio.solution[paso]&&!intento.isCheckmate()){falloDetectado.current=true;marcarErrorDesafio(claveError);setFallado(true);setMensaje("Esa jugada no es la mejor continuación. El intento de hoy ya no suma racha; podés seguir practicando.");setSeleccion(null);return false;}
    sonido.golpear(!!movimiento.captured);
    let siguiente=paso+1;
    let texto=`Bien: ${sanEsp(movimiento.san)}.`;
    let destinoFinal=movimiento.to;
    if(intento.isCheckmate()) siguiente=desafio.solution.length;
    else if(siguiente<desafio.solution.length){const respuesta=aplicarUci(intento,desafio.solution[siguiente]);siguiente++;texto+=` El rival responde ${sanEsp(respuesta.san)}. Encontrá la continuación.`;destinoFinal=respuesta.to;}
    if(siguiente>=desafio.solution.length) texto=enPractica||falloDetectado.current?"Práctica terminada. Hoy no cuenta como logrado ni suma racha.":"Secuencia completa. Comprobando el logro en tu cuenta…";
    setFen(intento.fen());setPaso(siguiente);setMensaje(texto);setSeleccion(null);setUltimoDestino(destinoFinal);return true;
  }
  function elegir(casilla:Square) {
    if(!habilitado||resuelto)return;
    if(partida.get(casilla)?.color===color){setSeleccion(casilla);setPromocion(null);setMensaje("Elegí una de las casillas marcadas.");return;}
    if(!seleccion||!destinos.includes(casilla)){setMensaje("Elegí una pieza de tu color y un destino válido.");return;}
    if(legales.some(m=>m.to===casilla&&m.promotion)){setPromocion(casilla);setMensaje("Elegí la pieza para coronar.");return;}
    mover(seleccion,casilla);
  }
  function pista(){if(!habilitado)return;const uci=desafio.solution[paso];if(!uci)return;falloDetectado.current=true;marcarErrorDesafio(claveError);setFallado(true);setSeleccion(uci.slice(0,2) as Square);setMensaje(`Seguís en práctica, sin sumar racha. Pista: mové ${nombres[partida.get(uci.slice(0,2) as Square)!.type]} de ${uci.slice(0,2)} a ${uci.slice(2,4)}${uci[4]?` y coroná ${nombres[uci[4] as PieceSymbol]}`:""}.`);}
  const estilos:Record<string,CSSProperties>={};
  if(ultimoDestino)estilos[ultimoDestino]={backgroundColor:"#e4be7170"};
  if(seleccion){estilos[seleccion]={backgroundColor:"#668ed4b0"};for(const m of legales)estilos[m.to]={backgroundImage:partida.get(m.to)?"radial-gradient(transparent 55%, #25426da0 56%)":"radial-gradient(#25426d80 19%, transparent 21%)"};}
  if(partida.isCheck())for(const fila of partida.board())for(const p of fila)if(p?.type==="k"&&p.color===partida.turn())estilos[p.square]={backgroundColor:"#dc6c6c"};
  const tableroInteractivo=<div className="play-board"><Chessboard options={{id:"desafio-diario",position:fen,boardOrientation:color==="w"?"white":"black",allowDragging:habilitado&&!resuelto,allowDragOffBoard:false,allowDrawingArrows:false,allowAutoScroll:false,showNotation:true,animationDurationInMs:180,lightSquareStyle:{backgroundColor:"#f0e6ce"},darkSquareStyle:{backgroundColor:"#638480"},squareStyles:estilos,canDragPiece:({piece})=>habilitado&&!resuelto&&piece.pieceType.startsWith(color),onPieceDrop:({sourceSquare,targetSquare})=>targetSquare?mover(sourceSquare as Square,targetSquare as Square):false,onSquareClick:({square})=>elegir(square as Square),squareRenderer:({piece,square,children})=>{const archivo="abcdefgh".indexOf(square[0]);const rango=Number(square[1]);const indice=color==="w"?(8-rango)*8+archivo:(rango-1)*8+7-archivo;return <button type="button" className="play-square" style={estilos[square]} ref={el=>{casillas.current[indice]=el;}} tabIndex={foco===indice?0:-1} onFocus={()=>setFoco(indice)} aria-label={`${square}${piece?`, ${nombres[piece.pieceType[1].toLowerCase() as PieceSymbol]} ${piece.pieceType[0]==="w"?"blanco":"negro"}`: ", vacía"}`} onKeyDown={e=>{const siguiente:Record<string,number>={ArrowRight:Math.min(63,indice+1),ArrowLeft:Math.max(0,indice-1),ArrowDown:Math.min(63,indice+8),ArrowUp:Math.max(0,indice-8)};if(e.key in siguiente){e.preventDefault();casillas.current[siguiente[e.key]]?.focus();}}}>{children}</button>;}}}/></div>;
  const coronacion=promocion&&<div className="puzzle-promotion" role="group" aria-label="Elegir coronación">{(["q","r","b","n"] as const).map(p=><button type="button" key={p} className="button-secondary" onClick={()=>seleccion&&mover(seleccion,promocion,p)}>{nombres[p]}</button>)}</div>;
  const controles=<div className="play-controls"><label className="text-xs text-zinc-400"><input type="checkbox" checked={sonido.activo} onChange={e=>sonido.setActivo(e.target.checked)}/> Sonido de piezas</label><button type="button" disabled={!habilitado||resuelto} onClick={pista} className="button-secondary"><Icono nombre="idea" className="h-4 w-4"/>Ver pista · práctica</button><button type="button" onClick={()=>{setFen(desafio.fen);setPaso(0);setSeleccion(null);setPromocion(null);setUltimoDestino(null);setMensaje("Elegí la mejor jugada y continuá la secuencia.");}} className="button-secondary"><Icono nombre="reiniciar" className="h-4 w-4"/>{logrado?"Volver a practicar":"Reiniciar"}</button></div>;
  const pasos=Math.ceil(desafio.solution.length/2),completados=Math.min(Math.ceil(paso/2),pasos);
  const progreso=<div className="puzzle-progress"><div><span>Tu secuencia</span><strong>{completados} / {pasos}</strong></div><progress value={completados} max={pasos} aria-label="Jugadas correctas del desafío"/></div>;
  const nivel=desafio.objetivo!==undefined&&<p className="mt-3 text-xs leading-relaxed text-amber-200/80">Objetivo de hoy: ≈{desafio.objetivo} · {desafio.rachaBase?`Racha líder al cierre de ayer: ${desafio.rachaBase} ${desafio.rachaBase===1?"día":"días"}`:"Comienza una nueva racha"}. Desde el tercer día sube 50; si nadie mantiene la racha, mañana vuelve a ≈1800.</p>;
  const detalles=<><RevisionDesafio autenticado={!!session} terminado={terminado} puzzleId={desafio.id} solucion={solucion}/><p className="puzzle-source">Dificultad de problemas Lichess · {desafio.fecha}{desafio.reserva?" · problema de reserva":""}</p></>;
  if(ampliado)return <div className="play-layout puzzle-layout" data-activa="true" data-logrado={logrado}>{avisoLogro&&<div className="puzzle-logro">{avisoLogro}</div>}<section ref={mesa} className="play-table" aria-label="Desafío diario"><div className="play-player"><span className="play-avatar" aria-hidden="true">♞</span><div><strong>El desafío del día</strong><span>≈{desafio.rating} · Jugás con {color==="w"?"blancas":"negras"}</span></div><span className="play-presence">{logrado?"Logrado":enPractica?"En práctica":!habilitado?"Comprobando intento":"Tu momento"}</span></div><MarcoTablero reserva={230} nombre="tablero del desafío">{tableroInteractivo}{coronacion}</MarcoTablero><div className="play-player"><span className="play-avatar play-avatar-you" aria-hidden="true">♟</span><div><strong>{jugador?nombreVisible(jugador):"Vos"}</strong><span>{enPractica?"Práctica · hoy no suma":resuelto?"Secuencia terminada":"Encontrá la mejor continuación"}</span></div></div><p className="play-status" role="status" aria-live="polite">{!habilitado?"Comprobando tu intento de hoy…":mensaje}</p>{accesoTabla}<p className="play-board-help">Arrastrá o tocá una pieza y su destino. Con teclado: flechas y Enter.</p></section><aside className="play-sidebar"><section className="play-rival-card puzzle-mission"><p className="eyebrow">Un día. Una buena idea.</p><h2>Tu próximo movimiento<br/><span>puede cambiar todo.</span></h2><p>Encontrá la táctica y seguí la respuesta del rival hasta completar la secuencia.</p>{progreso}{nivel}</section><div className="play-side-content"><section className="panel play-tools"><p className="eyebrow text-amber-200">Tu desafío</p>{controles}<GuardarRacha desafio={desafio} resuelto={resuelto} fallado={fallado} onEstado={setEstadoCuenta}/></section><section className="play-note"><Icono nombre="idea" className="h-5 w-5 text-amber-200"/><div><strong>La constancia también gana.</strong><p>Con tu sesión iniciada y tu jugador vinculado, la resolución sin errores se guarda automáticamente.</p><p>Una jugada legal incorrecta o pedir una pista corta la racha de hoy. Reiniciar permite practicar; mañana podés empezar otra.</p></div></section>{detalles}</div></aside></div>;
  return <section className="puzzle-card" aria-labelledby="titulo-desafio"><p className="eyebrow text-amber-200">Desafío del día · {desafio.rating}</p><div className="mb-3 mt-1 flex items-center justify-between gap-3"><h2 id="titulo-desafio" className="text-lg font-semibold">Juegan {color==="w"?"blancas":"negras"}.</h2><span className="text-xs text-zinc-500">{completados}/{pasos}</span></div>{avisoLogro}{tableroInteractivo}{coronacion}{nivel}<p role="status" className="play-status">{!habilitado?"Comprobando tu intento de hoy…":mensaje}</p>{accesoTabla}<GuardarRacha desafio={desafio} resuelto={resuelto} fallado={fallado} onEstado={setEstadoCuenta}/>{controles}{detalles}</section>;
}
