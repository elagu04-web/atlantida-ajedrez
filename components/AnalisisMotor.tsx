"use client";

import { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import { MotorAjedrez, type AnalisisPosicion } from "@/lib/stockfish";

function notacionLegible(fen: string, uci: string | null): string | null {
  if (!uci) return null;
  try {
    const prueba = new Chess(fen);
    const mov = prueba.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci.length > 4 ? uci[4] : undefined,
    });
    return mov?.san ?? null;
  } catch {
    return null;
  }
}

export function AnalisisMotor({ fen }: { fen: string }) {
  const [activo, setActivo] = useState(false);
  const [cargandoMotor, setCargandoMotor] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [analisis, setAnalisis] = useState<AnalisisPosicion | null>(null);
  const motorRef = useRef<MotorAjedrez | null>(null);

  useEffect(() => {
    if (!activo) return;
    setCargandoMotor(true);
    let cancelado = false;
    const motor = new MotorAjedrez((a) => {
      setAnalisis(a);
      setCargando(false);
    });
    motorRef.current = motor;
    motor.listo.then(() => {
      if (!cancelado) setCargandoMotor(false);
    });
    return () => {
      cancelado = true;
      motor.destruir();
      motorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  useEffect(() => {
    if (!activo || !motorRef.current) return;
    const turno = fen.split(" ")[1] === "b" ? "b" : "w";
    setCargando(true);
    // Movetime corto: en la transmisión pública priorizamos que responda
    // rápido a cada jugada nueva por sobre la profundidad del análisis.
    motorRef.current.analizar(fen, turno, 400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, fen]);

  if (!activo) {
    return (
      <button
        onClick={() => setActivo(true)}
        className="text-xs font-medium text-blue-600 hover:underline"
      >
        🔍 Mostrar análisis (motor de ajedrez)
      </button>
    );
  }

  const cp = analisis?.evaluacionCentipawns ?? null;
  const mate = analisis?.mateEn ?? null;
  // Convertimos el puntaje a un porcentaje de la barra para blancas (50% = parejo).
  let porcentajeBlancas = 50;
  if (mate !== null) {
    porcentajeBlancas = mate > 0 ? 97 : 3;
  } else if (cp !== null) {
    porcentajeBlancas = 50 + Math.max(-45, Math.min(45, cp / 20));
  }
  const etiqueta =
    mate !== null
      ? `Mate en ${Math.abs(mate)}`
      : cp !== null
      ? `${cp > 0 ? "+" : ""}${(cp / 100).toFixed(1)}`
      : "...";
  const jugadaSugerida = analisis ? notacionLegible(fen, analisis.mejorJugada) : null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs">
      <div className="h-4 w-32 overflow-hidden rounded-sm border border-zinc-300 bg-zinc-900">
        <div
          className="h-full bg-zinc-50 transition-all"
          style={{ width: `${porcentajeBlancas}%` }}
        />
      </div>
      <span className="font-mono font-semibold text-zinc-700">{etiqueta}</span>
      {cargandoMotor && <span className="text-zinc-400">cargando motor (puede tardar unos segundos)...</span>}
      {!cargandoMotor && cargando && <span className="text-zinc-400">pensando...</span>}
      {jugadaSugerida && (
        <span className="text-zinc-500">
          Sugiere: <span className="font-medium text-zinc-700">{jugadaSugerida}</span>
        </span>
      )}
      <button
        onClick={() => {
          setActivo(false);
          setAnalisis(null);
        }}
        className="ml-auto text-zinc-400 hover:text-zinc-600"
      >
        Ocultar
      </button>
    </div>
  );
}
