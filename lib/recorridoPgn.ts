import { Chess } from "chess.js";

export type RecorridoPgn = {
  posiciones: string[];
  jugadas: { texto: string; origen: string; destino: string }[];
  blancas: string;
  negras: string;
  resultado: string;
  pgn: string;
};

export function leerRecorridoPgn(pgn: string): RecorridoPgn {
  if (!pgn.trim() || pgn.length > 200_000) throw new Error("Elegí un PGN de hasta 200 KB.");
  const partida = new Chess();
  partida.loadPgn(pgn);
  const historial = partida.history({ verbose: true });
  if (!historial.length || historial.length > 600) throw new Error("El PGN debe incluir entre 1 y 600 medias jugadas.");
  const traduccion: Record<string, string> = { K: "R", Q: "D", R: "T", B: "A", N: "C" };
  const encabezados = partida.getHeaders();
  return {
    posiciones: [historial[0].before, ...historial.map(j => j.after)],
    jugadas: historial.map(j => ({
      texto: `${j.before.split(" ")[5]}${j.color === "w" ? "." : "…"} ${j.san.replace(/^[KQRBN]/, c => traduccion[c]).replace(/=([QRBN])/, (_, c: string) => `=${traduccion[c]}`)}`,
      origen: j.from, destino: j.to,
    })),
    blancas: encabezados.White || "Blancas", negras: encabezados.Black || "Negras",
    resultado: encabezados.Result || "*", pgn: partida.pgn(),
  };
}

// Esquema de la nota del club. Es material de estudio, no una partida atribuida a socios.
export const ESTUDIO_HIPOPOTAMO = leerRecorridoPgn("1. d4 g6 2. e4 Bg7 3. Nc3 d6 4. Nf3 e6 5. Be2 Ne7 6. O-O Nd7 7. Be3 b6 8. Qd2 Bb7 *");
