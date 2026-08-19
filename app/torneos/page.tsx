"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useTorneos } from "@/context/TorneosContext";
import { useAuth } from "@/context/AuthContext";
import { DESEMPATES_DISPONIBLES, FormatoTorneo } from "@/lib/tournaments";
import { nombreVisible } from "@/lib/players";

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
  const { torneos, crearTorneo, eliminarTorneo } = useTorneos();
  const { session } = useAuth();
  const puedeEditar = Boolean(session);

  const [nombre, setNombre] = useState("");
  const [formato, setFormato] = useState<FormatoTorneo>("suizo");
  const [rondasObjetivo, setRondasObjetivo] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [desempates, setDesempates] = useState<Set<string>>(new Set());
  const [busquedaJugadores, setBusquedaJugadores] = useState("");

  const jugadoresFiltrados = useMemo(() => {
    const q = busquedaJugadores.trim().toLowerCase();
    const base = [...jugadoresConStats].sort((a, b) => b.eloAtlantida - a.eloAtlantida);
    if (!q) return base;
    return base.filter((j) => `${j.nombre} ${j.apodo ?? ""}`.toLowerCase().includes(q));
  }, [jugadoresConStats, busquedaJugadores]);

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
    const rondas = formato === "suizo" && rondasObjetivo ? Number(rondasObjetivo) : null;
    const confirmado = window.confirm(
      `¿Crear el torneo "${nombreLimpio}"?\n\nFormato: ${formatoLabel[formato]}\nJugadores: ${seleccionados.size}${
        rondas ? `\nRondas planificadas: ${rondas}` : ""
      }`
    );
    if (!confirmado) return;
    const id = await crearTorneo(
      nombreLimpio,
      formato,
      [...seleccionados],
      [...desempates],
      rondas && rondas > 0 ? rondas : null
    );
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

      {!puedeEditar && (
        <p className="text-sm text-zinc-500">
          Iniciá sesión para crear torneos o borrarlos.
        </p>
      )}
      {puedeEditar && (
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

        {formato === "suizo" && (
          <div className="flex flex-col gap-1">
            <label htmlFor="rondasObjetivo" className="text-xs font-medium text-zinc-600">
              Cantidad de rondas (opcional)
            </label>
            <input
              id="rondasObjetivo"
              type="number"
              min={1}
              value={rondasObjetivo}
              onChange={(e) => setRondasObjetivo(e.target.value)}
              placeholder="Ej: 5"
              className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <span className="text-xs text-zinc-400">
              Si la dejás vacía, vas generando rondas de a una sin límite fijo.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-600">
              Jugadores ({seleccionados.size} seleccionados)
            </span>
            {jugadoresConStats.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setSeleccionados(new Set(jugadoresFiltrados.map((j) => j.id)))
                  }
                  className="text-blue-600 hover:underline"
                >
                  Seleccionar {busquedaJugadores ? "filtrados" : "todos"}
                </button>
                <button
                  type="button"
                  onClick={() => setSeleccionados(new Set())}
                  className="text-blue-600 hover:underline"
                >
                  Deseleccionar todos
                </button>
              </div>
            )}
          </div>

          {jugadoresConStats.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No hay jugadores cargados todavía —{" "}
              <Link href="/jugadores" className="text-blue-600 hover:underline">
                agregá algunos primero
              </Link>
              .
            </p>
          ) : (
            <>
              <input
                type="text"
                value={busquedaJugadores}
                onChange={(e) => setBusquedaJugadores(e.target.value)}
                placeholder="Buscar jugador..."
                className="w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <div className="grid max-h-64 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto rounded-md border border-zinc-100 p-2 sm:grid-cols-3">
                {jugadoresFiltrados.map((j) => (
                  <label key={j.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(j.id)}
                      onChange={() => toggleJugador(j.id)}
                    />
                    {nombreVisible(j)}{" "}
                    <span className="font-mono text-xs text-zinc-400">
                      {j.eloAtlantida}
                    </span>
                  </label>
                ))}
                {jugadoresFiltrados.length === 0 && (
                  <p className="col-span-full py-2 text-center text-sm text-zinc-400">
                    Ningún jugador coincide con la búsqueda.
                  </p>
                )}
              </div>
            </>
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
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Torneos creados</h2>
        {torneos.length === 0 && (
          <p className="text-sm text-zinc-400">Todavía no creaste ningún torneo.</p>
        )}
        {torneos.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm"
          >
            <Link href={`/torneos/${t.id}`} className="flex-1">
              <div className="font-medium">{t.nombre}</div>
              <div className="text-sm text-zinc-500">
                {formatoLabel[t.formato]} · {t.jugadoresIds.length} jugadores
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                {estadoLabel[t.estado]}
              </span>
              {puedeEditar && (
                <button
                  onClick={() => {
                    if (window.confirm(`¿Borrar el torneo "${t.nombre}"? Esto no se puede deshacer.`)) {
                      eliminarTorneo(t.id);
                    }
                  }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
