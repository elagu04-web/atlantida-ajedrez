import { Jugador, Partida, Resultado, nombreVisible } from "./players";
import { Torneo } from "./tournaments";

export const K_FACTOR = 20;
export const ELO_MINIMO = 1400;

function nuevoElo(ratingPropio: number, ratingRival: number, resultado: number): number {
  const esperado = 1 / (1 + Math.pow(10, (ratingRival - ratingPropio) / 400));
  return Math.max(ELO_MINIMO, Math.round(ratingPropio + K_FACTOR * (resultado - esperado)));
}

export type JugadorEnVivo = Jugador & {
  jugadas: number;
  victorias: number;
  empates: number;
  derrotas: number;
};

type PartidaOrdenada = {
  orden: number;
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

  for (const p of partidas) {
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
      torneo: p.torneoNombre,
    });
    historialExtra.get(p.negrasId)?.push({
      rival: nombrePorId.get(p.blancasId) ?? "?",
      color: "negras",
      resultado: resultadoNegras,
      fecha: p.torneoFecha,
      torneo: p.torneoNombre,
    });
  }

  return jugadoresBase
    .map((j) => {
      const todasLasPartidas = [...j.partidas, ...(historialExtra.get(j.id) ?? [])];
      const victorias = todasLasPartidas.filter((p) => p.resultado === "victoria").length;
      const empates = todasLasPartidas.filter((p) => p.resultado === "empate").length;
      const derrotas = todasLasPartidas.filter((p) => p.resultado === "derrota").length;
      return {
        ...j,
        partidas: todasLasPartidas,
        eloAtlantida: elo.get(j.id) ?? j.eloAtlantida,
        jugadas: todasLasPartidas.length,
        victorias,
        empates,
        derrotas,
      };
    })
    .sort((a, b) => b.eloAtlantida - a.eloAtlantida);
}
