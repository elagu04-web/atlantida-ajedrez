import type { PartidaPractica } from "./partidaPractica";

export const ELO_INICIAL_ALE = 1400;
export const PASO_ALE = 50;
export const ELO_MAXIMO_ALE = 3000;
export type ProgresoAle = { version: 1; partidas: string[] };
export const claveProgresoAle = (cuenta: string) => `atlantida-ale-progreso-v1:${cuenta}`;
export const clavePartidaAle = (cuenta: string) => `atlantida-ale-partida-v1:${cuenta}`;
export function leerProgresoAle(texto: string | null): ProgresoAle {
  try {
    const v = JSON.parse(texto ?? "null");
    if (v?.version !== 1 || !Array.isArray(v.partidas) || !v.partidas.every((id: unknown) => typeof id === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(id))) return { version: 1, partidas: [] };
    return { version: 1, partidas: [...new Set<string>(v.partidas)] };
  } catch { return { version: 1, partidas: [] }; }
}
export function eloDeAle(progreso: ProgresoAle) {
  return Math.min(ELO_MAXIMO_ALE, ELO_INICIAL_ALE + progreso.partidas.length * PASO_ALE);
}
export function sumarPartidaAle(progreso: ProgresoAle, partida: PartidaPractica): ProgresoAle {
  // Abandonar la pantalla o rendirse sin jugar no es completar una partida.
  if (partida.perfil !== "ale" || !partida.progresoAle || !partida.terminada || partida.jugadas.length < 4 || progreso.partidas.includes(partida.progresoAle.id)) return progreso;
  return { version: 1, partidas: [...progreso.partidas, partida.progresoAle.id] };
}
