"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { Chessboard } from "react-chessboard";
import { Icono } from "./Icono";
import { PiezaAjedrez } from "./PiezaAjedrez";
import { MotorPractica } from "@/lib/motorPractica";
import { CLAVE_PRACTICA, NIVELES_PRACTICA, PartidaPractica, colorAleatorioPractica, respuestaSuave, sanPractica, type ColorPractica, type NivelPractica } from "@/lib/partidaPractica";

const nombres:Record<PieceSymbol,string>={p:"peón",n:"caballo",b:"alfil",r:"torre",q:"dama",k:"rey"};
const escucharGuardado=(cb:()=>void)=>{window.addEventListener("storage",cb);return()=>window.removeEventListener("storage",cb);};
const leerGuardado=()=>{try{return localStorage.getItem(CLAVE_PRACTICA);}catch{return null;}};
function vistaDe(partida:PartidaPractica){return {fen:partida.ajedrez.fen(),color:partida.color,nivel:partida.nivel,turnoJugador:partida.turnoJugador,terminada:partida.terminada,estado:partida.estado(),puedeDeshacer:partida.puedeDeshacer,historial:partida.ajedrez.history({verbose:true}).map(m=>({san:sanPractica(m.san),from:m.from,to:m.to}))};}

export function JugarBot(){
  const juego=useRef<PartidaPractica|null>(null);const motor=useRef<MotorPractica|null>(null);const generacion=useRef(0);
  const tableroRef=useRef<HTMLDivElement>(null);const historialRef=useRef<HTMLDivElement>(null);const dialogo=useRef<HTMLDialogElement>(null);
  const [vista,setVista]=useState(()=>vistaDe(new PartidaPractica()));const [enJuego,setEnJuego]=useState(false);
  const [nivel,setNivel]=useState<NivelPractica>("club"),[color,setColor]=useState<ColorPractica|"azar">("w");
  const [accion,setAccion]=useState<"cargando"|"bot"|"pista"|null>(null),[error,setError]=useState("");
  const [seleccion,setSeleccion]=useState<Square|null>(null),[foco,setFoco]=useState<Square>("e2");
  const [promocion,setPromocion]=useState<{from:Square;to:Square}|null>(null),[pista,setPista]=useState<string|null>(null);
  const [invertido,setInvertido]=useState(false),[mensaje,setMensaje]=useState(""),[guarda,setGuarda]=useState(true);
  const guardada=useSyncExternalStore(escucharGuardado,leerGuardado,()=>null);
  useEffect(()=>()=>{generacion.current++;motor.current?.destruir();motor.current=null;},[]);
  useEffect(()=>{if(historialRef.current)historialRef.current.scrollTop=historialRef.current.scrollHeight;},[vista.historial.length]);

  function actualizar(){const partida=juego.current;if(!partida)return;setVista(vistaDe(partida));try{localStorage.setItem(CLAVE_PRACTICA,JSON.stringify(partida.guardar()));setGuarda(true);}catch{setGuarda(false);}}
  function cancelar(){generacion.current++;motor.current?.destruir();motor.current=null;setAccion(null);setPista(null);setPromocion(null);setSeleccion(null);setError("");setMensaje("");}
  async function ejecutar(tipo:"inicio"|"bot"|"pista"){
    const partida=juego.current;if(!partida||partida.terminada)return;
    if(tipo==="bot"&&partida.turnoJugador||tipo==="pista"&&!partida.turnoJugador)return;
    const token=++generacion.current;const fen=partida.ajedrez.fen();setError("");setMensaje("");
    try{
      if(!motor.current){setAccion("cargando");motor.current=new MotorPractica();}
      const actual=motor.current;await actual.listo;if(token!==generacion.current)return;
      if(tipo==="inicio"&&partida.turnoJugador){setAccion(null);return;}
      setAccion(tipo==="pista"?"pista":"bot");
      let uci=await actual.buscar(partida.jugadas,partida.nivel,tipo==="pista");
      if(token!==generacion.current||juego.current!==partida||partida.ajedrez.fen()!==fen)return;
      if(!partida.esLegal(uci))throw new Error("El bot devolvió una jugada inválida. Reintentá desde esta posición.");
      if(tipo==="pista"){
        const muestra=new Chess(fen);const sugerida=muestra.move(uci);setPista(uci);setMensaje(`Pista: ${sanPractica(sugerida.san)} (${uci.slice(0,2)} → ${uci.slice(2,4)}).`);
      }else{
        uci=respuestaSuave(partida,uci);if(!partida.moverBot(uci))throw new Error("No se pudo aplicar la respuesta del bot. Reintentá.");actualizar();setSeleccion(null);setPista(null);
      }
      setAccion(null);
    }catch(causa){
      if(token!==generacion.current)return;
      motor.current?.destruir();motor.current=null;setAccion(null);
      if((causa as Error)?.name!=="AbortError")setError(causa instanceof Error?causa.message:"El bot no respondió. Probá de nuevo.");
    }
  }
  function iniciar(partida?:PartidaPractica){
    cancelar();const elegida=color==="azar"?colorAleatorioPractica():color;
    juego.current=partida??new PartidaPractica(elegida,nivel);setNivel(juego.current.nivel);setColor(juego.current.color);setEnJuego(true);setInvertido(false);setFoco(juego.current.color==="w"?"e2":"e7");actualizar();dialogo.current?.close();void ejecutar("inicio");
  }
  function retomar(){
    try{const texto=leerGuardado();const recuperada=texto?PartidaPractica.recuperar(JSON.parse(texto)):null;if(!recuperada){setMensaje("No hay una partida válida para retomar. Podés empezar una nueva.");return;}iniciar(recuperada);}catch{setMensaje("No se pudo recuperar la partida. Podés empezar una nueva.");}
  }
  function mover(from:Square,to:Square,pieza?:PieceSymbol){
    const partida=juego.current;if(!partida||accion||error||!partida.turnoJugador)return false;
    if(!pieza&&partida.promociones(from,to).length){setPromocion({from,to});return false;}
    if(!partida.moverJugador(from,to,pieza))return false;
    setSeleccion(null);setPromocion(null);setPista(null);setMensaje("");actualizar();if(!partida.terminada)void ejecutar("bot");return true;
  }
  const posicion=new Chess(vista.fen);const habilitado=enJuego&&vista.turnoJugador&&!accion&&!error&&!promocion;
  const orientacion=(vista.color==="b")!==invertido?"black":"white";
  function elegir(square:Square){
    setFoco(square);if(!habilitado)return;
    if(seleccion&&mover(seleccion,square))return;
    if(posicion.get(square)?.color===vista.color)setSeleccion(seleccion===square?null:square);else if(!promocion)setSeleccion(null);
  }
  function deshacer(){cancelar();if(juego.current?.deshacer())actualizar();}
  function rendirse(){cancelar();juego.current?.rendirse();actualizar();}
  function descargar(){if(!juego.current)return;const blob=new Blob([juego.current.pgn()],{type:"application/x-chess-pgn;charset=utf-8"});const url=URL.createObjectURL(blob);const enlace=document.createElement("a");enlace.href=url;enlace.download="atlantida-practica.pgn";enlace.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function teclado(e:React.KeyboardEvent<HTMLButtonElement>,square:Square){
    if(!["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key))return;e.preventDefault();
    const signo=orientacion==="white"?1:-1;const x="abcdefgh".indexOf(square[0])+(e.key==="ArrowRight"?signo:e.key==="ArrowLeft"?-signo:0);const y=Number(square[1])+(e.key==="ArrowUp"?signo:e.key==="ArrowDown"?-signo:0);
    if(x<0||x>7||y<1||y>8)return;const destino=`${"abcdefgh"[x]}${y}` as Square;setFoco(destino);tableroRef.current?.querySelector<HTMLButtonElement>(`[data-square="${destino}"] button`)?.focus();
  }
  const estilos:Record<string,CSSProperties>={};const ultima=vista.historial.at(-1);
  if(ultima)for(const s of [ultima.from,ultima.to])estilos[s]={backgroundColor:"#e4be7170"};
  if(seleccion){estilos[seleccion]={backgroundColor:"#668ed4b0"};for(const m of posicion.moves({square:seleccion,verbose:true}))estilos[m.to]={backgroundImage:posicion.get(m.to)?"radial-gradient(transparent 55%, #25426da0 56%)":"radial-gradient(#25426d80 19%, transparent 21%)"};}
  if(posicion.isCheck())for(const fila of posicion.board())for(const p of fila)if(p?.type==="k"&&p.color===posicion.turn())estilos[p.square]={backgroundColor:"#dc6c6c"};
  const nivelActivo=NIVELES_PRACTICA.find(n=>n.id===vista.nivel)!;
  const estado=accion==="cargando"?"Preparando el bot… La primera carga puede tardar unos segundos.":accion==="bot"?"El bot está pensando…":accion==="pista"?"Buscando una pista…":enJuego?vista.estado.texto:"Elegí un nivel y empezá tu próxima partida.";
  const filas=Array.from({length:Math.ceil(vista.historial.length/2)},(_,i)=>({numero:i+1,blancas:vista.historial[i*2]?.san,negras:vista.historial[i*2+1]?.san}));
  const opciones=<><fieldset className="play-levels"><legend>Tu rival</legend>{NIVELES_PRACTICA.map(n=><label key={n.id} data-elegido={nivel===n.id}><input type="radio" name={enJuego?"nivel-nuevo":"nivel-inicio"} checked={nivel===n.id} onChange={()=>setNivel(n.id)}/><span><strong>{n.nombre}</strong><span>{n.detalle}</span></span><span className="play-level-mark" aria-hidden="true">{nivel===n.id?"✓":""}</span></label>)}</fieldset><fieldset className="play-colors"><legend>Elegí tus piezas</legend>{([{id:"w",nombre:"Blancas",pieza:"♙"},{id:"b",nombre:"Negras",pieza:"♟"},{id:"azar",nombre:"Al azar",pieza:"↔"}] as const).map(c=><label key={c.id} data-elegido={color===c.id}><input type="radio" name={enJuego?"color-nuevo":"color-inicio"} checked={color===c.id} onChange={()=>setColor(c.id)}/><span aria-hidden="true">{c.pieza}</span>{c.nombre}</label>)}</fieldset><button type="button" className="button-primary w-full justify-center" onClick={()=>iniciar()}>Empezar partida<Icono nombre="flecha" className="h-4 w-4"/></button></>;
  return <div className="play-layout" data-activa={enJuego}><section className="play-table" aria-label="Partida de práctica"><div className="play-player"><span className="play-avatar" aria-hidden="true">♞</span><div><strong>Bot Atlántida</strong><span>{enJuego?`${nivelActivo.nombre} · ${vista.color==="w"?"Negras":"Blancas"}`:"Un rival siempre dispuesto"}</span></div><span className={`play-presence ${accion?"play-thinking":""}`}>{accion?"Pensando":enJuego&&vista.terminada?"Final":"Sin apuro"}</span></div><div ref={tableroRef} className="play-board"><Chessboard options={{id:"practica",position:vista.fen,boardOrientation:orientacion,allowDragging:habilitado,allowDragOffBoard:false,allowDrawingArrows:false,allowAutoScroll:false,showNotation:true,animationDurationInMs:180,lightSquareStyle:{backgroundColor:"#f0e6ce"},darkSquareStyle:{backgroundColor:"#638480"},squareStyles:estilos,canDragPiece:({piece})=>habilitado&&piece.pieceType.startsWith(vista.color),onPieceDrop:({sourceSquare,targetSquare})=>targetSquare?mover(sourceSquare as Square,targetSquare as Square):false,onSquareClick:({square})=>elegir(square as Square),arrows:pista?[{startSquare:pista.slice(0,2),endSquare:pista.slice(2,4),color:"#dfb975"}]:[],squareRenderer:({piece,square,children})=><button type="button" className="play-square" tabIndex={square===foco?0:-1} aria-label={`${square}${piece?`, ${nombres[piece.pieceType[1].toLowerCase() as PieceSymbol]} ${piece.pieceType[0]==="w"?"blanco":"negro"}`:", vacía"}`} onKeyDown={e=>teclado(e,square as Square)}>{children}</button>}}/>{!enJuego&&<div className="play-board-intro"><span className="eyebrow">Una partida más</span><h2>Probá una idea.<br/>Pedí revancha.</h2><p>Elegí tu nivel y empezá a jugar.</p></div>}{promocion&&<div className="play-promotion" role="dialog" aria-modal="true" aria-label="Elegir pieza para coronar"><div><h3>¿Con qué coronás?</h3><div className="play-promotion-options">{(["q","r","b","n"] as PieceSymbol[]).map(p=><button type="button" key={p} aria-label={`Coronar a ${nombres[p]}`} onClick={()=>mover(promocion.from,promocion.to,p)}><PiezaAjedrez tipo={p} color={vista.color}/></button>)}</div><button type="button" className="text-link" onClick={()=>setPromocion(null)}>Cancelar</button></div></div>}</div><div className="play-player"><span className="play-avatar play-avatar-you" aria-hidden="true">♟</span><div><strong>Vos</strong><span>{enJuego?`${vista.color==="w"?"Blancas":"Negras"} · Práctica libre`:"Sin reloj. A tu ritmo."}</span></div><button type="button" className="icon-button" aria-label="Girar tablero" onClick={()=>setInvertido(v=>!v)}><Icono nombre="reiniciar"/></button></div><p className="play-status" role="status" aria-live="polite">{estado}</p><p className="play-board-help">Arrastrá o tocá una pieza y su destino. Con teclado: flechas y Enter.</p></section><aside className="play-sidebar">{!enJuego?<section className="panel play-setup"><p className="eyebrow text-amber-200">A tu medida</p><h2>Sentate a jugar.</h2><p className="play-muted">Cuatro niveles para practicar, probar y divertirte.</p>{opciones}{guardada&&<button type="button" className="button-secondary w-full justify-center mt-3" onClick={retomar}>Retomar partida guardada</button>}<p role="status" className="play-muted mt-4">{mensaje}</p></section>:<><section className="panel play-tools"><p className="eyebrow text-amber-200">Tu partida</p><div className="play-controls"><button type="button" className="button-secondary" onClick={()=>{setPista(null);void ejecutar("pista");}} disabled={!vista.turnoJugador||!!accion||!!error||!!promocion}><Icono nombre="idea" className="h-4 w-4"/>Pedir pista</button><button type="button" className="button-secondary" onClick={deshacer} disabled={!vista.puedeDeshacer}><Icono nombre="reiniciar" className="h-4 w-4"/>Deshacer</button></div>{mensaje&&<p role="status" className="play-hint">{mensaje}</p>}{error&&<div role="alert" className="play-error"><p>{error}</p><button type="button" className="button-secondary mt-3" onClick={()=>{cancelar();void ejecutar(vista.turnoJugador?"inicio":"bot");}}>Reintentar bot</button></div>}{vista.terminada&&<div className="play-finish"><strong>{vista.estado.resultado}</strong><p>{vista.estado.texto}</p><button type="button" className="button-primary mt-3" onClick={()=>dialogo.current?.showModal()}>Jugar revancha</button></div>}<div ref={historialRef} className="play-history" tabIndex={0} aria-label="Historial de jugadas">{filas.length?<table><caption className="sr-only">Jugadas de esta partida</caption><thead><tr><th scope="col">#</th><th scope="col">Blancas</th><th scope="col">Negras</th></tr></thead><tbody>{filas.map(f=><tr key={f.numero}><th scope="row">{f.numero}.</th><td>{f.blancas}</td><td>{f.negras??"…"}</td></tr>)}</tbody></table>:<p>La primera jugada abre la historia.</p>}</div><div className="play-controls"><button type="button" className="button-secondary" onClick={descargar} disabled={!vista.historial.length}>Descargar PGN</button><button type="button" className="button-secondary" onClick={()=>dialogo.current?.showModal()}>Nueva partida</button></div>{!vista.terminada&&<button type="button" className="play-resign" onClick={rendirse}>Rendirme</button>}</section></>}<section className="play-note"><Icono nombre="idea" className="h-5 w-5 text-amber-200"/><div><strong>Acá se viene a probar.</strong><p>Usá pistas, volvé una jugada atrás y probá otro plan. Estas partidas no cambian tu Elo del club.</p><p>{guarda?"Tu partida se guarda en este navegador para retomarla después.":"Este navegador no pudo guardar la partida. Podés descargarla en PGN."}</p></div></section><details className="play-engine-details"><summary>Motor de ajedrez</summary><p>Stockfish 18 · Funciona en tu navegador, con niveles de práctica sin Elo certificado.</p><a href="/stockfish/Copying.txt" target="_blank" rel="noopener noreferrer">Licencia GPLv3</a><span> · </span><a href="/stockfish/ORIGEN.txt" target="_blank" rel="noopener noreferrer">Código fuente y créditos</a></details></aside><dialog ref={dialogo} className="play-new-dialog" aria-labelledby="nueva-partida-titulo"><div className="flex justify-between gap-4 items-center"><h2 id="nueva-partida-titulo">Otra partida, otro plan.</h2><button type="button" className="icon-button" aria-label="Cerrar nueva partida" onClick={()=>dialogo.current?.close()}><Icono nombre="cerrar"/></button></div><p className="play-muted">Elegí tu próximo desafío. Empezar reemplaza la partida guardada; podés descargar el PGN antes.</p>{enJuego&&opciones}</dialog></div>;
}