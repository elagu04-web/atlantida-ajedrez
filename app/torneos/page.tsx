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
  match: "Match",
};

export default function TorneosPage() {
  const router = useRouter();
  const jugadoresConStats = useJugadoresEnVivo();
  const { torneos, crearTorneo, crearTorneoRapido, eliminarTorneo, cargando } = useTorneos();
  const { esAdmin } = useAuth();
  const puedeEditar = esAdmin;

  const [nombreRapido, setNombreRapido] = useState("");
  const [creandoRapido, setCreandoRapido] = useState(false);

  async function handleCrearRapido(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nombreRapido.trim();
    if (!nombreLimpio) return;
    setCreandoRapido(true);
    const id = await crearTorneoRapido(nombreLimpio);
    setCreandoRapido(false);
    if (id) router.push(`/torneos/${id}`);
  }

  const [nombre, setNombre] = useState("");
  const [formato, setFormato] = useState<FormatoTorneo>("suizo");
  const [rondasObjetivo, setRondasObjetivo] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [desempates, setDesempates] = useState<string[]>([]);
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
    setDesempates((actuales) =>
      actuales.includes(nombreDesempate)
        ? actuales.filter((d) => d !== nombreDesempate)
        : [...actuales, nombreDesempate]
    );
  }

  function moverDesempate(nombreDesempate: string, direccion: -1 | 1) {
    setDesempates((actuales) => {
      const i = actuales.indexOf(nombreDesempate);
      const j = i + direccion;
      if (i < 0 || j < 0 || j >= actuales.length) return actuales;
      const copia = [...actuales];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  const formatoInvalido = formato === "match" && seleccionados.size !== 2;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio || seleccionados.size < 2 || formatoInvalido) return;
    const rondas = (formato === "suizo" || formato === "match") && rondasObjetivo ? Number(rondasObjetivo) : null;
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
          onSubmit={handleCrearRapido}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="nombreRapido" className="text-xs font-medium text-blue-800">
              Creación rápida — solo el nombre
            </label>
            <input
              id="nombreRapido"
              type="text"
              value={nombreRapido}
              onChange={(e) => setNombreRapido(e.target.value)}
              placeholder="Ej: Torneo del jueves"
              className="w-64 rounded-md border border-blue-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!nombreRapido.trim() || creandoRapido}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creandoRapido ? "Creando..." : "Crear y abrir inscripción"}
          </button>
          <span className="text-xs text-blue-700">
            Formato, jugadores y desempates se eligen después — esto solo publica el torneo para
            que la gente se pueda anotar.
          </span>
        </form>
      )}

      {puedeEditar && (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-lg border border-zinc-200 bg-white p-5"
      >
        <span className="text-xs font-medium text-zinc-500">
          O crear con todos los detalles de una:
        </span>
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
              Round robin (todos contra todos, ida y vuelta)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="formato"
                checked={formato === "match"}
                onChange={() => setFormato("match")}
              />
              Match (2 jugadores)
            </label>
          </div>
          {formato === "match" && (
            <span className="text-xs text-zinc-500">
              Para cuando vienen solo dos personas: se enfrentan varias partidas seguidas,
              alternando quién juega con blancas. Elegí exactamente 2 jugadores abajo.
            </span>
          )}
        </div>

        {(formato === "suizo" || formato === "match") && (
          <div className="flex flex-col gap-1">
            <label htmlFor="rondasObjetivo" className="text-xs font-medium text-zinc-600">
              {formato === "match" ? "Cantidad de partidas" : "Cantidad de rondas (opcional)"}
            </label>
            <input
              id="rondasObjetivo"
              type="number"
              min={1}
              value={rondasObjetivo}
              onChange={(e) => setRondasObjetivo(e.target.value)}
              placeholder={formato === "match" ? "Ej: 2" : "Ej: 5"}
              className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <span className="text-xs text-zinc-500">
              {formato === "match"
                ? "Si la dejás vacía, el match es a 2 partidas."
                : "Si la dejás vacía, vas generando rondas de a una sin límite fijo."}
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
            <p className="text-sm text-zinc-500">
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
                    <span className="font-mono text-xs text-zinc-500">
                      {j.eloAtlantida}
                    </span>
                  </label>
                ))}
                {jugadoresFiltrados.length === 0 && (
                  <p className="col-span-full py-2 text-center text-sm text-zinc-500">
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
                  checked={desempates.includes(d)}
                  onChange={() => toggleDesempate(d)}
                />
                {d}
              </label>
            ))}
          </div>
          {desempates.length > 0 && (
            <div className="mt-2 flex flex-col gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-2">
              <span className="text-xs text-zinc-500">
                Orden de prioridad (se usa el primero; si empatan, se pasa al siguiente):
              </span>
              {desempates.map((d, i) => (
                <div key={d} className="flex items-center gap-2 text-sm">
                  <span className="w-4 text-xs text-zinc-400">{i + 1}.</span>
                  <span className="flex-1">{d}</span>
                  <button
                    type="button"
                    onClick={() => moverDesempate(d, -1)}
                    disabled={i === 0}
                    className="rounded border border-zinc-300 px-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moverDesempate(d, 1)}
                    disabled={i === desempates.length - 1}
                    className="rounded border border-zinc-300 px-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {formatoInvalido && (
          <p className="text-xs text-amber-600">
            El formato Match necesita exactamente 2 jugadores seleccionados (elegiste{" "}
            {seleccionados.size}).
          </p>
        )}

        <button
          type="submit"
          disabled={!nombre.trim() || seleccionados.size < 2 || formatoInvalido}
          className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Crear torneo
        </button>
      </form>
      )}

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Torneos creados</h2>
        {torneos.length === 0 && (
          <p className="text-sm text-zinc-500">
            {cargando ? "Cargando torneos..." : "Todavía no creaste ningún torneo."}
          </p>
        )}
        {[...torneos].reverse().map((t) => (
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
