import { RoundRobin, Swiss } from "tournament-pairings";
import type { Match } from "tournament-pairings/interfaces";

export type FormatoTorneo = "round-robin" | "suizo";
export type ResultadoPartida = "1-0" | "0-1" | "1/2-1/2";

export type EmparejamientoTorneo = {
  numero: number;
  blancasId: string;
  negrasId: string | null; // null = descanso (bye)
  resultado: ResultadoPartida | null;
};

export type RondaTorneo = {
  numero: number;
  emparejamientos: EmparejamientoTorneo[];
  advertenciaManual?: boolean;
};

export type EstadoTorneo = "armado" | "en_curso" | "finalizado";

export type Torneo = {
  id: string;
  nombre: string;
  formato: FormatoTorneo;
  desempates: string[];
  jugadoresIds: string[];
  rondas: RondaTorneo[];
  estado: EstadoTorneo;
  rondasObjetivo: number | null;
  creadoEn: string;
  // true en torneos históricos importados cuyos resultados no deben
  // recalcular el Elo actual (para no duplicar un efecto ya reflejado en el
  // Elo inicial), pero sí deben contar para historial de partidas,
  // estadísticas y Copa de Campeones.
  excluirDeElo?: boolean;
  // Registro de la final de desempate jugada aparte (tradición del club:
  // un empate en la punta no se resuelve por planilla, se juega una final).
  finalDesempate?: FinalDesempate | null;
};

export type FinalDesempate = {
  jugadorIds: string[]; // los que definen la final (2, salvo empates sin desempate configurado)
  ganadorId: string | null; // null hasta que se cargue el resultado de la final
};

export const DESEMPATES_DISPONIBLES = [
  "Buchholz",
  "Sonneborn-Berger",
  "Progresivo",
  "Enfrentamiento directo",
  "Mayor número de victorias",
];

export type Standing = {
  jugadorId: string;
  puntos: number;
  partidasJugadas: number;
  avoid: string[];
  seating: (1 | -1)[];
  receivedBye: boolean;
};

function construirEmparejamiento(m: Match, numero: number): EmparejamientoTorneo {
  const p1 = m.player1 !== null && m.player1 !== undefined ? String(m.player1) : null;
  const p2 = m.player2 !== null && m.player2 !== undefined ? String(m.player2) : null;
  if (p1 && !p2) {
    return { numero, blancasId: p1, negrasId: null, resultado: "1-0" };
  }
  if (!p1 && p2) {
    return { numero, blancasId: p2, negrasId: null, resultado: "1-0" };
  }
  return { numero, blancasId: p1 as string, negrasId: p2, resultado: null };
}

export function generarRoundRobin(jugadoresIds: string[]): RondaTorneo[] {
  const matches = RoundRobin(jugadoresIds, 1, false) as Match[];
  const porRonda = new Map<number, Match[]>();
  for (const m of matches) {
    if (!porRonda.has(m.round)) porRonda.set(m.round, []);
    porRonda.get(m.round)!.push(m);
  }
  return [...porRonda.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([numero, ms]) => ({
      numero,
      emparejamientos: ms.map((m, i) => construirEmparejamiento(m, i + 1)),
    }));
}

export function calcularStandings(torneo: Torneo): Map<string, Standing> {
  const standings = new Map<string, Standing>();
  for (const id of torneo.jugadoresIds) {
    standings.set(id, {
      jugadorId: id,
      puntos: 0,
      partidasJugadas: 0,
      avoid: [],
      seating: [],
      receivedBye: false,
    });
  }
  for (const ronda of torneo.rondas) {
    for (const emp of ronda.emparejamientos) {
      const blancas = standings.get(emp.blancasId);
      const negras = emp.negrasId ? standings.get(emp.negrasId) : undefined;

      if (!emp.negrasId) {
        if (blancas) blancas.receivedBye = true;
      } else {
        if (blancas) blancas.seating.push(1);
        if (negras) negras.seating.push(-1);
        if (blancas && negras) {
          blancas.avoid.push(negras.jugadorId);
          negras.avoid.push(blancas.jugadorId);
        }
      }

      if (emp.resultado) {
        if (blancas) blancas.partidasJugadas += 1;
        if (negras) negras.partidasJugadas += 1;
        if (emp.resultado === "1-0" && blancas) blancas.puntos += 1;
        else if (emp.resultado === "0-1" && negras) negras.puntos += 1;
        else if (emp.resultado === "1/2-1/2") {
          if (blancas) blancas.puntos += 0.5;
          if (negras) negras.puntos += 0.5;
        }
      }
    }
  }
  return standings;
}

type JugadaTorneo = { rivalId: string; resultadoPropio: number };

