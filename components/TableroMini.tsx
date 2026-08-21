"use client";

import { Chessboard } from "react-chessboard";

export const PIEZA_UNICODE: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

export function TableroMini({ fen }: { fen: string }) {
  return (
    <div className="mx-auto w-full max-w-[420px] overflow-hidden rounded-md shadow-md">
      <Chessboard
        options={{
          position: fen === "start" ? undefined : fen,
          allowDragging: false,
          showNotation: true,
          animationDurationInMs: 200,
          lightSquareStyle: { backgroundColor: "#eeeed2" },
          darkSquareStyle: { backgroundColor: "#769656" },
          alphaNotationStyle: { color: "rgba(0,0,0,0.55)" },
          numericNotationStyle: { color: "rgba(0,0,0,0.55)" },
        }}
      />
    </div>
  );
}
