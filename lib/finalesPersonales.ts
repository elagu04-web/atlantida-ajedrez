import { Chess } from "chess.js";
import type { SesionEntrenamiento, PracticaError } from "./entrenamientoPersonal";
import type { AnalisisPosicion } from "./stockfish";

export type PlanFinal = "activar" | "debilidades" | "pasado" | "contrajuego" | "otro";
export type EstadoFinalPersonal = {
  fen: string; ruta: string[]; errores: number; ayudas: number;
  valoracion: "ganar" | "tablas" | "resistir"; plan: PlanFinal; nota: string;
  actualizada: string; practica?: PracticaError;
};
export type FinalDePartida = {
  id: string; sesion: SesionEntrenamiento; indice: number; fen: string;
  familia: string; errorDetectado: boolean;
};
export const PLANES_FINALES: Record<PlanFinal, string> = {
  activar: "Activar el rey o mi pieza", debilidades: "Atacar o crear una debilidad",
  pasado: "Crear o frenar un peón pasado", contrajuego: "Frenar el contrajuego", otro: "Otro plan",
};

/** Material, not move number, identifies likely endgames. This is a deliberately
 * conservative filter, not a theoretical evaluation of the position. */
export function familiaFinal(fen: string): string | null {
  try {
    // Most imported positions are middlegames. Reject those cheaply before
    // constructing a chess instance on every account update.
    const tablero = fen.split(" ")[0];
    const piezasTexto = tablero.match(/[prnbqk]/gi) ?? [];
    const mayoresTexto = tablero.match(/[rnbq]/gi) ?? [];
    const blancasTexto = mayoresTexto.filter(p => p === p.toUpperCase()).length;
    const negrasTexto = mayoresTexto.length - blancasTexto;
    if (!(blancasTexto <= 1 && negrasTexto <= 1) &&
      !(mayoresTexto.every(p => p.toLowerCase() !== "q") && mayoresTexto.length <= 4 && piezasTexto.length <= 16)) return null;
    const c = new Chess(fen);
    if (c.isGameOver()) return null;
    const piezas = c.board().flat().filter(p => p !== null);
    const mayores = piezas.filter(p => p.type !== "k" && p.type !== "p");
    const blancas = mayores.filter(p => p.color === "w").length;
    const negras = mayores.filter(p => p.color === "b").length;
    if (!(blancas <= 1 && negras <= 1) &&
      !(mayores.every(p => p.type !== "q") && mayores.length <= 4 && piezas.length <= 16)) return null;
    if (!mayores.length) return "Reyes y peones";
    if (mayores.every(p => p.type === "r")) return "Torres";
    if (mayores.every(p => p.type === "b" || p.type === "n")) return "Piezas menores";
    if (mayores.every(p => p.type === "q")) return "Damas";
    return "Finales mixtos";
  } catch { return null; }
}

export function finalesDePartidas(sesiones: SesionEntrenamiento[]): FinalDePartida[] {
  return sesiones.flatMap(s => {
    const vistos = new Set<string>();
    const candidatos = s.resultado.jugadas.flatMap((j, indice) => {
      if (j.color !== s.color) return [];
      const familia = familiaFinal(j.fenAntes);
      const posicion = j.fenAntes.split(" ").slice(0, 4).join(" ");
      if (!familia || vistos.has(posicion)) return [];
      vistos.add(posicion);
      return [{ id: `${s.id}:${indice}`, sesion: s, indice, fen: j.fenAntes, familia, errorDetectado: j.perdidaCentipeones >= 100 }];
    });
    // Keep saved work visible even when a later reanalysis changes the ranking.
    const guardados = candidatos.filter(e => s.finales?.[String(e.indice)]);
    const resto = candidatos.filter(e => !s.finales?.[String(e.indice)]).sort((a, b) =>
      Number(b.errorDetectado) - Number(a.errorDetectado) ||
      b.sesion.resultado.jugadas[b.indice].perdidaCentipeones - a.sesion.resultado.jugadas[a.indice].perdidaCentipeones || a.indice - b.indice);
    const elegidos = [...guardados];
    for (const e of resto) {
      if (elegidos.length >= Math.max(4, guardados.length)) break;
      if (elegidos.some(x => Math.abs(x.indice - e.indice) < 4)) continue;
      elegidos.push(e);
    }
    return elegidos;
  }).sort((a, b) => Number(b.errorDetectado) - Number(a.errorDetectado) || b.sesion.creada.localeCompare(a.sesion.creada) || a.indice - b.indice);
}

export function posicionFinal(estado: Pick<EstadoFinalPersonal, "fen" | "ruta">): Chess {
  const c = new Chess(estado.fen);
  for (const uci of estado.ruta) c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
  return c;
}
export function estadoFinalValido(v: unknown, fen: string, color: "w" | "b"): v is EstadoFinalPersonal {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const e = v as EstadoFinalPersonal;
  try {
    if (e.fen !== fen || !Array.isArray(e.ruta) || e.ruta.length > 400 ||
      e.ruta.some(u => typeof u !== "string" || !/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)) ||
      !Number.isInteger(e.errores) || e.errores < 0 || e.errores > 400 ||
      !Number.isInteger(e.ayudas) || e.ayudas < 0 || e.ayudas > 10000 ||
      !["ganar", "tablas", "resistir"].includes(e.valoracion) || !Object.hasOwn(PLANES_FINALES, e.plan) ||
      typeof e.nota !== "string" || e.nota.length > 800 || typeof e.actualizada !== "string" || !Number.isFinite(Date.parse(e.actualizada))) return false;
    if (new Chess(fen).turn() !== color) return false;
    const c = posicionFinal(e);
    return c.turn() === color || c.isGameOver();
  } catch { return false; }
}

/** Engine scores are White-relative. A modest tolerance accepts alternatives;
 * this is feedback for practice, never a tablebase claim of win or draw. */
export function compararDecisionFinal(antes: AnalisisPosicion, despues: AnalisisPosicion, color: "w" | "b", uci: string) {
  const signo = color === "w" ? 1 : -1;
  const valor = (a: AnalisisPosicion) => a.mateEn !== null ? Math.sign(a.mateEn) * (100000 - Math.abs(a.mateEn) * 100) : a.evaluacionCentipawns;
  const a = valor(antes), b = valor(despues);
  if (a === null || b === null) throw new Error("No se pudo comprobar la decisión.");
  const mismoMate = antes.mateEn !== null && despues.mateEn !== null && Math.sign(antes.mateEn) === signo && Math.sign(despues.mateEn) === signo;
  const perdida = uci === antes.mejorJugada || mismoMate ? 0 : Math.max(0, (a - b) * signo);
  return { acierto: perdida <= 75, perdida: Math.min(perdida, 1000) };
}

export function resultadoFinal(c: Chess, color: "w" | "b"): "victoria" | "derrota" | "tablas" | null {
  if (c.isCheckmate()) return c.turn() !== color ? "victoria" : "derrota";
  return c.isGameOver() ? "tablas" : null;
}
