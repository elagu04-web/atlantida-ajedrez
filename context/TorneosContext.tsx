"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  Torneo,
  FormatoTorneo,
  EstadoTorneo,
  RondaTorneo,
  ResultadoPartida,
  StandingConDesempates,
  FinalDesempate,
  generarRoundRobin,
  generarMatch,
  PARTIDAS_MATCH_POR_DEFECTO,
  generarRondaUnoDutch,
  generarRondaSuiza,
  standingsConDesempates,
  puedeEditarJugadores,
  corregirColorEmparejamiento,
  intercambiarEnRonda,
  intercambioEsValido,
  SlotEmparejamiento,
} from "@/lib/tournaments";
import { useJugadores } from "@/context/JugadoresContext";
import { useActividad } from "@/context/ActividadContext";
import { calcularEloYHistorialEnVivo } from "@/lib/elo";
import { nombreVisible } from "@/lib/players";
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
  created_at: string;
  excluir_elo: boolean | null;
  final_desempate: FinalDesempate | null;
  inscriptos_ids: string[] | null;
  asistieron_ids: string[] | null;
  ida_y_vuelta: boolean | null;
};

type TorneosContextType = {
  torneos: Torneo[];
  cargando: boolean;
  crearTorneo: (
    nombre: string,
    formato: FormatoTorneo,
    jugadoresIds: string[],
    desempates: string[],
    rondasObjetivo: number | null,
    idaYVuelta?: boolean
  ) => Promise<string>;
  crearTorneoRapido: (nombre: string) => Promise<string>;
  cambiarFormato: (torneoId: string, formato: FormatoTorneo) => Promise<void>;
  convertirASuizo: (torneoId: string) => Promise<void>;
  cambiarIdaYVuelta: (torneoId: string, idaYVuelta: boolean) => Promise<void>;
  cambiarDesempates: (torneoId: string, desempates: string[]) => Promise<void>;
  alternarInscripcion: (torneoId: string, jugadorId: string) => Promise<void>;
  alternarAsistencia: (torneoId: string, jugadorId: string) => Promise<void>;
  obtenerTorneo: (id: string) => Torneo | undefined;
  agregarJugadorATorneo: (torneoId: string, jugadorId: string) => Promise<void>;
  quitarJugadorDeTorneo: (torneoId: string, jugadorId: string) => Promise<void>;
  generarRondas: (torneoId: string, jugadorByeElegido?: string) => Promise<void>;
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
  intercambiarJugadores: (
    torneoId: string,
    rondaNumero: number,
    slotA: SlotEmparejamiento,
    slotB: SlotEmparejamiento,
    forzar: boolean
  ) => Promise<boolean>;
  eliminarTorneo: (torneoId: string) => Promise<void>;
  finalizarTorneo: (torneoId: string) => Promise<void>;
  standingsDeTorneo: (torneoId: string) => StandingConDesempates[];
  registrarFinalDesempate: (
    torneoId: string,
    jugadorIds: string[],
    ganadorId: string
  ) => Promise<void>;
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
    creadoEn: fila.created_at,
    excluirDeElo: fila.excluir_elo === true,
    finalDesempate: fila.final_desempate ?? null,
    inscriptosIds: fila.inscriptos_ids ?? [],
    asistieronIds: fila.asistieron_ids ?? [],
    idaYVuelta: fila.ida_y_vuelta === true,
  };
}

