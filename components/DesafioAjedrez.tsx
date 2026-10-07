"use client";
import { useEffect, useRef, useState } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { Icono } from "./Icono";
import { PiezaAjedrez } from "./PiezaAjedrez";
import { aplicarUci, fechaMontevideo, validarDesafio, type Desafio } from "@/lib/desafios";
import reserva from "@/data/desafio-reserva.json";
import Link from "next/link";
import { GuardarRacha } from "./GuardarRacha";

const nombres:Record<PieceSymbol,string>={k:"rey",q:"dama",r:"torre",b:"alfil",n:"caballo",p:"peón"};
const notacion:Record<string,string>={K:"R",Q:"D",R:"T",B:"A",N:"C"};
const sanEsp=(san:string)=>san.replace(/^[KQRBN]/,s=>notacion[s]??s).replace(/=([QRBN])/,(_,s:string)=>`=${notacion[s]??s}`);
export function DesafioAjedrez() {
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
  return desafio?<TableroDesafio key={`${desafio.id}:${desafio.fecha}`} desafio={desafio}/>:<section className="puzzle-card"><p className="eyebrow text-amber-200">Desafío del día · ≈1800</p><div className="skeleton mt-4 aspect-square rounded-xl"/><p role="status" className="mt-4 text-xs text-zinc-400">Buscando tu próxima buena jugada…</p></section>;
}

