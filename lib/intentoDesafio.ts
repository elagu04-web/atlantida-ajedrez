export function claveErrorDesafio(usuario: string | undefined, fecha: string, puzzle: string) {
  return `atlantida-desafio-error:${usuario ?? "anon"}:${fecha}:${puzzle}`;
}
export function leerErrorDesafio(clave: string): boolean {
  try { return typeof window !== "undefined" && localStorage.getItem(clave) === "1"; } catch { return false; }
}
// Se escribe en el evento, antes de mostrar la pista o permitir otra jugada.
export function marcarErrorDesafio(clave: string) {
  try { localStorage.setItem(clave, "1"); } catch { /* El registro remoto sigue conservando el fallo. */ }
}
