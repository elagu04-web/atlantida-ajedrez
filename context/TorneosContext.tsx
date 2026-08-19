"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  Torneo,
  FormatoTorneo,
  EstadoTorneo,
  RondaTorneo,
  ResultadoPartida,
  Standing,
  generarRoundRobin,
  generarRondaUnoDutch,
  generarRondaSuiza,
  calcularStandings,
  puedeEditarJugadores,
  corregirColorEmparejamiento,
} from "@/lib/tournaments";
import { useJugadores } from "@/context/JugadoresContext";
import { calcularEloYHistorialEnVivo } from "@/lib/elo";
import { supabase } from "@/lib/supabase";

type FilaTorneo = {
  id: string;
  nombre: string;
  formato: FormatoTorneo;
  desempates: string[];
  jugadores_ids: string[];
  rondas: RondaTorneo[];
  estado: EstadoTorneo;
  rondas_objetivo: number | null;
};

type TorneosContextType = {
  torneos: Torneo[];
  cargando: boolean;
  crearTorneo: (
    nombre: string,
    formato: FormatoTorneo,
    jugadoresIds: string[],
    desempates: string[],
    rondasObjetivo: number | null
  ) => Promise<string>;
  obtenerTorneo: (id: string) => Torneo | undefined;
  agregarJugadorATorneo: (torneoId: string, jugadorId: string) => Promise<void>;
  quitarJugadorDeTorneo: (torneoId: string, jugadorId: string) => Promise<void>;
  generarRondas: (torneoId: string) => Promise<void>;
  registrarResultado: (
    torneoId: string,
    rondaNumero: number,
    emparejamientoNumero: number,
    resultado: ResultadoPartida | null
  ) => Promise<void>;
  corregirColor: (
    torneoId: string,
    rondaNumero: number,
    emparejamientoNumero: number
  ) => Promise<void>;
  eliminarUltimaRonda: (torneoId: string) => Promise<void>;
  eliminarTorneo: (torneoId: string) => Promise<void>;
  finalizarTorneo: (torneoId: string) => Promise<void>;
  standingsDeTorneo: (torneoId: string) => Standing[];
};

const TorneosContext = createContext<TorneosContextType | null>(null);

function filaATorneo(fila: FilaTorneo): Torneo {
  return {
    id: fila.id,
    nombre: fila.nombre,
    formato: fila.formato,
    desempates: fila.desempates ?? [],
    jugadoresIds: fila.jugadores_ids ?? [],
    rondas: fila.rondas ?? [],
    estado: fila.estado,
    rondasObjetivo: fila.rondas_objetivo ?? null,
  };
}

