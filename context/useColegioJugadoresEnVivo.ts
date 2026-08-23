"use client";

import { useMemo } from "react";
import { useColegioJugadores } from "./ColegioJugadoresContext";
import { useColegioTorneos } from "./ColegioTorneosContext";
import { calcularEloYHistorialEnVivo } from "@/lib/elo";

export function useColegioJugadoresEnVivo() {
  const { jugadores } = useColegioJugadores();
  const { torneos } = useColegioTorneos();
  return useMemo(() => calcularEloYHistorialEnVivo(jugadores, torneos), [jugadores, torneos]);
}
