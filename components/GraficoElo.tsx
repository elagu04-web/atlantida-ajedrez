"use client";

import { useState } from "react";

type Punto = { fecha: string; elo: number; torneo: string };

export function GraficoElo({ puntos }: { puntos: Punto[] }) {
  const [activo, setActivo] = useState<number | null>(null);

  if (puntos.length < 2) {
    return <p className="text-sm text-zinc-400">Todavía no hay suficientes partidas para graficar.</p>;
  }

  const ancho = 640;
  const alto = 180;
  const margen = { arriba: 16, abajo: 24, izquierda: 40, derecha: 12 };
  const elos = puntos.map((p) => p.elo);
  const eloMin = Math.min(...elos);
  const eloMax = Math.max(...elos);
  const rango = Math.max(1, eloMax - eloMin);

  function x(i: number) {
    return margen.izquierda + (i / (puntos.length - 1)) * (ancho - margen.izquierda - margen.derecha);
  }
  function y(elo: number) {
    return (
      margen.arriba +
      (1 - (elo - eloMin) / rango) * (alto - margen.arriba - margen.abajo)
    );
  }

  const linea = puntos.map((p, i) => `${x(i)},${y(p.elo)}`).join(" ");
  const punto = activo !== null ? puntos[activo] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full" onMouseLeave={() => setActivo(null)}>
        <text x={4} y={y(eloMax) + 4} className="fill-zinc-400 text-[10px]">
          {eloMax}
        </text>
        <text x={4} y={y(eloMin) + 4} className="fill-zinc-400 text-[10px]">
          {eloMin}
        </text>
        <polyline points={linea} fill="none" stroke="#2563eb" strokeWidth={2} />
        {puntos.map((p, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(p.elo)}
            r={activo === i ? 5 : 3}
            fill="#2563eb"
            onMouseEnter={() => setActivo(i)}
            onClick={() => setActivo(activo === i ? null : i)}
            className="cursor-pointer"
          />
        ))}
      </svg>
      {punto && (
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs shadow-sm">
          <span className="font-semibold">{punto.elo}</span> · {punto.fecha} · {punto.torneo}
        </div>
      )}
    </div>
  );
}
