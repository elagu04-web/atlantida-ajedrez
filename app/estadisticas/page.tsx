"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTorneos } from "@/context/TorneosContext";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { determinarCampeon, Torneo, ResultadoCampeon } from "@/lib/tournaments";
import { agruparTorneosPorPeriodo, calcularTablaGeneral, etiquetaPeriodo } from "@/lib/tablaGeneral";
import { nombreVisible } from "@/lib/players";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";

export default function EstadisticasPage() {
  const { torneos, cargando } = useTorneos();
  const jugadores = useJugadoresEnVivo();
  const [modo, setModo] = useState<"mes" | "anio">("mes");
  const [periodo, setPeriodo] = useState<string | null>(null);

  function nombreDe(id: string) {
    const j = jugadores.find((j) => j.id === id);
    return j ? nombreVisible(j) : "?";
  }

  const grupos = useMemo(() => agruparTorneosPorPeriodo(torneos, modo), [torneos, modo]);
  const periodosDisponibles = useMemo(() => [...grupos.keys()].sort().reverse(), [grupos]);
  const periodoActivo =
    periodo && periodosDisponibles.includes(periodo) ? periodo : periodosDisponibles[0];
  const torneosDelPeriodo = periodoActivo ? grupos.get(periodoActivo) ?? [] : [];
  const tabla = useMemo(() => calcularTablaGeneral(torneosDelPeriodo), [torneosDelPeriodo]);

  const anioActual = new Date().getFullYear();
  const campeones = useMemo(() => {
    const resultado: { torneo: Torneo; resultado: ResultadoCampeon }[] = [];
    for (const t of torneos) {
      if (new Date(t.iniciadoEn ?? t.creadoEn).getFullYear() !== anioActual) continue;
      const r = determinarCampeon(t);
      if (r) resultado.push({ torneo: t, resultado: r });
    }
    return resultado;
  }, [torneos, anioActual]);

  const titulos = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const c of campeones) {
      if (c.resultado.tipo === "campeon") {
        conteo.set(c.resultado.jugadorId, (conteo.get(c.resultado.jugadorId) ?? 0) + 1);
      }
    }
    return [...conteo.entries()].sort((a, b) => b[1] - a[1]);
  }, [campeones]);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Estadísticas"
        subtitulo="Tabla general por período y Copa de Campeones."
      />

      <div className="rounded-lg border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Tabla general</h2>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => {
                setModo("mes");
                setPeriodo(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                modo === "mes" ? "bg-blue-600 text-white" : "border border-white/20 hover:bg-white/10"
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => {
                setModo("anio");
                setPeriodo(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                modo === "anio" ? "bg-blue-600 text-white" : "border border-white/20 hover:bg-white/10"
              }`}
            >
              Anual
            </button>
            {periodosDisponibles.length > 0 && (
              <select
                value={periodoActivo}
                onChange={(e) => setPeriodo(e.target.value)}
                className="rounded-md border border-white/20 bg-white/5 px-2 py-1.5 text-xs"
              >
                {periodosDisponibles.map((p) => (
                  <option key={p} value={p}>
                    {etiquetaPeriodo(p)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {tabla.columnas.length === 0 ? (
          <p className="text-sm text-zinc-400">
            {cargando ? "Cargando..." : "Todavía no hay torneos con resultados cargados."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/10 text-left text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">Jugador</th>
                  {tabla.columnas.map((c, i) => (
                    <th key={c.id} className="px-3 py-2 text-center font-medium" title={c.nombre}>
                      T{i + 1}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center font-medium">Total</th>
                  <th className="px-3 py-2 text-center font-medium">PJ</th>
                  <th className="px-3 py-2 text-center font-medium">Rend.%</th>
                </tr>
              </thead>
              <tbody>
                {tabla.filas.map((f, i) => (
                  <tr key={f.jugadorId} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-2 text-zinc-400">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">{nombreDe(f.jugadorId)}</td>
                    {f.puntosPorTorneo.map((p, j) => (
                      <td key={j} className="px-3 py-2 text-center font-mono text-zinc-400">
                        {p === null ? <span className="text-zinc-400">–</span> : p}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-mono font-semibold">{f.total}</td>
                    <td className="px-3 py-2 text-center">{f.partidasJugadas}</td>
                    <td className="px-3 py-2 text-center">{f.rendimiento.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-zinc-400">
              {tabla.columnas.map((c, i) => `T${i + 1} = ${c.nombre}`).join(" · ")}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 font-semibold">🏆 Copa de Campeones {anioActual}</h2>
        {campeones.length === 0 ? (
          <p className="text-sm text-zinc-400">
            {cargando ? "Cargando..." : "Todavía no hay torneos finalizados este año."}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase text-zinc-400">Por torneo</h3>
              <ul className="flex flex-col gap-2 text-sm">
                {campeones.map(({ torneo, resultado }) => (
                  <li key={torneo.id} className="flex items-center justify-between gap-3">
                    <Link href={`/torneos/${torneo.id}`} className="hover:underline">
                      {torneo.nombre}
                    </Link>
                    <span className="text-right font-medium">
                      {resultado.tipo === "campeon"
                        ? nombreDe(resultado.jugadorId)
                        : resultado.tipo === "necesita_final"
                        ? `Definen con una final: ${resultado.jugadorIds.map(nombreDe).join(" vs ")}`
                        : `Empate sin definir: ${resultado.jugadorIds.map(nombreDe).join(" y ")}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium uppercase text-zinc-400">Títulos</h3>
              <ul className="flex flex-col gap-2 text-sm">
                {titulos.map(([jugadorId, cantidad]) => (
                  <li key={jugadorId} className="flex items-center justify-between">
                    <span>{nombreDe(jugadorId)}</span>
                    <span className="font-mono font-semibold">{cantidad}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
