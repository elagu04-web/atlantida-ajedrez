"use client";

import { createContext, useContext, ReactNode } from "react";
import { Jugador } from "@/lib/players";
import { supabase } from "@/lib/supabase";
import { useColeccionRemota } from "./useColeccionRemota";
import { useAuth } from "./AuthContext";

type FilaAlumno = {
  id: string;
  nombre: string;
  apodo: string | null;
  fide_id: string | null;
  foto_url: string | null;
  elo_inicial: number;
  lichess_usuario: string | null;
};

type ColegioJugadoresContextType = {
  jugadores: Jugador[];
  cargando: boolean;
  errorCarga: string | null;
  ultimaActualizacion: Date | null;
  agregarJugador: (nombre: string, eloInicial: number, apodo?: string) => Promise<string>;
  eliminarJugador: (id: string) => Promise<void>;
  actualizarJugador: (id: string, nombre: string, eloInicial: number) => Promise<boolean>;
  actualizarLichess: (id: string, usuario: string) => Promise<boolean>;
  obtenerJugador: (id: string) => Jugador | undefined;
};

const ColegioJugadoresContext = createContext<ColegioJugadoresContextType | null>(null);

function filaAJugador(fila: FilaAlumno): Jugador {
  return {
    id: fila.id,
    nombre: fila.nombre,
    apodo: fila.apodo,
    fideId: fila.fide_id,
    fotoUrl: fila.foto_url,
    eloAtlantida: fila.elo_inicial,
    partidas: [],
    lichessUsuario: fila.lichess_usuario ?? null,
  };
}

export function ColegioJugadoresProvider({ children }: { children: ReactNode }) {
  const { esAdmin } = useAuth();
  const { items: jugadores, incorporar, cargando, guardar, eliminar, avisar, errorCarga, ultimaActualizacion } = useColeccionRemota<FilaAlumno, Jugador>("colegio_jugadores", filaAJugador, esAdmin);



  async function agregarJugador(nombre: string, eloInicial: number, apodo?: string) {
    const { data, error } = await supabase
      .from("colegio_jugadores")
      .insert({ nombre, elo_inicial: eloInicial, apodo: apodo?.trim() || null })
      .select()
      .single();
    if (error || !data) { avisar("No se pudo crear. Comprobá la conexión y tus permisos."); return ""; }
    const nuevo = filaAJugador(data);
    incorporar(data);
    return nuevo.id;
  }

  async function eliminarJugador(id: string) {
    const { data: torneosRelacionados, error } = await supabase.from("colegio_torneos").select("jugadores_ids,rondas");
    if (error) { avisar("No se pudo comprobar el historial. El jugador no se eliminó."); return; }
    const tieneHistorial = torneosRelacionados?.some(t => t.jugadores_ids?.includes(id) || (t.rondas as import("@/lib/tournaments").RondaTorneo[] | null)?.some(r => r.emparejamientos.some(e => e.blancasId === id || e.negrasId === id)));
    if (tieneHistorial) { avisar("Este jugador participa en torneos. Se conserva para no alterar resultados ni el Elo de sus rivales."); return; }
    if (!(await eliminar(id))) return;
  }

  async function actualizarJugador(id: string, nombre: string, eloInicial: number) {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return false;

    if (!(await guardar(id, { nombre: nombreLimpio, elo_inicial: eloInicial }))) return false;
    return true;
  }

  async function actualizarLichess(id: string, usuario: string) {
    const usuarioLimpio = usuario.trim() || null;

    if (!(await guardar(id, { lichess_usuario: usuarioLimpio }))) return false;
    return true;
  }

  function obtenerJugador(id: string) {
    return jugadores.find((j) => j.id === id);
  }

  return (
    <ColegioJugadoresContext.Provider
      value={{
        errorCarga, ultimaActualizacion,
        jugadores,
        cargando,
        agregarJugador,
        eliminarJugador,
        actualizarJugador,
        actualizarLichess,
        obtenerJugador,
      }}
    >
      {children}
    </ColegioJugadoresContext.Provider>
  );
}

export function useColegioJugadores() {
  const ctx = useContext(ColegioJugadoresContext);
  if (!ctx) {
    throw new Error("useColegioJugadores debe usarse dentro de ColegioJugadoresProvider");
  }
  return ctx;
}
