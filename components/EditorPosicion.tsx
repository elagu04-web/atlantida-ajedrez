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
  casillasSospechosas,
  onAplicar,
  onCancelar,
}: {
  chess: Chess;
  casillasSospechosas?: string[] | null;
  onAplicar: (fen: string) => void;
  onCancelar: () => void;
}) {
  const sospechosas = new Set(casillasSospechosas ?? []);
  const [tablero, setTablero] = useState<CasillaTablero[][]>(() =>
    chess.board().map((fila) => [...fila])
  );
  const [turno, setTurno] = useState<Color>(chess.turn());
  const [seleccion, setSeleccion] = useState<{ type: PieceSymbol; color: Color } | "vaciar" | null>(
    null
  );
  const [piezaLevantada, setPiezaLevantada] = useState<{ fila: number; columna: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  function moverPieza(origen: { fila: number; columna: number }, destino: { fila: number; columna: number }) {
    if (origen.fila === destino.fila && origen.columna === destino.columna) return;
    setTablero((actual) => {
      const copia = actual.map((f) => [...f]);
      copia[destino.fila][destino.columna] = copia[origen.fila][origen.columna];
      copia[origen.fila][origen.columna] = null;
      return copia;
    });
  }

  function tocarCasilla(fila: number, columna: number) {
    // Paleta activa: coloca o vacía esa casilla, como antes.
    if (seleccion) {
      setTablero((actual) => {
        const copia = actual.map((f) => [...f]);
        copia[fila][columna] = seleccion === "vaciar" ? null : { ...seleccion };
        return copia;
      });
      setPiezaLevantada(null);
      return;
    }

    // Sin paleta: click en una pieza para levantarla, click en otra casilla
    // para moverla ahí (y click en la misma casilla para cancelar).
    if (piezaLevantada) {
      if (piezaLevantada.fila === fila && piezaLevantada.columna === columna) {
        setPiezaLevantada(null);
        return;
      }
      moverPieza(piezaLevantada, { fila, columna });
      setPiezaLevantada(null);
      return;
    }

    if (tablero[fila][columna]) {
      setPiezaLevantada({ fila, columna });
    }
  }

  function manejarSoltar(fila: number, columna: number, ev: React.DragEvent) {
    ev.preventDefault();
    const texto = ev.dataTransfer.getData("text/plain");
    if (!texto) return;
    const origen = JSON.parse(texto) as { fila: number; columna: number };
    moverPieza(origen, { fila, columna });
    setPiezaLevantada(null);
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
    <div className="flex flex-col gap-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
      <div>
        <h3 className="font-semibold text-amber-200">🛠 Corregir posición a mano</h3>
        <p className="mt-1 text-sm text-amber-300">
          Elegí una pieza de la paleta y tocá las casillas para armar la posición real del
          tablero. Esto reinicia la lista de jugadas desde acá (chess.js no permite insertar un
          cambio manual en el medio del historial).
        </p>
        {sospechosas.size > 0 && (
          <p className="mt-1 text-sm font-medium text-red-400">
            Casillas marcadas en rojo abajo: son las que no coinciden con lo que se esperaba —
            probablemente ahí está el problema.
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {PALETA.map((p, i) => (
          <button
            key={i}
            onClick={() => {
              setSeleccion(p);
              setPiezaLevantada(null);
            }}
            className={`flex h-10 w-10 items-center justify-center rounded border text-2xl ${
              seleccion !== "vaciar" &&
              seleccion?.type === p.type &&
              seleccion?.color === p.color
                ? "border-amber-600 bg-amber-500/30"
                : "border-white/20 bg-white/5 hover:bg-white/10"
            }`}
          >
            {PIEZA_UNICODE[`${p.color}${p.type}`]}
          </button>
        ))}
        <button
          onClick={() => {
            setSeleccion("vaciar");
            setPiezaLevantada(null);
          }}
          className={`flex h-10 w-16 items-center justify-center rounded border text-xs font-medium ${
            seleccion === "vaciar"
              ? "border-amber-600 bg-amber-500/30"
              : "border-white/20 bg-white/5 hover:bg-white/10"
          }`}
        >
          Vaciar
        </button>
        {seleccion && (
          <button
            onClick={() => setSeleccion(null)}
            className="flex h-10 items-center justify-center rounded border border-white/20 bg-white/5 px-3 text-xs font-medium hover:bg-white/10"
          >
            Soltar paleta
          </button>
        )}
      </div>
      <p className="text-xs text-amber-300">
        Sin paleta seleccionada: tocá una pieza para levantarla y tocá la casilla destino para
        moverla — o arrastrala directamente con el mouse.
      </p>

      <div className="mx-auto grid w-fit grid-cols-8 border border-white/30">
        {tablero.map((fila, i) =>
          fila.map((casilla, j) => {
            const oscura = (i + j) % 2 === 1;
            const levantada = piezaLevantada?.fila === i && piezaLevantada?.columna === j;
            const nombreCasilla = `${ARCHIVOS[j]}${8 - i}`;
            const sospechosa = sospechosas.has(nombreCasilla);
            return (
              <button
                key={`${i}-${j}`}
                onClick={() => tocarCasilla(i, j)}
                draggable={Boolean(casilla) && !seleccion}
                onDragStart={(ev) => {
                  ev.dataTransfer.setData("text/plain", JSON.stringify({ fila: i, columna: j }));
                  setPiezaLevantada({ fila: i, columna: j });
                }}
                onDragEnd={() => setPiezaLevantada(null)}
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={(ev) => manejarSoltar(i, j, ev)}
                className={`flex h-10 w-10 items-center justify-center text-2xl ${
                  levantada
                    ? "bg-amber-300 ring-2 ring-inset ring-amber-600"
                    : sospechosa
                    ? "bg-red-500/30 ring-2 ring-inset ring-red-500"
                    : oscura
                    ? "bg-white/20 hover:bg-amber-500/30"
                    : "bg-white/10 hover:bg-amber-500/20"
                }`}
                title={`${nombreCasilla}${sospechosa ? " — no coincide" : ""}`}
              >
                {casilla ? PIEZA_UNICODE[`${casilla.color}${casilla.type}`] : ""}
              </button>
            );
          })
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-amber-200">Le toca mover a:</span>
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

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={aplicar}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
        >
          Aplicar posición
        </button>
        <button
          onClick={onCancelar}
          className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
