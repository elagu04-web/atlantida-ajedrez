"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useTorneos } from "@/context/TorneosContext";
import { jugoRecientemente } from "@/lib/elo";
import { nombreVisible } from "@/lib/players";

export default function InscribirseTorneoPage() {
  const { id } = useParams<{ id: string }>();
  const { obtenerTorneo, alternarInscripcion, cargando } = useTorneos();
  const jugadores = useJugadoresEnVivo();
  const torneo = obtenerTorneo(id);
  const [busqueda, setBusqueda] = useState("");
  const [enVuelo, setEnVuelo] = useState<string | null>(null);

  const elegibles = useMemo(() => {
    const activos = jugadores.filter(jugoRecientemente);
    const filtrados = busqueda.trim()
      ? activos.filter((j) => nombreVisible(j).toLowerCase().includes(busqueda.trim().toLowerCase()))
      : activos;
    return [...filtrados].sort((a, b) => nombreVisible(a).localeCompare(nombreVisible(b)));
  }, [jugadores, busqueda]);

  if (cargando) {
    return <p className="text-sm text-zinc-500">Cargando...</p>;
  }

  if (!torneo) {
    return <p className="text-sm text-zinc-500">Ese torneo no existe.</p>;
  }

  if (torneo.estado !== "armado") {
    return (
      <div className="flex flex-col gap-4">
        <Link href={`/torneos/${torneo.id}`} className="text-sm text-blue-600 hover:underline">
          ← Ver el torneo
        </Link>
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-500">
            La inscripción para &quot;{torneo.nombre}&quot; ya está cerrada — el torneo ya arrancó.
          </p>
        </div>
      </div>
    );
  }

  async function alternar(jugadorId: string) {
    setEnVuelo(jugadorId);
    await alternarInscripcion(torneo!.id, jugadorId);
    setEnVuelo(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/torneos/${torneo.id}`} className="text-sm text-blue-600 hover:underline">
          ← Ver el torneo
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Anotarse — {torneo.nombre}</h1>
        <p className="mt-1 text-zinc-600">
          Tocá tu nombre para anotarte. Tocalo de nuevo si te querés sacar. No hace falta iniciar
          sesión.
        </p>
      </div>

      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar tu nombre..."
        className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm"
      />

      <div className="rounded-lg border border-zinc-200 bg-white p-2">
        {elegibles.length === 0 ? (
          <p className="p-4 text-center text-sm text-zinc-500">
            {busqueda ? "Nadie coincide con la búsqueda." : "No hay jugadores activos cargados."}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            {elegibles.map((j) => {
              const anotado = torneo!.inscriptosIds.includes(j.id);
              return (
                <button
                  key={j.id}
                  onClick={() => alternar(j.id)}
                  disabled={enVuelo === j.id}
                  className={`flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium disabled:opacity-50 ${
                    anotado
                      ? "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                      : "hover:bg-zinc-50"
                  }`}
                >
                  <span>{nombreVisible(j)}</span>
                  <span>{anotado ? "✓ Anotado" : "Anotarme"}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-500">
        {torneo.inscriptosIds.length} anotado{torneo.inscriptosIds.length === 1 ? "" : "s"} hasta
        ahora.
      </p>
    </div>
  );
}
