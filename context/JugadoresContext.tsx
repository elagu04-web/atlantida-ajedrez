"use client";

import { createContext, useContext, ReactNode } from "react";
import { Jugador } from "@/lib/players";
import { registrarMiJugador } from "@/lib/registroJugador";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabase";
import { useColeccionRemota } from "./useColeccionRemota";
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
  errorCarga: string | null;
  ultimaActualizacion: Date | null;
  crearMiJugador: (nombre: string) => Promise<{ok: boolean; error: string | null}>;
  agregarJugador: (nombre: string, eloInicial: number, apodo?: string) => Promise<string>;
  eliminarJugador: (id: string) => Promise<void>;
  actualizarApodo: (id: string, apodo: string) => Promise<boolean>;
  actualizarFideId: (id: string, fideId: string) => Promise<boolean>;
  actualizarFoto: (id: string, fotoUrl: string | null) => Promise<boolean>;
  actualizarDescripcion: (id: string, descripcion: string) => Promise<boolean>;
  actualizarJugador: (id: string, nombre: string, eloInicial: number) => Promise<boolean>;
  obtenerJugador: (id: string) => Jugador | undefined;
  reclamarJugador: (id: string, email: string) => Promise<{ ok: boolean; error: string | null }>;
  liberarJugador: (id: string, email: string) => Promise<{ ok: boolean; error: string | null }>;
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
  const { items: jugadores, incorporar, cargando, guardar, eliminar, avisar, errorCarga, ultimaActualizacion } = useColeccionRemota<FilaJugador, Jugador>("jugadores", filaAJugador);
  const { registrar } = useActividad();
  const { session } = useAuth();



  async function crearMiJugador(nombre: string) {
    if (!session?.user.email) return {ok:false,error:"Iniciá sesión para crear tu jugador."};
    try {
      const perfil = await registrarMiJugador(nombre, session.user.email);
      incorporar(perfil);
      return {ok:true,error:null};
    } catch (error) {
      return {ok:false,error:error instanceof Error ? error.message : "No se pudo crear tu jugador. Volvé a intentar."};
    }
  }
  async function agregarJugador(nombre: string, eloInicial: number, apodo?: string) {
    const { data, error } = await supabase
      .from("jugadores")
      .insert({ nombre, elo_inicial: eloInicial, apodo: apodo?.trim() || null })
      .select()
      .single();
    if (error || !data) { avisar("No se pudo crear. Comprobá la conexión y tus permisos."); return ""; }
    const nuevo = filaAJugador(data);
    incorporar(data);
    registrar("jugador", `Se agregó el jugador "${nuevo.nombre}" (Elo inicial ${nuevo.eloAtlantida}).`);
    return nuevo.id;
  }

  async function eliminarJugador(id: string) {
    const { data: torneosRelacionados, error } = await supabase.from("torneos").select("jugadores_ids,rondas");
    if (error) { avisar("No se pudo comprobar el historial. El jugador no se eliminó."); return; }
    const tieneHistorial = torneosRelacionados?.some(t => t.jugadores_ids?.includes(id) || (t.rondas as import("@/lib/tournaments").RondaTorneo[] | null)?.some(r => r.emparejamientos.some(e => e.blancasId === id || e.negrasId === id)));
    if (tieneHistorial) { avisar("Este jugador participa en torneos. Se conserva para no alterar resultados ni el Elo de sus rivales."); return; }
    if (!(await eliminar(id))) return;
    registrar("jugador", "Se eliminó un jugador sin historial de torneos.");
  }

  async function actualizarApodo(id: string, apodo: string) {
    const apodoLimpio = apodo.trim() || null;

    if (!(await guardar(id, { apodo: apodoLimpio }))) return false;
    return true;
  }

  async function actualizarFideId(id: string, fideId: string) {
    const fideIdLimpio = fideId.trim() || null;

    if (!(await guardar(id, { fide_id: fideIdLimpio }))) return false;
    return true;
  }

  async function actualizarJugador(id: string, nombre: string, eloInicial: number) {
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return false;
    const anterior = jugadores.find((j) => j.id === id);

    if (!(await guardar(id, { nombre: nombreLimpio, elo_inicial: eloInicial }))) return false;
    registrar(
      "jugador",
      `Se editó el jugador "${anterior?.nombre ?? id}" → nombre "${nombreLimpio}", Elo inicial ${eloInicial}.`
    );
    return true;
  }

  async function actualizarFoto(id: string, fotoUrl: string | null) {

    if (!(await guardar(id, { foto_url: fotoUrl }))) return false;
    return true;
  }

  async function actualizarDescripcion(id: string, descripcion: string) {
    const descripcionLimpia = descripcion.trim() || null;

    if (!(await guardar(id, { descripcion: descripcionLimpia }))) return false;
    return true;
  }

  function obtenerJugador(id: string) {
    return jugadores.find((j) => j.id === id);
  }

  /**
   * Un socio logueado con Google "reclama" el jugador que le corresponde de
   * la lista, una sola vez — queda su email guardado ahí para futuras
   * inscripciones. La política de Supabase solo deja completar el email si
   * todavía está vacío, así que si dos personas intentan reclamarlo, la base acepta solo la primera.
   */
  async function reclamarJugador(id: string, email: string) {
    const respuesta = await supabase.rpc("vincular_mi_jugador", {p_jugador_id:id}).abortSignal(AbortSignal.timeout(10000));
    if (!respuesta.error && respuesta.data) { incorporar(respuesta.data); return {ok:true,error:null}; }
    if (respuesta.error?.code !== "PGRST202") return {ok:false,error:respuesta.error?.message ?? "Sin confirmación del vínculo."};
    // Compatibilidad mientras se aplica la migración; no se amplían permisos.
    const { data, error } = await supabase.from("jugadores").update({email}).eq("id",id).is("email",null).select().single();
    if (error || !data) return {ok:false,error:error?.message ?? "Sin confirmación del vínculo."};
    incorporar(data);
    return {ok:true,error:null};
  }
  /**
   * Si alguien reclamó el jugador equivocado por error, puede soltarlo
   * (vuelve a quedar email null) para elegir de nuevo — solo puede soltar
   * el que tiene su propio email puesto, eso lo garantiza la política de
   * Supabase, no solo este chequeo del lado del cliente.
   */
  async function liberarJugador(id: string, email: string) {
    const respuesta = await supabase.rpc("desvincular_mi_jugador", {p_jugador_id:id}).abortSignal(AbortSignal.timeout(10000));
    if (!respuesta.error && respuesta.data) { incorporar(respuesta.data); return {ok:true,error:null}; }
    if (respuesta.error?.code !== "PGRST202") return {ok:false,error:respuesta.error?.message ?? "Sin confirmación del cambio."};
    const {data,error}=await supabase.from("jugadores").update({email:null}).eq("id",id).eq("email",email).select().single();
    if (error || !data) return {ok:false,error:error?.message ?? "Sin confirmación del cambio."};
    incorporar(data);
    return {ok:true,error:null};
  }
  return (
    <JugadoresContext.Provider
      value={{
        errorCarga, ultimaActualizacion,
        jugadores,
        cargando,
        crearMiJugador,
        agregarJugador,
        eliminarJugador,
        actualizarApodo,
        actualizarFideId,
        actualizarFoto,
        actualizarDescripcion,
        actualizarJugador,
        obtenerJugador,
        reclamarJugador,
        liberarJugador,
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
