export type LadoReloj = 0 | 1; // Blancas / negras, independientemente de su posición en pantalla.
export type ConfiguracionReloj = { segundos: number; incremento: number };
export type EstadoReloj = {
  configuracion: ConfiguracionReloj;
  estado: "listo" | "corriendo" | "pausado" | "terminado";
  tiempos: [number, number];
  jugadas: [number, number];
  turno: LadoReloj;
  inicioTurno: number | null;
  caido: LadoReloj | null;
};
export const RITMOS_RELOJ = [
  { segundos: 180, incremento: 2 }, { segundos: 300, incremento: 3 },
  { segundos: 600, incremento: 3 }, { segundos: 600, incremento: 5 },
  { segundos: 900, incremento: 10 }, { segundos: 1800, incremento: 0 },
] as const;
export const CONFIGURACION_RELOJ = RITMOS_RELOJ[1];

export function configuracionValida(c: ConfiguracionReloj): boolean {
  return Number.isInteger(c?.segundos) && c.segundos >= 1 && c.segundos <= 10800
    && Number.isInteger(c?.incremento) && c.incremento >= 0 && c.incremento <= 60;
}
export function crearReloj(configuracion: ConfiguracionReloj = CONFIGURACION_RELOJ): EstadoReloj {
  if (!configuracionValida(configuracion)) throw new RangeError("Elegí entre 1 segundo y 180 minutos, con incremento de 0 a 60 segundos.");
  return { configuracion: { ...configuracion }, estado: "listo", tiempos: [configuracion.segundos * 1000, configuracion.segundos * 1000], jugadas: [0, 0], turno: 0, inicioTurno: null, caido: null };
}
export function tiemposReloj(reloj: EstadoReloj, ahora: number): [number, number] {
  const tiempos: [number, number] = [...reloj.tiempos];
  if (reloj.estado === "corriendo" && reloj.inicioTurno !== null)
    tiempos[reloj.turno] = Math.max(0, tiempos[reloj.turno] - Math.max(0, ahora - reloj.inicioTurno));
  return tiempos;
}
/** El intervalo sólo pinta la pantalla: el tiempo se calcula desde el inicio real del turno. */
export function comprobarTiempo(reloj: EstadoReloj, ahora: number): EstadoReloj {
  if (reloj.estado !== "corriendo") return reloj;
  const tiempos = tiemposReloj(reloj, ahora);
  return tiempos[reloj.turno] > 0 ? reloj : { ...reloj, tiempos, estado: "terminado", inicioTurno: null, caido: reloj.turno };
}
export function arrancarReloj(reloj: EstadoReloj, ahora: number): EstadoReloj {
  return reloj.estado === "listo" || reloj.estado === "pausado" ? { ...reloj, estado: "corriendo", inicioTurno: ahora } : reloj;
}
export function pulsarReloj(reloj: EstadoReloj, lado: LadoReloj, ahora: number): EstadoReloj {
  const vigente = comprobarTiempo(reloj, ahora);
  if (vigente.estado !== "corriendo" || vigente.turno !== lado) return vigente;
  const tiempos = tiemposReloj(vigente, ahora);
  tiempos[lado] += vigente.configuracion.incremento * 1000;
  const jugadas: [number, number] = [...vigente.jugadas];
  jugadas[lado]++;
  return { ...vigente, tiempos, jugadas, turno: lado === 0 ? 1 : 0, inicioTurno: ahora };
}
export function pausarReloj(reloj: EstadoReloj, ahora: number): EstadoReloj {
  const vigente = comprobarTiempo(reloj, ahora);
  return vigente.estado !== "corriendo" ? vigente : { ...vigente, tiempos: tiemposReloj(vigente, ahora), estado: "pausado", inicioTurno: null };
}
export function formatearTiempo(ms: number): string {
  ms = Math.max(0, ms);
  if (ms > 0 && ms < 10000) {
    const decimas = Math.ceil(ms / 100);
    return `0:${String(Math.floor(decimas / 10)).padStart(2, "0")}.${decimas % 10}`;
  }
  const total = Math.ceil(ms / 1000), segundos = String(total % 60).padStart(2, "0");
  return total >= 3600 ? `${Math.floor(total / 3600)}:${String(Math.floor(total / 60) % 60).padStart(2, "0")}:${segundos}` : `${Math.floor(total / 60)}:${segundos}`;
}
export function nombreRitmo(c: ConfiguracionReloj): string {
  return `${c.segundos % 60 === 0 ? c.segundos / 60 : `${Math.floor(c.segundos / 60)}:${String(c.segundos % 60).padStart(2, "0")}`} + ${c.incremento}`;
}
export function guardarEstadoReloj(reloj: EstadoReloj): string {
  return JSON.stringify({ version: 1, reloj });
}
export function recuperarReloj(valor: string | null, ahora: number): EstadoReloj | null {
  try {
    const datos = JSON.parse(valor ?? "null"), r = datos?.reloj as EstadoReloj;
    if (datos?.version !== 1 || !r || !configuracionValida(r.configuracion)
      || !["listo", "corriendo", "pausado", "terminado"].includes(r.estado)
      || ![0, 1].includes(r.turno) || ![null, 0, 1].includes(r.caido)
      || !Array.isArray(r.tiempos) || r.tiempos.length !== 2 || r.tiempos.some(t => !Number.isFinite(t) || t < 0 || t > 604800000)
      || !Array.isArray(r.jugadas) || r.jugadas.length !== 2 || r.jugadas.some(j => !Number.isInteger(j) || j < 0 || j > 100000)
      || (r.estado === "corriendo" ? !Number.isFinite(r.inicioTurno) || r.inicioTurno === null || r.inicioTurno < 0 || r.inicioTurno > ahora : r.inicioTurno !== null)
      || (r.estado === "terminado" ? r.caido === null || r.tiempos[r.caido] !== 0 : r.caido !== null)) return null;
    return pausarReloj(r, ahora);
  } catch { return null; }
}
