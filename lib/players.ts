export type Resultado = "victoria" | "empate" | "derrota";
export type Color = "blancas" | "negras";

export type Partida = {
  rival: string;
  color: Color;
  resultado: Resultado;
  fecha: string;
  torneo: string;
};

export type Jugador = {
  id: string;
  nombre: string;
  eloAtlantida: number;
  partidas: Partida[];
};
