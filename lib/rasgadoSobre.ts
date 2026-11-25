/** El mismo recorrido horizontal abre el sobre en cualquiera de las dos direcciones. */
export function evaluarRasgado(desplazamientoX: number, desplazamientoY: number, ancho: number) {
  if (![desplazamientoX,desplazamientoY,ancho].every(Number.isFinite) || ancho<=0 || Math.abs(desplazamientoY)>Math.max(48,ancho*.4)) return {progreso:0,direccion:1 as const,completo:false};
  const progreso=Math.min(1,Math.abs(desplazamientoX)/(ancho*.64));
  return {progreso,direccion:desplazamientoX<0?-1 as const:1 as const,completo:progreso>=1};
}
