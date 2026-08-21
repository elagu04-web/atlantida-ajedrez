"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { conectarPegasus } from "@/lib/pegasus";
import { TableroMini } from "@/components/TableroMini";

export default function TransmitirPage() {
  const { session } = useAuth();
  const puedeUsar = Boolean(session);

  const chessRef = useRef(new Chess());
  const [log, setLog] = useState<string[]>([]);
  const [conectado, setConectado] = useState(false);
  const [conectando, setConectando] = useState(false);
  const [fen, setFen] = useState(chessRef.current.fen());
  const [jugadas, setJugadas] = useState<string[]>([]);

  const [transmisionId, setTransmisionId] = useState<string | null>(null);
  const [transmitiendo, setTransmitiendo] = useState(false);
  const transmitiendoRef = useRef(false);
  const [blancas, setBlancas] = useState("");
  const [negras, setNegras] = useState("");
  const blancasRef = useRef("");
  const negrasRef = useRef("");

  const pickupsRef = useRef(0);
  const origenRef = useRef("");
  const desincronizadoRef = useRef(false);
  const [ultimaPromocion, setUltimaPromocion] = useState<{ origen: string; destino: string } | null>(
    null
  );

  useEffect(() => {
    async function cargar() {
      const { data } = await supabase.from("transmision").select("*").limit(1).single();
      if (data) {
        setTransmisionId(data.id);
        setTransmitiendo(data.activa);
        transmitiendoRef.current = data.activa;
        setBlancas(data.blancas ?? "");
        setNegras(data.negras ?? "");
        blancasRef.current = data.blancas ?? "";
        negrasRef.current = data.negras ?? "";
      }
    }
    cargar();
  }, []);

  function cambiarBlancas(valor: string) {
    setBlancas(valor);
    blancasRef.current = valor;
  }

  function cambiarNegras(valor: string) {
    setNegras(valor);
    negrasRef.current = valor;
  }

  function agregarLog(linea: string) {
    setLog((actual) => [...actual.slice(-49), linea]);
  }

  function actualizarDesdeChess() {
    setFen(chessRef.current.fen());
    setJugadas(chessRef.current.history());
  }

  async function publicarEstado(activa: boolean) {
    if (!transmisionId) return;
    await supabase
      .from("transmision")
      .update({
        activa,
        fen: chessRef.current.fen(),
        jugadas: chessRef.current.history(),
        blancas: blancasRef.current.trim() || null,
        negras: negrasRef.current.trim() || null,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", transmisionId);
  }

  function manejarLevantada(casilla: string) {
    agregarLog(`↑ se levantó una pieza de ${casilla}`);
    // Si la pieza que estaba en esa casilla es del jugador que le toca mover,
    // es el origen real de la jugada. Si es del rival (o la casilla ya
    // figuraba vacía en nuestro modelo), es una pieza capturada saliendo del
    // tablero: no cuenta para el seguimiento del movimiento.
    const pieza = chessRef.current.get(casilla as any);
    if (pieza && pieza.color === chessRef.current.turn()) {
      pickupsRef.current++;
      origenRef.current = casilla;
    }
  }

  function manejarApoyada(casilla: string) {
    agregarLog(`↓ se apoyó una pieza en ${casilla}`);
    if (pickupsRef.current > 0) pickupsRef.current--;
    if (pickupsRef.current === 0 && origenRef.current !== "") {
      const origen = origenRef.current;
      origenRef.current = "";
      try {
        const mov = chessRef.current.move({ from: origen, to: casilla, promotion: "q" });
        agregarLog(`♟ Jugada: ${mov.san} (${origen} → ${casilla})`);
        actualizarDesdeChess();
        if (transmitiendoRef.current) publicarEstado(true);
        if (mov.promotion) {
          setUltimaPromocion({ origen, destino: casilla });
          agregarLog("👑 Coronó a Dama por defecto — corregí abajo si en realidad fue otra pieza.");
        } else {
          setUltimaPromocion(null);
        }
      } catch {
        agregarLog(`⚠ No pude interpretar ${origen} → ${casilla} como jugada válida.`);
      }
    }
  }

  function manejarVolcado(ocupado: boolean[]) {
    // Solo comparamos cuando no hay ninguna pieza en el aire — mientras se
    // está haciendo una jugada, el tablero real y el modelo van a diferir
    // momentáneamente y eso es normal.
    if (pickupsRef.current !== 0) return;
    const tablero = chessRef.current.board();
    let coincide = true;
    for (let i = 0; i < 64 && coincide; i++) {
      const fila = Math.floor(i / 8);
      const columna = i - fila * 8;
      const hayPiezaEnModelo = Boolean(tablero[fila][columna]);
      if (ocupado[i] !== hayPiezaEnModelo) coincide = false;
    }
    if (!coincide && !desincronizadoRef.current) {
      desincronizadoRef.current = true;
      agregarLog(
        "⚠ El tablero físico no coincide con la partida registrada — puede haber una jugada perdida (Bluetooth). Si hace falta, corregí a mano o reiniciá la partida."
      );
    }
    if (coincide) desincronizadoRef.current = false;
  }

  const NOMBRE_PIEZA: Record<string, string> = { q: "Dama", r: "Torre", b: "Alfil", n: "Caballo" };

  function corregirPromocion(piezaCorrecta: "r" | "b" | "n") {
    if (!ultimaPromocion) return;
    chessRef.current.undo();
    const mov = chessRef.current.move({
      from: ultimaPromocion.origen,
      to: ultimaPromocion.destino,
      promotion: piezaCorrecta,
    });
    agregarLog(`✏️ Corregido: coronó a ${NOMBRE_PIEZA[piezaCorrecta]} (${mov.san}).`);
    actualizarDesdeChess();
    if (transmitiendoRef.current) publicarEstado(true);
    setUltimaPromocion(null);
  }

  async function handleConectar() {
    setConectando(true);
    try {
      await conectarPegasus({
        onLog: agregarLog,
        onPiezaLevantada: manejarLevantada,
        onPiezaApoyada: manejarApoyada,
        onVolcadoTablero: manejarVolcado,
      });
      setConectado(true);
    } catch (err) {
      agregarLog(`❌ Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setConectando(false);
  }

  function handleReiniciar() {
    setUltimaPromocion(null);
    pickupsRef.current = 0;
    desincronizadoRef.current = false;
    origenRef.current = "";
    chessRef.current = new Chess();
    actualizarDesdeChess();
    agregarLog("Se reinició la partida (el tablero físico sigue conectado).");
    if (transmitiendoRef.current) publicarEstado(true);
  }

  async function handleIniciarTransmision() {
    transmitiendoRef.current = true;
    setTransmitiendo(true);
    await publicarEstado(true);
    agregarLog("🔴 Transmisión iniciada — ya se puede ver en /transmision.");
  }

  async function handleTerminarTransmision() {
    transmitiendoRef.current = false;
    setTransmitiendo(false);
    await publicarEstado(false);
    agregarLog("Transmisión terminada.");
  }

  if (!puedeUsar) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Transmitir</h1>
        <p className="text-zinc-600">Iniciá sesión para transmitir una partida.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transmitir</h1>
        <p className="mt-1 text-zinc-600">
          Conectá el tablero DGT Pegasus por Bluetooth (Chrome o Edge de computadora, tablero
          prendido y cerca) y transmitilo en vivo en /transmision.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Blancas</label>
          <input
            type="text"
            value={blancas}
            onChange={(e) => cambiarBlancas(e.target.value)}
            placeholder="Nombre jugador blancas"
            className="w-48 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-zinc-600">Negras</label>
          <input
            type="text"
            value={negras}
            onChange={(e) => cambiarNegras(e.target.value)}
            placeholder="Nombre jugador negras"
            className="w-48 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        {!transmitiendo ? (
          <button
            onClick={handleIniciarTransmision}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            🔴 Iniciar transmisión
          </button>
        ) : (
          <button
            onClick={handleTerminarTransmision}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Terminar transmisión
          </button>
        )}
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

      {ultimaPromocion && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            👑 Se registró como coronación a <strong>Dama</strong>. Si en la mesa fue otra pieza,
            corregilo acá:
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => corregirPromocion("r")}
              className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100"
            >
              Torre
            </button>
            <button
              onClick={() => corregirPromocion("b")}
              className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100"
            >
              Alfil
            </button>
            <button
              onClick={() => corregirPromocion("n")}
              className="rounded-md border border-amber-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-amber-100"
            >
              Caballo
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Tablero (según lo que se movió)</h2>
          <TableroMini fen={fen} />
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
