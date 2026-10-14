import type { Jugador } from "./players";
import type { ResultadoPartida, Torneo } from "./tournaments";

// Identidades del registro público del club; los apodos no identifican una cuenta.
export const PARTICIPANTES_MATE = [
  { id: "db7d23fa-0254-4d6a-91ac-9eb9b41c5c76", nombre: "Fernando Torterolo" },
  { id: "2cba15cf-586b-420b-a144-de5ee6d85031", nombre: "Camilo La Rosa" },
  { id: "97fa10ca-29a9-4db7-8061-e39414e0c65f", nombre: "Jorge Franquez" },
  { id: "44970cf2-4a55-4b9f-93b0-9c9c59ef2557", nombre: "Juan Diego Montenegro" },
] as const;

type TorneoMate = Pick<Torneo, "id" | "nombre" | "estado" | "rondas" | "jugadoresIds" | "iniciadoEn">;
type JugadorMate = Pick<Jugador, "id" | "nombre">;
export type PartidaMate = {
  id: string; torneoId: string; torneo: string; ronda: number; mesa: number;
  fecha: string | null; blancasId: string; negrasId: string; resultado: ResultadoPartida;
};
export type FilaMate = {
  jugadorId: string; nombre: string; posicion: number; partidas: number;
  victorias: number; tablas: number; derrotas: number; puntos: number; rendimiento: number | null;
};
export type PasoCinturonMate = {
  id: string; torneoId: string | null; torneo: string; ronda: number | null;
  tipo: "conquista" | "defensa" | "recuperado" | "ambiguo";
  campeonId: string | null; anteriorId: string | null; partidas: PartidaMate[];
};

const resultados = new Set<ResultadoPartida>(["1-0", "0-1", "1/2-1/2"]);
const diaUruguay = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo", year: "numeric", month: "2-digit", day: "2-digit" });
function fechaValida(fecha: string | null | undefined) {
  return fecha && Number.isFinite(Date.parse(fecha)) ? new Date(fecha).toISOString() : null;
}
function ganador(p: PartidaMate) {
  return p.resultado === "1/2-1/2" ? null : p.resultado === "1-0" ? p.blancasId : p.negrasId;
}
function siguiente(campeon: string | null, p: PartidaMate) {
  const gana = ganador(p);
  if (!campeon) return gana;
  return gana && (p.blancasId === campeon || p.negrasId === campeon) ? gana : campeon;
}

/** Una mesa no es una hora. Se consideran TODOS los órdenes posibles dentro de la ronda. */
function aplicarGrupo(candidatos: Set<string | null>, partidas: PartidaMate[], respetarRondas = false) {
  const salida = new Set<string | null>();
  const visitados = new Set<string>();
  const requisitos = partidas.map(p => partidas.reduce((mask, otra, i) =>
    respetarRondas && otra.torneoId === p.torneoId && otra.ronda < p.ronda ? mask | (1 << i) : mask, 0));
  function recorrer(campeon: string | null, usados: number) {
    const clave = `${campeon ?? "vacante"}:${usados}`;
    if (visitados.has(clave)) return;
    visitados.add(clave);
    if (usados === (1 << partidas.length) - 1) { salida.add(campeon); return; }
    partidas.forEach((p, i) => {
      if (!(usados & (1 << i)) && (usados & requisitos[i]) === requisitos[i]) recorrer(siguiente(campeon, p), usados | (1 << i));
    });
  }
  // El límite evita trabajo exponencial ante un calendario corrupto. No adjudica un campeón arbitrario.
  if (partidas.length > 10) return new Set<string | null>([...PARTICIPANTES_MATE.map(j => j.id), ...candidatos]);
  candidatos.forEach(c => recorrer(c, 0));
  return salida;
}
function unico(candidatos: Set<string | null>) { return candidatos.size === 1 ? [...candidatos][0] : null; }

