"use client";

import { useMemo } from "react";
import { useEpicoJugadores } from "./EpicoJugadoresContext";
import { useEpicoTorneos } from "./EpicoTorneosContext";
import { calcularEloYHistorialEnVivo } from "@/lib/elo";

export function useEpicoJugadoresEnVivo() {
  const { jugadores } = useEpicoJugadores();
  const { torneos } = useEpicoTorneos();
  return useMemo(() => calcularEloYHistorialEnVivo(jugadores, torneos), [jugadores, torneos]);
}
