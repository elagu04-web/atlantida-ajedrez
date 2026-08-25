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
  lichessUsuario?: string | null;
  // Email de Google con el que este jugador "reclamó" su perfil, para
  // poder anotarse solo a torneos sin que nadie más pueda hacerlo en su
  // nombre. null hasta que el jugador se loguea por primera vez y lo elige.
  email?: string | null;
};

export function nombreVisible(j: { nombre: string; apodo: string | null }): string {
  return j.apodo?.trim() || j.nombre;
}
