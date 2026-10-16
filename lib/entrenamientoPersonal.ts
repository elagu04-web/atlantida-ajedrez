import { Chess } from "chess.js";
import type { ResultadoAnalisis, JugadaAnalizada } from "./analisisPartidas";
import { fechaMontevideo } from "./desafios";
import { estadoFinalValido, type EstadoFinalPersonal } from "./finalesPersonales";

export type PracticaError = { aciertos: number; fallos: number; proxima: string | null; ultimoDia: string | null; ayudado: boolean; etapa?: number; diaAyuda?: string | null; actualizada?: string };
export type SesionEntrenamiento = { id: string; actualizada: string; creada: string; titulo: string; pgn: string; color: "w" | "b"; resultado: ResultadoAnalisis; practicas: Record<string, PracticaError>; notas?: Record<string, string>; practicasActualizadas?: Record<string, string>; notasActualizadas?: Record<string, string>; finales?: Record<string, EstadoFinalPersonal> };
export type EjercicioPersonal = { id: string; jugada: JugadaAnalizada; tema: string };
export const PGN_EJEMPLO = '[Event "Ejemplo de entrenamiento"]\n[White "Blancas"]\n[Black "Negras"]\n[Result "0-1"]\n\n1. f3 e5 2. g4 Qh4# 0-1';
export const PLAN_ENTRENAMIENTO = [
  { titulo: "Encontrar el punto débil", objetivo: "Entender qué se repite en tus partidas.", pasos: ["Revisá una partida lenta: elegí una que hayas pensado de verdad.", "Antes de ver la solución, volvé a jugar sus momentos críticos.", "Anotá qué amenaza del rival se te pasó y qué candidato faltó mirar."] },
  { titulo: "Calcular con una rutina", objetivo: "Dejar de mover la primera jugada que se te ocurre.", pasos: ["En cada posición, buscá jaques, capturas y amenazas para los dos lados.", "Elegí dos candidatos y calculá la mejor respuesta del rival.", "Practicá otra partida contra un bot aplicando esa rutina antes de mover."] },
  { titulo: "Convertirlo en un hábito", objetivo: "Comprobar si reconocés las ideas otro día.", pasos: ["Volvé a las posiciones cuya revisión esté pendiente.", "Sumá una partida nueva y buscá si reaparece el mismo tipo de error.", "Traé una posición difícil al grupo de estudio del jueves."] },
  { titulo: "Revisar y ajustar", objetivo: "Elegir qué vale la pena trabajar el próximo mes.", pasos: ["Revisá las partidas del mes y compará los errores que más se repiten.", "Separá las posiciones que resolvés solo de las que aún necesitan ayuda.", "Elegí un foco nuevo con el profe: cálculo, seguridad de piezas o finales."] },
] as const;

