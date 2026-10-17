import { Chess } from "chess.js";
import { familiaFinal } from "./finalesPersonales";
import { fechaMontevideo } from "./desafios";
import type { JugadaAnalizada } from "./analisisPartidas";
import type { SesionEntrenamiento, PracticaError } from "./entrenamientoPersonal";
import type { ProgresoGuiado, EjercicioGuiado, ActividadGuiada } from "./entrenamientoGuiado";

const CATEGORIAS = {
  rey: { nombre: "Seguridad del rey", actividad: "tactica", temas: ["mateIn1", "mateIn2", "mateIn3", "backRankMate", "defensiveMove"] },
  piezas: { nombre: "Seguridad de las piezas", actividad: "tactica", temas: ["hangingPiece", "trappedPiece", "defensiveMove"] },
  apertura: { nombre: "Decisiones en la apertura", actividad: "candidatas", temas: ["opening"] },
  calculo: { nombre: "Cálculo y oportunidades", actividad: "candidatas", temas: [] },
  "final-peones": { nombre: "Finales de reyes y peones", actividad: "tactica", temas: ["pawnEndgame", "promotion", "zugzwang"] },
  "final-torres": { nombre: "Finales de torres", actividad: "tactica", temas: ["rookEndgame"] },
  "final-menores": { nombre: "Finales de piezas menores", actividad: "tactica", temas: ["bishopEndgame", "knightEndgame"] },
  "final-damas": { nombre: "Finales de damas", actividad: "tactica", temas: ["queenEndgame"] },
  "final-mixtos": { nombre: "Finales mixtos", actividad: "candidatas", temas: ["endgame"] },
} satisfies Record<string, { nombre: string; actividad: ActividadGuiada; temas: string[] }>;
export type CategoriaPareto = keyof typeof CATEGORIAS;
const categoriaFinal = (familia: string): CategoriaPareto => ({ "Reyes y peones": "final-peones", Torres: "final-torres", "Piezas menores": "final-menores", Damas: "final-damas" } as Record<string, CategoriaPareto>)[familia] ?? "final-mixtos";
export type EvidenciaPareto = { sesion: SesionEntrenamiento; indice: number; perdida: number; practica?: PracticaError; destino: "decision" | "final" };
export type FocoPareto = {
  id: CategoriaPareto; nombre: string; actividad: ActividadGuiada; temas: string[];
  partidasConError: number; partidasObservadas: number; prioridad: number;
  primerasSenales: boolean; mejoraEnRepasos: boolean; mejoraEnPartidas: boolean;
  repasosIndependientes: number; evidencias: EvidenciaPareto[]; siguiente?: EvidenciaPareto;
};
export type ResumenPareto = { partidas: number; totalDisponibles: number; focos: FocoPareto[]; temas: FocoPareto[]; dia: string };
type InfoPartida = { firma: string; fecha: string; hora: string; familias: Map<string, string> };
type PartidaPareto = { s: SesionEntrenamiento; copias: SesionEntrenamiento[]; info: InfoPartida; fecha: string };
const cachePartidas = new Map<string, InfoPartida | null>();
const cacheResultados = new WeakMap<object, { pgn: string; info: InfoPartida | null }>();

