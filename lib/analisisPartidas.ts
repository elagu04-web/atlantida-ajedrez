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
  fenAntes: string;
  mejorJugadaSan: string | null;
};

function uciASan(fen: string, uci: string | null): string | null {
  if (!uci) return null;
  try {
    const prueba = new Chess(fen);
    const mov = prueba.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return mov?.san ?? null;
  } catch {
    return null;
  }
}

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
  ultimaEvaluacion: () => {
    evaluacionCentipawns: number | null;
    mateEn: number | null;
    mejorJugada: string | null;
  },
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
  const mejoresUci: (string | null)[] = [];
  for (let i = 0; i < posiciones.length; i++) {
    const turno = posiciones[i].split(" ")[1] === "b" ? "b" : "w";
    await motor.analizar(posiciones[i], turno, tiempoMs);
    await new Promise((r) => setTimeout(r, tiempoMs + 150));
    const evaluacion = ultimaEvaluacion();
    valores.push(valorNumerico(evaluacion));
    mejoresUci.push(evaluacion.mejorJugada);
    onProgreso(i + 1, posiciones.length);
  }

  const jugadas: JugadaAnalizada[] = movimientos.map((m, i) => {
    const antes = valores[i];
    const despues = valores[i + 1];
    const perdida = m.color === "w" ? Math.max(0, antes - despues) : Math.max(0, despues - antes);
    // Si el motor sugería exactamente la jugada que se hizo, no hay nada
    // mejor que mostrar.
    const mejorJugadaSan =
      perdida >= 50 ? uciASan(posiciones[i], mejoresUci[i]) : null;
    return {
      numero: Math.floor(i / 2) + 1,
      color: m.color,
      san: m.san,
      perdidaCentipeones: Math.round(perdida),
      fenAntes: posiciones[i],
      mejorJugadaSan: mejorJugadaSan === m.san ? null : mejorJugadaSan,
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

export type FaseJuego = "apertura" | "medio juego" | "final";

function faseDeJugada(numeroJugada: number): FaseJuego {
  if (numeroJugada <= 10) return "apertura";
  if (numeroJugada <= 25) return "medio juego";
  return "final";
}

export type ResumenPartidaJugador = {
  rival: string;
  color: "w" | "b";
  resultado: string;
  fecha: string;
  perdidaPromedio: number;
  peorJugada: JugadaAnalizada | null;
};

export type AnalisisPatrones = {
  partidas: ResumenPartidaJugador[];
  perdidaPromedioGeneral: number;
  totalErroresGraves: number;
  totalErrores: number;
  totalImprecisiones: number;
  perdidaPorFase: Record<FaseJuego, { total: number; cantidad: number }>;
  faseMasDebil: FaseJuego | null;
};

/**
 * Analiza varias partidas seguidas del mismo jugador (identificado por su
 * usuario de Lichess, comparando contra blancas/negras de cada partida) y
 * junta los resultados: cuánto pierde en promedio, cuántos errores de cada
 * tipo comete, y en qué momento de la partida (apertura/medio juego/final)
 * le cuesta más — para tener una idea de qué entrenar, no solo qué pasó en
 * una partida puntual.
 */
export async function analizarPatrones(
  partidas: PartidaLichess[],
  usuario: string,
  motor: { analizar: (fen: string, turno: "w" | "b", tiempoMs?: number) => Promise<void> },
  onProgreso: (partidaActual: number, totalPartidas: number, jugadaActual: number, totalJugadas: number) => void,
  ultimaEvaluacion: () => {
    evaluacionCentipawns: number | null;
    mateEn: number | null;
    mejorJugada: string | null;
  },
  tiempoMs = 180
): Promise<AnalisisPatrones> {
  const usuarioNorm = usuario.trim().toLowerCase();
  const resumenes: ResumenPartidaJugador[] = [];
  const todasLasJugadas: JugadaAnalizada[] = [];

  for (let p = 0; p < partidas.length; p++) {
    const partida = partidas[p];
    const esBlancas = partida.blancas.toLowerCase() === usuarioNorm;
    const esNegras = partida.negras.toLowerCase() === usuarioNorm;
    if (!esBlancas && !esNegras) continue;
    const colorJugador: "w" | "b" = esBlancas ? "w" : "b";

    const res = await analizarPartida(
      partida.pgn,
      motor,
      (hechas, total) => onProgreso(p + 1, partidas.length, hechas, total),
      ultimaEvaluacion,
      tiempoMs
    );

    const jugadasJugador = res.jugadas.filter((j) => j.color === colorJugador);
    todasLasJugadas.push(...jugadasJugador);
    const perdidaPromedio = jugadasJugador.length
      ? jugadasJugador.reduce((s, j) => s + j.perdidaCentipeones, 0) / jugadasJugador.length
      : 0;
    const peorJugada = jugadasJugador.reduce<JugadaAnalizada | null>(
      (a, b) => (!a || b.perdidaCentipeones > a.perdidaCentipeones ? b : a),
      null
    );

    resumenes.push({
      rival: esBlancas ? partida.negras : partida.blancas,
      color: colorJugador,
      resultado: partida.resultado,
      fecha: partida.fecha,
      perdidaPromedio: Math.round(perdidaPromedio),
      peorJugada,
    });
  }

  const perdidaPorFase: Record<FaseJuego, { total: number; cantidad: number }> = {
    apertura: { total: 0, cantidad: 0 },
    "medio juego": { total: 0, cantidad: 0 },
    final: { total: 0, cantidad: 0 },
  };
  for (const j of todasLasJugadas) {
    const fase = faseDeJugada(j.numero);
    perdidaPorFase[fase].total += j.perdidaCentipeones;
    perdidaPorFase[fase].cantidad += 1;
  }

  const fases: FaseJuego[] = ["apertura", "medio juego", "final"];
  const faseMasDebil =
    fases
      .filter((f) => perdidaPorFase[f].cantidad > 0)
      .sort(
        (a, b) =>
          perdidaPorFase[b].total / perdidaPorFase[b].cantidad -
          perdidaPorFase[a].total / perdidaPorFase[a].cantidad
      )[0] ?? null;

  return {
    partidas: resumenes,
    perdidaPromedioGeneral: todasLasJugadas.length
      ? Math.round(todasLasJugadas.reduce((s, j) => s + j.perdidaCentipeones, 0) / todasLasJugadas.length)
      : 0,
    totalErroresGraves: todasLasJugadas.filter((j) => j.perdidaCentipeones >= 300).length,
    totalErrores: todasLasJugadas.filter((j) => j.perdidaCentipeones >= 100 && j.perdidaCentipeones < 300).length,
    totalImprecisiones: todasLasJugadas.filter((j) => j.perdidaCentipeones >= 50 && j.perdidaCentipeones < 100).length,
    perdidaPorFase,
    faseMasDebil,
  };
}
