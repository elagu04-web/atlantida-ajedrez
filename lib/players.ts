export type Resultado = "victoria" | "empate" | "derrota";
export type Color = "blancas" | "negras";

export type Partida = {
  rival: string;
  color: Color;
  resultado: Resultado;
  fecha: string;
  torneo: string;
  eloDespues?: number;
};

export type Jugador = {
  id: string;
  nombre: string;
  apodo: string | null;
  fideId: string | null;
  fotoUrl: string | null;
  eloAtlantida: number;
  partidas: Partida[];
};

export function nombreVisible(j: { nombre: string; apodo: string | null }): string {
  return j.apodo?.trim() || j.nombre;
}
