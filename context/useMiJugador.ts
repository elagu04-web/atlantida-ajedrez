"use client";
import { useAuth } from "./AuthContext";
import { useJugadores } from "./JugadoresContext";
import { identidadJugador } from "@/lib/identidadJugador";

export function useMiJugador() {
  const { session, cargando: cargandoAuth } = useAuth();
  const { jugadores, cargando, errorCarga } = useJugadores();
  return { ...identidadJugador(jugadores, session?.user.email), cargando: cargando || cargandoAuth, error: errorCarga };
}
