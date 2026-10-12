"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { Chessboard } from "react-chessboard";
import { MotorEntrenamiento } from "@/lib/motorEntrenamiento";
import type { AnalisisPosicion } from "@/lib/stockfish";
import type { EjercicioPersonal, PracticaError } from "@/lib/entrenamientoPersonal";
import { sanPractica } from "@/lib/partidaPractica";

const nombrePieza: Record<string, string> = { p: "peón", n: "caballo", b: "alfil", r: "torre", q: "dama", k: "rey" };
const valor = (a: AnalisisPosicion) => a.mateEn !== null ? Math.sign(a.mateEn) * (100000 - Math.abs(a.mateEn) * 100) : a.evaluacionCentipawns ?? 0;
export function EjercicioEntrenamiento({ ejercicio, practica, alIntentar, nota = "", alGuardarNota }: { ejercicio: EjercicioPersonal; practica?: PracticaError; alIntentar: (acierto: boolean, ayudado: boolean) => void; nota?: string; alGuardarNota: (nota: string) => void }) {
  const j = ejercicio.jugada;
  const [fen, setFen] = useState(j.fenAntes), [seleccion, setSeleccion] = useState<Square | null>(null);
  const [resuelto, setResuelto] = useState(false), [revelado, setRevelado] = useState(false), [evaluando, setEvaluando] = useState(false);
  const [mensaje, setMensaje] = useState(""), [pista, setPista] = useState(false);
  const [borrador, setBorrador] = useState(nota), [notaGuardada, setNotaGuardada] = useState(false);
  const [promocion, setPromocion] = useState<{ from: Square; to: Square } | null>(null);
  const motor = useRef<MotorEntrenamiento | null>(null), activo = useRef(true), ocupado = useRef(false);
  useEffect(() => { activo.current = true; return () => { activo.current = false; motor.current?.destruir(); }; }, []);
  async function mover(from: string, to: string, promotion?: PieceSymbol) {
    if (resuelto || ocupado.current) return;
    const ajedrez = new Chess(j.fenAntes);
    let movimiento;
    try { movimiento = ajedrez.move({ from, to, promotion }); } catch { setSeleccion(null); return; }
    ocupado.current = true; setEvaluando(true); setMensaje(""); setSeleccion(null);
    try {
      let acertado = movimiento.san === j.mejorJugadaSan;
      if (!acertado) {
        // También reconocer buenas alternativas: el ejercicio no obliga a copiar una sola SAN.
        if (!motor.current) motor.current = new MotorEntrenamiento();
        const original = new Chess(j.fenAntes);
        const antes = await motor.current.evaluarPosicion(original.fen(), original.turn(), 900);
        const despues = await motor.current.evaluarPosicion(ajedrez.fen(), ajedrez.turn(), 900);
        const perdida = j.color === "w" ? valor(antes) - valor(despues) : valor(despues) - valor(antes);
        acertado = perdida <= 40;
      }
      if (!activo.current) return;
      alIntentar(acertado, revelado || pista);
      if (acertado) { setFen(ajedrez.fen()); setResuelto(true); setMensaje(revelado || pista ? "Bien. Volvé otro día para resolverla sin ayuda." : "¡Bien encontrada! El repaso quedará pendiente para otro día."); }
      else setMensaje("Hay una alternativa mejor. Volvé a mirar las amenazas de ambos lados y probá otro candidato.");
    } catch (e) {
      if (activo.current && (e as Error).name !== "AbortError") { motor.current?.destruir(); motor.current = null; setMensaje("No pudimos comprobar esa alternativa. Reintentá; este intento no cuenta como error."); }
    } finally { ocupado.current = false; if (activo.current) setEvaluando(false); }
  }
  function elegir(from: string, to: string) {
    if (resuelto || ocupado.current) return false;
    const partida = new Chess(j.fenAntes);
    const legales = partida.moves({ square: from as Square, verbose: true }).filter(m => m.to === to);
    if (!legales.length) return false;
    if (legales.some(m => m.promotion)) setPromocion({ from: from as Square, to: to as Square });
    else void mover(from, to);
    return false;
  }
  const partida = new Chess(fen);
  const estilos: Record<string, CSSProperties> = {};
  if (seleccion) {
    estilos[seleccion] = { backgroundColor: "#e4be7180" };
    for (const m of partida.moves({ square: seleccion, verbose: true })) estilos[m.to] = { backgroundImage: "radial-gradient(circle, #173f3b88 0 15%, transparent 17%)" };
  }
  return <div className="training-exercise"><div className="training-exercise-heading"><span>{j.color === "w" ? "Jugás con blancas" : "Jugás con negras"}</span><span>{ejercicio.tema}</span></div>
    <div className="training-board play-board"><Chessboard options={{ id: "ejercicio-personal", position: fen, boardOrientation: j.color === "w" ? "white" : "black", allowDragging: !resuelto && !evaluando, allowAutoScroll: false, animationDurationInMs: 220, lightSquareStyle: { backgroundColor: "#f0e6ce" }, darkSquareStyle: { backgroundColor: "#638480" }, squareStyles: estilos,
      canDragPiece: ({ square }) => !resuelto && !evaluando && !promocion && partida.get(square as Square)?.color === j.color,
      onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? elegir(sourceSquare, targetSquare) : false,
      onSquareClick: ({ square }) => { if (resuelto || ocupado.current) return; const pieza = partida.get(square as Square); if (seleccion && partida.moves({ square: seleccion, verbose: true }).some(m => m.to === square)) elegir(seleccion, square); else setSeleccion(pieza?.color === j.color ? square as Square : null); },
      squareRenderer: ({ square, children }) => { const pieza = partida.get(square as Square); return <button type="button" className="play-square" disabled={resuelto || evaluando} aria-label={`${square}${pieza ? `, ${nombrePieza[pieza.type]} ${pieza.color === "w" ? "blanco" : "negro"}` : ", vacía"}`}>{children}</button>; },
    }}/></div>
    {promocion && <div className="training-promotion" role="group" aria-label="Elegir pieza de promoción">{(["q", "r", "b", "n"] as PieceSymbol[]).map(p => <button type="button" key={p} className="button-secondary" onClick={() => { const mov = promocion; setPromocion(null); void mover(mov.from, mov.to, p); }}>{nombrePieza[p]}</button>)}</div>}
    <div className="training-exercise-feedback" role="status">{evaluando ? "Comprobando tu alternativa con el motor…" : mensaje || "Antes de mover: ¿qué amenaza el rival? Elegí dos candidatos y calculá su respuesta."}</div>
    {pista && !revelado && <p className="training-hint">Buscá una alternativa a <strong>{sanPractica(j.san)}</strong>. {j.piezaColgada ? `Revisá la seguridad del ${j.piezaColgada.nombrePieza} en ${j.piezaColgada.casilla}.` : j.llevaAMate ? "Prestá atención a los jaques y a la seguridad del rey." : "Revisá jaques, capturas y amenazas para ambos lados."}</p>}
    {(resuelto || revelado) && <div className="training-solution"><strong>La idea para comparar</strong><p>{j.varianteSan?.map(sanPractica).join(" · ")}</p><p>En la partida se jugó {j.numero}{j.color === "w" ? "." : "…"} {sanPractica(j.san)}. {j.llevaAMate ? "Quedó un mate forzado a favor del rival." : `La pérdida estimada fue de ${(j.perdidaCentipeones / 100).toLocaleString("es-UY", { maximumFractionDigits: 2 })} peones.`}</p></div>}
    {!resuelto && <div className="training-exercise-actions"><button type="button" className="button-secondary" disabled={evaluando || revelado} onClick={() => setPista(true)}>Una pista</button><button type="button" className="text-link" disabled={evaluando || revelado} onClick={() => { setRevelado(true); alIntentar(false, true); }}>Ver la idea</button></div>}
    {practica?.proxima && <p className="training-next-review">Próximo repaso: {new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short" }).format(new Date(practica.proxima + "T12:00:00Z"))} · Las ayudas no suman un acierto independiente.</p>}
    <div className="training-exercise-note"><label className="training-field">¿Qué te llevás de esta posición?<textarea value={borrador} maxLength={800} onChange={e => { setBorrador(e.target.value); setNotaGuardada(false); }} placeholder="La amenaza que no vi, el candidato que faltó…"/></label><button type="button" className="text-link" onClick={() => { alGuardarNota(borrador.trim()); setNotaGuardada(true); }}>Guardar mi idea</button><span role="status">{notaGuardada ? "Idea guardada junto a esta posición." : ""}</span></div>
  </div>;
}
