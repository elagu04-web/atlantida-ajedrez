import { Jugador, Partida, Resultado, nombreVisible } from "./players";
import { Torneo } from "./tournaments";

export const K_FACTOR = 20;
export const ELO_MINIMO = 1400;
export const DIAS_ACTIVIDAD = 365;

function nuevoElo(ratingPropio: number, ratingRival: number, resultado: number): number {
  const esperado = 1 / (1 + Math.pow(10, (ratingRival - ratingPropio) / 400));
  return Math.max(ELO_MINIMO, Math.round(ratingPropio + K_FACTOR * (resultado - esperado)));
}

export function jugoRecientemente(j: { ultimaPartidaFecha: string | null }): boolean {
  if (!j.ultimaPartidaFecha) return false;
  const dias = (Date.now() - new Date(j.ultimaPartidaFecha).getTime()) / (1000 * 60 * 60 * 24);
  return dias <= DIAS_ACTIVIDAD;
}

export type JugadorEnVivo = Jugador & {
  jugadas: number;
  victorias: number;
  empates: number;
  derrotas: number;
  ultimaPartidaFecha: string | null;
  eloAntesUltimoTorneo: number;
};

type PartidaOrdenada = {
  orden: number;
  torneoIndex: number;
  torneoNombre: string;
  torneoFecha: string;
  blancasId: string;
  negrasId: string;
  resultado: "1-0" | "0-1" | "1/2-1/2";
  excluirDeElo: boolean;
};

/**
 * Recalcula el Elo Atlántida y el historial de partidas de cada jugador
 * a partir de todos los resultados cargados en todos los torneos, en orden
 * cronológico (orden de creación del torneo, luego número de ronda).
 */
export function calcularEloYHistorialEnVivo(
  jugadoresBase: Jugador[],
  torneos: Torneo[]
): JugadorEnVivo[] {
  const elo = new Map<string, number>();
  const historialExtra = new Map<string, Partida[]>();
  for (const j of jugadoresBase) {
    elo.set(j.id, j.eloAtlantida);
    historialExtra.set(j.id, []);
  }

  const partidas: PartidaOrdenada[] = [];
  torneos.forEach((t, torneoIndex) => {
    t.rondas.forEach((ronda) => {
      ronda.emparejamientos.forEach((e, i) => {
        if (!e.negrasId || !e.resultado) return;
        partidas.push({
          orden: torneoIndex * 1_000_000 + ronda.numero * 1_000 + i,
          torneoIndex,
          torneoNombre: t.nombre,
          torneoFecha: t.creadoEn.slice(0, 10),
          blancasId: e.blancasId,
          negrasId: e.negrasId,
          resultado: e.resultado,
          excluirDeElo: t.excluirDeElo === true,
        });
      });
    });
  });
  partidas.sort((a, b) => a.orden - b.orden);

  const nombrePorId = new Map(jugadoresBase.map((j) => [j.id, nombreVisible(j)]));

  // El "último torneo" para mostrar cuánto subió/bajó cada uno es el más
  // reciente que de verdad movió el Elo (no uno histórico marcado
  // excluirDeElo). Se guarda una foto del Elo de cada jugador justo antes
  // de aplicar sus resultados, para poder mostrar el antes/después.
  const ultimoIndiceConResultados = partidas.reduce(
    (max, p) => (!p.excluirDeElo && p.torneoIndex > max ? p.torneoIndex : max),
    -1
  );
  const eloAntesDelUltimo = new Map<string, number>();
  let snapshotTomado = false;

  for (const p of partidas) {
    if (!snapshotTomado && p.torneoIndex === ultimoIndiceConResultados) {
      for (const [id, valor] of elo) eloAntesDelUltimo.set(id, valor);
      snapshotTomado = true;
    }
    const eloBlancas = elo.get(p.blancasId);
    const eloNegras = elo.get(p.negrasId);
    if (eloBlancas === undefined || eloNegras === undefined) continue;

    const puntosBlancas = p.resultado === "1-0" ? 1 : p.resultado === "0-1" ? 0 : 0.5;
    const puntosNegras = 1 - puntosBlancas;

    if (!p.excluirDeElo) {
      elo.set(p.blancasId, nuevoElo(eloBlancas, eloNegras, puntosBlancas));
      elo.set(p.negrasId, nuevoElo(eloNegras, eloBlancas, puntosNegras));
    }

    const resultadoBlancas: Resultado =
      p.resultado === "1-0" ? "victoria" : p.resultado === "0-1" ? "derrota" : "empate";
    const resultadoNegras: Resultado =
      p.resultado === "1-0" ? "derrota" : p.resultado === "0-1" ? "victoria" : "empate";

    historialExtra.get(p.blancasId)?.push({
      rival: nombrePorId.get(p.negrasId) ?? "?",
      color: "blancas",
      resultado: resultadoBlancas,
      fecha: p.torneoFecha,
      eloDespues: elo.get(p.blancasId),
      torneo: p.torneoNombre,
    });
    historialExtra.get(p.negrasId)?.push({
      rival: nombrePorId.get(p.blancasId) ?? "?",
      color: "negras",
      resultado: resultadoNegras,
      fecha: p.torneoFecha,
      eloDespues: elo.get(p.negrasId),
      torneo: p.torneoNombre,
    });
  }

  return jugadoresBase
    .map((j) => {
      const todasLasPartidas = [...j.partidas, ...(historialExtra.get(j.id) ?? [])];
      const victorias = todasLasPartidas.filter((p) => p.resultado === "victoria").length;
      const empates = todasLasPartidas.filter((p) => p.resultado === "empate").length;
      const derrotas = todasLasPartidas.filter((p) => p.resultado === "derrota").length;
      const ultimaPartidaFecha = todasLasPartidas.reduce<string | null>(
        (masReciente, p) => (!masReciente || p.fecha > masReciente ? p.fecha : masReciente),
        null
      );
      const eloFinal = elo.get(j.id) ?? j.eloAtlantida;
      return {
        ...j,
        partidas: todasLasPartidas,
        eloAtlantida: eloFinal,
        jugadas: todasLasPartidas.length,
        victorias,
        empates,
        derrotas,
        ultimaPartidaFecha,
        eloAntesUltimoTorneo: eloAntesDelUltimo.get(j.id) ?? eloFinal,
      };
    })
    .sort((a, b) => b.eloAtlantida - a.eloAtlantida);
}
