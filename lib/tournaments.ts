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
