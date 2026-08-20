"use client";

import { useRef, useState } from "react";
import { Chess } from "chess.js";
import { useAuth } from "@/context/AuthContext";
import { conectarPegasus } from "@/lib/pegasus";

const PIEZA_UNICODE: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};

export default function TransmitirPage() {
  const { session } = useAuth();
  const puedeUsar = Boolean(session);

  const chessRef = useRef(new Chess());
  const [log, setLog] = useState<string[]>([]);
  const [conectado, setConectado] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [tablero, setTablero] = useState(chessRef.current.board());
  const [jugadas, setJugadas] = useState<string[]>([]);

  function agregarLog(linea: string) {
    setLog((actual) => [...actual.slice(-49), linea]);
  }

  function actualizarDesdeChess() {
    setTablero(chessRef.current.board());
    setJugadas(chessRef.current.history());
  }

  async function handleConectar() {
    setConectando(true);
    try {
      await conectarPegasus({
        onLog: agregarLog,
        onIntentoDeMovimiento: (origen, destino) => {
          try {
            const mov = chessRef.current.move({ from: origen, to: destino, promotion: "q" });
            agregarLog(`♟ Jugada: ${mov.san} (${origen} → ${destino})`);
            actualizarDesdeChess();
          } catch {
            agregarLog(`⚠ No pude interpretar ${origen} → ${destino} como jugada válida.`);
          }
        },
      });
      setConectado(true);
    } catch (err) {
      agregarLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setConectando(false);
  }

  function handleReiniciar() {
    chessRef.current = new Chess();
    actualizarDesdeChess();
    agregarLog("Se reinició la partida (el tablero físico sigue conectado).");
  }

  if (!puedeUsar) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Transmitir (prueba)</h1>
        <p className="text-zinc-600">Iniciá sesión para probar la conexión con el tablero.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transmitir (prueba)</h1>
        <p className="mt-1 text-zinc-600">
          Página de prueba para conectar el tablero DGT Pegasus por Bluetooth. Funciona solo en
          Chrome o Edge de computadora, con el tablero prendido y cerca.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleConectar}
          disabled={conectando || conectado}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {conectado ? "Conectado" : conectando ? "Conectando..." : "Conectar tablero"}
        </button>
        <button
          onClick={handleReiniciar}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Reiniciar partida
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Tablero (según lo que se movió)</h2>
          <div className="mx-auto grid w-fit grid-cols-8 border border-zinc-400">
            {tablero.map((fila, i) =>
              fila.map((casilla, j) => {
                const oscura = (i + j) % 2 === 1;
                const pieza = casilla ? PIEZA_UNICODE[`${casilla.color}${casilla.type}`] : "";
                return (
                  <div
                    key={`${i}-${j}`}
                    className={`flex h-9 w-9 items-center justify-center text-2xl ${
                      oscura ? "bg-zinc-300" : "bg-zinc-50"
                    }`}
                  >
                    {pieza}
                  </div>
                );
              })
            )}
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Jugadas: {jugadas.length > 0 ? jugadas.join(", ") : "ninguna todavía"}
          </p>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Registro</h2>
          <div className="h-80 overflow-y-auto rounded bg-zinc-900 p-3 font-mono text-xs text-zinc-100">
            {log.length === 0 && <p className="text-zinc-500">Todavía no hay actividad.</p>}
            {log.map((linea, i) => (
              <div key={i}>{linea}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
