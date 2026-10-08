import type { Jugador } from "./players";

export function identidadJugador(jugadores: Jugador[], email?: string | null) {
  const cuenta = email?.trim().toLowerCase();
  const vinculados = cuenta ? jugadores.filter(j => j.email?.trim().toLowerCase() === cuenta) : [];
  return { jugador: vinculados.length === 1 ? vinculados[0] : undefined, ambigua: vinculados.length > 1 };
}

export function claveIntentoDesafio(usuarioId: string | undefined, fecha: string, puzzleId: string) {
  return `${usuarioId ?? "anon"}:${fecha}:${puzzleId}`;
}