export function TorneosProvider({ children }: { children: ReactNode }) {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [cargando, setCargando] = useState(true);
  const { jugadores } = useJugadores();

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from("torneos")
        .select("*")
        .order("created_at");
      if (!error && data) setTorneos(data.map(filaATorneo));
      setCargando(false);
    }
    cargar();
  }, []);

  async function crearTorneo(
    nombre: string,
    formato: FormatoTorneo,
    jugadoresIds: string[],
    desempates: string[],
    rondasObjetivo: number | null
  ) {
    const { data, error } = await supabase
      .from("torneos")
      .insert({
        nombre,
        formato,
        desempates,
        jugadores_ids: jugadoresIds,
        rondas: [],
        estado: "armado",
        rondas_objetivo: rondasObjetivo,
      })
      .select()
      .single();
    if (error || !data) return "";
    const nuevo = filaATorneo(data);
    setTorneos((actuales) => [...actuales, nuevo]);
    return nuevo.id;
  }

  function obtenerTorneo(id: string) {
    return torneos.find((t) => t.id === id);
  }

  async function agregarJugadorATorneo(torneoId: string, jugadorId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || !puedeEditarJugadores(torneo) || torneo.jugadoresIds.includes(jugadorId)) {
      return;
    }
    const nuevosIds = [...torneo.jugadoresIds, jugadorId];
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, jugadoresIds: nuevosIds } : t))
    );
    await supabase.from("torneos").update({ jugadores_ids: nuevosIds }).eq("id", torneoId);
  }

  async function quitarJugadorDeTorneo(torneoId: string, jugadorId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || !puedeEditarJugadores(torneo)) return;
    const nuevosIds = torneo.jugadoresIds.filter((id) => id !== jugadorId);
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, jugadoresIds: nuevosIds } : t))
    );
    await supabase.from("torneos").update({ jugadores_ids: nuevosIds }).eq("id", torneoId);
  }

  async function generarRondas(torneoId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || torneo.jugadoresIds.length < 2) return;

    let nuevasRondas: RondaTorneo[];
    let nuevoEstado: EstadoTorneo = "en_curso";

    if (torneo.formato === "round-robin") {
      if (torneo.rondas.length > 0) return;
      nuevasRondas = generarRoundRobin(torneo.jugadoresIds);
    } else {
      if (torneo.rondasObjetivo && torneo.rondas.length >= torneo.rondasObjetivo) {
        return; // ya se jugaron todas las rondas planificadas
      }
      const ultimaRonda = torneo.rondas[torneo.rondas.length - 1];
      if (ultimaRonda && ultimaRonda.emparejamientos.some((e) => e.resultado === null)) {
        return; // faltan resultados por cargar
      }
      const enVivo = calcularEloYHistorialEnVivo(jugadores, torneos);
      const elos = new Map(enVivo.map((j) => [j.id, j.eloAtlantida]));
      const siguienteNumero = torneo.rondas.length + 1;
      const nuevaRonda =
        siguienteNumero === 1
          ? generarRondaUnoDutch(torneo.jugadoresIds, elos)
          : generarRondaSuiza(torneo, siguienteNumero, elos);
      nuevasRondas = [...torneo.rondas, nuevaRonda];
    }

    setTorneos((actuales) =>
      actuales.map((t) =>
        t.id === torneoId ? { ...t, rondas: nuevasRondas, estado: nuevoEstado } : t
      )
    );
    await supabase
      .from("torneos")
      .update({ rondas: nuevasRondas, estado: nuevoEstado })
      .eq("id", torneoId);
  }

  async function registrarResultado(
    torneoId: string,
    rondaNumero: number,
    emparejamientoNumero: number,
    resultado: ResultadoPartida | null
  ) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo) return;
    const nuevasRondas = torneo.rondas.map((r) => {
      if (r.numero !== rondaNumero) return r;
      return {
        ...r,
        emparejamientos: r.emparejamientos.map((e) =>
          e.numero === emparejamientoNumero ? { ...e, resultado } : e
        ),
      };
    });
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, rondas: nuevasRondas } : t))
    );
    await supabase.from("torneos").update({ rondas: nuevasRondas }).eq("id", torneoId);
  }

  async function corregirColor(
    torneoId: string,
    rondaNumero: number,
    emparejamientoNumero: number
  ) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo) return;
    const nuevasRondas = torneo.rondas.map((r) => {
      if (r.numero !== rondaNumero) return r;
      return {
        ...r,
        emparejamientos: r.emparejamientos.map((e) =>
          e.numero === emparejamientoNumero ? corregirColorEmparejamiento(e) : e
        ),
      };
    });
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, rondas: nuevasRondas } : t))
    );
    await supabase.from("torneos").update({ rondas: nuevasRondas }).eq("id", torneoId);
  }

  async function eliminarUltimaRonda(torneoId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || torneo.rondas.length === 0) return;
    const nuevasRondas = torneo.rondas.slice(0, -1);
    const nuevoEstado: EstadoTorneo = nuevasRondas.length === 0 ? "armado" : "en_curso";
    setTorneos((actuales) =>
      actuales.map((t) =>
        t.id === torneoId ? { ...t, rondas: nuevasRondas, estado: nuevoEstado } : t
      )
    );
    await supabase
      .from("torneos")
      .update({ rondas: nuevasRondas, estado: nuevoEstado })
      .eq("id", torneoId);
  }

  async function eliminarTorneo(torneoId: string) {
    setTorneos((actuales) => actuales.filter((t) => t.id !== torneoId));
    await supabase.from("torneos").delete().eq("id", torneoId);
  }

  async function finalizarTorneo(torneoId: string) {
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, estado: "finalizado" } : t))
    );
    await supabase.from("torneos").update({ estado: "finalizado" }).eq("id", torneoId);
  }

  function standingsDeTorneo(torneoId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo) return [];
    return [...calcularStandings(torneo).values()].sort((a, b) => b.puntos - a.puntos);
  }

  return (
    <TorneosContext.Provider
      value={{
        torneos,
        cargando,
        crearTorneo,
        obtenerTorneo,
        agregarJugadorATorneo,
        quitarJugadorDeTorneo,
        generarRondas,
        registrarResultado,
        corregirColor,
        eliminarUltimaRonda,
        eliminarTorneo,
        finalizarTorneo,
        standingsDeTorneo,
      }}
    >
      {children}
    </TorneosContext.Provider>
  );
}

export function useTorneos() {
  const ctx = useContext(TorneosContext);
  if (!ctx) {
    throw new Error("useTorneos debe usarse dentro de TorneosProvider");
  }
  return ctx;
}
