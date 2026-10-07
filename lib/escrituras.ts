import { supabase } from "./supabase";

/** Compara solo los campos que se modifican: otro dispositivo no puede
 * sobrescribir resultados o inscripciones partiendo de una copia vieja. */
export async function actualizarFila(
  tabla: string,
  id: string,
  cambios: Record<string, unknown>,
  anterior: Record<string, unknown>,
) {
  const campos = Object.keys(cambios);
  for (const campo of campos) {
    if (!(campo in anterior)) throw new Error("Falta la versión anterior del registro. Recargá y volvé a intentar.");
  }
  const arraysPostgres = new Set<string>();
  async function ejecutar() {
    let consulta = supabase.from(tabla).update(cambios).eq("id", id);
    for (const campo of campos) {
      const valor = anterior[campo];
      const filtro = arraysPostgres.has(campo) && Array.isArray(valor)
        ? `{${valor.map(v => `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`
        : typeof valor === "object" ? JSON.stringify(valor) : valor;
      consulta = valor == null ? consulta.is(campo, null) : consulta.eq(campo, filtro);
    }
    return consulta.select().single();
  }
  let { data, error } = await ejecutar();
  // Las instalaciones pueden usar jsonb o uuid[] para las listas de IDs.
  // Un filtro mal tipado no ejecuta la escritura; se reintenta con el formato
  // nativo del campo, manteniendo la misma comparación contra la versión vieja.
  while (error?.code === "22P02" && error.message.includes("malformed array literal")) {
    const campo = campos.find(c => Array.isArray(anterior[c]) && !arraysPostgres.has(c) && error?.message.includes(JSON.stringify(anterior[c])));
    if (!campo) break;
    arraysPostgres.add(campo);
    ({ data, error } = await ejecutar());
  }
  if (error || !data) {
    throw new Error(error?.code === "PGRST116"
      ? "El registro cambió en otra pantalla o no tenés permiso para editarlo. Recargá y volvé a intentar; no se sobrescribió ningún cambio."
      : "No se pudo guardar. Comprobá la conexión y tus permisos, y volvé a intentar.");
  }
  return data as Record<string, unknown>;
}