function TableroDesafio({desafio}:{desafio:Desafio}) {
  const [fen,setFen]=useState(desafio.fen);
  const [paso,setPaso]=useState(0);
  const [seleccion,setSeleccion]=useState<Square|null>(null);
  const [mensaje,setMensaje]=useState("Elegí la mejor jugada y continuá la secuencia.");
  const [promocion,setPromocion]=useState<Square|null>(null);
  const [ultimoDestino,setUltimoDestino]=useState<Square|null>(null);
  const [foco,setFoco]=useState(0);
  const casillas=useRef<(HTMLButtonElement|null)[]>([]);
  const partida=new Chess(fen);
  const color=new Chess(desafio.fen).turn();
  const resuelto=paso>=desafio.solution.length;
  const legales=seleccion?partida.moves({square:seleccion,verbose:true}):[];
  const destinos=legales.map(m=>m.to);
  const tablero=color==="b"?[...partida.board()].reverse().map(f=>[...f].reverse()):partida.board();
  const linea=new Chess(desafio.fen);
  const solucion=desafio.solution.map(uci=>sanEsp(aplicarUci(linea,uci).san));
  function jugar(destino:Square,piezaPromocion?:string) {
    if(!seleccion)return;
    const intento=new Chess(fen);
    const uci=`${seleccion}${destino}${piezaPromocion??""}`;
    const movimiento=intento.move({from:seleccion,to:destino,promotion:piezaPromocion});
    setPromocion(null);
    if(uci!==desafio.solution[paso]&&!intento.isCheckmate()){setMensaje("Esa jugada no es la mejor continuación. La posición se mantiene; probá otra.");return;}
    let siguiente=paso+1;
    let texto=`Bien: ${sanEsp(movimiento.san)}.`;
    let destinoFinal=movimiento.to;
    if(intento.isCheckmate()) siguiente=desafio.solution.length;
    else if(siguiente<desafio.solution.length){const respuesta=aplicarUci(intento,desafio.solution[siguiente]);siguiente++;texto+=` El rival responde ${sanEsp(respuesta.san)}. Encontrá la continuación.`;destinoFinal=respuesta.to;}
    if(siguiente>=desafio.solution.length) texto="¡Desafío resuelto! Encontraste la secuencia táctica.";
    setFen(intento.fen());setPaso(siguiente);setMensaje(texto);setSeleccion(null);setUltimoDestino(destinoFinal);
  }
  function elegir(casilla:Square) {
    if(resuelto)return;
    if(partida.get(casilla)?.color===color){setSeleccion(casilla);setPromocion(null);setMensaje("Elegí una de las casillas marcadas.");return;}
    if(!seleccion||!destinos.includes(casilla)){setMensaje("Elegí una pieza de tu color y un destino válido.");return;}
    if(legales.some(m=>m.to===casilla&&m.promotion)){setPromocion(casilla);setMensaje("Elegí la pieza para coronar.");return;}
    jugar(casilla);
  }
  function pista(){const uci=desafio.solution[paso];if(!uci)return;setSeleccion(uci.slice(0,2) as Square);setMensaje(`Pista: mové ${nombres[partida.get(uci.slice(0,2) as Square)!.type]} de ${uci.slice(0,2)} a ${uci.slice(2,4)}${uci[4]?` y coroná ${nombres[uci[4] as PieceSymbol]}`:""}.`);}
  return <section className="puzzle-card" aria-labelledby="titulo-desafio">
    <p className="eyebrow text-amber-200">Desafío del día · {desafio.rating}</p>
    <div className="mb-3 mt-1 flex items-center justify-between gap-3"><h2 id="titulo-desafio" className="text-lg font-semibold">Juegan {color==="w"?"blancas":"negras"}.</h2><span className="text-xs text-zinc-500">{Math.min(Math.ceil(paso/2),Math.ceil(desafio.solution.length/2))}/{Math.ceil(desafio.solution.length/2)}</span></div>
    <div className="puzzle-board" role="group" aria-label="Tablero del desafío. Usá las flechas para recorrer y Enter para elegir.">{tablero.flatMap((fila,r)=>fila.map((pieza,c)=>{
      const archivo=color==="w"?c:7-c,rango=color==="w"?8-r:r+1;
      const casilla=`${"abcdefgh"[archivo]}${rango}` as Square;const indice=r*8+c;
      const femenino=pieza&&["q","r"].includes(pieza.type);
      return <button key={casilla} ref={el=>{casillas.current[indice]=el;}} type="button" tabIndex={foco===indice?0:-1} onFocus={()=>setFoco(indice)} aria-label={`${casilla}${pieza?`, ${nombres[pieza.type]} ${pieza.color==="w"?(femenino?"blanca":"blanco"):(femenino?"negra":"negro")}`:", vacía"}${destinos.includes(casilla)?", destino posible":""}`} aria-pressed={seleccion===casilla} className={`puzzle-square ${(r+c)%2?"square-dark":"square-light"} ${seleccion===casilla?"square-selected":""} ${ultimoDestino===casilla?"square-last":""}`} onClick={()=>elegir(casilla)} onKeyDown={e=>{const siguiente:Record<string,number>={ArrowRight:Math.min(63,indice+1),ArrowLeft:Math.max(0,indice-1),ArrowDown:Math.min(63,indice+8),ArrowUp:Math.max(0,indice-8)};if(e.key in siguiente){e.preventDefault();casillas.current[siguiente[e.key]]?.focus();}}}>{pieza&&<PiezaAjedrez tipo={pieza.type} color={pieza.color}/>} {destinos.includes(casilla)&&!pieza&&<span className="legal-dot"/>}{c===0&&<span className="board-rank">{rango}</span>}{r===7&&<span className="board-file">{"abcdefgh"[archivo]}</span>}</button>;
    }))}</div>
    {promocion&&<div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Elegir coronación">{(["q","r","b","n"] as const).map(p=><button key={p} className="comparison-chip" onClick={()=>jugar(promocion,p)}>{nombres[p]}</button>)}</div>}
    <p role="status" className={`mt-3 min-h-10 text-xs leading-relaxed ${resuelto?"text-emerald-300":"text-zinc-300"}`}>{mensaje}</p>
    <GuardarRacha desafio={desafio} resuelto={resuelto}/>
    <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3"><button type="button" disabled={resuelto} onClick={pista} className="puzzle-action"><Icono nombre="idea" className="h-4 w-4"/>Ver pista</button><button type="button" onClick={()=>{setFen(desafio.fen);setPaso(0);setSeleccion(null);setPromocion(null);setUltimoDestino(null);setMensaje("Elegí la mejor jugada y continuá la secuencia.");}} className="puzzle-action"><Icono nombre="reiniciar" className="h-4 w-4"/>Reiniciar</button></div>
    <details className="mt-3 text-xs text-zinc-400"><summary>Ver solución</summary><p className="mt-2 leading-relaxed">{solucion.join(" · ")}</p></details>
    <p className="mt-3 text-[10px] text-zinc-500">Dificultad de problemas Lichess · {desafio.fecha}{desafio.reserva?" · problema de reserva":""} · <a href={`https://lichess.org/training/${desafio.id}`} target="_blank" rel="noopener noreferrer" className="text-blue-300 hover:underline">Original ↗</a></p>
    <Link href="/desafios#rachas" className="mt-3 block text-xs text-blue-300 hover:underline">Ver tabla de rachas →</Link>
  </section>;
}
