import { Chess } from "chess.js";

export type PartidaLichess = {
  pgn: string;
  blancas: string;
  negras: string;
  resultado: string;
  fecha: string;
  control: string;
};

/** Trae las últimas partidas de un usuario de Lichess (API pública, sin login). */
export async function obtenerPartidasLichess(usuario: string, cantidad = 10): Promise<PartidaLichess[]> {
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(
    usuario.trim()
  )}?max=${cantidad}&moves=true&opening=false&clocks=false&evals=false`;
  const res = await fetch(url, { headers: { Accept: "application/x-chess-pgn" } });
  if (res.status === 404) {
    throw new Error(`No existe ningún usuario "${usuario}" en Lichess.`);
  }
  if (!res.ok) {
    throw new Error(`No se pudo consultar Lichess (código ${res.status}).`);
  }
  const texto = await res.text();
  const bloques = texto
    .split(/(?=\[Event )/)
    .map((p) => p.trim())
    .filter(Boolean);

  return bloques.map((pgn) => {
    const campo = (nombre: string) => pgn.match(new RegExp(`\\[${nombre} "([^"]*)"\\]`))?.[1] ?? "";
    return {
      pgn,
      blancas: campo("White") || "?",
      negras: campo("Black") || "?",
      resultado: campo("Result") || "*",
      fecha: campo("UTCDate"),
      control: campo("TimeControl"),
    };
  });
}

export type JugadaAnalizada = {
  numero: number;
  color: "w" | "b";
  san: string;
  perdidaCentipeones: number;
};

export type ResultadoAnalisis = {
  jugadas: JugadaAnalizada[];
  peorJugadaBlancas: JugadaAnalizada | null;
  peorJugadaNegras: JugadaAnalizada | null;
};

const TOPE_MATE = 100000;

function valorNumerico(evaluacion: { evaluacionCentipawns: number | null; mateEn: number | null }): number {
  if (evaluacion.mateEn !== null) {
    return Math.sign(evaluacion.mateEn) * (TOPE_MATE - Math.abs(evaluacion.mateEn) * 100);
  }
  return evaluacion.evaluacionCentipawns ?? 0;
}

/**
 * Analiza una partida completa jugada por jugada: evalúa cada posición con
 * Stockfish (siempre desde el punto de vista de blancas) y calcula cuánto
 * empeoró la posición de quien movió en cada jugada respecto a antes de
 * mover — eso es la "pérdida de centipeones" de esa jugada.
 */
export async function analizarPartida(
  pgn: string,
  motor: { analizar: (fen: string, turno: "w" | "b", tiempoMs?: number) => Promise<void> },
  onProgreso: (hechas: number, total: number) => void,
  ultimaEvaluacion: () => { evaluacionCentipawns: number | null; mateEn: number | null },
  tiempoMs = 250
): Promise<ResultadoAnalisis> {
  const chess = new Chess();
  chess.loadPgn(pgn);
  const movimientos = chess.history({ verbose: true });
  if (movimientos.length === 0) {
    return { jugadas: [], peorJugadaBlancas: null, peorJugadaNegras: null };
  }

  const posiciones = movimientos.map((m) => m.before);
  posiciones.push(movimientos[movimientos.length - 1].after);

  const valores: number[] = [];
  for (let i = 0; i < posiciones.length; i++) {
    const turno = posiciones[i].split(" ")[1] === "b" ? "b" : "w";
    await motor.analizar(posiciones[i], turno, tiempoMs);
    await new Promise((r) => setTimeout(r, tiempoMs + 150));
    valores.push(valorNumerico(ultimaEvaluacion()));
    onProgreso(i + 1, posiciones.length);
  }

  const jugadas: JugadaAnalizada[] = movimientos.map((m, i) => {
    const antes = valores[i];
    const despues = valores[i + 1];
    const perdida = m.color === "w" ? Math.max(0, antes - despues) : Math.max(0, despues - antes);
    return {
      numero: Math.floor(i / 2) + 1,
      color: m.color,
      san: m.san,
      perdidaCentipeones: Math.round(perdida),
    };
  });

  const deBlancas = jugadas.filter((j) => j.color === "w");
  const deNegras = jugadas.filter((j) => j.color === "b");
  const peor = (lista: JugadaAnalizada[]) =>
    lista.length === 0
      ? null
      : lista.reduce((a, b) => (b.perdidaCentipeones > a.perdidaCentipeones ? b : a));

  return {
    jugadas,
    peorJugadaBlancas: peor(deBlancas),
    peorJugadaNegras: peor(deNegras),
  };
}
