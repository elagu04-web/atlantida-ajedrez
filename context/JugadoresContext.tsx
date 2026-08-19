"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Jugador } from "@/lib/players";
import { supabase } from "@/lib/supabase";

type FilaJugador = {
  id: string;
  nombre: string;
  elo_inicial: number;
};

type JugadoresContextType = {
  jugadores: Jugador[];
  cargando: boolean;
  agregarJugador: (nombre: string, eloInicial: number) => Promise<string>;
  eliminarJugador: (id: string) => Promise<void>;
  obtenerJugador: (id: string) => Jugador | undefined;
};

const JugadoresContext = createContext<JugadoresContextType | null>(null);

function filaAJugador(fila: FilaJugador): Jugador {
  return {
    id: fila.id,
    nombre: fila.nombre,
    eloAtlantida: fila.elo_inicial,
    partidas: [],
  };
}

export function JugadoresProvider({ children }: { children: ReactNode }) {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from("jugadores")
        .select("*")
        .order("created_at");
      if (!error && data) setJugadores(data.map(filaAJugador));
      setCargando(false);
    }
    cargar();
  }, []);

  async function agregarJugador(nombre: string, eloInicial: number) {
    const { data, error } = await supabase
      .from("jugadores")
      .insert({ nombre, elo_inicial: eloInicial })
      .select()
      .single();
    if (error || !data) return "";
    const nuevo = filaAJugador(data);
    setJugadores((actuales) => [...actuales, nuevo]);
    return nuevo.id;
  }

  async function eliminarJugador(id: string) {
    const { error } = await supabase.from("jugadores").delete().eq("id", id);
    if (!error) {
      setJugadores((actuales) => actuales.filter((j) => j.id !== id));
    }
  }

  function obtenerJugador(id: string) {
    return jugadores.find((j) => j.id === id);
  }

  return (
    <JugadoresContext.Provider
      value={{ jugadores, cargando, agregarJugador, eliminarJugador, obtenerJugador }}
    >
      {children}
    </JugadoresContext.Provider>
  );
}

export function useJugadores() {
  const ctx = useContext(JugadoresContext);
  if (!ctx) {
    throw new Error("useJugadores debe usarse dentro de JugadoresProvider");
  }
  return ctx;
}
