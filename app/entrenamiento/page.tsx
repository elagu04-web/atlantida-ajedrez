"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MotorAjedrez, type AnalisisPosicion } from "@/lib/stockfish";
import { TableroMini } from "@/components/TableroMini";
import {
  obtenerPartidasLichess,
  obtenerPartidasChessCom,
  analizarPartida,
  analizarPatrones,
  type PartidaExterna,
  type FuentePartida,
  type ResultadoAnalisis,
  type JugadaAnalizada,
  type AnalisisPatrones,
  type FaseJuego,
  type PatronRecurrente,
} from "@/lib/analisisPartidas";

const ETIQUETA_FUENTE: Record<FuentePartida, string> = { lichess: "Lichess", chesscom: "Chess.com" };

const ETIQUETA_FASE: Record<FaseJuego, string> = {
  apertura: "Apertura",
  "medio juego": "Medio juego",
  final: "Final",
};

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

function DetalleJugada({ jugada }: { jugada: JugadaAnalizada }) {
  return (
    <>
      {jugada.llevaAMate && (
        <div className="text-sm text-red-700">☠ Esta jugada lleva a un jaque mate forzado</div>
      )}
      {jugada.varianteSan && (
        <div className="text-sm text-zinc-600">
          Mejor era: <span className="font-mono font-medium">{jugada.varianteSan.join(" ")}</span>
        </div>
      )}
      {jugada.piezaColgada && (
        <div className="text-sm text-red-600">
          ⚠ Quedó {jugada.piezaColgada.nombrePieza} colgada en {jugada.piezaColgada.casilla}
        </div>
      )}
    </>
  );
}

function BarraPatron({ patron }: { patron: PatronRecurrente }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-56 shrink-0 truncate">{patron.etiqueta}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{ width: `${Math.max(patron.porcentaje, 4)}%` }}
        />
      </div>
      <span className="w-20 shrink-0 text-right text-xs text-zinc-500">
        {patron.cantidad} ({patron.porcentaje}%)
      </span>
    </div>
  );
}

export default function EntrenamientoPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Cargando...</p>}>
      <EntrenamientoContenido />
    </Suspense>
  );
}

