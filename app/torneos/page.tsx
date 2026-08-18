"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useTorneos } from "@/context/TorneosContext";
import { DESEMPATES_DISPONIBLES, FormatoTorneo } from "@/lib/tournaments";

const estadoLabel: Record<string, string> = {
  armado: "Armado",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

const formatoLabel: Record<string, string> = {
  "round-robin": "Round robin",
  suizo: "Sistema suizo",
};

export default function TorneosPage() {
  const router = useRouter();
  const jugadoresConStats = useJugadoresEnVivo();
  const { torneos, crearTorneo } = useTorneos();

  const [nombre, setNombre] = useState("");
  const [formato, setFormato] = useState<FormatoTorneo>("suizo");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [desempates, setDesempates] = useState<Set<string>>(new Set());

  function toggleJugador(id: string) {
    setSeleccionados((actuales) => {
      const nuevo = new Set(actuales);
      if (nuevo.has(id)) nuevo.delete(id);
      else nuevo.add(id);
      return nuevo;
    });
  }

  function toggleDesempate(nombreDesempate: string) {
    setDesempates((actuales) => {
      const nuevo = new Set(actuales);
      if (nuevo.has(nombreDesempate)) nuevo.delete(nombreDesempate);
      else nuevo.add(nombreDesempate);
      return nuevo;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio || seleccionados.size < 2) return;
    const id = await crearTorneo(nombreLimpio, formato, [...seleccionados], [...desempates]);
    if (id) router.push(`/torneos/${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Torneos</h1>
        <p className="mt-1 text-zinc-600">
          Creá un torneo, elegí el formato, los jugadores y los desempates.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-xs font-medium text-zinc-600">
            Nombre del torneo
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Copa de Primavera"
            className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">Formato</span>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="formato"
                checked={formato === "suizo"}
                onChange={() => setFormato("suizo")}
              />
              Sistema suizo
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="formato"
                checked={formato === "round-robin"}
                onChange={() => setFormato("round-robin")}
              />
              Round robin (todos contra todos)
            </label>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">
            Jugadores ({seleccionados.size} seleccionados)
          </span>
          {jugadoresConStats.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No hay jugadores cargados todavía —{" "}
              <Link href="/jugadores" className="text-blue-600 hover:underline">
                agregá algunos primero
              </Link>
              .
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {jugadoresConStats.map((j) => (
                <label key={j.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={seleccionados.has(j.id)}
                    onChange={() => toggleJugador(j.id)}
                  />
                  {j.nombre}{" "}
                  <span className="font-mono text-xs text-zinc-400">
                    {j.eloAtlantida}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600">
            Desempates a usar
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
            {DESEMPATES_DISPONIBLES.map((d) => (
              <label key={d} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={desempates.has(d)}
                  onChange={() => toggleDesempate(d)}
                />
                {d}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={!nombre.trim() || seleccionados.size < 2}
          className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Crear torneo
        </button>
      </form>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Torneos creados</h2>
        {torneos.length === 0 && (
          <p className="text-sm text-zinc-400">Todavía no creaste ningún torneo.</p>
        )}
        {torneos.map((t) => (
          <Link
            key={t.id}
            href={`/torneos/${t.id}`}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm"
          >
            <div>
              <div className="font-medium">{t.nombre}</div>
              <div className="text-sm text-zinc-500">
                {formatoLabel[t.formato]} · {t.jugadoresIds.length} jugadores
              </div>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
              {estadoLabel[t.estado]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
