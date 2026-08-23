"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { MotorAjedrez, type AnalisisPosicion } from "@/lib/stockfish";
import {
  obtenerPartidasLichess,
  analizarPartida,
  type PartidaLichess,
  type ResultadoAnalisis,
  type JugadaAnalizada,
} from "@/lib/analisisPartidas";

function claseSeveridad(perdida: number): string {
  if (perdida >= 300) return "bg-red-100 text-red-800";
  if (perdida >= 100) return "bg-orange-100 text-orange-800";
  if (perdida >= 50) return "bg-amber-100 text-amber-800";
  return "";
}

function etiquetaSeveridad(perdida: number): string | null {
  if (perdida >= 300) return "Error grave";
  if (perdida >= 100) return "Error";
  if (perdida >= 50) return "Imprecisión";
  return null;
}

export default function EntrenamientoPage() {
  const { session } = useAuth();
  const [usuario, setUsuario] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [partidas, setPartidas] = useState<PartidaLichess[]>([]);

  const [analizando, setAnalizando] = useState(false);
  const [progreso, setProgreso] = useState<{ hechas: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);
  const [errorAnalisis, setErrorAnalisis] = useState<string | null>(null);

  const motorRef = useRef<MotorAjedrez | null>(null);
  const ultimaEvalRef = useRef<AnalisisPosicion>({
    evaluacionCentipawns: null,
    mateEn: null,
    mejorJugada: null,
    profundidad: 0,
  });

  useEffect(() => {
    return () => {
      motorRef.current?.destruir();
      motorRef.current = null;
    };
  }, []);

  if (!session) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
        <p className="text-zinc-500">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario.trim()) return;
    setBuscando(true);
    setErrorBusqueda(null);
    setResultado(null);
    setPartidas([]);
    try {
      const lista = await obtenerPartidasLichess(usuario, 10);
      setPartidas(lista);
      if (lista.length === 0) {
        setErrorBusqueda("Ese usuario no tiene partidas recientes en Lichess.");
      }
    } catch (err) {
      setErrorBusqueda(err instanceof Error ? err.message : "Error buscando las partidas.");
    }
    setBuscando(false);
  }

  async function handleAnalizar(partida: PartidaLichess) {
    setAnalizando(true);
    setErrorAnalisis(null);
    setResultado(null);
    setProgreso(null);
    try {
      if (!motorRef.current) {
        motorRef.current = new MotorAjedrez((a) => {
          ultimaEvalRef.current = a;
        });
      }
      const res = await analizarPartida(
        partida.pgn,
        motorRef.current,
        (hechas, total) => setProgreso({ hechas, total }),
        () => ultimaEvalRef.current
      );
      setResultado(res);
    } catch (err) {
      setErrorAnalisis(err instanceof Error ? err.message : "Error analizando la partida.");
    }
    setAnalizando(false);
    setProgreso(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Entrenamiento</h1>
        <p className="mt-1 text-zinc-600">
          Traé las últimas partidas de un jugador en Lichess y analizalas con el motor para
          encontrar sus errores más grandes — herramienta solo para vos, no la ven los alumnos.
        </p>
      </div>

      <form onSubmit={handleBuscar} className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="usuario" className="text-xs font-medium text-zinc-600">
            Usuario de Lichess
          </label>
          <input
            id="usuario"
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder="Ej: DrNykterstein"
            className="w-56 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={buscando || !usuario.trim()}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {buscando ? "Buscando..." : "Buscar partidas"}
        </button>
      </form>

      {errorBusqueda && <p className="text-sm text-red-600">{errorBusqueda}</p>}

      {partidas.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold">Últimas partidas</h2>
          {partidas.map((p, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 py-2 text-sm last:border-0"
            >
              <span>
                <span className="font-medium">{p.blancas}</span> vs{" "}
                <span className="font-medium">{p.negras}</span>{" "}
                <span className="font-mono text-xs text-zinc-500">{p.resultado}</span>
                {p.fecha && <span className="ml-2 text-xs text-zinc-500">{p.fecha}</span>}
              </span>
              <button
                onClick={() => handleAnalizar(p)}
                disabled={analizando}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Analizar esta partida
              </button>
            </div>
          ))}
        </div>
      )}

      {analizando && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
          Analizando con el motor
          {progreso ? ` — jugada ${progreso.hechas} de ${progreso.total}...` : "..."}
        </div>
      )}

      {errorAnalisis && <p className="text-sm text-red-600">{errorAnalisis}</p>}

      {resultado && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {resultado.peorJugadaBlancas && resultado.peorJugadaBlancas.perdidaCentipeones > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="text-xs font-medium text-zinc-500">Peor jugada de blancas</div>
                <div className="mt-1 text-lg font-semibold">
                  {resultado.peorJugadaBlancas.numero}. {resultado.peorJugadaBlancas.san}
                </div>
                <div className="text-sm text-red-600">
                  -{resultado.peorJugadaBlancas.perdidaCentipeones} centipeones
                </div>
              </div>
            )}
            {resultado.peorJugadaNegras && resultado.peorJugadaNegras.perdidaCentipeones > 0 && (
              <div className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="text-xs font-medium text-zinc-500">Peor jugada de negras</div>
                <div className="mt-1 text-lg font-semibold">
                  {resultado.peorJugadaNegras.numero}...{resultado.peorJugadaNegras.san}
                </div>
                <div className="text-sm text-red-600">
                  -{resultado.peorJugadaNegras.perdidaCentipeones} centipeones
                </div>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <h2 className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 font-semibold">
              Jugada por jugada
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 p-4 text-sm sm:grid-cols-3 md:grid-cols-4">
              {agruparPorJugada(resultado.jugadas).map((par, i) => (
                <div key={i} className="flex items-center gap-1 font-mono text-xs">
                  <span className="text-zinc-400">{i + 1}.</span>
                  {par.map((j, k) => (
                    <span
                      key={k}
                      title={etiquetaSeveridad(j.perdidaCentipeones) ?? undefined}
                      className={`rounded px-1 ${claseSeveridad(j.perdidaCentipeones)}`}
                    >
                      {j.san}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex gap-4 border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500">
              <span className="rounded bg-amber-100 px-1 text-amber-800">Imprecisión</span>
              <span className="rounded bg-orange-100 px-1 text-orange-800">Error</span>
              <span className="rounded bg-red-100 px-1 text-red-800">Error grave</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function agruparPorJugada(jugadas: JugadaAnalizada[]): JugadaAnalizada[][] {
  const pares: JugadaAnalizada[][] = [];
  for (const j of jugadas) {
    if (j.color === "w") pares.push([j]);
    else if (pares.length > 0) pares[pares.length - 1].push(j);
    else pares.push([j]);
  }
  return pares;
}
