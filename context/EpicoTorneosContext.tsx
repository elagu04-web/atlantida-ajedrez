"use client";

import { createContext, useContext, ReactNode } from "react";
import {
  Torneo,
  FormatoTorneo,
  EstadoTorneo,
  RondaTorneo,
  ResultadoPartida,
  StandingConDesempates,
  generarRoundRobin,
  generarRondaUnoDutch,
  generarRondaSuiza,
  standingsConDesempates,
  puedeEditarJugadores,
} from "@/lib/tournaments";
import { useEpicoJugadores } from "@/context/EpicoJugadoresContext";
import { calcularEloYHistorialEnVivo } from "@/lib/elo";
import { supabase } from "@/lib/supabase";
import { useColeccionRemota } from "./useColeccionRemota";
import { useAuth } from "./AuthContext";

type FilaTorneo = {
  id: string;
  nombre: string;
  formato: FormatoTorneo;
  desempates: string[];
  jugadores_ids: string[];
  rondas: RondaTorneo[];
  estado: EstadoTorneo;
  rondas_objetivo: number | null;
  created_at: string;
  excluir_elo: boolean | null;
};

type EpicoTorneosContextType = {
  torneos: Torneo[];
  cargando: boolean;
  errorCarga: string | null;
  ultimaActualizacion: Date | null;
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
  eliminarUltimaRonda: (torneoId: string) => Promise<void>;
  eliminarTorneo: (torneoId: string) => Promise<void>;
  finalizarTorneo: (torneoId: string) => Promise<void>;
  standingsDeTorneo: (torneoId: string) => StandingConDesempates[];
};

const EpicoTorneosContext = createContext<EpicoTorneosContextType | null>(null);

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
    creadoEn: fila.created_at,
    excluirDeElo: fila.excluir_elo === true,
    inscriptosIds: [],
    asistieronIds: [],
    pagaronIds: [],
  };
}

export function EpicoTorneosProvider({ children }: { children: ReactNode }) {
  const { esAdmin } = useAuth();
  const { items: torneos, incorporar, cargando, guardar, eliminar, avisar, errorCarga, ultimaActualizacion } = useColeccionRemota<FilaTorneo, Torneo>("epico_torneos", filaATorneo, esAdmin);
  const { jugadores } = useEpicoJugadores();



  async function crearTorneo(
    nombre: string,
    formato: FormatoTorneo,
    jugadoresIds: string[],
    desempates: string[],
    rondasObjetivo: number | null
  ) {
    const { data, error } = await supabase
      .from("epico_torneos")
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
    if (error || !data) { avisar("No se pudo crear. Comprobá la conexión y tus permisos."); return ""; }
    const nuevo = filaATorneo(data);
    incorporar(data);
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

    if (!(await guardar(torneoId, { jugadores_ids: nuevosIds }))) return;
  }

  async function quitarJugadorDeTorneo(torneoId: string, jugadorId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || !puedeEditarJugadores(torneo)) return;
    if (torneo.rondas.some(r => r.emparejamientos.some(e => e.blancasId === jugadorId || e.negrasId === jugadorId))) {
      avisar("Este jugador ya tiene emparejamientos. Se conserva en la tabla para mantener el historial del torneo.");
      return;
    }
    const nuevosIds = torneo.jugadoresIds.filter((id) => id !== jugadorId);

    if (!(await guardar(torneoId, { jugadores_ids: nuevosIds }))) return;
  }

  async function generarRondas(torneoId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || torneo.jugadoresIds.length < 2) return;

    let nuevasRondas: RondaTorneo[];
    const nuevoEstado: EstadoTorneo = "en_curso";

    if (torneo.formato === "round-robin") {
      if (torneo.rondas.length > 0) return;
      nuevasRondas = generarRoundRobin(torneo.jugadoresIds);
    } else {
      if (torneo.rondasObjetivo && torneo.rondas.length >= torneo.rondasObjetivo) {
        return;
      }
      const ultimaRonda = torneo.rondas[torneo.rondas.length - 1];
      if (ultimaRonda && ultimaRonda.emparejamientos.some((e) => e.resultado === null)) {
        return;
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


    if (!(await guardar(torneoId, { rondas: nuevasRondas, estado: nuevoEstado }))) return;
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

    if (!(await guardar(torneoId, { rondas: nuevasRondas }))) return;
  }

  async function eliminarUltimaRonda(torneoId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || torneo.rondas.length === 0) return;
    const nuevasRondas = torneo.rondas.slice(0, -1);
    const nuevoEstado: EstadoTorneo = nuevasRondas.length === 0 ? "armado" : "en_curso";

    if (!(await guardar(torneoId, { rondas: nuevasRondas, estado: nuevoEstado }))) return;
  }

  async function eliminarTorneo(torneoId: string) {

    if (!(await eliminar(torneoId))) return;
  }

  async function finalizarTorneo(torneoId: string) {

    if (!(await guardar(torneoId, { estado: "finalizado" }))) return;
  }

  function standingsDeTorneo(torneoId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo) return [];
    return standingsConDesempates(torneo);
  }

  return (
    <EpicoTorneosContext.Provider
      value={{
        errorCarga, ultimaActualizacion,
        torneos,
        cargando,
        crearTorneo,
        obtenerTorneo,
        agregarJugadorATorneo,
        quitarJugadorDeTorneo,
        generarRondas,
        registrarResultado,
        eliminarUltimaRonda,
        eliminarTorneo,
        finalizarTorneo,
        standingsDeTorneo,
      }}
    >
      {children}
    </EpicoTorneosContext.Provider>
  );
}

export function useEpicoTorneos() {
  const ctx = useContext(EpicoTorneosContext);
  if (!ctx) {
    throw new Error("useEpicoTorneos debe usarse dentro de EpicoTorneosProvider");
  }
  return ctx;
}
