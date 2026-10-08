import { supabase } from "./supabase";

export type PerfilRegistrado = {
  id: string; nombre: string; apodo: string | null; email: string;
  elo_inicial: number; fide_id: string | null; foto_url: string | null; descripcion: string | null;
};

export function normalizarNombreJugador(nombre: string) {
  const limpio = nombre.replace(/\s+/gu, " ").trim();
  if (/[\u0000-\u001f\u007f]/u.test(nombre) || Array.from(limpio).length < 2 || Array.from(limpio).length > 80) {
    throw new Error("Escribí tu nombre y apellido, entre 2 y 80 caracteres.");
  }
  return limpio;
}

export async function registrarMiJugador(nombre: string, email: string): Promise<PerfilRegistrado> {
  const limpio = normalizarNombreJugador(nombre);
  if (!email.trim()) throw new Error("Iniciá sesión para crear tu jugador.");
  const {data,error} = await supabase.rpc("crear_mi_jugador", {p_nombre: limpio}).abortSignal(AbortSignal.timeout(10000));
  if (error) {
    if (error.code === "PGRST202") throw new Error("El registro de jugadores nuevos todavía no está habilitado. Avisale al club.");
    if (error.code === "P0001") throw new Error(error.message);
    throw new Error("No se confirmó la creación. Comprobá tu conexión y reintentá; tu cuenta no creará un duplicado.");
  }
  if (!data || typeof data.id !== "string" || !data.id || typeof data.nombre !== "string" || !data.nombre.trim()
    || typeof data.email !== "string" || data.email.trim().toLowerCase() !== email.trim().toLowerCase()
    || typeof data.elo_inicial !== "number" || !Number.isFinite(data.elo_inicial)) {
    throw new Error("El servidor no confirmó tu perfil. Recargá la página antes de reintentar.");
  }
  return data as PerfilRegistrado;
}
