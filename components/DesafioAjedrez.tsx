"use client";
import { useRef, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Icono } from "./Icono";
import { PiezaAjedrez } from "./PiezaAjedrez";

const INICIAL = "7k/5Q2/6K1/8/8/8/8/8 w - - 0 1";
const nombres: Record<string, string> = {k:"rey",q:"dama"};
export function DesafioAjedrez() {
  const [fen, setFen] = useState(INICIAL);
  const [seleccion, setSeleccion] = useState<Square | null>(null);
  const [mensaje, setMensaje] = useState("Tocá una pieza blanca y elegí su destino.");
  const [foco, setFoco] = useState(13);
  const casillas = useRef<(HTMLButtonElement | null)[]>([]);
  const partida = new Chess(fen);
  const resuelto = partida.isCheckmate();
  const legales = seleccion ? partida.moves({square:seleccion,verbose:true}).map(m=>m.to) : [];
  function elegir(casilla: Square) {
    if(resuelto) return;
    const pieza = partida.get(casilla);
    if(pieza?.color === "w") { setSeleccion(casilla); setMensaje("Ahora elegí una de las casillas marcadas."); return; }
    if(!seleccion || !legales.includes(casilla)) { setMensaje("Elegí primero una pieza blanca y después una casilla válida."); return; }
    const intento = new Chess(fen); const movimiento = intento.move({from:seleccion,to:casilla});
    if(intento.isCheckmate()) { setFen(intento.fen()); setMensaje(`¡Mate! ${movimiento.san.replace("Q","D").replace("K","R")} termina la partida.`); setSeleccion(null); }
    else setMensaje("Esa jugada no da mate. Probá otro destino.");
  }
  function pista() {
    const mate = partida.moves({verbose:true}).find(m => { const p = new Chess(fen); p.move(m); return p.isCheckmate(); });
    if(mate) { setSeleccion(mate.from); setMensaje(`Pista: llevá ${partida.get(mate.from)?.type === "q" ? "la dama" : "la pieza"} a ${mate.to}.`); }
  }
  return <section className="puzzle-card" aria-labelledby="titulo-desafio">
    <div className="mb-4 flex items-center justify-between gap-3"><div><p className="eyebrow text-amber-200">Un minuto de ajedrez</p><h2 id="titulo-desafio" className="mt-1 text-lg font-semibold">Blancas. Mate en una.</h2></div><span className="puzzle-piece" aria-hidden="true">♔</span></div>
    <div className="puzzle-board" role="group" aria-label="Tablero del desafío. Usá las flechas para recorrer casillas y Enter para elegir.">{partida.board().flatMap((fila,r) => fila.map((pieza,c) => {
      const casilla = `${"abcdefgh"[c]}${8-r}` as Square; const indice = r*8+c;
      return <button key={casilla} ref={el=>{casillas.current[indice]=el;}} type="button" tabIndex={foco===indice?0:-1} onFocus={()=>setFoco(indice)} aria-label={`${casilla}${pieza ? `, ${nombres[pieza.type]} ${pieza.type === "q" ? (pieza.color === "w" ? "blanca" : "negra") : (pieza.color === "w" ? "blanco" : "negro")}` : ", vacía"}${legales.includes(casilla)?", destino posible":""}`} aria-pressed={seleccion===casilla} className={`puzzle-square ${(r+c)%2 ? "square-dark":"square-light"} ${seleccion===casilla?"square-selected":""}`} onClick={()=>elegir(casilla)} onKeyDown={e=>{
        const siguientes: Record<string,number>={ArrowRight:Math.min(63,indice+1),ArrowLeft:Math.max(0,indice-1),ArrowDown:Math.min(63,indice+8),ArrowUp:Math.max(0,indice-8)};
        if(e.key in siguientes){e.preventDefault();casillas.current[siguientes[e.key]]?.focus();}
      }}>{pieza && <PiezaAjedrez tipo={pieza.type as "k"|"q"} color={pieza.color} />}{legales.includes(casilla)&&!pieza&&<span className="legal-dot" />}{c===0&&<span className="board-rank">{8-r}</span>}{r===7&&<span className="board-file">{"abcdefgh"[c]}</span>}</button>;
    }))}</div>
    <p role="status" className={`mt-4 min-h-10 text-xs leading-relaxed ${resuelto?"text-emerald-300":"text-zinc-300"}`}>{mensaje}</p>
    <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-3"><button type="button" disabled={resuelto} onClick={pista} className="puzzle-action"><Icono nombre="idea" className="h-4 w-4" />Ver pista</button><button type="button" onClick={()=>{setFen(INICIAL);setSeleccion(null);setMensaje("Tocá una pieza blanca y elegí su destino.");}} className="puzzle-action"><Icono nombre="reiniciar" className="h-4 w-4" />Reiniciar</button></div>
  </section>;
}
