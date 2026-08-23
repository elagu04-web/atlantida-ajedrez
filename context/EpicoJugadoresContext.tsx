"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Jugador } from "@/lib/players";
import { supabase } from "@/lib/supabase";

type FilaAlumno = {
  id: string;
  nombre: string;
  apodo: string | null;
  fide_id: string | null;
  foto_url: string | null;
  elo_inicial: number;
  lichess_usuario: string | null;
};

type EpicoJugadoresContextType = {
  jugadores: Jugador[];
  cargando: boolean;
  agregarJugador: (nombre: string, eloInicial: number, apodo?: string) => Promise<string>;
  eliminarJugador: (id: string) => Promise<void>;
  actualizarJugador: (id: string, nombre: string, eloInicial: number) => Promise<void>;
  actualizarLichess: (id: string, usuario: string) => Promise<void>;
  obtenerJugador: (id: string) => Jugador | undefined;
};

const EpicoJugadoresContext = createContext<EpicoJugadoresContextType | null>(null);

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

export function EpicoJugadoresProvider({ children }: { children: ReactNode }) {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from("epico_jugadores")
        .select("*")
        .order("created_at");
      if (!error && data) setJugadores(data.map(filaAJugador));
      setCargando(false);
    }
    cargar();
  }, []);

  async function agregarJugador(nombre: string, eloInicial: number, apodo?: string) {
    const { data, error } = await supabase
      .from("epico_jugadores")
      .insert({ nombre, elo_inicial: eloInicial, apodo: apodo?.trim() || null })
      .select()
      .single();
    if (error || !data) return "";
    const nuevo = filaAJugador(data);
    setJugadores((actuales) => [...actuales, nuevo]);
    return nuevo.id;
  }

  async function eliminarJugador(id: string) {
    const { error } = await supabase.from("epico_jugadores").delete().eq("id", id);
    if (!error) setJugadores((actuales) => actuales.filter((j) => j.id !== id));
  }

  async function actualizarJugador(id: string, nombre: string, eloInicial: number) {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    setJugadores((actuales) =>
      actuales.map((j) =>
        j.id === id ? { ...j, nombre: nombreLimpio, eloAtlantida: eloInicial } : j
      )
    );
    await supabase
      .from("epico_jugadores")
      .update({ nombre: nombreLimpio, elo_inicial: eloInicial })
      .eq("id", id);
  }

  async function actualizarLichess(id: string, usuario: string) {
    const usuarioLimpio = usuario.trim() || null;
    setJugadores((actuales) =>
      actuales.map((j) => (j.id === id ? { ...j, lichessUsuario: usuarioLimpio } : j))
    );
    await supabase.from("epico_jugadores").update({ lichess_usuario: usuarioLimpio }).eq("id", id);
  }

  function obtenerJugador(id: string) {
    return jugadores.find((j) => j.id === id);
  }

  return (
    <EpicoJugadoresContext.Provider
      value={{
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
    </EpicoJugadoresContext.Provider>
  );
}

export function useEpicoJugadores() {
  const ctx = useContext(EpicoJugadoresContext);
  if (!ctx) {
    throw new Error("useEpicoJugadores debe usarse dentro de EpicoJugadoresProvider");
  }
  return ctx;
}