function EntrenamientoContenido() {
  const { session } = useAuth();
  const parametros = useSearchParams();
  const [usuario, setUsuario] = useState(() => parametros.get("usuario") ?? "");
  const [fuente, setFuente] = useState<FuentePartida>("lichess");
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [partidas, setPartidas] = useState<PartidaExterna[]>([]);

  const [analizando, setAnalizando] = useState(false);
  const [progreso, setProgreso] = useState<{ hechas: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<ResultadoAnalisis | null>(null);
  const [errorAnalisis, setErrorAnalisis] = useState<string | null>(null);

  const [analizandoPatrones, setAnalizandoPatrones] = useState(false);
  const [progresoPatrones, setProgresoPatrones] = useState<{
    partida: number;
    totalPartidas: number;
    jugada: number;
    totalJugadas: number;
  } | null>(null);
  const [patrones, setPatrones] = useState<AnalisisPatrones | null>(null);
  const [errorPatrones, setErrorPatrones] = useState<string | null>(null);

  const motorRef = useRef<MotorAjedrez | null>(null);
  const ultimaEvalRef = useRef<AnalisisPosicion>({
    evaluacionCentipawns: null,
    mateEn: null,
    mejorJugada: null,
    variantePrincipal: null,
    profundidad: 0,
  });

  useEffect(() => {
    return () => {
      motorRef.current?.destruir();
      motorRef.current = null;
    };
  }, []);

  useEffect(() => {
    const usuarioUrl = parametros.get("usuario");
    if (usuarioUrl) buscarPartidas(usuarioUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!session) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
        <p className="text-zinc-500">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  async function buscarPartidas(usuarioBuscado: string) {
    if (!usuarioBuscado.trim()) return;
    setBuscando(true);
    setErrorBusqueda(null);
    setResultado(null);
    setPartidas([]);
    try {
      const lista =
        fuente === "lichess"
          ? await obtenerPartidasLichess(usuarioBuscado, 10)
          : await obtenerPartidasChessCom(usuarioBuscado, 10);
      setPartidas(lista);
      if (lista.length === 0) {
        setErrorBusqueda(`Ese usuario no tiene partidas recientes en ${ETIQUETA_FUENTE[fuente]}.`);
      }
    } catch (err) {
      setErrorBusqueda(err instanceof Error ? err.message : "Error buscando las partidas.");
    }
    setBuscando(false);
  }

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    buscarPartidas(usuario);
  }

  async function handleAnalizar(partida: PartidaExterna) {
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

  async function handleAnalizarPatrones() {
    if (partidas.length === 0) return;
    setAnalizandoPatrones(true);
    setErrorPatrones(null);
    setPatrones(null);
    setProgresoPatrones(null);
    try {
      if (!motorRef.current) {
        motorRef.current = new MotorAjedrez((a) => {
          ultimaEvalRef.current = a;
        });
      }
      const res = await analizarPatrones(
        partidas,
        usuario,
        motorRef.current,
        (partida, totalPartidas, jugada, totalJugadas) =>
          setProgresoPatrones({ partida, totalPartidas, jugada, totalJugadas }),
        () => ultimaEvalRef.current
      );
      setPatrones(res);
    } catch (err) {
      setErrorPatrones(err instanceof Error ? err.message : "Error analizando los patrones.");
    }
    setAnalizandoPatrones(false);
    setProgresoPatrones(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Entrenamiento</h1>
        <p className="mt-1 text-zinc-600">
          Traé las últimas partidas de un jugador en Lichess o Chess.com y analizalas con el motor
          para encontrar sus errores más grandes — herramienta solo para vos, no la ven los alumnos.
        </p>
      </div>

      <form onSubmit={handleBuscar} className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Plataforma</span>
          <div className="flex gap-3 py-2">
            {(Object.keys(ETIQUETA_FUENTE) as FuentePartida[]).map((f) => (
              <label key={f} className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name="fuente"
                  checked={fuente === f}
                  onChange={() => setFuente(f)}
                />
                {ETIQUETA_FUENTE[f]}
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="usuario" className="text-xs font-medium text-zinc-600">
            Usuario de {ETIQUETA_FUENTE[fuente]}
          </label>
          <input
            id="usuario"
            type="text"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            placeholder={fuente === "lichess" ? "Ej: DrNykterstein" : "Ej: Hikaru"}
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Últimas partidas</h2>
            <button
              onClick={handleAnalizarPatrones}
              disabled={analizandoPatrones || analizando}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              📊 Analizar patrones de las {partidas.length} partidas
            </button>
          </div>
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
                <span className="ml-2 text-xs text-zinc-500">· {p.apertura}</span>
                <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-500">
                  {ETIQUETA_FUENTE[p.fuente]}
                </span>
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
                <DetalleJugada jugada={resultado.peorJugadaBlancas} />
                <div className="mt-2 max-w-[220px]">
                  <TableroMini fen={resultado.peorJugadaBlancas.fenAntes} />
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
                <DetalleJugada jugada={resultado.peorJugadaNegras} />
                <div className="mt-2 max-w-[220px]">
                  <TableroMini fen={resultado.peorJugadaNegras.fenAntes} />
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
                  {par.map((j, k) => {
                    const etiqueta = etiquetaSeveridad(j.perdidaCentipeones);
                    const titulo = etiqueta
                      ? `${etiqueta} (-${j.perdidaCentipeones})${j.llevaAMate ? " — lleva a mate forzado" : ""}${
                          j.varianteSan ? ` — mejor era ${j.varianteSan.join(" ")}` : ""
                        }${j.piezaColgada ? ` — quedó ${j.piezaColgada.nombrePieza} colgada en ${j.piezaColgada.casilla}` : ""}`
                      : undefined;
                    return (
                      <span
                        key={k}
                        title={titulo}
                        className={`rounded px-1 ${claseSeveridad(j.perdidaCentipeones)}`}
                      >
                        {j.san}
                      </span>
                    );
                  })}
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

      {analizandoPatrones && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          Analizando patrones
          {progresoPatrones
            ? ` — partida ${progresoPatrones.partida} de ${progresoPatrones.totalPartidas} (jugada ${progresoPatrones.jugada} de ${progresoPatrones.totalJugadas})...`
            : "..."}{" "}
          Esto puede tardar varios minutos.
        </div>
      )}

      {errorPatrones && <p className="text-sm text-red-600">{errorPatrones}</p>}

      {patrones && (
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h2 className="font-semibold text-blue-900">
              Patrones de {usuario} en {patrones.partidas.length} partidas
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div>
                <div className="text-xs text-blue-700">Pérdida promedio por jugada</div>
                <div className="text-lg font-semibold text-blue-900">{patrones.perdidaPromedioGeneral} cp</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Errores graves</div>
                <div className="text-lg font-semibold text-red-700">{patrones.totalErroresGraves}</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Errores</div>
                <div className="text-lg font-semibold text-orange-700">{patrones.totalErrores}</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Imprecisiones</div>
                <div className="text-lg font-semibold text-amber-700">{patrones.totalImprecisiones}</div>
              </div>
              <div>
                <div className="text-xs text-blue-700">Piezas colgadas</div>
                <div className="text-lg font-semibold text-red-700">{patrones.totalPiezasColgadas}</div>
              </div>
            </div>
            {patrones.faseMasDebil && (
              <p className="mt-4 text-sm text-blue-900">
                💡 Donde más pierde en promedio es en <strong>{ETIQUETA_FASE[patrones.faseMasDebil]}</strong> — buen
                punto de partida para la próxima clase.
              </p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {(Object.keys(patrones.perdidaPorFase) as FaseJuego[]).map((fase) => {
                const datos = patrones.perdidaPorFase[fase];
                const promedio = datos.cantidad > 0 ? Math.round(datos.total / datos.cantidad) : 0;
                return (
                  <div key={fase} className="rounded-md bg-white p-2 text-center">
                    <div className="text-zinc-500">{ETIQUETA_FASE[fase]}</div>
                    <div className="font-semibold">{datos.cantidad > 0 ? `${promedio} cp` : "—"}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {patrones.patronesRecurrentes.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-5">
              <h2 className="font-semibold">Patrones recurrentes</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Qué se repite entre todas las jugadas marcadas como error, de más a menos frecuente.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {patrones.patronesRecurrentes.map((p) => (
                  <BarraPatron key={p.etiqueta} patron={p} />
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                  <th className="px-4 py-2 font-medium">Rival</th>
                  <th className="px-4 py-2 font-medium">Apertura</th>
                  <th className="px-4 py-2 font-medium">Color</th>
                  <th className="px-4 py-2 font-medium">Resultado</th>
                  <th className="px-4 py-2 font-medium">Pérdida promedio</th>
                  <th className="px-4 py-2 font-medium">Peor jugada</th>
                </tr>
              </thead>
              <tbody>
                {patrones.partidas.map((p, i) => (
                  <tr key={i} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2 text-zinc-500">{p.fecha}</td>
                    <td className="px-4 py-2">{p.rival}</td>
                    <td className="px-4 py-2 text-xs text-zinc-500">{p.apertura}</td>
                    <td className="px-4 py-2">{p.color === "w" ? "Blancas" : "Negras"}</td>
                    <td className="px-4 py-2 font-mono text-xs">{p.resultado}</td>
                    <td className="px-4 py-2 font-mono">{p.perdidaPromedio} cp</td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {p.peorJugada
                        ? `${p.peorJugada.numero}. ${p.peorJugada.san} (-${p.peorJugada.perdidaCentipeones})`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {patrones.aperturas.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <h2 className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 font-semibold">
                Rendimiento por apertura
              </h2>
              <table className="w-full text-sm">
                <thead className="border-b border-zinc-200 text-left text-zinc-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Apertura</th>
                    <th className="px-4 py-2 font-medium">Partidas</th>
                    <th className="px-4 py-2 font-medium">V</th>
                    <th className="px-4 py-2 font-medium">E</th>
                    <th className="px-4 py-2 font-medium">D</th>
                    <th className="px-4 py-2 font-medium">Pérdida promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {patrones.aperturas.map((a, i) => (
                    <tr key={i} className="border-b border-zinc-100 last:border-0">
                      <td className="px-4 py-2">{a.apertura}</td>
                      <td className="px-4 py-2 text-center">{a.partidas}</td>
                      <td className="px-4 py-2 text-center text-green-700">{a.victorias}</td>
                      <td className="px-4 py-2 text-center text-zinc-500">{a.empates}</td>
                      <td className="px-4 py-2 text-center text-red-700">{a.derrotas}</td>
                      <td className="px-4 py-2 font-mono">{a.perdidaPromedio} cp</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