function infoPartida(s: SesionEntrenamiento): InfoPartida | null {
  // Cache only PGN facts; never cache an account's focus or practice results.
  const anterior = cacheResultados.get(s.resultado);
  if (anterior?.pgn === s.pgn) return anterior.info;
  if (cachePartidas.has(s.pgn)) {
    const info = cachePartidas.get(s.pgn)!;
    cacheResultados.set(s.resultado, { pgn: s.pgn, info }); return info;
  }
  let info: InfoPartida | null = null;
  try {
    const c = new Chess(); c.loadPgn(s.pgn);
    const h = c.getHeaders(), movimientos = c.history({ verbose: true });
    if (h.Event !== "Ejemplo de entrenamiento" && movimientos.length) {
      const f = h.UTCDate ?? h.Date ?? "", fecha = f.replaceAll(".", "-");
      const fechaValida = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && Number.isFinite(Date.parse(fecha)) && new Date(fecha).toISOString().slice(0, 10) === fecha;
      const hora = /^(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(h.UTCTime ?? "") ? h.UTCTime : "";
      info = { firma: JSON.stringify([h.White?.trim().toLowerCase() ?? "", h.Black?.trim().toLowerCase() ?? "", fechaValida ? fecha : "", hora, movimientos[0].before, movimientos.map(m => m.from + m.to + (m.promotion ?? ""))]), fecha: fechaValida ? fecha : "", hora, familias: new Map() };
    }
  } catch { /* Incomplete or corrupt imports cannot establish a personal focus. */ }
  if (cachePartidas.size >= 60) cachePartidas.delete(cachePartidas.keys().next().value!);
  cachePartidas.set(s.pgn, info);
  cacheResultados.set(s.resultado, { pgn: s.pgn, info });
  return info;
}

function clasificar(j: JugadaAnalizada, familia: string | null): CategoriaPareto {
  // A score loss alone never proves a particular strategic cause. The first
  // two signals come from the saved analysis; the rest describe stage/material.
  if (j.llevaAMate) return "rey";
  if (j.piezaColgada) return "piezas";
  if (familia) return categoriaFinal(familia);
  if (j.numero <= 15) return "apertura";
  return "calculo";
}
const posicion = (fen: string) => fen.split(" ").slice(0, 4).join(" ");
const limpio = (p?: PracticaError) => !!p && (p.etapa ?? 0) >= 2 && !p.ayudado;

/** One vote per game/topic, bounded severity, recent opportunities and independent
 * reviews. The focus is derived from private saved documents, not a second store
 * that can go stale or cross account boundaries. Pareto is prioritization here,
 * not a promise of an 80% gain or a diagnosis based only on centipawns. */
export function analizarPareto(sesiones: SesionEntrenamiento[], progreso: ProgresoGuiado, banco: EjercicioGuiado[], ahora = new Date()): ResumenPareto {
  const dia = fechaMontevideo(ahora);
  const unicas = new Map<string, PartidaPareto>();
  for (const s of sesiones) {
    const info = infoPartida(s);
    if (!info) continue;
    const firma = info.firma + ":" + s.color, anterior = unicas.get(firma);
    const fecha = info.fecha && info.fecha <= dia ? info.fecha : s.creada.slice(0, 10);
    const copias = [...(anterior?.copias ?? []), s];
    if (!anterior || s.actualizada > anterior.s.actualizada || (s.actualizada === anterior.s.actualizada && s.id < anterior.s.id)) unicas.set(firma, { s, copias, info, fecha });
    else anterior.copias = copias;
  }
  const orden = (j: PartidaPareto) => j.info.hora ? j.fecha + "T" + j.info.hora + "Z" : j.s.creada;
  const recientes = [...unicas.values()].sort((a, b) => b.fecha.localeCompare(a.fecha) || orden(b).localeCompare(orden(a)) || a.info.firma.localeCompare(b.info.firma)).slice(0, 20);
  const juegos = recientes.map(({ s, copias, info, fecha }) => {
    const disponibles = new Set<CategoriaPareto>(), errores = new Map<CategoriaPareto, EvidenciaPareto[]>();
    const practicas = new Map<string, PracticaError>();
    for (const copia of copias) copia.resultado.jugadas.forEach((j, i) => {
      if (j.color !== copia.color) return;
      for (const [destino, p] of [["decision", copia.practicas[String(i)]], ["final", copia.finales?.[String(i)]?.practica]] as const) {
        if (!p) continue;
        const clave = destino + ":" + posicion(j.fenAntes), anterior = practicas.get(clave);
        const reloj = (p: PracticaError) => p.actualizada ?? (p.ultimoDia ? p.ultimoDia + "T00:00:00.000Z" : "");
        if (!anterior || reloj(p) > reloj(anterior) || (reloj(p) === reloj(anterior) && p.ayudado)) practicas.set(clave, p);
      }
    });
    s.resultado.jugadas.forEach((j, indice) => {
      if (j.color !== s.color) return;
      disponibles.add("rey"); disponibles.add("piezas"); disponibles.add("calculo");
      if (j.numero <= 15) disponibles.add("apertura");
      // Store null as an empty string to avoid reconstructing middlegames on every review.
      if (!info.familias.has(j.fenAntes)) info.familias.set(j.fenAntes, familiaFinal(j.fenAntes) ?? "");
      const familia = info.familias.get(j.fenAntes) || null;
      if (familia) disponibles.add(categoriaFinal(familia));
      if (j.perdidaCentipeones < 100 || j.san === j.mejorJugadaSan) return;
      const id = clasificar(j, familia), lista = errores.get(id) ?? [];
      const destino = id.startsWith("final-") ? "final" : "decision";
      const practica = practicas.get(destino + ":" + posicion(j.fenAntes));
      lista.push({ sesion: s, indice, perdida: j.perdidaCentipeones, practica, destino }); errores.set(id, lista);
    });
    return { disponibles, errores, fecha };
  });
  const temas: FocoPareto[] = [];
  for (const id of Object.keys(CATEGORIAS) as CategoriaPareto[]) {
    const datos = CATEGORIAS[id], oportunidades = juegos.filter(j => j.disponibles.has(id));
    const conError = oportunidades.filter(j => j.errores.has(id));
    if (!conError.length) continue;
    const evidencias: EvidenciaPareto[] = [];
    const propias = new Map<string, PracticaError>();
    for (const j of conError) {
      const lista = j.errores.get(id)!.slice().sort((a, b) => b.perdida - a.perdida || a.indice - b.indice);
      // One illustrative decision per game; practice evidence can use all
      // distinct positions but repeated clicks never add observations.
      const paraPracticar = lista.filter(e => !!e.sesion.resultado.jugadas[e.indice].mejorJugadaSan);
      const pendiente = paraPracticar.find(e => !e.practica?.proxima || e.practica.proxima <= dia);
      if (pendiente ?? paraPracticar[0]) evidencias.push((pendiente ?? paraPracticar[0])!);
      for (const e of lista) if (e.practica) {
        const clave = posicion(e.sesion.resultado.jugadas[e.indice].fenAntes), anterior = propias.get(clave);
        if (!anterior || (e.practica.actualizada ?? "") > (anterior.actualizada ?? "")) propias.set(clave, e.practica);
      }
    }
    const muestras = [...propias].map(([clave, practica]) => ({ clave, practica, fecha: practica.actualizada ?? (practica.ultimoDia ? practica.ultimoDia + "T00:00:00.000Z" : "") }));
    if (datos.temas.length) for (const e of banco) {
      const a = progreso.ejercicios[e.id];
      if (!a?.practica || !e.temas.some(t => (datos.temas as readonly string[]).includes(t))) continue;
      muestras.push({ clave: posicion(e.fen), practica: a.practica, fecha: a.actualizada ?? "" });
    }
    muestras.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.clave.localeCompare(b.clave));
    const vistas = new Set<string>();
    const distintas = muestras.filter(m => { if (vistas.has(m.clave)) return false; vistas.add(m.clave); return true; }).slice(0, 6);
    const ultimoError = conError.reduce((fecha, j) => j.fecha > fecha ? j.fecha : fecha, "");
    // An error in a newly imported game reopens the focus. Old successful
    // exercises cannot be used as evidence that the new problem is resolved.
    const aprendidoDespues = (m: typeof distintas[number]) => limpio(m.practica) && m.fecha.slice(0, 10) >= ultimoError;
    const repasosIndependientes = distintas.filter(aprendidoDespues).length;
    const mejoraEnRepasos = distintas.length >= 3 && distintas.slice(0, 3).every(aprendidoDespues);
    // With dates but no reliable game times, same-day ordering cannot prove
    // that three clean games happened after the error.
    const mejoraEnPartidas = oportunidades.length >= 4 && oportunidades.slice(0, 3).every(j => !j.errores.has(id) && j.fecha > ultimoError);
    let peso = 0, necesidad = 0;
    oportunidades.forEach((j, i) => {
      const masRecientes = oportunidades.slice(0, i).filter(previa => previa.fecha > j.fecha).length;
      const w = .86 ** masRecientes; peso += w;
      const errores = j.errores.get(id);
      if (errores) necesidad += w * (.5 + .5 * Math.min(500, Math.max(...errores.map(e => e.perdida))) / 500);
    });
    const confianza = .4 + .6 * Math.min(1, conError.length / 3);
    const prioridad = mejoraEnPartidas ? 0 : necesidad / (peso || 1) * confianza * (mejoraEnRepasos ? .6 : 1);
    temas.push({ id, nombre: datos.nombre, actividad: datos.actividad, temas: [...datos.temas], partidasConError: conError.length, partidasObservadas: oportunidades.length, primerasSenales: conError.length < 3, prioridad, mejoraEnRepasos, mejoraEnPartidas, repasosIndependientes, evidencias,
      siguiente: evidencias.find(e => !e.practica?.proxima || e.practica.proxima <= dia) });
  }
  temas.sort((a, b) => b.prioridad - a.prioridad || b.partidasConError - a.partidasConError || a.id.localeCompare(b.id));
  const activos = temas.filter(t => t.prioridad > .025);
  const focos = activos.slice(0, 1);
  if (activos[1] && activos[1].prioridad >= activos[0].prioridad * .5) focos.push(activos[1]);
  return { partidas: recientes.length, totalDisponibles: unicas.size, temas, focos, dia };
}

/** New reinforcement stays near the user's current level, with a varied second
 * position. Existing due reviews and unfinished sessions are handled upstream. */
export function nuevosSegunPareto(nuevos: EjercicioGuiado[], nivel: number, temas: readonly string[]): EjercicioGuiado[] | null {
  if (!temas.length) return null;
  const cercanos = nuevos.filter(e => typeof e.rating === "number" && Math.abs(e.rating - nivel) <= 200);
  // Prefer the concrete motif before a broader fallback such as defensiveMove.
  const dirigido = temas.map(t => cercanos.find(e => e.temas.includes(t))).find(e => !!e);
  if (!dirigido) return null;
  const resto = cercanos.filter(e => e.id !== dirigido.id);
  const variado = resto.find(e => !e.temas.some(t => temas.includes(t))) ?? resto[0];
  return variado ? [dirigido, variado] : [dirigido];
}
