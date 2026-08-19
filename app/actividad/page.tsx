"use client";

import { useActividad } from "@/context/ActividadContext";

const iconoPorTipo: Record<string, string> = {
  jugador: "👤",
  torneo: "♟️",
  resultado: "🏆",
};

function formatearFecha(iso: string) {
  const fecha = new Date(iso);
  return fecha.toLocaleString("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActividadPage() {
  const { actividades, cargando } = useActividad();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Actividad</h1>
        <p className="mt-1 text-zinc-600">
          Historial de qué se hizo y cuándo (los últimos {actividades.length > 0 ? "300" : ""} eventos).
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {cargando ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">Cargando...</p>
        ) : actividades.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">Todavía no hay actividad registrada.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100">
            {actividades.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <span className="text-lg leading-none">{iconoPorTipo[a.tipo] ?? "•"}</span>
                <div className="flex-1">
                  <p className="text-zinc-800">{a.descripcion}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{formatearFecha(a.creadoEn)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
