import { determinarCampeon, rondaCompleta, type Torneo } from "./tournaments";

export type PremioTorneo = {
  jugadorId: string;
  origen: Torneo;
  destino: Torneo | null;
  estado: "disponible" | "reservado" | "utilizado";
};

function fechaTorneo(torneo: Torneo): number {
  return Date.parse(torneo.iniciadoEn ?? torneo.creadoEn);
}

function ordenar(a: Torneo, b: Torneo) {
  const diferencia = fechaTorneo(a) - fechaTorneo(b);
  return (Number.isFinite(diferencia) ? diferencia : 0) || a.id.localeCompare(b.id);
}

/**
 * Un premio por campeón oficial. Usa IDs de jugador y las inscripciones que ya
 * guarda el servidor; nunca modifica pagos. Los torneos jugados siguen su fecha
 * de inicio y los próximos se reservan después, por fecha de creación.
 *
 * El esquema histórico no tiene fecha de cierre ni de inscripción. Por eso el
 * orden de inicio es la referencia reproducible, no una fecha de victoria
 * inventada. Correcciones de resultados y bajas se reflejan al recalcular.
 */
export function calcularPremiosTorneo(torneos: readonly Torneo[], ahora = new Date()): PremioTorneo[] {
  const premios: PremioTorneo[] = [];
  const vistos = new Set<string>();
  const unicos = torneos.filter(t => {
    if (vistos.has(t.id)) return false;
    vistos.add(t.id);
    return true;
  });
  const jugados = unicos.filter(t => t.estado !== "armado" && Number.isFinite(fechaTorneo(t)) && fechaTorneo(t) <= ahora.getTime()).sort(ordenar);
  const proximos = unicos.filter(t => t.estado === "armado")
    .sort((a, b) => Date.parse(a.creadoEn) - Date.parse(b.creadoEn) || a.id.localeCompare(b.id));

  function aplicar(torneo: Torneo) {
    // Una inscripción antigua que no pasó a la lista final no consume el premio.
    const participantes = torneo.estado === "armado"
      ? new Set([...torneo.jugadoresIds, ...torneo.inscriptosIds])
      : new Set(torneo.jugadoresIds);
    for (const jugadorId of participantes) {
      const premio = premios.find(p => p.jugadorId === jugadorId && p.destino === null &&
        (torneo.estado === "armado" || fechaTorneo(torneo) > fechaTorneo(p.origen)));
      if (premio) {
        premio.destino = torneo;
        premio.estado = torneo.estado === "armado" ? "reservado" : "utilizado";
      }
    }
  }

  for (const torneo of jugados) {
    aplicar(torneo);
    // Evita premios por cierre accidental, resultados faltantes o fechas inválidas.
    if (torneo.estado !== "finalizado" || !Number.isFinite(fechaTorneo(torneo)) ||
      torneo.jugadoresIds.length < 2 || torneo.rondas.length === 0 ||
      !torneo.rondas.every(rondaCompleta) ||
      !torneo.rondas.some(r => r.emparejamientos.some(e => e.negrasId && e.resultado))) continue;
    const campeon = determinarCampeon(torneo);
    if (campeon?.tipo !== "campeon" || !torneo.jugadoresIds.includes(campeon.jugadorId)) continue;
    const final = torneo.finalDesempate;
    if (final?.ganadorId === campeon.jugadorId && !final.jugadorIds.includes(campeon.jugadorId)) continue;
    premios.push({ jugadorId: campeon.jugadorId, origen: torneo, destino: null, estado: "disponible" });
  }
  for (const torneo of proximos) aplicar(torneo);
  return premios;
}

export function premioEnTorneo(premios: readonly PremioTorneo[], torneoId: string, jugadorId: string) {
  return premios.find(p => p.jugadorId === jugadorId && p.destino?.id === torneoId);
}

/** Vista previa: no reserva nada hasta que la inscripción se confirma en Supabase. */
export function premioAlInscribirse(torneos: readonly Torneo[], torneoId: string, jugadorId: string) {
  const torneo = torneos.find(t => t.id === torneoId);
  if (!torneo || torneo.estado !== "armado") return undefined;
  const conInscripcion = torneos.map(t => t.id === torneoId
    ? { ...t, inscriptosIds: [...new Set([...t.inscriptosIds, jugadorId])] }
    : t);
  return premioEnTorneo(calcularPremiosTorneo(conInscripcion), torneoId, jugadorId);
}