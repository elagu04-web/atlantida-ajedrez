import { Chess, type Square } from "chess.js";

export type PartidaLichess = {
  pgn: string;
  blancas: string;
  negras: string;
  resultado: string;
  fecha: string;
  control: string;
  apertura: string;
  eco: string;
};

/** Trae las últimas partidas de un usuario de Lichess (API pública, sin login). */
export async function obtenerPartidasLichess(usuario: string, cantidad = 10): Promise<PartidaLichess[]> {
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(
    usuario.trim()
  )}?max=${cantidad}&moves=true&opening=true&clocks=false&evals=false`;
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
      apertura: campo("Opening") || "Apertura desconocida",
      eco: campo("ECO"),
    };
  });
}

const VALOR_PIEZA: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const NOMBRE_PIEZA: Record<string, string> = {
  p: "peón",
  n: "caballo",
  b: "alfil",
  r: "torre",
  q: "dama",
};

export type PiezaColgada = { casilla: string; pieza: string; nombrePieza: string };

/**
 * Heurística simple de "pieza colgada": después de la jugada, ¿quedó
 * alguna pieza del que acaba de mover atacada por el rival y sin ninguna
 * pieza propia defendiéndola? No es un análisis táctico completo (no ve
 * clavadas ni sobrecargas), pero agarra el caso más común de principiante/
 * intermedio: dejar algo picando gratis.
 */
function detectarPiezaColgada(fenDespues: string, colorQueMovio: "w" | "b"): PiezaColgada | null {
  const chess = new Chess(fenDespues);
  const oponente = colorQueMovio === "w" ? "b" : "w";
  let peor: PiezaColgada | null = null;
  let peorValor = 0;
  for (const fila of chess.board()) {
    for (const celda of fila) {
      if (!celda || celda.color !== colorQueMovio || celda.type === "k") continue;
      if (!chess.isAttacked(celda.square as Square, oponente)) continue;
      const defendida = chess.attackers(celda.square as Square, colorQueMovio).length > 0;
      if (defendida) continue;
      const valor = VALOR_PIEZA[celda.type];
      if (valor > peorValor) {
        peorValor = valor;
        peor = { casilla: celda.square, pieza: celda.type, nombrePieza: NOMBRE_PIEZA[celda.type] };
      }
    }
  }
  return peor;
}

export type JugadaAnalizada = {
  numero: number;
  color: "w" | "b";
  san: string;
  perdidaCentipeones: number;
  fenAntes: string;
  mejorJugadaSan: string | null;
  varianteSan: string[] | null;
  piezaColgada: PiezaColgada | null;
  llevaAMate: boolean;
};

function variantASan(fen: string, uciLista: string[] | null, tope = 4): string[] | null {
  if (!uciLista || uciLista.length === 0) return null;
  const chess = new Chess(fen);
  const sans: string[] = [];
  for (const uci of uciLista.slice(0, tope)) {
    try {
      const mov = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      });
      if (!mov) break;
      sans.push(mov.san);
    } catch {
      break;
    }
  }
  return sans.length > 0 ? sans : null;
}

export type ResultadoAnalisis = {
  jugadas: JugadaAnalizada[];
  peorJugadaBlancas: JugadaAnalizada | null;
  peorJugadaNegras: JugadaAnalizada | null;
};

const TOPE_MATE = 100000;
// Techo para la "pérdida" que se muestra/promedia. El valor gigante de
// TOPE_MATE sirve para comparar internamente quién va ganando cuando hay
// jaque mate forzado, pero mostrar "-99254 centipeones" en una jugada no
// significa nada para un humano y arruina cualquier promedio (una sola
// jugada hacia un mate forzado pesaría como cientos de jugadas normales
// juntas). Cualquier pérdida de 1000+ ya es "perdiste la partida", no hace
// falta más precisión que esa.
const TOPE_PERDIDA_MOSTRADA = 1000;

function valorNumerico(evaluacion: { evaluacionCentipawns: number | null; mateEn: number | null }): number {
  if (evaluacion.mateEn !== null) {
    return Math.sign(evaluacion.mateEn) * (TOPE_MATE - Math.abs(evaluacion.mateEn) * 100);
  }
  return evaluacion.evaluacionCentipawns ?? 0;
}

type EvaluacionMotor = {
  evaluacionCentipawns: number | null;
  mateEn: number | null;
  mejorJugada: string | null;
  variantePrincipal: string[] | null;
};

/**
 * Analiza una partida completa jugada por jugada: evalúa cada posición con
 * Stockfish (siempre desde el punto de vista de blancas) y calcula cuánto
 * empeoró la posición de quien movió en cada jugada respecto a antes de
 * mover — eso es la "pérdida de centipeones" de esa jugada. Para las
 * jugadas marcadas como error, además arma la línea que sugería el motor
 * y revisa si quedó alguna pieza colgada.
 */
export async function analizarPartida(
  pgn: string,
  motor: { analizar: (fen: string, turno: "w" | "b", tiempoMs?: number) => Promise<void> },
  onProgreso: (hechas: number, total: number) => void,
  ultimaEvaluacion: () => EvaluacionMotor,
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
  const variantes: (string[] | null)[] = [];
  const esMate: boolean[] = [];
  for (let i = 0; i < posiciones.length; i++) {
    const turno = posiciones[i].split(" ")[1] === "b" ? "b" : "w";
    await motor.analizar(posiciones[i], turno, tiempoMs);
    await new Promise((r) => setTimeout(r, tiempoMs + 150));
    const evaluacion = ultimaEvaluacion();
    valores.push(valorNumerico(evaluacion));
    variantes.push(evaluacion.variantePrincipal);
    esMate.push(evaluacion.mateEn !== null);
    onProgreso(i + 1, posiciones.length);
  }

  const jugadas: JugadaAnalizada[] = movimientos.map((m, i) => {
    const antes = valores[i];
    const despues = valores[i + 1];
    const perdidaCruda = m.color === "w" ? Math.max(0, antes - despues) : Math.max(0, despues - antes);
    const perdida = Math.min(perdidaCruda, TOPE_PERDIDA_MOSTRADA);
    const esError = perdida >= 50;
    const llevaAMate = esMate[i] || esMate[i + 1];
    const varianteSan = esError ? variantASan(posiciones[i], variantes[i]) : null;
    // Si el motor sugería exactamente la jugada que se hizo, no hay nada
    // mejor que mostrar.
    const mejorJugadaSan = varianteSan && varianteSan[0] !== m.san ? varianteSan[0] : null;
    return {
      numero: Math.floor(i / 2) + 1,
      color: m.color,
      san: m.san,
      perdidaCentipeones: Math.round(perdida),
      fenAntes: posiciones[i],
      mejorJugadaSan,
      varianteSan: mejorJugadaSan ? varianteSan : null,
      piezaColgada: esError ? detectarPiezaColgada(m.after, m.color) : null,
      llevaAMate,
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
  apertura: string;
  perdidaPromedio: number;
  peorJugada: JugadaAnalizada | null;
};

export type ResumenApertura = {
  apertura: string;
  partidas: number;
  victorias: number;
  empates: number;
  derrotas: number;
  perdidaPromedio: number;
};

export type AnalisisPatrones = {
  partidas: ResumenPartidaJugador[];
  perdidaPromedioGeneral: number;
  totalErroresGraves: number;
  totalErrores: number;
  totalImprecisiones: number;
  totalPiezasColgadas: number;
  perdidaPorFase: Record<FaseJuego, { total: number; cantidad: number }>;
  faseMasDebil: FaseJuego | null;
  aperturas: ResumenApertura[];
};

/**
 * Analiza varias partidas seguidas del mismo jugador (identificado por su
 * usuario de Lichess, comparando contra blancas/negras de cada partida) y
 * junta los resultados: cuánto pierde en promedio, cuántos errores de cada
 * tipo comete, en qué momento de la partida (apertura/medio juego/final) le
 * cuesta más, y cómo le va con cada apertura — para tener una idea de qué
 * entrenar, no solo qué pasó en una partida puntual.
 */
export async function analizarPatrones(
  partidas: PartidaLichess[],
  usuario: string,
  motor: { analizar: (fen: string, turno: "w" | "b", tiempoMs?: number) => Promise<void> },
  onProgreso: (partidaActual: number, totalPartidas: number, jugadaActual: number, totalJugadas: number) => void,
  ultimaEvaluacion: () => EvaluacionMotor,
  tiempoMs = 180
): Promise<AnalisisPatrones> {
  const usuarioNorm = usuario.trim().toLowerCase();
  const resumenes: ResumenPartidaJugador[] = [];
  const todasLasJugadas: JugadaAnalizada[] = [];
  const porApertura = new Map<
    string,
    { partidas: number; victorias: number; empates: number; derrotas: number; perdidaTotal: number; jugadasTotal: number }
  >();

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
      apertura: partida.apertura,
      perdidaPromedio: Math.round(perdidaPromedio),
      peorJugada,
    });

    const gano = (esBlancas && partida.resultado === "1-0") || (esNegras && partida.resultado === "0-1");
    const perdio = (esBlancas && partida.resultado === "0-1") || (esNegras && partida.resultado === "1-0");
    const entrada = porApertura.get(partida.apertura) ?? {
      partidas: 0,
      victorias: 0,
      empates: 0,
      derrotas: 0,
      perdidaTotal: 0,
      jugadasTotal: 0,
    };
    entrada.partidas += 1;
    if (gano) entrada.victorias += 1;
    else if (perdio) entrada.derrotas += 1;
    else entrada.empates += 1;
    entrada.perdidaTotal += jugadasJugador.reduce((s, j) => s + j.perdidaCentipeones, 0);
    entrada.jugadasTotal += jugadasJugador.length;
    porApertura.set(partida.apertura, entrada);
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

  const aperturas: ResumenApertura[] = [...porApertura.entries()]
    .map(([apertura, e]) => ({
      apertura,
      partidas: e.partidas,
      victorias: e.victorias,
      empates: e.empates,
      derrotas: e.derrotas,
      perdidaPromedio: e.jugadasTotal > 0 ? Math.round(e.perdidaTotal / e.jugadasTotal) : 0,
    }))
    .sort((a, b) => b.partidas - a.partidas);

  return {
    partidas: resumenes,
    perdidaPromedioGeneral: todasLasJugadas.length
      ? Math.round(todasLasJugadas.reduce((s, j) => s + j.perdidaCentipeones, 0) / todasLasJugadas.length)
      : 0,
    totalErroresGraves: todasLasJugadas.filter((j) => j.perdidaCentipeones >= 300).length,
    totalErrores: todasLasJugadas.filter((j) => j.perdidaCentipeones >= 100 && j.perdidaCentipeones < 300).length,
    totalImprecisiones: todasLasJugadas.filter((j) => j.perdidaCentipeones >= 50 && j.perdidaCentipeones < 100).length,
    totalPiezasColgadas: todasLasJugadas.filter((j) => j.piezaColgada !== null).length,
    perdidaPorFase,
    faseMasDebil,
    aperturas,
  };
}