export function TorneosProvider({ children }: { children: ReactNode }) {
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [cargando, setCargando] = useState(true);
  const { jugadores } = useJugadores();
  const { registrar } = useActividad();

  function nombreDe(jugadorId: string) {
    const j = jugadores.find((j) => j.id === jugadorId);
    return j ? nombreVisible(j) : "?";
  }

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
    rondasObjetivo: number | null,
    idaYVuelta = false
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
        ida_y_vuelta: idaYVuelta,
      })
      .select()
      .single();
    if (error || !data) return "";
    const nuevo = filaATorneo(data);
    setTorneos((actuales) => [...actuales, nuevo]);
    const etiquetaFormato =
      formato === "suizo" ? "Sistema suizo" : formato === "match" ? "Match" : "Round robin";
    registrar(
      "torneo",
      `Se creó el torneo "${nuevo.nombre}" (${etiquetaFormato}, ${jugadoresIds.length} jugadores).`
    );
    return nuevo.id;
  }

  /**
   * Crea un torneo con solo el nombre — formato, jugadores y desempates se
   * terminan de definir después desde la página del torneo, mientras siga
   * "armado". Pensado para dejarlo publicado rápido y abrir la inscripción.
   */
  async function crearTorneoRapido(nombre: string) {
    const { data, error } = await supabase
      .from("torneos")
      .insert({
        nombre,
        formato: "suizo",
        desempates: [],
        jugadores_ids: [],
        rondas: [],
        estado: "armado",
        rondas_objetivo: null,
        inscriptos_ids: [],
      })
      .select()
      .single();
    if (error || !data) return "";
    const nuevo = filaATorneo(data);
    setTorneos((actuales) => [...actuales, nuevo]);
    registrar("torneo", `Se creó el torneo "${nuevo.nombre}" (a definir) — abierto para inscripción.`);
    return nuevo.id;
  }

  /** Solo tiene sentido mientras el torneo sigue armado, sin rondas generadas. */
  async function cambiarFormato(torneoId: string, formato: FormatoTorneo) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || torneo.estado !== "armado" || torneo.rondas.length > 0) return;
    setTorneos((actuales) => actuales.map((t) => (t.id === torneoId ? { ...t, formato } : t)));
    await supabase.from("torneos").update({ formato }).eq("id", torneoId);
  }

  /**
   * Pasa un torneo de round robin a sistema suizo en pleno torneo — pensado
   * para cuando aparece un jugador nuevo a mitad de camino. El round robin
   * arma todo el calendario de una sola vez, así que las rondas futuras que
   * todavía nadie jugó (ningún resultado cargado) se descartan: de ahí en
   * más las rondas se generan de a una con el algoritmo suizo, que sí deja
   * sumar jugadores sobre la marcha.
   */
  async function convertirASuizo(torneoId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || torneo.formato !== "round-robin" || torneo.estado === "finalizado") return;
    let ultimoIndiceConResultado = -1;
    torneo.rondas.forEach((r, i) => {
      if (r.emparejamientos.some((e) => e.resultado !== null)) ultimoIndiceConResultado = i;
    });
    const nuevasRondas = torneo.rondas.slice(0, ultimoIndiceConResultado + 1);
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, formato: "suizo", rondas: nuevasRondas } : t))
    );
    await supabase.from("torneos").update({ formato: "suizo", rondas: nuevasRondas }).eq("id", torneoId);
    registrar(
      "torneo",
      `Se cambió el torneo "${torneo.nombre}" de round robin a sistema suizo en pleno torneo (se descartaron ${
        torneo.rondas.length - nuevasRondas.length
      } ronda(s) futuras sin jugar).`
    );
  }

  /** Solo tiene sentido mientras el torneo sigue armado, sin rondas generadas. */
  async function cambiarIdaYVuelta(torneoId: string, idaYVuelta: boolean) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || torneo.estado !== "armado" || torneo.rondas.length > 0) return;
    setTorneos((actuales) => actuales.map((t) => (t.id === torneoId ? { ...t, idaYVuelta } : t)));
    await supabase.from("torneos").update({ ida_y_vuelta: idaYVuelta }).eq("id", torneoId);
  }

  /**
   * A diferencia del formato, los desempates se pueden cambiar en cualquier
   * momento (armado, en curso, hasta finalizado) — no afectan cómo se
   * emparejó nada, solo cómo se ordena la tabla de posiciones a partir de
   * los resultados ya cargados.
   */
  async function cambiarDesempates(torneoId: string, desempates: string[]) {
    setTorneos((actuales) => actuales.map((t) => (t.id === torneoId ? { ...t, desempates } : t)));
    await supabase.from("torneos").update({ desempates }).eq("id", torneoId);
  }

  /**
   * Anotarse/desanotarse de un torneo próximo. A propósito no exige sesión
   * de admin — cualquiera puede tocar su propio nombre en la lista pública
   * de inscripción (como una planilla física, funciona a confianza). El
   * permiso real que lo hace posible sin login vive en Supabase: una
   * política RLS que solo deja tocar la columna inscriptos_ids, y solo
   * mientras el torneo sigue "armado".
   */
  async function alternarInscripcion(torneoId: string, jugadorId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || torneo.estado !== "armado") return;
    const yaInscripto = torneo.inscriptosIds.includes(jugadorId);
    const nuevosIds = yaInscripto
      ? torneo.inscriptosIds.filter((id) => id !== jugadorId)
      : [...torneo.inscriptosIds, jugadorId];
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, inscriptosIds: nuevosIds } : t))
    );
    await supabase.from("torneos").update({ inscriptos_ids: nuevosIds }).eq("id", torneoId);
  }

  /**
   * Marca (o desmarca) que un inscripto efectivamente vino — a diferencia de
   * inscribirse, esto es solo para que el admin se organice, no requiere que
   * el torneo siga armado ni afecta nada del torneo en sí.
   */
  async function alternarAsistencia(torneoId: string, jugadorId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo) return;
    const yaVino = torneo.asistieronIds.includes(jugadorId);
    const nuevosIds = yaVino
      ? torneo.asistieronIds.filter((id) => id !== jugadorId)
      : [...torneo.asistieronIds, jugadorId];
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, asistieronIds: nuevosIds } : t))
    );
    await supabase.from("torneos").update({ asistieron_ids: nuevosIds }).eq("id", torneoId);
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
    registrar("torneo", `Se agregó a ${nombreDe(jugadorId)} al torneo "${torneo.nombre}".`);
  }

  async function quitarJugadorDeTorneo(torneoId: string, jugadorId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || !puedeEditarJugadores(torneo)) return;
    const nuevosIds = torneo.jugadoresIds.filter((id) => id !== jugadorId);
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, jugadoresIds: nuevosIds } : t))
    );
    await supabase.from("torneos").update({ jugadores_ids: nuevosIds }).eq("id", torneoId);
    registrar("torneo", `Se quitó a ${nombreDe(jugadorId)} del torneo "${torneo.nombre}".`);
  }

  async function generarRondas(torneoId: string, jugadorByeElegido?: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo || torneo.jugadoresIds.length < 2) return;

    let nuevasRondas: RondaTorneo[];
    const nuevoEstado: EstadoTorneo = "en_curso";

    if (torneo.formato === "round-robin") {
      if (torneo.rondas.length > 0) return;
      nuevasRondas = generarRoundRobin(torneo.jugadoresIds, torneo.idaYVuelta === true, jugadorByeElegido);
    } else if (torneo.formato === "match") {
      if (torneo.rondas.length > 0) return;
      if (torneo.jugadoresIds.length !== 2) return;
      nuevasRondas = generarMatch(torneo.jugadoresIds, torneo.rondasObjetivo ?? PARTIDAS_MATCH_POR_DEFECTO);
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
          ? generarRondaUnoDutch(torneo.jugadoresIds, elos, jugadorByeElegido)
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
    registrar(
      "torneo",
      torneo.formato === "round-robin" || torneo.formato === "match"
        ? `Se generaron todas las rondas del torneo "${torneo.nombre}".`
        : `Se generó la ronda ${nuevasRondas.length} del torneo "${torneo.nombre}".`
    );
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

    if (resultado) {
      const ronda = torneo.rondas.find((r) => r.numero === rondaNumero);
      const emp = ronda?.emparejamientos.find((e) => e.numero === emparejamientoNumero);
      if (emp?.negrasId) {
        registrar(
          "resultado",
          `${nombreDe(emp.blancasId)} ${resultado} ${nombreDe(emp.negrasId)} — ronda ${rondaNumero} de "${torneo.nombre}".`
        );
      }
    }
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
    registrar(
      "torneo",
      `Se corrigió el color de una partida en la ronda ${rondaNumero} de "${torneo.nombre}".`
    );
  }

  async function intercambiarJugadores(
    torneoId: string,
    rondaNumero: number,
    slotA: SlotEmparejamiento,
    slotB: SlotEmparejamiento,
    forzar: boolean
  ) {
    const torneo = obtenerTorneo(torneoId);
    const ronda = torneo?.rondas.find((r) => r.numero === rondaNumero);
    if (!torneo || !ronda) return false;

    const esValido = intercambioEsValido(torneo, ronda, slotA, slotB);
    if (!esValido && !forzar) return false;

    const rondaNueva = intercambiarEnRonda(ronda, slotA, slotB);
    if (!esValido) rondaNueva.advertenciaManual = true;

    const nuevasRondas = torneo.rondas.map((r) => (r.numero === rondaNumero ? rondaNueva : r));
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, rondas: nuevasRondas } : t))
    );
    await supabase.from("torneos").update({ rondas: nuevasRondas }).eq("id", torneoId);
    registrar(
      "torneo",
      `Se intercambiaron jugadores en la ronda ${rondaNumero} de "${torneo.nombre}"${
        !esValido ? " (⚠ forzado, no era válido)" : ""
      }.`
    );
    return true;
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
    registrar("torneo", `Se eliminó la ronda ${torneo.rondas.length} del torneo "${torneo.nombre}".`);
  }

  async function eliminarTorneo(torneoId: string) {
    const torneo = obtenerTorneo(torneoId);
    setTorneos((actuales) => actuales.filter((t) => t.id !== torneoId));
    await supabase.from("torneos").delete().eq("id", torneoId);
    registrar("torneo", `Se eliminó el torneo "${torneo?.nombre ?? torneoId}".`);
  }

  async function finalizarTorneo(torneoId: string) {
    const torneo = obtenerTorneo(torneoId);
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, estado: "finalizado" } : t))
    );
    await supabase.from("torneos").update({ estado: "finalizado" }).eq("id", torneoId);
    registrar("torneo", `Se finalizó el torneo "${torneo?.nombre ?? torneoId}".`);
  }

  function standingsDeTorneo(torneoId: string) {
    const torneo = obtenerTorneo(torneoId);
    if (!torneo) return [];
    return standingsConDesempates(torneo);
  }

  async function registrarFinalDesempate(torneoId: string, jugadorIds: string[], ganadorId: string) {
    const torneo = obtenerTorneo(torneoId);
    const finalDesempate: FinalDesempate = { jugadorIds, ganadorId };
    setTorneos((actuales) =>
      actuales.map((t) => (t.id === torneoId ? { ...t, finalDesempate } : t))
    );
    await supabase.from("torneos").update({ final_desempate: finalDesempate }).eq("id", torneoId);
    registrar(
      "torneo",
      `Se cargó el resultado de la final de desempate de "${torneo?.nombre ?? torneoId}": ganó ${nombreDe(ganadorId)}.`
    );
  }

  return (
    <TorneosContext.Provider
      value={{
        torneos,
        cargando,
        crearTorneo,
        crearTorneoRapido,
        cambiarFormato,
        convertirASuizo,
        cambiarIdaYVuelta,
        cambiarDesempates,
        alternarInscripcion,
        alternarAsistencia,
        obtenerTorneo,
        agregarJugadorATorneo,
        quitarJugadorDeTorneo,
        generarRondas,
        registrarResultado,
        corregirColor,
        eliminarUltimaRonda,
        intercambiarJugadores,
        eliminarTorneo,
        finalizarTorneo,
        standingsDeTorneo,
        registrarFinalDesempate,
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
