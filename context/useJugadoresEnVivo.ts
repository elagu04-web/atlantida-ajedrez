"use client";

import { useMemo } from "react";
import { useJugadores } from "./JugadoresContext";
import { useTorneos } from "./TorneosContext";
import { calcularEloYHistorialEnVivo } from "@/lib/elo";

/**
 * Combina el roster de jugadores con los resultados de todos los torneos
 * para dar el Elo Atlántida y el historial de partidas actualizados.
 */
export function useJugadoresEnVivo() {
  const { jugadores } = useJugadores();
  const { torneos } = useTorneos();
  return useMemo(() => calcularEloYHistorialEnVivo(jugadores, torneos), [jugadores, torneos]);
}
