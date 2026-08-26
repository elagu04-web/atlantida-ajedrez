"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Jugador } from "@/lib/players";
import { supabase } from "@/lib/supabase";
import { useActividad } from "@/context/ActividadContext";

type FilaJugador = {
  id: string;
  nombre: string;
  apodo: string | null;
  fide_id: string | null;
  foto_url: string | null;
  elo_inicial: number;
  email: string | null;
  descripcion: string | null;
};

type JugadoresContextType = {
  jugadores: Jugador[];
  cargando: boolean;
  agregarJugador: (nombre: string, eloInicial: number, apodo?: string) => Promise<string>;
  eliminarJugador: (id: string) => Promise<void>;
  actualizarApodo: (id: string, apodo: string) => Promise<void>;
  actualizarFideId: (id: string, fideId: string) => Promise<void>;
  actualizarFoto: (id: string, fotoUrl: string | null) => Promise<void>;
  actualizarDescripcion: (id: string, descripcion: string) => Promise<void>;
  actualizarJugador: (id: string, nombre: string, eloInicial: number) => Promise<void>;
  obtenerJugador: (id: string) => Jugador | undefined;
  reclamarJugador: (id: string, email: string) => Promise<{ ok: boolean; error: string | null }>;
};

const JugadoresContext = createContext<JugadoresContextType | null>(null);

function filaAJugador(fila: FilaJugador): Jugador {
  return {
    id: fila.id,
    nombre: fila.nombre,
    apodo: fila.apodo,
    fideId: fila.fide_id,
    fotoUrl: fila.foto_url,
    eloAtlantida: fila.elo_inicial,
    partidas: [],
    email: fila.email,
    descripcion: fila.descripcion,
  };
}

export function JugadoresProvider({ children }: { children: ReactNode }) {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [cargando, setCargando] = useState(true);
  const { registrar } = useActividad();

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

  async function agregarJugador(nombre: string, eloInicial: number, apodo?: string) {
    const { data, error } = await supabase
      .from("jugadores")
      .insert({ nombre, elo_inicial: eloInicial, apodo: apodo?.trim() || null })
      .select()
      .single();
    if (error || !data) return "";
    const nuevo = filaAJugador(data);
    setJugadores((actuales) => [...actuales, nuevo]);
    registrar("jugador", `Se agregó el jugador "${nuevo.nombre}" (Elo inicial ${nuevo.eloAtlantida}).`);
    return nuevo.id;
  }

  async function eliminarJugador(id: string) {
    const jugador = jugadores.find((j) => j.id === id);
    const { error } = await supabase.from("jugadores").delete().eq("id", id);
    if (!error) {
      setJugadores((actuales) => actuales.filter((j) => j.id !== id));
      registrar("jugador", `Se eliminó el jugador "${jugador?.nombre ?? id}".`);
    }
  }

  async function actualizarApodo(id: string, apodo: string) {
    const apodoLimpio = apodo.trim() || null;
    setJugadores((actuales) =>
      actuales.map((j) => (j.id === id ? { ...j, apodo: apodoLimpio } : j))
    );
    await supabase.from("jugadores").update({ apodo: apodoLimpio }).eq("id", id);
  }

  async function actualizarFideId(id: string, fideId: string) {
    const fideIdLimpio = fideId.trim() || null;
    setJugadores((actuales) =>
      actuales.map((j) => (j.id === id ? { ...j, fideId: fideIdLimpio } : j))
    );
    await supabase.from("jugadores").update({ fide_id: fideIdLimpio }).eq("id", id);
  }

  async function actualizarJugador(id: string, nombre: string, eloInicial: number) {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    const anterior = jugadores.find((j) => j.id === id);
    setJugadores((actuales) =>
      actuales.map((j) =>
        j.id === id ? { ...j, nombre: nombreLimpio, eloAtlantida: eloInicial } : j
      )
    );
    await supabase
      .from("jugadores")
      .update({ nombre: nombreLimpio, elo_inicial: eloInicial })
      .eq("id", id);
    registrar(
      "jugador",
      `Se editó el jugador "${anterior?.nombre ?? id}" → nombre "${nombreLimpio}", Elo inicial ${eloInicial}.`
    );
  }

  async function actualizarFoto(id: string, fotoUrl: string | null) {
    setJugadores((actuales) =>
      actuales.map((j) => (j.id === id ? { ...j, fotoUrl } : j))
    );
    await supabase.from("jugadores").update({ foto_url: fotoUrl }).eq("id", id);
  }

  async function actualizarDescripcion(id: string, descripcion: string) {
    const descripcionLimpia = descripcion.trim() || null;
    setJugadores((actuales) =>
      actuales.map((j) => (j.id === id ? { ...j, descripcion: descripcionLimpia } : j))
    );
    await supabase.from("jugadores").update({ descripcion: descripcionLimpia }).eq("id", id);
  }

  function obtenerJugador(id: string) {
    return jugadores.find((j) => j.id === id);
  }

  /**
   * Un socio logueado con Google "reclama" el jugador que le corresponde de
   * la lista, una sola vez — queda su email guardado ahí para futuras
   * inscripciones. La política de Supabase solo deja completar el email si
   * todavía está vacío, así que si dos personas intentan reclamar el mismo
   * nombre casi al mismo tiempo, gana la primera y a la segunda le vuelve
   * `false`.
   */
  async function reclamarJugador(id: string, email: string) {
    const { data, error } = await supabase
      .from("jugadores")
      .update({ email })
      .eq("id", id)
      .is("email", null)
      .select()
      .single();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: null };
    setJugadores((actuales) => actuales.map((j) => (j.id === id ? { ...j, email } : j)));
    return { ok: true, error: null };
  }

  return (
    <JugadoresContext.Provider
      value={{
        jugadores,
        cargando,
        agregarJugador,
        eliminarJugador,
        actualizarApodo,
        actualizarFideId,
        actualizarFoto,
        actualizarDescripcion,
        actualizarJugador,
        obtenerJugador,
        reclamarJugador,
      }}
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
