"use client";

import { useMemo } from "react";
import { useJugadores } from "./JugadoresContext";
import { useTorneos } from "./TorneosContext";
import { calcularEloYHistorialEnVivo } from "@/lib/elo";
import {useResultadosClubOnline} from './ResultadosClubOnlineContext';

/**
 * Combina el roster de jugadores con los resultados de todos los torneos
 * para dar el Elo Atlántida y el historial de partidas actualizados.
 */
export function useJugadoresEnVivo() {
  const { jugadores } = useJugadores();
  const { torneos } = useTorneos();
  const {resultados}=useResultadosClubOnline();
  return useMemo(() => calcularEloYHistorialEnVivo(jugadores, torneos,resultados), [jugadores, torneos,resultados]);
}
