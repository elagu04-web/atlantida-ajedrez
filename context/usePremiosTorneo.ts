"use client";

import { useMemo } from "react";
import { useTorneos } from "./TorneosContext";
import { calcularPremiosTorneo } from "@/lib/premiosTorneo";

export function usePremiosTorneo() {
  const { torneos, cargando, errorCarga } = useTorneos();
  const premios = useMemo(() => calcularPremiosTorneo(torneos), [torneos]);
  return { premios, torneos, cargando, error: errorCarga };
}