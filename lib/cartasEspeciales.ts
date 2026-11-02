import type { JugadorEnVivo } from "./elo";
import type { Torneo } from "./tournaments";
import { posicionesElo } from "./rendimiento";
import { calcularPremiosTorneo } from "./premiosTorneo";
import { calcularTorneoMate } from "./torneoMate";

/** Usa el mismo ranking y los campeones confirmados que el resto del club. */
export function cartasEspeciales(jugadores: Pick<JugadorEnVivo, "id" | "eloAtlantida" | "jugadas">[], torneos: readonly Torneo[], ahora = new Date()) {
  const distinciones = new Map<string, string[]>();
  for (const [id, puesto] of posicionesElo(jugadores.filter(j => j.jugadas > 0))) {
    if (puesto === 1) distinciones.set(id, ["N.º 1 del ranking"]);
  }
  const martes = calcularPremiosTorneo(torneos, ahora).filter(p => {
    if (p.origen.formato === "match") return false;
    const fecha = new Date(p.origen.iniciadoEn ?? p.origen.creadoEn);
    return new Intl.DateTimeFormat("en-US", { timeZone: "America/Montevideo", weekday: "short" }).format(fecha) === "Tue";
  });
  const ultimo = martes.at(-1);
  if (ultimo) distinciones.set(ultimo.jugadorId, [...(distinciones.get(ultimo.jugadorId) ?? []), "Campeón de los martes"]);
  const { cinturon } = calcularTorneoMate([...torneos], jugadores.map(j => ({ id: j.id, nombre: j.id })));
  // El cinturón y la tabla general son reconocimientos distintos. No inventamos
  // un portador si el orden de los duelos todavía está por confirmar.
  if (!cinturon.pendiente && cinturon.campeonId) {
    distinciones.set(cinturon.campeonId, [...(distinciones.get(cinturon.campeonId) ?? []), "Cinturón del Mate"]);
  }
  return distinciones;
}