export function validarPgnEntrenamiento(pgn: string) {
  if (!pgn.trim() || pgn.length > 200000 || (pgn.match(/\[Event\s+"/g)?.length ?? 0) > 1) throw new Error("Usá un PGN de una sola partida, de hasta 200 KB.");
  const chess = new Chess(); chess.loadPgn(pgn);
  const movimientos = chess.history();
  if (!movimientos.length || movimientos.length > 600) throw new Error("Elegí una partida con entre 1 y 600 medias jugadas.");
  return { pgn: chess.pgn(), titulo: `${chess.getHeaders().White || "Blancas"} · ${chess.getHeaders().Black || "Negras"}` };
}
export function temaDeError(j: JugadaAnalizada): string {
  if (j.llevaAMate) return "Seguridad del rey";
  if (j.piezaColgada) return "Seguridad de piezas";
  if (j.numero <= 10) return "Decisiones en la apertura";
  if (j.numero > 25) return "Cálculo en posiciones avanzadas";
  return "Cálculo y oportunidades";
}
export function ejerciciosPersonales(sesion: SesionEntrenamiento): EjercicioPersonal[] {
  return sesion.resultado.jugadas.map((jugada, i) => ({ id: String(i), jugada, tema: temaDeError(jugada) })).filter(e => e.jugada.color === sesion.color && e.jugada.perdidaCentipeones >= 100 && e.jugada.mejorJugadaSan).sort((a, b) => b.jugada.perdidaCentipeones - a.jugada.perdidaCentipeones).slice(0, 6);
}
export function crearSesionEntrenamiento(biblioteca: SesionEntrenamiento[], pgn: string, color: "w" | "b", resultado: ResultadoAnalisis, id: string, ahora = new Date()): SesionEntrenamiento {
  const entrada = validarPgnEntrenamiento(pgn);
  const previa = biblioteca.find(s => s.pgn === entrada.pgn && s.color === color);
  const practicas = Object.fromEntries(Object.entries(previa?.practicas ?? {}).filter(([i]) => resultado.jugadas[Number(i)]?.fenAntes === previa?.resultado.jugadas[Number(i)]?.fenAntes && resultado.jugadas[Number(i)]?.mejorJugadaSan === previa?.resultado.jugadas[Number(i)]?.mejorJugadaSan));
  const finales = previa?.finales ? Object.fromEntries(Object.entries(previa.finales).filter(([i, e]) => resultado.jugadas[Number(i)]?.fenAntes === e.fen)) : undefined;
  return { id: previa?.id ?? id, creada: previa?.creada ?? ahora.toISOString(), actualizada: ahora.toISOString(), pgn: entrada.pgn, titulo: entrada.titulo, color, resultado, practicas, notas: previa?.notas ?? {}, practicasActualizadas: previa?.practicasActualizadas ?? {}, notasActualizadas: previa?.notasActualizadas ?? {}, ...(finales ? { finales } : {}) };
}
export const INTERVALOS_REPASO = [1, 3, 7, 14, 30] as const;
export function normalizarPractica(actual?: PracticaError): PracticaError {
  const p = actual ?? { aciertos: 0, fallos: 0, proxima: null, ultimoDia: null, ayudado: false };
  return { ...p, etapa: p.etapa ?? (p.ayudado ? 0 : Math.min(p.aciertos, 5)), diaAyuda: p.diaAyuda ?? (p.ayudado ? p.ultimoDia : null) };
}
export function ayudaEnDia(actual?: PracticaError, ahora = new Date()): boolean {
  const p = normalizarPractica(actual), dia = fechaMontevideo(ahora);
  return p.diaAyuda === dia || (p.ayudado && p.ultimoDia === dia);
}
export function registrarPractica(actual: PracticaError | undefined, acertado: boolean, ayudado: boolean, ahora = new Date()): PracticaError {
  const dia = fechaMontevideo(ahora), previa = normalizarPractica(actual);
  const fechaSiguiente = (dias: number) => new Date(Date.parse(dia + "T12:00:00Z") + dias * 86400000).toISOString().slice(0, 10);
  // La primera respuesta y las ayudas quedan registradas aunque se recargue o cambie de dispositivo.
  if (!acertado || ayudado || ayudaEnDia(previa, ahora)) return {
    ...previa, etapa: 0, fallos: previa.fallos + (!acertado && !ayudado ? 1 : 0),
    proxima: fechaSiguiente(1), ultimoDia: dia, ayudado: true, diaAyuda: dia, actualizada: ahora.toISOString(),
  };
  // Repetir hoy o adelantarse a un repaso sirve para practicar, pero no acelera la etapa.
  if (previa.ultimoDia === dia || (previa.proxima !== null && previa.proxima > dia)) return previa;
  const etapa = Math.min((previa.etapa ?? 0) + 1, INTERVALOS_REPASO.length);
  return { ...previa, aciertos: previa.aciertos + 1, etapa, proxima: fechaSiguiente(INTERVALOS_REPASO[etapa - 1]), ultimoDia: dia, ayudado: false, diaAyuda: null, actualizada: ahora.toISOString() };
}
export function practicaValida(p: unknown): p is PracticaError {
  if (!p || typeof p !== "object" || Array.isArray(p)) return false;
  const v = p as PracticaError;
  const fecha = (d: unknown) => d === null || (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d);
  try { return Number.isInteger(v.aciertos) && v.aciertos >= 0 && Number.isInteger(v.fallos) && v.fallos >= 0 && typeof v.ayudado === "boolean" && fecha(v.proxima) && fecha(v.ultimoDia) && (v.etapa === undefined || (Number.isInteger(v.etapa) && v.etapa >= 0 && v.etapa <= 5)) && (v.diaAyuda === undefined || fecha(v.diaAyuda)) && (v.actualizada === undefined || (typeof v.actualizada === "string" && Number.isFinite(Date.parse(v.actualizada)))); } catch { return false; }
}
export function leerBibliotecaEntrenamiento(texto: string): SesionEntrenamiento[] {
  try {
    const datos: unknown = JSON.parse(texto);
    if (!Array.isArray(datos)) return [];
    return datos.filter((s): s is SesionEntrenamiento => {
      try {
        if (!s || typeof s.id !== "string" || typeof s.pgn !== "string" || s.pgn.length > 200000 || typeof s.titulo !== "string" || s.titulo.length > 200 || typeof s.creada !== "string" || typeof s.actualizada !== "string" || !Number.isFinite(Date.parse(s.creada)) || !Number.isFinite(Date.parse(s.actualizada)) || !["w", "b"].includes(s.color) || !Array.isArray(s.resultado?.jugadas) || s.resultado.jugadas.length > 600 || !s.practicas || typeof s.practicas !== "object" || Array.isArray(s.practicas)) return false;
        for (const j of s.resultado.jugadas as JugadaAnalizada[]) {
          if (!j || !["w", "b"].includes(j.color) || typeof j.san !== "string" || !Number.isInteger(j.numero) || j.numero < 1 || !Number.isFinite(j.perdidaCentipeones) || j.perdidaCentipeones < 0 || j.perdidaCentipeones > 1000 || typeof j.fenAntes !== "string") return false;
          const posicion = new Chess(j.fenAntes);
          if (posicion.turn() !== j.color || (j.mejorJugadaSan !== null && typeof j.mejorJugadaSan !== "string")) return false;
          if (j.mejorJugadaSan) posicion.move(j.mejorJugadaSan);
          if (j.varianteSan !== null && (!Array.isArray(j.varianteSan) || j.varianteSan.some((m: string) => typeof m !== "string"))) return false;
        }
        for (const p of Object.values(s.practicas)) if (!practicaValida(p)) return false;
        if (s.finales !== undefined) {
          if (!s.finales || typeof s.finales !== "object" || Array.isArray(s.finales)) return false;
          for (const [i, e] of Object.entries(s.finales)) {
            const j = s.resultado.jugadas[Number(i)];
            if (!/^\d+$/.test(i) || !j || j.color !== s.color || !estadoFinalValido(e, j.fenAntes, s.color) || (e.practica !== undefined && !practicaValida(e.practica))) return false;
          }
        }
        s.practicas = Object.fromEntries(Object.entries(s.practicas as Record<string, PracticaError>).map(([id, p]) => [id, normalizarPractica(p)]));
        if (s.notas !== undefined && (!s.notas || typeof s.notas !== "object" || Array.isArray(s.notas) || Object.values(s.notas).some(n => typeof n !== "string" || n.length > 800))) return false;
        for (const reloj of [s.practicasActualizadas, s.notasActualizadas]) if (reloj !== undefined && (!reloj || typeof reloj !== "object" || Array.isArray(reloj) || Object.values(reloj).some(t => typeof t !== "string" || !Number.isFinite(Date.parse(t))))) return false;
        return true;
      } catch { return false; }
    });
  } catch { return []; }
}
export function resumenEntrenamiento(sesiones: SesionEntrenamiento[], ahora = new Date()) {
  const dia = fechaMontevideo(ahora);
  const ejercicios = sesiones.flatMap(s => ejerciciosPersonales(s).map(e => ({ ...e, sesion: s, practica: s.practicas[e.id] })));
  const temas = new Map<string, number>();
  for (const e of ejercicios) temas.set(e.tema, (temas.get(e.tema) ?? 0) + 1);
  const foco = [...temas].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { partidas: sesiones.length, ejercicios, resueltos: ejercicios.filter(e => (e.practica?.aciertos ?? 0) > 0).length, pendientes: ejercicios.filter(e => !e.practica?.proxima || e.practica.proxima <= dia), foco };
}
