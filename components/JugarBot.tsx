"use client";
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { Chessboard } from "react-chessboard";
import Image from "next/image";
import { RivalEnPartida } from "./RivalEnPartida";
import { jugadasFrancesa } from "@/lib/francesa";
import { respuestaFiable, abandonarApertura } from "@/lib/calidadBot";
import { respuestaAtacante } from "@/lib/estiloBot";
import type { EmocionBot } from "@/lib/personalidadBot";
import { jugadasHipopotamo } from "@/lib/hipopotamo";
import { Icono } from "./Icono";
import { PiezaAjedrez } from "./PiezaAjedrez";
import { SonidoTablero } from "@/lib/sonidoTablero";
import { MotorPractica } from "@/lib/motorPractica";
import { APERTURA_MORRA, CLAVE_PRACTICA, DATOS_BOTS_PRACTICA, NIVELES_PRACTICA, PartidaPractica, colorAleatorioPractica, respuestaSuave, sanPractica, type ColorPractica, type NivelPractica, type PerfilBot } from "@/lib/partidaPractica";

const RECORRIDO_MORRA=(()=>{const partida=new Chess();return [{fen:partida.fen(),san:"",uci:"",captura:false},...APERTURA_MORRA.map(uci=>{const m=partida.move(uci);return {fen:partida.fen(),san:sanPractica(m.san),uci,captura:!!m.captured};})];})();
const nombres:Record<PieceSymbol,string>={p:"peón",n:"caballo",b:"alfil",r:"torre",q:"dama",k:"rey"};
const escucharGuardado=(cb:()=>void)=>{window.addEventListener("storage",cb);return()=>window.removeEventListener("storage",cb);};
const leerGuardado=()=>{try{return localStorage.getItem(CLAVE_PRACTICA);}catch{return null;}};
function vistaDe(partida:PartidaPractica){return {fen:partida.ajedrez.fen(),color:partida.color,nivel:partida.nivel,perfil:partida.perfil,turnoJugador:partida.turnoJugador,terminada:partida.terminada,estado:partida.estado(),puedeDeshacer:partida.puedeDeshacer,historial:partida.ajedrez.history({verbose:true}).map(m=>({san:sanPractica(m.san),from:m.from,to:m.to,color:m.color,captura:!!m.captured}))};}