function historialDeJugador(torneo: Torneo, jugadorId: string): JugadaTorneo[] {
  const historial: JugadaTorneo[] = [];
  for (const ronda of torneo.rondas) {
    for (const emp of ronda.emparejamientos) {
      if (!emp.resultado || !emp.negrasId) continue; // sin resultado o descanso: no cuenta como enfrentamiento
      if (emp.blancasId !== jugadorId && emp.negrasId !== jugadorId) continue;
      const esBlancas = emp.blancasId === jugadorId;
      const rivalId = esBlancas ? emp.negrasId : emp.blancasId;
      let resultadoPropio: number;
      if (emp.resultado === "1/2-1/2") resultadoPropio = 0.5;
      else if ((emp.resultado === "1-0" && esBlancas) || (emp.resultado === "0-1" && !esBlancas))
        resultadoPropio = 1;
      else resultadoPropio = 0;
      historial.push({ rivalId, resultadoPropio });
    }
  }
  return historial;
}

function progresivoDeJugador(torneo: Torneo, jugadorId: string): number {
  let acumulado = 0;
  let total = 0;
  for (const ronda of [...torneo.rondas].sort((a, b) => a.numero - b.numero)) {
    const emp = ronda.emparejamientos.find(
      (e) => e.blancasId === jugadorId || e.negrasId === jugadorId
    );
    if (!emp || !emp.resultado) continue;
    let ganado = 0;
    if (!emp.negrasId) ganado = 1; // descanso: punto libre
    else if (emp.resultado === "1/2-1/2") ganado = 0.5;
    else if (
      (emp.resultado === "1-0" && emp.blancasId === jugadorId) ||
      (emp.resultado === "0-1" && emp.negrasId === jugadorId)
    )
      ganado = 1;
    acumulado += ganado;
    total += acumulado;
  }
  return total;
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Calcula, para cada jugador del torneo, el valor de cada criterio de
 * desempate disponible (independientemente de cuáles estén configurados en
 * el torneo — se calculan todos, y quien ordena decide cuáles usar):
 * - Buchholz: suma de los puntos finales de todos los rivales enfrentados.
 * - Sonneborn-Berger: igual pero ponderado por el resultado propio contra
 *   cada rival (ganada cuenta entero, tablas la mitad, perdida no suma).
 * - Progresivo: suma del puntaje acumulado ronda a ronda (premia arrancar
 *   fuerte).
 * - Enfrentamiento directo: puntos obtenidos específicamente contra otros
 *   jugadores que terminaron con el mismo puntaje final.
 * - Mayor número de victorias: cantidad de partidas ganadas.
 */
export function calcularDesempates(torneo: Torneo): Map<string, Record<string, number>> {
  const standings = calcularStandings(torneo);
  const puntosFinales = new Map<string, number>();
  for (const [id, s] of standings) puntosFinales.set(id, s.puntos);

  const resultado = new Map<string, Record<string, number>>();
  for (const jugadorId of torneo.jugadoresIds) {
    const historial = historialDeJugador(torneo, jugadorId);
    const propiosPuntos = puntosFinales.get(jugadorId) ?? 0;

    const buchholz = historial.reduce((acc, j) => acc + (puntosFinales.get(j.rivalId) ?? 0), 0);
    const sonnebornBerger = historial.reduce(
      (acc, j) => acc + j.resultadoPropio * (puntosFinales.get(j.rivalId) ?? 0),
      0
    );
    const victorias = historial.filter((j) => j.resultadoPropio === 1).length;
    const enfrentamientoDirecto = historial
      .filter((j) => (puntosFinales.get(j.rivalId) ?? -1) === propiosPuntos)
      .reduce((acc, j) => acc + j.resultadoPropio, 0);

    resultado.set(jugadorId, {
      Buchholz: redondear(buchholz),
      "Sonneborn-Berger": redondear(sonnebornBerger),
      Progresivo: redondear(progresivoDeJugador(torneo, jugadorId)),
      "Enfrentamiento directo": redondear(enfrentamientoDirecto),
      "Mayor número de victorias": victorias,
    });
  }
  return resultado;
}

export type StandingConDesempates = Standing & { desempates: Record<string, number> };

/**
 * Tabla de posiciones ordenada de verdad: primero por puntos, y en caso de
 * empate por los criterios de desempate configurados en el torneo, en el
 * orden en que se eligieron (el primero de la lista manda; solo se mira el
 * siguiente si el anterior también empata).
 */
export function standingsConDesempates(torneo: Torneo): StandingConDesempates[] {
  const standings = [...calcularStandings(torneo).values()];
  const desempates = calcularDesempates(torneo);
  const combinados: StandingConDesempates[] = standings.map((s) => ({
    ...s,
    desempates: desempates.get(s.jugadorId) ?? {},
  }));

  combinados.sort((a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    for (const criterio of torneo.desempates) {
      const diff = (b.desempates[criterio] ?? 0) - (a.desempates[criterio] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
  return combinados;
}

/**
 * Ronda 1 del suizo según el sistema Dutch de FIDE (C.04.3): se ordena a
 * todos por Elo, si son impares el de menor Elo descansa, y se divide el
 * resto en dos mitades (la mitad de arriba contra la de abajo, 1 contra el
 * primero de la mitad de abajo, 2 contra el segundo, etc.) — fuertes contra
 * débiles. Las siguientes rondas ya no usan esto: dependen de resultados y
 * usan el algoritmo suizo completo (evita repetir rivales, balancea
 * colores).
 */
export function generarRondaUnoDutch(
  jugadoresIds: string[],
  elos: Map<string, number>
): RondaTorneo {
  const ordenados = [...jugadoresIds].sort(
    (a, b) => (elos.get(b) ?? 0) - (elos.get(a) ?? 0)
  );

  let conBye: string | null = null;
  if (ordenados.length % 2 !== 0) {
    conBye = ordenados.pop()!; // menor Elo de todos, al final del orden descendente
  }

  const mitad = ordenados.length / 2;
  const mitadFuerte = ordenados.slice(0, mitad);
  const mitadDebil = ordenados.slice(mitad);

  const emparejamientos: EmparejamientoTorneo[] = mitadFuerte.map((blancasId, i) => ({
    numero: i + 1,
    blancasId,
    negrasId: mitadDebil[i],
    resultado: null,
  }));

  if (conBye) {
    emparejamientos.push({
      numero: emparejamientos.length + 1,
      blancasId: conBye,
      negrasId: null,
      resultado: "1-0",
    });
  }

  return { numero: 1, emparejamientos };
}

export function generarRondaSuiza(
  torneo: Torneo,
  numeroRonda: number,
  elos: Map<string, number>
): RondaTorneo {
  const standings = calcularStandings(torneo);
  const players = torneo.jugadoresIds.map((id) => {
    const s = standings.get(id)!;
    return {
      id,
      score: s.puntos,
      receivedBye: s.receivedBye,
      avoid: s.avoid,
      seating: s.seating,
      rating: elos.get(id) ?? null,
    };
  });
  const matches = Swiss(players, numeroRonda, true, true) as Match[];
  return {
    numero: numeroRonda,
    emparejamientos: matches.map((m, i) => construirEmparejamiento(m, i + 1)),
  };
}

export function rondaCompleta(ronda: RondaTorneo): boolean {
  return ronda.emparejamientos.every((e) => e.resultado !== null);
}

export type ResultadoCampeon =
  | { tipo: "campeon"; jugadorId: string }
  | { tipo: "necesita_final"; jugadorIds: string[] }
  | { tipo: "empate"; jugadorIds: string[] };

/**
 * El campeón de un torneo finalizado es quien más puntos hizo. Si hay
 * empate en la punta, la tradición del club es que NO se resuelve en la
 * planilla: los empatados juegan una final aparte. Si son justo dos,
 * definen esos dos. Si son tres o más, primero se aplican los desempates
 * configurados en el torneo (en el orden de prioridad elegido) para
 * quedarse con los dos primeros, y esos dos juegan la final. Sin
 * desempates configurados y con 3+ empatados no hay forma de elegir
 * quiénes juegan, así que queda como "empate" sin definir.
 *
 * El resultado de esa final se registra aparte (torneo.finalDesempate) —
 * una vez cargado, ese jugador es el campeón.
 */
export function determinarCampeon(torneo: Torneo): ResultadoCampeon | null {
  if (torneo.estado !== "finalizado" || torneo.rondas.length === 0) return null;
  const standings = standingsConDesempates(torneo);
  if (standings.length === 0) return null;

  const maxPuntos = standings[0].puntos;
  const empatados = standings.filter((s) => s.puntos === maxPuntos);
  if (empatados.length === 1) {
    return { tipo: "campeon", jugadorId: empatados[0].jugadorId };
  }

  let finalistas: string[];
  if (empatados.length === 2) {
    finalistas = empatados.map((s) => s.jugadorId);
  } else if (torneo.desempates.length > 0) {
    // standingsConDesempates ya viene ordenado por los desempates del torneo.
    finalistas = empatados.slice(0, 2).map((s) => s.jugadorId);
  } else {
    return { tipo: "empate", jugadorIds: empatados.map((s) => s.jugadorId) };
  }

  const final = torneo.finalDesempate;
  const mismosFinalistas =
    final &&
    final.jugadorIds.length === finalistas.length &&
    finalistas.every((id) => final.jugadorIds.includes(id));
  if (mismosFinalistas && final.ganadorId) {
    return { tipo: "campeon", jugadorId: final.ganadorId };
  }

  return { tipo: "necesita_final", jugadorIds: finalistas };
}

/**
 * Los emparejamientos de una ronda se pueden reordenar a mano solo mientras
 * nadie jugó todavía (ningún emparejamiento real tiene resultado cargado).
 */
export function puedeEditarEmparejamientos(ronda: RondaTorneo): boolean {
  return ronda.emparejamientos.every((e) => !e.negrasId || e.resultado === null);
}

/**
 * Intercambia blancas/negras de una partida ya emparejada. Si ya tenía
 * resultado cargado, invierte 1-0 <-> 0-1 para que el ganador real no
 * cambie (las tablas quedan igual). No se usa con partidas de descanso.
 */
export function corregirColorEmparejamiento(
  emparejamiento: EmparejamientoTorneo
): EmparejamientoTorneo {
  if (!emparejamiento.negrasId) return emparejamiento;
  const resultado =
    emparejamiento.resultado === "1-0"
      ? "0-1"
      : emparejamiento.resultado === "0-1"
      ? "1-0"
      : emparejamiento.resultado;
  return {
    ...emparejamiento,
    blancasId: emparejamiento.negrasId,
    negrasId: emparejamiento.blancasId,
    resultado,
  };
}

export type SlotEmparejamiento = {
  emparejamientoNumero: number;
  color: "blancas" | "negras";
};

function jugadorEnSlot(ronda: RondaTorneo, slot: SlotEmparejamiento): string | null {
  const emp = ronda.emparejamientos.find((e) => e.numero === slot.emparejamientoNumero);
  if (!emp) return null;
  return slot.color === "blancas" ? emp.blancasId : emp.negrasId;
}

/**
 * Intercambia dos jugadores entre dos "lugares" (emparejamiento + color) de
 * la misma ronda. Si alguno de los emparejamientos tocados queda con
 * resultado, se borra (la composición cambió); si queda como descanso, se
 * le reasigna el 1-0 automático de siempre.
 */
export function intercambiarEnRonda(
  ronda: RondaTorneo,
  slotA: SlotEmparejamiento,
  slotB: SlotEmparejamiento
): RondaTorneo {
  const jugadorA = jugadorEnSlot(ronda, slotA);
  const jugadorB = jugadorEnSlot(ronda, slotB);
  if (!jugadorA || !jugadorB || jugadorA === jugadorB) return ronda;

  return {
    ...ronda,
    emparejamientos: ronda.emparejamientos.map((e) => {
      let blancasId = e.blancasId;
      let negrasId = e.negrasId;
      let tocado = false;

      if (e.numero === slotA.emparejamientoNumero) {
        if (slotA.color === "blancas") blancasId = jugadorB;
        else negrasId = jugadorB;
        tocado = true;
      }
      if (e.numero === slotB.emparejamientoNumero) {
        if (slotB.color === "blancas") blancasId = jugadorA;
        else negrasId = jugadorA;
        tocado = true;
      }

      if (!tocado) return e;
      return { ...e, blancasId, negrasId, resultado: negrasId ? null : "1-0" };
    }),
  };
}

/**
 * Si dos jugadores ya se enfrentaron en rondas anteriores del torneo (sin
 * contar la ronda que se está editando).
 */
export function yaSeEnfrentaron(
  torneo: Torneo,
  rondaEnEdicion: number,
  jugadorA: string,
  jugadorB: string
): boolean {
  const historial: Torneo = {
    ...torneo,
    rondas: torneo.rondas.filter((r) => r.numero !== rondaEnEdicion),
  };
  const standings = calcularStandings(historial);
  return standings.get(jugadorA)?.avoid.includes(jugadorB) ?? false;
}

/**
 * Valida que, después de un intercambio, ninguno de los dos emparejamientos
 * tocados enfrente a dos jugadores que ya jugaron entre sí antes en este
 * torneo.
 */
export function intercambioEsValido(
  torneo: Torneo,
  ronda: RondaTorneo,
  slotA: SlotEmparejamiento,
  slotB: SlotEmparejamiento
): boolean {
  const nuevaRonda = intercambiarEnRonda(ronda, slotA, slotB);
  const numerosTocados = new Set([slotA.emparejamientoNumero, slotB.emparejamientoNumero]);
  for (const emp of nuevaRonda.emparejamientos) {
    if (!numerosTocados.has(emp.numero) || !emp.negrasId) continue;
    if (yaSeEnfrentaron(torneo, ronda.numero, emp.blancasId, emp.negrasId)) return false;
  }
  return true;
}

/**
 * En round-robin el calendario completo se genera de una sola vez, así que
 * modificar la lista de jugadores después no tiene efecto sobre las rondas
 * ya armadas. En suizo cada ronda se genera por separado, así que se puede
 * seguir agregando o quitando jugadores para las rondas futuras.
 */
export function puedeEditarJugadores(t: Torneo): boolean {
  if (t.estado === "finalizado") return false;
  if (t.estado === "armado") return true;
  return t.formato === "suizo";
}