/** Sólo torneos del contexto público del club. No consulta colegio_torneos ni historiales privados. */
export function calcularTorneoMate(torneos: TorneoMate[], jugadores: JugadorMate[], alcance: "entre-ellos" | "todos" = "entre-ellos") {
  const idsMate = new Set<string>(PARTICIPANTES_MATE.map(j => j.id));
  const conocidos = new Set(jugadores.map(j => j.id));
  const partidas: PartidaMate[] = [];
  for (const t of torneos) {
    if (t.estado === "armado") continue;
    const presentes = new Set(t.jugadoresIds);
    const claves = new Set<string>();
    for (const r of t.rondas) for (const e of r.emparejamientos) {
      if (!Number.isInteger(r.numero) || r.numero < 1 || !Number.isInteger(e.numero) || e.numero < 1) continue;
      if (!e.negrasId || e.blancasId === e.negrasId || !e.resultado || !resultados.has(e.resultado)) continue;
      if (!presentes.has(e.blancasId) || !presentes.has(e.negrasId) || !conocidos.has(e.blancasId) || !conocidos.has(e.negrasId)) continue;
      if (!idsMate.has(e.blancasId) && !idsMate.has(e.negrasId)) continue;
      const id = `${t.id}:${r.numero}:${e.numero}`;
      if (claves.has(id)) continue;
      claves.add(id);
      partidas.push({ id, torneoId: t.id, torneo: t.nombre, ronda: r.numero, mesa: e.numero,
        fecha: fechaValida(t.iniciadoEn), blancasId: e.blancasId, negrasId: e.negrasId, resultado: e.resultado });
    }
  }
  const duelos = partidas.filter(p => idsMate.has(p.blancasId) && idsMate.has(p.negrasId));
  const incluidas = alcance === "entre-ellos" ? duelos : partidas;
  const filas: FilaMate[] = PARTICIPANTES_MATE.map(j => {
    const propias = incluidas.filter(p => p.blancasId === j.id || p.negrasId === j.id);
    const victorias = propias.filter(p => ganador(p) === j.id).length;
    const tablas = propias.filter(p => p.resultado === "1/2-1/2").length;
    const puntos = victorias + tablas / 2;
    return { jugadorId: j.id, nombre: jugadores.find(p => p.id === j.id)?.nombre ?? j.nombre, posicion: 0,
      partidas: propias.length, victorias, tablas, derrotas: propias.length - victorias - tablas, puntos,
      rendimiento: propias.length ? puntos / propias.length * 100 : null };
  });
  filas.sort((a, b) => b.puntos - a.puntos || a.nombre.localeCompare(b.nombre, "es"));
  filas.forEach((f, i) => { f.posicion = i && filas[i - 1].puntos === f.puntos ? filas[i - 1].posicion : i + 1; });
  const cruces = PARTICIPANTES_MATE.flatMap((a, i) => PARTICIPANTES_MATE.slice(i + 1).map(b => {
    const ps = duelos.filter(p => [p.blancasId, p.negrasId].includes(a.id) && [p.blancasId, p.negrasId].includes(b.id));
    return { aId: a.id, bId: b.id, partidas: ps.length, aVictorias: ps.filter(p => ganador(p) === a.id).length,
      tablas: ps.filter(p => p.resultado === "1/2-1/2").length, bVictorias: ps.filter(p => ganador(p) === b.id).length };
  }));
  const cinturon = calcularCinturonMate(duelos);
  return { filas, cruces, duelos, partidasIncluidas: incluidas.length, torneos: new Set(incluidas.map(p => p.torneoId)).size, cinturon };
}

export function calcularCinturonMate(duelos: PartidaMate[]) {
  const pasos: PasoCinturonMate[] = [];
  let candidatos = new Set<string | null>([null]);
  const porDia = new Map<string, Map<string, PartidaMate[]>>();
  const sinFecha = duelos.filter(p => !p.fecha);
  for (const p of duelos.filter(p => p.fecha)) {
    const dia = diaUruguay.format(new Date(p.fecha!));
    const ts = porDia.get(dia) ?? new Map<string, PartidaMate[]>();
    ts.set(p.torneoId, [...(ts.get(p.torneoId) ?? []), p]);
    porDia.set(dia, ts);
  }
  for (const [, ts] of [...porDia].sort(([a], [b]) => a.localeCompare(b))) {
    if (ts.size > 1) {
      // Los horarios de INICIO no permiten ordenar las partidas de torneos que se solapan.
      const ps = [...ts.values()].flat();
      const anterior = unico(candidatos);
      candidatos = aplicarGrupo(candidatos, ps, true);
      const actual = unico(candidatos);
      if (actual || candidatos.size > 1) pasos.push({ id: `simultaneos:${ps[0].fecha}`, torneoId: null, torneo: "Torneos del mismo día", ronda: null,
        tipo: candidatos.size > 1 ? "ambiguo" : "recuperado", campeonId: actual, anteriorId: anterior, partidas: ps });
      continue;
    }
    const ps = [...ts.values()][0];
    const numeros = [...new Set(ps.map(p => p.ronda))].sort((a, b) => a - b);
    for (const ronda of numeros) {
      const grupo = ps.filter(p => p.ronda === ronda);
      const anterior = unico(candidatos);
      const eraAmbiguo = candidatos.size > 1;
      candidatos = aplicarGrupo(candidatos, grupo);
      const actual = unico(candidatos);
      const base = { id: `${ps[0].torneoId}:${ronda}`, torneoId: ps[0].torneoId, torneo: ps[0].torneo, ronda, partidas: grupo };
      if (candidatos.size > 1) {
        if (!eraAmbiguo) pasos.push({ ...base, tipo: "ambiguo", campeonId: null, anteriorId: anterior });
      } else if (eraAmbiguo && actual) {
        pasos.push({ ...base, tipo: "recuperado", campeonId: actual, anteriorId: null });
      } else if (actual && actual !== anterior) {
        pasos.push({ ...base, tipo: "conquista", campeonId: actual, anteriorId: anterior });
      } else if (actual && grupo.some(p => p.blancasId === actual || p.negrasId === actual)) {
        pasos.push({ ...base, tipo: "defensa", campeonId: actual, anteriorId: actual });
      }
    }
  }
  const ultimoConfirmado = pasos.filter(p => p.campeonId).at(-1)?.campeonId ?? null;
  // Una partida sin fecha podría estar ANTES o DESPUÉS de cualquier defensa: no se usa created_at.
  const campeonId = sinFecha.length ? null : unico(candidatos);
  return { campeonId, ultimoConfirmado, pasos, sinFecha, pendiente: sinFecha.length > 0 || candidatos.size > 1,
    conquistas: pasos.filter(p => p.tipo === "conquista"), ambiguedades: pasos.filter(p => p.tipo === "ambiguo").length };
}