export function JugarBot(){
  const sonido=useRef<SonidoTablero|null>(null);
  const [sonidoActivo,setSonidoActivo]=useState(true),[volumen,setVolumen]=useState(.85);
  const juego=useRef<PartidaPractica|null>(null);const motor=useRef<MotorPractica|null>(null);const generacion=useRef(0);
  const tableroRef=useRef<HTMLDivElement>(null);const historialRef=useRef<HTMLDivElement>(null);const dialogo=useRef<HTMLDialogElement>(null);
  const [vista,setVista]=useState(()=>vistaDe(new PartidaPractica("w","club","victor")));const [enJuego,setEnJuego]=useState(false);
  const [recorrido,setRecorrido]=useState<number|null>(null);
  useEffect(()=>{if(recorrido===null)return;const timer=setTimeout(()=>{if(recorrido>=APERTURA_MORRA.length){setRecorrido(null);return;}sonido.current?.golpe(RECORRIDO_MORRA[recorrido+1].captura);setRecorrido(recorrido+1);},800);return()=>clearTimeout(timer);},[recorrido]);
  const [perfil,setPerfil]=useState<PerfilBot>("victor");
  const [nivel,setNivel]=useState<NivelPractica>("club"),[color,setColor]=useState<ColorPractica|"azar">("w");
  const [accion,setAccion]=useState<"cargando"|"bot"|"pista"|null>(null),[error,setError]=useState("");
  const [seleccion,setSeleccion]=useState<Square|null>(null),[foco,setFoco]=useState<Square>("e2");
  const [promocion,setPromocion]=useState<{from:Square;to:Square}|null>(null),[pista,setPista]=useState<string|null>(null);
  const [invertido,setInvertido]=useState(false),[mensaje,setMensaje]=useState(""),[guarda,setGuarda]=useState(true);
  const guardada=useSyncExternalStore(escucharGuardado,leerGuardado,()=>null);
  useEffect(()=>()=>{generacion.current++;motor.current?.destruir();motor.current=null;sonido.current?.cerrar();sonido.current=null;},[]);
  useEffect(()=>{if(historialRef.current)historialRef.current.scrollTop=historialRef.current.scrollHeight;},[vista.historial.length]);

  function prepararSonido(activo=sonidoActivo,nuevoVolumen=volumen){if(!sonido.current)sonido.current=new SonidoTablero();sonido.current.configurar(activo,nuevoVolumen);sonido.current.activar();}
  function sonar(){const ultima=juego.current?.ajedrez.history({verbose:true}).at(-1);sonido.current?.golpe(!!ultima?.captured);}
  function actualizar(){const partida=juego.current;if(!partida)return;setVista(vistaDe(partida));try{localStorage.setItem(CLAVE_PRACTICA,JSON.stringify(partida.guardar()));setGuarda(true);}catch{setGuarda(false);}}
  function cancelar(){setRecorrido(null);generacion.current++;motor.current?.destruir();motor.current=null;setAccion(null);setPista(null);setPromocion(null);setSeleccion(null);setError("");setMensaje("");}
  async function ejecutar(tipo:"inicio"|"bot"|"pista"){
    const partida=juego.current;if(!partida||partida.terminada)return;
    if(tipo==="bot"&&partida.turnoJugador||tipo==="pista"&&!partida.turnoJugador)return;
    const token=++generacion.current;const fen=partida.ajedrez.fen();setError("");setMensaje("");
    try{
      if(!motor.current){setAccion("cargando");motor.current=new MotorPractica();}
      const actual=motor.current;await actual.listo;if(token!==generacion.current)return;
      if(tipo==="inicio"&&partida.turnoJugador){setAccion(null);return;}
      setAccion(tipo==="pista"?"pista":"bot");
      let apertura=tipo==="pista"?undefined:partida.perfil==="fonchi"?jugadasHipopotamo(partida.ajedrez):partida.perfil==="victor"?jugadasFrancesa(partida.ajedrez):undefined;
      let uci=await actual.buscar(partida.jugadas,partida.nivel,tipo==="pista",DATOS_BOTS_PRACTICA[partida.perfil].elo!==null?{elo:DATOS_BOTS_PRACTICA[partida.perfil].elo!,searchmoves:apertura,estiloAtaque:partida.perfil==="victor"||partida.perfil==="matias"}:{});
      if(apertura&&!apertura.includes(uci))throw new Error("El bot no respetó la apertura. Reintentá desde esta posición.");
      let variantes=actual.variantes;
      if(tipo!=="pista"&&DATOS_BOTS_PRACTICA[partida.perfil].elo!==null){
        uci=respuestaFiable(partida.ajedrez,uci,variantes,DATOS_BOTS_PRACTICA[partida.perfil].elo!,apertura);
        if(apertura){
          const libre=await actual.buscar(partida.jugadas,partida.nivel,true);
          if(token!==generacion.current||juego.current!==partida||partida.ajedrez.fen()!==fen)return;
          if(abandonarApertura(partida.ajedrez,uci,variantes,libre,actual.variantes)){uci=libre;variantes=actual.variantes;apertura=undefined;}
        }
      }
      if(token!==generacion.current||juego.current!==partida||partida.ajedrez.fen()!==fen)return;
      if(!partida.esLegal(uci))throw new Error("El bot devolvió una jugada inválida. Reintentá desde esta posición.");
      if(tipo==="pista"){
        const muestra=new Chess(fen);const sugerida=muestra.move(uci);setPista(uci);setMensaje(`Pista: ${sanPractica(sugerida.san)} (${uci.slice(0,2)} → ${uci.slice(2,4)}).`);
      }else{
        uci=(partida.perfil==="victor"||partida.perfil==="matias")?respuestaAtacante(partida.ajedrez,uci,variantes,apertura,partida.perfil==="matias"):respuestaSuave(partida,uci);if(!partida.moverBot(uci))throw new Error("No se pudo aplicar la respuesta del bot. Reintentá.");actualizar();sonar();setSeleccion(null);setPista(null);
      }
      setAccion(null);
    }catch(causa){
      if(token!==generacion.current)return;
      motor.current?.destruir();motor.current=null;setAccion(null);
      if((causa as Error)?.name!=="AbortError")setError(causa instanceof Error?causa.message:"El bot no respondió. Probá de nuevo.");
    }
  }
  function iniciar(partida?:PartidaPractica){
    prepararSonido();cancelar();const elegida=perfil==="matias"?"b":perfil!=="stockfish"?"w":color==="azar"?colorAleatorioPractica():color;
    juego.current=partida??new PartidaPractica(elegida,perfil!=="stockfish"?"club":nivel,perfil);setPerfil(juego.current.perfil);setNivel(juego.current.nivel);setColor(juego.current.color);setEnJuego(true);setRecorrido(!partida&&juego.current.perfil==="matias"?0:null);setInvertido(false);setFoco(juego.current.color==="w"?"e2":"e7");actualizar();dialogo.current?.close();requestAnimationFrame(()=>requestAnimationFrame(()=>tableroRef.current?.closest(".play-table")?.scrollIntoView({block:"start",behavior:"instant"})));void ejecutar("inicio");
  }
  function retomar(){
    try{const texto=leerGuardado();const recuperada=texto?PartidaPractica.recuperar(JSON.parse(texto)):null;if(!recuperada){setMensaje("No hay una partida válida para retomar. Podés empezar una nueva.");return;}iniciar(recuperada);}catch{setMensaje("No se pudo recuperar la partida. Podés empezar una nueva.");}
  }
  function mover(from:Square,to:Square,pieza?:PieceSymbol){
    const partida=juego.current;if(!partida||recorrido!==null||accion||error||!partida.turnoJugador)return false;
    if(!pieza&&partida.promociones(from,to).length){setPromocion({from,to});return false;}
    prepararSonido();if(!partida.moverJugador(from,to,pieza))return false;
    sonar();
    setSeleccion(null);setPromocion(null);setPista(null);setMensaje("");actualizar();if(!partida.terminada)void ejecutar("bot");return true;
  }
  const fenMostrado=recorrido!==null?RECORRIDO_MORRA[recorrido].fen:vista.fen;
  const posicion=new Chess(fenMostrado);const habilitado=enJuego&&recorrido===null&&vista.turnoJugador&&!accion&&!error&&!promocion;
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
  if(recorrido!==null){const uci=RECORRIDO_MORRA[recorrido].uci;if(uci)for(const s of [uci.slice(0,2),uci.slice(2,4)])estilos[s]={backgroundColor:"#e4be7170"};}
  else if(ultima)for(const s of [ultima.from,ultima.to])estilos[s]={backgroundColor:"#e4be7170"};
  if(seleccion){estilos[seleccion]={backgroundColor:"#668ed4b0"};for(const m of posicion.moves({square:seleccion,verbose:true}))estilos[m.to]={backgroundImage:posicion.get(m.to)?"radial-gradient(transparent 55%, #25426da0 56%)":"radial-gradient(#25426d80 19%, transparent 21%)"};}
  if(posicion.isCheck())for(const fila of posicion.board())for(const p of fila)if(p?.type==="k"&&p.color===posicion.turn())estilos[p.square]={backgroundColor:"#dc6c6c"};
  const perfilActivo=enJuego?vista.perfil:perfil;
  const esFonchi=perfilActivo==="fonchi";
  const esMatias=perfilActivo==="matias";
  const esVictor=perfilActivo==="victor";
  const botActivo=DATOS_BOTS_PRACTICA[perfilActivo];
  const resultado=vista.estado.resultado;
  const victoriaBot=resultado===(vista.color==="w"?"0-1":"1-0");
  const emocion:EmocionBot=recorrido!==null?"pensando":vista.terminada?(resultado==="1/2-1/2"?"tablas":victoriaBot?"victoria":"derrota"):posicion.isCheck()?(vista.turnoJugador?"jaque":"amenazado"):accion==="bot"||accion==="cargando"?"pensando":ultima?.color!==vista.color&&ultima?.captura?"captura":"esperando";
  const nivelActivo=NIVELES_PRACTICA.find(n=>n.id===vista.nivel)!;
  const estado=recorrido!==null?`Gambito Morra · ${recorrido}/${APERTURA_MORRA.length}${recorrido?` · ${Math.ceil(recorrido/2)}${recorrido%2?".":"…"} ${RECORRIDO_MORRA[recorrido].san}`:" · Mirá cómo se arma el ataque"}. Después seguís con negras.`:accion==="cargando"?"Preparando el bot… La primera carga puede tardar unos segundos.":accion==="bot"?"El bot está pensando…":accion==="pista"?"Buscando una pista…":enJuego?vista.estado.texto:"Elegí tu rival y empezá tu próxima partida.";
  const filas=Array.from({length:Math.ceil(vista.historial.length/2)},(_,i)=>({numero:i+1,blancas:vista.historial[i*2]?.san,negras:vista.historial[i*2+1]?.san}));
  const opciones=<><fieldset className="play-bots"><legend>Elegí tu rival</legend><label data-elegido={perfil==="matias"}><input type="radio" name={enJuego?"bot-nuevo":"bot-inicio"} checked={perfil==="matias"} onChange={()=>setPerfil("matias")}/><span><strong>Matías y su viento a favor</strong><small>≈2100 Elo · Blancas · Gambito Morra</small></span></label><label data-elegido={perfil==="fonchi"}><input type="radio" name={enJuego?"bot-nuevo":"bot-inicio"} checked={perfil==="fonchi"} onChange={()=>setPerfil("fonchi")}/><span><strong>Fonchi y el Hipopótamo</strong><small>≈2000 Elo · Siempre con negras</small></span></label><label className="play-bot-victor" data-elegido={perfil==="victor"}><input type="radio" name={enJuego?"bot-nuevo":"bot-inicio"} checked={perfil==="victor"} onChange={()=>setPerfil("victor")}/><span><strong>Víctor Terminator <span className="play-max-level">Max Level</span></strong><small>≈2150 Elo · Francesa · Ataque</small></span></label><label data-elegido={perfil==="stockfish"}><input type="radio" name={enJuego?"bot-nuevo":"bot-inicio"} checked={perfil==="stockfish"} onChange={()=>setPerfil("stockfish")}/><span><strong>Bot Atlántida</strong><small>Práctica libre · Cuatro niveles</small></span></label></fieldset>{perfil==="matias"?<div className="play-fonchi play-matias"><Image src="/imagenes/matias-morra-bot.png" width={1199} height={1312} sizes="240px" alt="Matías dibujado inclinado sobre la partida con su celular"/><p>“Un peón menos, unas cuantas ideas más.”</p><div className="play-fonchi-tags"><span>≈2100 Elo</span><span>Juega con blancas</span><span>Recursos y ataque</span></div><p className="play-muted">El Gambito Morra aceptado ya está jugado: 1.e4 c5 2.d4 cxd4 3.c3 dxc3 4.Cxc3. Vos seguís con negras. Matías entrega un peón para activar sus piezas y busca complicar la partida.</p></div>:perfil==="fonchi"?<div className="play-fonchi"><Image src="/imagenes/fonchi-hipopotamo-bot.png" width={240} height={240} sizes="240px" alt="Fonchi dibujado abrazando a un hipopótamo"/><p>“Vos ocupá el centro, que nosotros esperamos acá atrás.”</p><div className="play-fonchi-tags"><span>Vos: blancas</span><span>Fonchi: negras</span><span>≈2000 Elo</span></div><p className="play-muted">Defensa Hipopótamo: doble fianchetto, centro compacto y contraataque. El orden se adapta a jaques y amenazas.</p></div>:<>{perfil==="victor"?<div className="play-victor"><span className="play-victor-badge">MAX LEVEL · ≈2150 ELO</span><Image src="/imagenes/victor-terminator-avatar.png" width={1160} height={1355} sizes="210px" alt="Víctor Terminator jugando ajedrez, con un ojo rojo y armadura de cyborg"/><p>“Objetivo: tu rey.”</p><p className="play-muted">Siempre con negras: arma el centro de la Francesa y busca la iniciativa. ¿Podés frenar su ataque?</p><div className="play-fonchi-tags"><span>Vos: blancas</span><span>Víctor: negras</span></div></div>:<><fieldset className="play-levels"><legend>Tu rival</legend>{NIVELES_PRACTICA.map(n=><label key={n.id} data-elegido={nivel===n.id}><input type="radio" name={enJuego?"nivel-nuevo":"nivel-inicio"} checked={nivel===n.id} onChange={()=>setNivel(n.id)}/><span><strong>{n.nombre}</strong><span>{n.detalle}</span></span><span className="play-level-mark" aria-hidden="true">{nivel===n.id?"✓":""}</span></label>)}</fieldset><fieldset className="play-colors"><legend>Elegí tus piezas</legend>{([{id:"w",nombre:"Blancas",pieza:"♙"},{id:"b",nombre:"Negras",pieza:"♟"},{id:"azar",nombre:"Al azar",pieza:"↔"}] as const).map(c=><label key={c.id} data-elegido={color===c.id}><input type="radio" name={enJuego?"color-nuevo":"color-inicio"} checked={color===c.id} onChange={()=>setColor(c.id)}/><span aria-hidden="true">{c.pieza}</span>{c.nombre}</label>)}</fieldset></>}</>}<button type="button" className="button-primary w-full justify-center" onClick={()=>iniciar()}>Empezar partida<Icono nombre="flecha" className="h-4 w-4"/></button></>;
  return <div className="play-layout" data-activa={enJuego}><section className="play-table" aria-label="Partida de práctica"><div className="play-player"><span className={`play-avatar ${esFonchi?"play-avatar-fonchi":esVictor?"play-avatar-victor":esMatias?"play-avatar-matias":""}`} aria-hidden="true">{botActivo.imagen?<Image src={botActivo.imagen} width={60} height={60} sizes="60px" alt=""/>:"♞"}</span><div><strong>{botActivo.nombre}</strong><span>{esMatias?"≈2100 Elo · Blancas · Morra":esFonchi?"≈2000 Elo · Negras · Hipopótamo":esVictor?`Max Level · ≈2150 Elo${enJuego?` · ${vista.color==="w"?"Negras":"Blancas"}`:""}`:enJuego?`${nivelActivo.nombre} · ${vista.color==="w"?"Negras":"Blancas"}`:"Un rival siempre dispuesto"}</span></div><span className={`play-presence ${accion?"play-thinking":""}`}>{recorrido!==null?"El Morra":accion?"Pensando":enJuego&&vista.terminada?"Final":"Sin apuro"}</span></div><div ref={tableroRef} className="play-board"><Chessboard options={{id:"practica",position:fenMostrado,boardOrientation:orientacion,allowDragging:habilitado,allowDragOffBoard:false,allowDrawingArrows:false,allowAutoScroll:false,showNotation:true,animationDurationInMs:recorrido!==null?420:180,lightSquareStyle:{backgroundColor:"#f0e6ce"},darkSquareStyle:{backgroundColor:"#638480"},squareStyles:estilos,canDragPiece:({piece})=>habilitado&&piece.pieceType.startsWith(vista.color),onPieceDrop:({sourceSquare,targetSquare})=>targetSquare?mover(sourceSquare as Square,targetSquare as Square):false,onSquareClick:({square})=>elegir(square as Square),arrows:pista?[{startSquare:pista.slice(0,2),endSquare:pista.slice(2,4),color:"#dfb975"}]:[],squareRenderer:({piece,square,children})=><button type="button" className="play-square" tabIndex={square===foco?0:-1} aria-label={`${square}${piece?`, ${nombres[piece.pieceType[1].toLowerCase() as PieceSymbol]} ${piece.pieceType[0]==="w"?"blanco":"negro"}`:", vacía"}`} onKeyDown={e=>teclado(e,square as Square)}>{children}</button>}}/>{!enJuego&&<div className="play-board-intro"><span className="eyebrow">Una partida más</span><h2>Probá una idea.<br/>Pedí revancha.</h2><p>{esMatias?"¿Podés frenar el ataque de Matías?":esFonchi?"¿Podés despertar al hipopótamo?":esVictor?"¿Podés ganarle a Víctor Terminator?":"Elegí tu nivel y empezá a jugar."}</p></div>}{promocion&&<div className="play-promotion" role="dialog" aria-modal="true" aria-label="Elegir pieza para coronar"><div><h3>¿Con qué coronás?</h3><div className="play-promotion-options">{(["q","r","b","n"] as PieceSymbol[]).map(p=><button type="button" key={p} aria-label={`Coronar a ${nombres[p]}`} onClick={()=>mover(promocion.from,promocion.to,p)}><PiezaAjedrez tipo={p} color={vista.color}/></button>)}</div><button type="button" className="text-link" onClick={()=>setPromocion(null)}>Cancelar</button></div></div>}</div><div className="play-player"><span className="play-avatar play-avatar-you" aria-hidden="true">♟</span><div><strong>Vos</strong><span>{enJuego?`${vista.color==="w"?"Blancas":"Negras"} · Práctica libre`:"Sin reloj. A tu ritmo."}</span></div><button type="button" className="icon-button" aria-label="Girar tablero" onClick={()=>setInvertido(v=>!v)}><Icono nombre="reiniciar"/></button></div><p className="play-status" role="status" aria-live="polite">{estado}</p><p className="play-board-help">Arrastrá o tocá una pieza y su destino. Con teclado: flechas y Enter.</p></section><aside className="play-sidebar">{enJuego&&<RivalEnPartida perfil={vista.perfil} emocion={emocion} reaccion={vista.historial.length}/>}<div className="play-side-content">{!enJuego?<section className="panel play-setup"><p className="eyebrow text-amber-200">Los rivales del club</p><h2>Sentate a jugar.</h2><p className="play-muted">Elegí a quién desafiar y pedí revancha.</p>{opciones}{guardada&&<button type="button" className="button-secondary w-full justify-center mt-3" onClick={retomar}>Retomar partida guardada</button>}<p role="status" className="play-muted mt-4">{mensaje}</p></section>:<><section className="panel play-tools"><p className="eyebrow text-amber-200">Tu partida</p>{esMatias&&<div className="play-opening-controls">{recorrido!==null?<><p role="status">Las primeras jugadas se mueven solas. Al terminar, te toca con negras.</p><button type="button" className="button-secondary" onClick={()=>setRecorrido(null)}>Saltar apertura</button></>:<button type="button" className="text-link" disabled={!vista.turnoJugador||!!accion||!!promocion} onClick={()=>{setSeleccion(null);setPista(null);setRecorrido(0);}}>Ver apertura otra vez</button>}</div>}<div className="play-controls"><button type="button" className="button-secondary" onClick={()=>{setPista(null);void ejecutar("pista");}} disabled={recorrido!==null||!vista.turnoJugador||!!accion||!!error||!!promocion}><Icono nombre="idea" className="h-4 w-4"/>Pedir pista</button><button type="button" className="button-secondary" onClick={deshacer} disabled={recorrido!==null||!vista.puedeDeshacer}><Icono nombre="reiniciar" className="h-4 w-4"/>Deshacer</button></div>{mensaje&&<p role="status" className="play-hint">{mensaje}</p>}{error&&<div role="alert" className="play-error"><p>{error}</p><button type="button" className="button-secondary mt-3" onClick={()=>{cancelar();void ejecutar(vista.turnoJugador?"inicio":"bot");}}>Reintentar bot</button></div>}{vista.terminada&&<div className="play-finish"><strong>{vista.estado.resultado}</strong><p>{vista.estado.texto}</p><button type="button" className="button-primary mt-3" onClick={()=>dialogo.current?.showModal()}>Jugar revancha</button></div>}<div ref={historialRef} className="play-history" tabIndex={0} aria-label="Historial de jugadas">{filas.length?<table><caption className="sr-only">Jugadas de esta partida</caption><thead><tr><th scope="col">#</th><th scope="col">Blancas</th><th scope="col">Negras</th></tr></thead><tbody>{filas.map(f=><tr key={f.numero}><th scope="row">{f.numero}.</th><td>{f.blancas}</td><td>{f.negras??"…"}</td></tr>)}</tbody></table>:<p>La primera jugada abre la historia.</p>}</div><div className="play-controls"><button type="button" className="button-secondary" onClick={descargar} disabled={!vista.historial.length}>Descargar PGN</button><button type="button" className="button-secondary" onClick={()=>dialogo.current?.showModal()}>Nueva partida</button></div>{!vista.terminada&&<button type="button" className="play-resign" disabled={recorrido!==null} onClick={rendirse}>Rendirme</button>}</section></>}<section className="play-sound" aria-label="Sonidos del tablero"><div><label><input type="checkbox" checked={sonidoActivo} onChange={e=>{setSonidoActivo(e.target.checked);prepararSonido(e.target.checked);}}/>Sonido de piezas</label><span>{sonidoActivo?`${Math.round(volumen*100)}%`:"Silenciado"}</span></div><label className="play-volume">Volumen<input type="range" min="0.1" max="1" step="0.05" value={volumen} disabled={!sonidoActivo} onChange={e=>{const valor=Number(e.target.value);setVolumen(valor);prepararSonido(sonidoActivo,valor);sonido.current?.golpe();}}/></label></section><section className="play-note"><Icono nombre="idea" className="h-5 w-5 text-amber-200"/><div><strong>Acá se viene a probar.</strong><p>Usá pistas, volvé una jugada atrás y probá otro plan. Estas partidas no cambian tu Elo del club.</p><p>{guarda?"Tu partida se guarda en este navegador para retomarla después.":"Este navegador no pudo guardar la partida. Podés descargarla en PGN."}</p></div></section><details className="play-engine-details"><summary>Motor de ajedrez</summary><p>Stockfish 18 · Funciona en tu navegador. Fonchi tiene una fuerza objetivo de 2000 Elo y Víctor Terminator de 2150 Elo. Matías apunta a 2100 Elo con blancas desde el Gambito Morra. Son estimaciones de práctica que varían según el dispositivo y la posición.</p><a href="/stockfish/Copying.txt" target="_blank" rel="noopener noreferrer">Licencia GPLv3</a><span> · </span><a href="/stockfish/ORIGEN.txt" target="_blank" rel="noopener noreferrer">Código fuente y créditos</a></details></div></aside><dialog ref={dialogo} className="play-new-dialog" aria-labelledby="nueva-partida-titulo"><div className="flex justify-between gap-4 items-center"><h2 id="nueva-partida-titulo">Otra partida, otro plan.</h2><button type="button" className="icon-button" aria-label="Cerrar nueva partida" onClick={()=>dialogo.current?.close()}><Icono nombre="cerrar"/></button></div><p className="play-muted">Elegí tu próximo desafío. Empezar reemplaza la partida guardada; podés descargar el PGN antes.</p>{enJuego&&opciones}</dialog></div>;
}