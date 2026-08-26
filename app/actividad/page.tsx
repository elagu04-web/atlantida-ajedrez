"use client";

import { useActividad } from "@/context/ActividadContext";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";

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
      <EncabezadoPagina
        titulo="Actividad"
        subtitulo={`Historial de qué se hizo y cuándo (los últimos ${
          actividades.length > 0 ? "300" : ""
        } eventos).`}
      />

      <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
        {cargando ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">Cargando...</p>
        ) : actividades.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-400">Todavía no hay actividad registrada.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/5">
            {actividades.map((a) => (
              <li key={a.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                <span className="text-lg leading-none">{iconoPorTipo[a.tipo] ?? "•"}</span>
                <div className="flex-1">
                  <p className="text-zinc-200">{a.descripcion}</p>
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
