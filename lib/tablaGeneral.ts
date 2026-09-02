import { Torneo, calcularStandings } from "./tournaments";

export type FilaTablaGeneral = {
  jugadorId: string;
  puntosPorTorneo: (number | null)[]; // null = no jugó ese torneo
  total: number;
  partidasJugadas: number;
  rendimiento: number; // 0-100
};

export type TablaGeneral = {
  columnas: { id: string; nombre: string }[]; // torneos, en orden cronológico
  filas: FilaTablaGeneral[]; // ordenadas por total desc, luego rendimiento desc
};

/**
 * Agrupa torneos por "clave de período": "AAAA-MM" para vista mensual,
 * "AAAA" para vista anual. Usa iniciadoEn (cuándo arrancó de verdad, se
 * generó la ronda 1) cuando existe — con la creación rápida un torneo
 * puede quedar armado días antes de jugarse, así que creadoEn ya no
 * refleja en qué mes se jugó. Se cae a creadoEn para torneos de antes de
 * que existiera ese campo.
 */
export function agruparTorneosPorPeriodo(
  torneos: Torneo[],
  modo: "mes" | "anio"
): Map<string, Torneo[]> {
  const grupos = new Map<string, Torneo[]>();
  for (const t of torneos) {
    const fecha = t.iniciadoEn ?? t.creadoEn;
    const clave = modo === "mes" ? fecha.slice(0, 7) : fecha.slice(0, 4);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave)!.push(t);
  }
  return grupos;
}

export function calcularTablaGeneral(torneos: Torneo[]): TablaGeneral {
  const jugadoresIds = [...new Set(torneos.flatMap((t) => t.jugadoresIds))];

  const filas = jugadoresIds.map((jugadorId) => {
    let total = 0;
    let partidasJugadas = 0;
    const puntosPorTorneo = torneos.map((t) => {
      if (!t.jugadoresIds.includes(jugadorId)) return null;
      const s = calcularStandings(t).get(jugadorId);
      if (!s) return null;
      total += s.puntos;
      partidasJugadas += s.partidasJugadas;
      return s.puntos;
    });
    const rendimiento = partidasJugadas > 0 ? (total / partidasJugadas) * 100 : 0;
    return { jugadorId, puntosPorTorneo, total, partidasJugadas, rendimiento };
  });

  filas.sort((a, b) => b.total - a.total || b.rendimiento - a.rendimiento);

  return {
    columnas: torneos.map((t) => ({ id: t.id, nombre: t.nombre })),
    filas,
  };
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function etiquetaPeriodo(clave: string): string {
  if (clave.length === 4) return clave; // año solo
  const [anio, mes] = clave.split("-");
  return `${MESES[Number(mes) - 1]} ${anio}`;
}
