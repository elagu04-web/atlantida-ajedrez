import { fechaMontevideo } from "./desafios";
import { obtenerTema, revisarTemas } from "./temasTacticos";
import type { ActividadGuiada, EjercicioGuiado, ProgresoGuiado } from "./entrenamientoGuiado";
import type { OrigenIntentoTactico } from "./entrenamientoTemas";

/** Bounded, account-scoped observations. UUIDs make offline merges idempotent. */
export type IntentoEntrenamiento = {
  id: string; ejercicio: string; fecha: string; acierto: boolean; ayudado: boolean;
  origen: OrigenIntentoTactico; temas: string[]; nivelAntes: number; nivelDespues: number;
};
export const LIMITE_HISTORIAL = 1200;
export function leerHistorial(v: unknown, banco: EjercicioGuiado[]): IntentoEntrenamiento[] {
  if (!Array.isArray(v)) return [];
  const ids = new Set(banco.map(e => e.id));
  return unirHistorial(v.filter((x): x is IntentoEntrenamiento => !!x && typeof x === "object"
    && typeof x.id === "string" && /^[\w-]{1,100}$/.test(x.id) && ids.has(x.ejercicio)
    && typeof x.fecha === "string" && /^\d{4}-\d\d-\d\dT/.test(x.fecha) && x.fecha.length <= 30 && Number.isFinite(Date.parse(x.fecha))
    && typeof x.acierto === "boolean" && typeof x.ayudado === "boolean" && ["jugada", "pista", "solucion"].includes(x.origen)
    && Array.isArray(x.temas) && x.temas.length <= 3 && x.temas.every((t: unknown) => typeof t === "string" && !!obtenerTema(t))
    && [x.nivelAntes, x.nivelDespues].every(n => Number.isInteger(n) && n >= 800 && n <= 2700))
    .map(x => ({id:x.id,ejercicio:x.ejercicio,fecha:x.fecha,acierto:x.acierto,ayudado:x.ayudado,origen:x.origen,temas:[...new Set(x.temas)],nivelAntes:x.nivelAntes,nivelDespues:x.nivelDespues})));
}
export function unirHistorial(...listas: IntentoEntrenamiento[][]): IntentoEntrenamiento[] {
  const mapa = new Map<string, IntentoEntrenamiento>();
  for (const x of listas.flat()) {
    const previo = mapa.get(x.id);
    if (!previo || JSON.stringify(x) > JSON.stringify(previo)) mapa.set(x.id, x);
  }
  return [...mapa.values()].sort((a,b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id)).slice(0,LIMITE_HISTORIAL);
}
type Muestra = { ejercicio: EjercicioGuiado; dia: string; fecha: string; error: boolean; ayuda: boolean; completado: boolean; reconocida: boolean | null; nivel: number };
export type RendimientoTema = {
  id: string; nombre: string; muestras: number; posiciones: number; errores: number; ayudas: number;
  limpias: number; reconocimiento: number | null; porcentaje: number; tendencia: number | null;
  dificultadResuelta: number | null; ultima: string; proximoRepaso: string | null;
};
export function analizarHistorial(p: ProgresoGuiado, banco: EjercicioGuiado[]) {
  const ejercicios = new Map(banco.map(e => [e.id,e]));
  const muestras = new Map<string,Muestra>();
  for (const x of p.historial ?? []) {
    const e = ejercicios.get(x.ejercicio); if (!e) continue;
    const dia = fechaMontevideo(new Date(x.fecha)), clave = `${e.id}:${dia}`;
    const m = muestras.get(clave) ?? {ejercicio:e,dia,fecha:x.fecha,error:false,ayuda:false,completado:false,reconocida:null,nivel:x.nivelAntes};
    m.error ||= !x.acierto && x.origen === "jugada";
    m.ayuda ||= x.ayudado || x.origen !== "jugada";
    m.completado ||= x.acierto;
    // Only a completed, unassisted hypothesis is evidence about recognition.
    if (x.acierto && !x.ayudado && x.origen === "jugada" && x.temas.length) {
      const revision = revisarTemas(x.temas,e.temas);
      const valida = revision.some(t => t.estado === "confirmada" || t.estado === "general");
      const erronea = revision.some(t => t.estado === "sinConfirmar");
      if (valida || erronea) m.reconocida = valida && !erronea;
    }
    if (x.fecha > m.fecha) m.fecha = x.fecha;
    muestras.set(clave,m);
  }
  const todas = [...muestras.values()].sort((a,b) => b.fecha.localeCompare(a.fecha));
  const limpia = (m:Muestra) => m.completado && !m.error && !m.ayuda;
  const porcentaje = (ms:Muestra[]) => Math.round(ms.filter(limpia).length / ms.length * 100);
  const porTema = new Map<string,Muestra[]>();
  for (const m of todas.filter(m => m.ejercicio.actividad === "tactica")) {
    const especificos = m.ejercicio.temas.filter(t => !/^mate(?:In[1-5])?$/.test(t));
    for (const id of new Set(especificos.length ? especificos : m.ejercicio.temas.filter(t => t !== "mate"))) {
      const lista = porTema.get(id) ?? []; lista.push(m); porTema.set(id,lista);
    }
  }
  const temas: RendimientoTema[] = [...porTema].flatMap(([id,lista]) => {
    const t = obtenerTema(id); if (!t) return [];
    const recientes = lista.slice(0,6), anteriores = lista.slice(6,12), reconocidas = lista.filter(m => m.reconocida !== null);
    const ratings = lista.filter(limpia).map(m => m.ejercicio.rating).filter((r):r is number => r !== undefined);
    const repasos = lista.map(m => p.ejercicios[m.ejercicio.id]?.practica?.proxima).filter((d):d is string => !!d).sort();
    return [{id,nombre:t.nombre,muestras:lista.length,posiciones:new Set(lista.map(m=>m.ejercicio.id)).size,errores:lista.filter(m=>m.error).length,ayudas:lista.filter(m=>m.ayuda).length,limpias:lista.filter(limpia).length,reconocimiento:reconocidas.length?Math.round(reconocidas.filter(m=>m.reconocida).length/reconocidas.length*100):null,porcentaje:porcentaje(lista),tendencia:recientes.length>=3&&anteriores.length>=3?porcentaje(recientes)-porcentaje(anteriores):null,dificultadResuelta:ratings.length?Math.round(ratings.reduce((a,b)=>a+b,0)/ratings.length):null,ultima:lista[0].fecha,proximoRepaso:repasos[0]??null}];
  }).sort((a,b) => a.porcentaje-b.porcentaje || b.muestras-a.muestras || a.nombre.localeCompare(b.nombre));
  const habilidades = (["tactica","candidatas","evaluacion"] as ActividadGuiada[]).map(actividad => {
    const ms = todas.filter(m=>m.ejercicio.actividad===actividad);
    const eventos = (p.historial??[]).filter(x=>ejercicios.get(x.ejercicio)?.actividad===actividad);
    return {actividad,muestras:ms.length,limpias:ms.filter(limpia).length,errores:ms.filter(m=>m.error).length,ayudas:ms.filter(m=>m.ayuda).length,anterior:eventos.at(-1)?.nivelAntes??null,actual:eventos[0]?.nivelDespues??null};
  });
  return {temas,habilidades,intentos:p.historial?.length??0,dias:new Set(todas.map(m=>m.dia)).size,muestras:todas.length};
}
