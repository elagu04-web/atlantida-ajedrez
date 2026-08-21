"use client";

import { Chess } from "chess.js";

export const PIEZA_UNICODE: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

export function TableroMini({ fen }: { fen: string }) {
  const tablero = new Chess(fen === "start" ? undefined : fen).board();
  return (
    <div className="mx-auto grid w-fit grid-cols-8 border border-zinc-400">
      {tablero.map((fila, i) =>
        fila.map((casilla, j) => {
          const oscura = (i + j) % 2 === 1;
          const pieza = casilla ? PIEZA_UNICODE[`${casilla.color}${casilla.type}`] : "";
          return (
            <div
              key={`${i}-${j}`}
              className={`flex h-9 w-9 items-center justify-center text-2xl sm:h-12 sm:w-12 sm:text-3xl ${
                oscura ? "bg-zinc-300" : "bg-zinc-50"
              }`}
            >
              {pieza}
            </div>
          );
        })
      )}
    </div>
  );
}
