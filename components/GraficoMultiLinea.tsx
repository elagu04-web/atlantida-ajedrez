"use client";

import { useState } from "react";

export type SerieLinea = {
  id: string;
  nombre: string;
  color: string;
  valores: (number | null)[];
};

/**
 * Gráfico de líneas para varias series a la vez (mismo dibujo a mano que
 * GraficoElo, generalizado) — usado para la carrera de un torneo ronda a
 * ronda y para comparar la evolución de Elo de varios jugadores.
 */
export function GraficoMultiLinea({
  categorias,
  series,
  formatoValor = (v: number) => String(v),
}: {
  categorias: string[];
  series: SerieLinea[];
  formatoValor?: (v: number) => string;
}) {
  const [activo, setActivo] = useState<number | null>(null);

  const todosLosValores = series.flatMap((s) => s.valores.filter((v): v is number => v !== null));
  if (todosLosValores.length === 0 || categorias.length < 2) {
    return <p className="text-sm text-zinc-400">Todavía no hay suficientes datos para graficar.</p>;
  }

  const ancho = 640;
  const alto = 220;
  const margen = { arriba: 16, abajo: 22, izquierda: 40, derecha: 12 };
  const valorMin = Math.min(...todosLosValores);
  const valorMax = Math.max(...todosLosValores);
  const rango = Math.max(1, valorMax - valorMin);
  const mostrarEtiquetasX = categorias.length <= 10;

  function x(i: number) {
    return margen.izquierda + (i / (categorias.length - 1)) * (ancho - margen.izquierda - margen.derecha);
  }
  function y(valor: number) {
    return margen.arriba + (1 - (valor - valorMin) / rango) * (alto - margen.arriba - margen.abajo);
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" onMouseLeave={() => setActivo(null)}>
        <text x={4} y={y(valorMax) + 4} className="fill-zinc-400 text-[10px]">
          {formatoValor(valorMax)}
        </text>
        <text x={4} y={y(valorMin) + 4} className="fill-zinc-400 text-[10px]">
          {formatoValor(valorMin)}
        </text>
        {series.map((s) => {
          const puntos = s.valores
            .map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
            .filter((p): p is string => p !== null)
            .join(" ");
          return <polyline key={s.id} points={puntos} fill="none" stroke={s.color} strokeWidth={2} />;
        })}
        {series.map((s) =>
          s.valores.map((v, i) =>
            v === null ? null : (
              <circle
                key={`${s.id}-${i}`}
                cx={x(i)}
                cy={y(v)}
                r={activo === i ? 5 : 3}
                fill={s.color}
                onMouseEnter={() => setActivo(i)}
                className="cursor-pointer"
              />
            )
          )
        )}
        {mostrarEtiquetasX &&
          categorias.map((c, i) => (
            <text key={i} x={x(i)} y={alto - 4} textAnchor="middle" className="fill-zinc-500 text-[9px]">
              {c}
            </text>
          ))}
      </svg>
      {activo !== null && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-md border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-xs shadow-lg">
          <div className="mb-1 font-semibold text-zinc-300">{categorias[activo]}</div>
          <div className="flex flex-col gap-0.5">
            {series.map((s) =>
              s.valores[activo] === null ? null : (
                <div key={s.id} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="text-zinc-300">
                    {s.nombre}: <span className="font-mono">{formatoValor(s.valores[activo]!)}</span>
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-400">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.nombre}
          </span>
        ))}
      </div>
    </div>
  );
}

export const COLORES_SERIE = [
  "#3b82f6", // blue-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ec4899", // pink-500
  "#a855f7", // purple-500
  "#06b6d4", // cyan-500
  "#f97316", // orange-500
  "#84cc16", // lime-500
];

export function colorDeSerie(indice: number): string {
  return COLORES_SERIE[indice % COLORES_SERIE.length];
}
