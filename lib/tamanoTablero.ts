export type PreferenciaTablero = { modo: 'auto' } | { modo: 'manual'; lado: number };
export const CLAVE_TAMANO_TABLERO = 'atlantida-tablero-tamano-v1';
export function leerTamanoTablero(texto: string | null): PreferenciaTablero {
  try {
    const p = JSON.parse(texto ?? 'null');
    if (p?.modo === 'manual' && Number.isFinite(p.lado)) return { modo: 'manual', lado: Math.max(144, Math.min(1000, Math.round(p.lado))) };
  } catch { /* Una preferencia dañada no impide jugar. */ }
  return { modo: 'auto' };
}
/** Dimensiones en píxeles CSS, sin escalar ni transformar las coordenadas del tablero. */
export function dimensionesTablero(ancho: number, alto: number, cabecera: number, reserva: number, preferencia: PreferenciaTablero) {
  const maximo = Math.max(1, Math.min(1000, Math.floor(ancho)));
  const minimo = Math.min(144, maximo);
  const automatico = Math.max(minimo, Math.min(maximo, Math.floor(alto - cabecera - reserva)));
  const lado = preferencia.modo === 'manual' ? Math.max(minimo, Math.min(maximo, preferencia.lado)) : automatico;
  return { lado, minimo, maximo, automatico };
}
