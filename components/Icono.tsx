import type { SVGProps } from "react";

export type NombreIcono = "flecha" | "buscar" | "trofeo" | "personas" | "grafico" | "directo" | "reloj" | "menu" | "cerrar" | "reiniciar" | "idea" | "check" | "actividad";
const trazos: Record<NombreIcono, string> = {
  flecha: "M4 12h16m-6-6 6 6-6 6",
  buscar: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  trofeo: "M8 3h8v5a4 4 0 0 1-8 0V3Zm0 2H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v6m-4 3h8m-6-3h4v3",
  personas: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  grafico: "M3 3v18h18M7 14l4-4 4 3 6-7",
  directo: "M4 4h16v13H4V4Zm4 17h8m-4-4v4m-2-13 5 3-5 3V8Z",
  reloj: "M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0",
  menu: "M4 6h16M4 12h16M4 18h16",
  cerrar: "m6 6 12 12M6 18 18 6",
  reiniciar: "M3 11a9 9 0 1 1 2.5 7M3 4v7h7",
  idea: "M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2",
  check: "m5 12 4 4L19 6",
  actividad: "M3 12h4l3-8 4 16 3-8h4",
};
export function Icono({ nombre, className = "h-5 w-5", ...props }: SVGProps<SVGSVGElement> & {nombre: NombreIcono}) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}><path d={trazos[nombre]} /></svg>;
}
