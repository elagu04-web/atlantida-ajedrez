import { supabase } from "./supabase";

export type ControlTorneo = {
  id: string;
  pagaron_ids: string[];
  asistieron_ids: string[];
  created_at: string;
  actualizado_en: string;
};
export type CampoControlTorneo = "pagaron_ids" | "asistieron_ids";

function fallo(error: {code?: string} | null): Error {
  if (error?.code === "PGRST205" || error?.code === "42P01") {
    return new Error("El registro de pagos y asistencia todavía no está habilitado. No se guardó el cambio.");
  }
  return new Error("No se pudo guardar. Comprobá tu conexión y tu sesión de administrador; el cambio no está confirmado.");
}

/** Aplica el valor elegido, no un toggle de una copia vieja. Relee ante conflictos. */
export async function establecerMarcaTorneo(id: string, campo: CampoControlTorneo, jugadorId: string, marcado: boolean): Promise<ControlTorneo> {
  for (let intento = 0; intento < 4; intento++) {
    const {data: anterior, error: lecturaError} = await supabase.from("torneos_control").select("*").eq("id", id).abortSignal(AbortSignal.timeout(10000)).maybeSingle();
    if (lecturaError) throw fallo(lecturaError);
    const lista = anterior?.[campo] ?? [];
    if (!Array.isArray(lista) || lista.some(v => typeof v !== "string")) throw new Error("El registro necesita revisión; no se reemplazaron sus datos.");
    if (anterior && lista.includes(jugadorId) === marcado) return anterior as ControlTorneo;
    const nuevos = marcado ? [...new Set([...lista, jugadorId])] : lista.filter(v => v !== jugadorId);
    const cambios = {[campo]: nuevos, actualizado_en: new Date().toISOString()};
    // Una alta simultánea nunca reemplaza el registro existente: se relee y combina.
    const respuesta = anterior
      ? await supabase.from("torneos_control").update(cambios).eq("id", id).eq(campo, JSON.stringify(lista)).select().abortSignal(AbortSignal.timeout(10000)).maybeSingle()
      : await supabase.from("torneos_control").insert({id, ...cambios}).select().abortSignal(AbortSignal.timeout(10000)).single();
    if (respuesta.data && !respuesta.error) {
      if (!Array.isArray(respuesta.data[campo]) || respuesta.data[campo].includes(jugadorId) !== marcado) throw new Error("El servidor no confirmó la marca. Recargá para revisar el registro.");
      return respuesta.data as ControlTorneo;
    }
    if (respuesta.error?.code === "23505" || (!respuesta.error && !respuesta.data)) continue;
    throw fallo(respuesta.error);
  }
  throw new Error("El registro está cambiando en otra pantalla. Reintentá; no se sobrescribieron sus cambios.");
}
