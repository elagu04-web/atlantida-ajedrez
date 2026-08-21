"use client";

import { useState } from "react";
import { Chess, type PieceSymbol, type Color } from "chess.js";
import { PIEZA_UNICODE } from "./TableroMini";

type CasillaTablero = { type: PieceSymbol; color: Color } | null;

const ARCHIVOS = "abcdefgh";
const PALETA: { type: PieceSymbol; color: Color }[] = [
  { type: "k", color: "w" }, { type: "q", color: "w" }, { type: "r", color: "w" },
  { type: "b", color: "w" }, { type: "n", color: "w" }, { type: "p", color: "w" },
  { type: "k", color: "b" }, { type: "q", color: "b" }, { type: "r", color: "b" },
  { type: "b", color: "b" }, { type: "n", color: "b" }, { type: "p", color: "b" },
];

function construirFen(tablero: CasillaTablero[][], turno: Color): string {
  const filas = tablero.map((fila) => {
    let cadena = "";
    let vacias = 0;
    for (const casilla of fila) {
      if (!casilla) {
        vacias++;
        continue;
      }
      if (vacias > 0) {
        cadena += vacias;
        vacias = 0;
      }
      cadena += casilla.color === "w" ? casilla.type.toUpperCase() : casilla.type;
    }
    if (vacias > 0) cadena += vacias;
    return cadena;
  });
  return `${filas.join("/")} ${turno} - - 0 1`;
}

export function EditorPosicion({
  chess,
  onAplicar,
  onCancelar,
}: {
  chess: Chess;
  onAplicar: (fen: string) => void;
  onCancelar: () => void;
}) {
  const [tablero, setTablero] = useState<CasillaTablero[][]>(() =>
    chess.board().map((fila) => [...fila])
  );
  const [turno, setTurno] = useState<Color>(chess.turn());
  const [seleccion, setSeleccion] = useState<{ type: PieceSymbol; color: Color } | "vaciar" | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  function tocarCasilla(fila: number, columna: number) {
    if (!seleccion) return;
    setTablero((actual) => {
      const copia = actual.map((f) => [...f]);
      copia[fila][columna] = seleccion === "vaciar" ? null : { ...seleccion };
      return copia;
    });
  }

  function aplicar() {
    const fen = construirFen(tablero, turno);
    try {
      new Chess(fen); // valida la posición (reyes presentes, etc.) antes de aplicarla
      onAplicar(fen);
      setError(null);
    } catch {
      setError("Esa posición no es válida (por ejemplo, puede faltar un rey). Revisá el tablero.");
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
      <div>
        <h3 className="font-semibold text-amber-900">🛠 Corregir posición a mano</h3>
        <p className="mt-1 text-sm text-amber-800">
          Elegí una pieza de la paleta y tocá las casillas para armar la posición real del
          tablero. Esto reinicia la lista de jugadas desde acá (chess.js no permite insertar un
          cambio manual en el medio del historial).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PALETA.map((p, i) => (
          <button
            key={i}
            onClick={() => setSeleccion(p)}
            className={`flex h-10 w-10 items-center justify-center rounded border text-2xl ${
              seleccion !== "vaciar" &&
              seleccion?.type === p.type &&
              seleccion?.color === p.color
                ? "border-amber-600 bg-amber-200"
                : "border-zinc-300 bg-white hover:bg-zinc-50"
            }`}
          >
            {PIEZA_UNICODE[`${p.color}${p.type}`]}
          </button>
        ))}
        <button
          onClick={() => setSeleccion("vaciar")}
          className={`flex h-10 w-16 items-center justify-center rounded border text-xs font-medium ${
            seleccion === "vaciar"
              ? "border-amber-600 bg-amber-200"
              : "border-zinc-300 bg-white hover:bg-zinc-50"
          }`}
        >
          Vaciar
        </button>
      </div>

      <div className="mx-auto grid w-fit grid-cols-8 border border-zinc-400">
        {tablero.map((fila, i) =>
          fila.map((casilla, j) => {
            const oscura = (i + j) % 2 === 1;
            return (
              <button
                key={`${i}-${j}`}
                onClick={() => tocarCasilla(i, j)}
                className={`flex h-10 w-10 items-center justify-center text-2xl ${
                  oscura ? "bg-zinc-300 hover:bg-amber-200" : "bg-zinc-50 hover:bg-amber-100"
                }`}
                title={`${ARCHIVOS[j]}${8 - i}`}
              >
                {casilla ? PIEZA_UNICODE[`${casilla.color}${casilla.type}`] : ""}
              </button>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-amber-900">Le toca mover a:</span>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            checked={turno === "w"}
            onChange={() => setTurno("w")}
          />
          Blancas
        </label>
        <label className="flex items-center gap-1 text-sm">
          <input
            type="radio"
            checked={turno === "b"}
            onChange={() => setTurno("b")}
          />
          Negras
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={aplicar}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Aplicar posición
        </button>
        <button
          onClick={onCancelar}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
