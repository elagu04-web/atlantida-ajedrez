"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useJugadores } from "@/context/JugadoresContext";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useAuth } from "@/context/AuthContext";
import { nombreVisible } from "@/lib/players";
import { ELO_MINIMO, jugoRecientemente, type JugadorEnVivo } from "@/lib/elo";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";

type Orden = "elo" | "partidas";

function ApodoCelda({
  jugadorId,
  apodoActual,
  puedeEditar,
  onGuardar,
}: {
  jugadorId: string;
  apodoActual: string | null;
  puedeEditar: boolean;
  onGuardar: (id: string, apodo: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(apodoActual ?? "");

  if (!puedeEditar) {
    return apodoActual ? <span className="text-xs text-zinc-400">{apodoActual}</span> : null;
  }

  if (!editando) {
    return apodoActual ? (
      <button
        onClick={() => setEditando(true)}
        className="text-xs text-zinc-400 hover:text-blue-400 hover:underline"
      >
        editar apodo
      </button>
    ) : (
      <button
        onClick={() => setEditando(true)}
        className="text-xs text-zinc-400 hover:text-blue-400 hover:underline"
      >
        + agregar apodo
      </button>
    );
  }

  return (
    <input
      type="text"
      autoFocus
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => {
        setEditando(false);
        if (valor.trim() !== (apodoActual ?? "")) onGuardar(jugadorId, valor);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      placeholder="Apodo..."
      className="w-32 rounded border border-white/20 bg-white/5 px-1 py-0.5 text-xs"
    />
  );
}

function FideIdCelda({
  jugadorId,
  fideIdActual,
  puedeEditar,
  onGuardar,
}: {
  jugadorId: string;
  fideIdActual: string | null;
  puedeEditar: boolean;
  onGuardar: (id: string, fideId: string) => void;
}) {
  const [valor, setValor] = useState(fideIdActual ?? "");

  if (!puedeEditar) {
    return <span className="text-xs text-zinc-400">{fideIdActual ?? ""}</span>;
  }

  return (
    <input
      type="text"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => {
        if (valor.trim() !== (fideIdActual ?? "")) onGuardar(jugadorId, valor);
      }}
      placeholder="ID FIDE..."
      className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-zinc-400 hover:border-white/10 focus:border-white/20 focus:bg-white/5 focus:outline-none"
    />
  );
}

export default function JugadoresPage() {
  const { agregarJugador, eliminarJugador, actualizarApodo, actualizarFideId, actualizarJugador, cargando } =
    useJugadores();
  const jugadoresConStats = useJugadoresEnVivo();
  const { esAdmin } = useAuth();
  const puedeEditar = esAdmin;

  const [nombre, setNombre] = useState("");
  const [apodo, setApodo] = useState("");
  const [elo, setElo] = useState("1500");
  const [busqueda, setBusqueda] = useState("");
  const [orden, setOrden] = useState<Orden>("elo");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editElo, setEditElo] = useState("");

  function empezarEdicion(j: JugadorEnVivo) {
    setEditandoId(j.id);
    setEditNombre(j.nombre);
    setEditElo(String(j.eloAtlantida));
  }

  function guardarEdicion() {
    if (!editandoId) return;
    const eloNumero = Number(editElo);
    const eloValido = Number.isFinite(eloNumero) ? eloNumero : 1500;
    actualizarJugador(editandoId, editNombre, Math.max(ELO_MINIMO, eloValido));
    setEditandoId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    const eloNumero = Math.max(ELO_MINIMO, Number(elo) || 1500);
    agregarJugador(nombreLimpio, eloNumero, apodo);
    setNombre("");
    setApodo("");
    setElo("1500");
  }

  const ocultosPorInactividad = useMemo(
    () => jugadoresConStats.filter((j) => !jugoRecientemente(j)).length,
    [jugadoresConStats]
  );

  const lista = useMemo(() => {
    const activos = mostrarTodos ? jugadoresConStats : jugadoresConStats.filter(jugoRecientemente);
    const filtrados = busqueda.trim()
      ? activos.filter((j: JugadorEnVivo) =>
          `${j.nombre} ${j.apodo ?? ""}`.toLowerCase().includes(busqueda.trim().toLowerCase())
        )
      : activos;
    return [...filtrados].sort((a, b) =>
      orden === "elo" ? b.eloAtlantida - a.eloAtlantida : b.jugadas - a.jugadas
    );
  }, [jugadoresConStats, busqueda, orden, mostrarTodos]);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Jugadores"
        subtitulo="Lista de jugadores del club con su Elo Atlántida y estadísticas."
        accion={
          puedeEditar && (
            <Link
              href="/jugadores/compartir"
              className="rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              🖼️ Imagen para compartir
            </Link>
          )
        }
      />

      {puedeEditar && (
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-white/5 p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-xs font-medium text-zinc-400">
            Nombre del jugador
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Ana Rodríguez"
            className="w-48 rounded-md border border-white/20 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="apodo" className="text-xs font-medium text-zinc-400">
            Apodo (opcional)
          </label>
          <input
            id="apodo"
            type="text"
            value={apodo}
            onChange={(e) => setApodo(e.target.value)}
            placeholder="Ej: Fonchi"
            className="w-36 rounded-md border border-white/20 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="elo" className="text-xs font-medium text-zinc-400">
            Elo inicial
          </label>
          <input
            id="elo"
            type="number"
            min={ELO_MINIMO}
            value={elo}
            onChange={(e) => setElo(e.target.value)}
            className="w-28 rounded-md border border-white/20 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Agregar jugador
        </button>
      </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar jugador..."
          className="w-64 rounded-md border border-white/20 px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-xs font-medium text-zinc-400">Ordenar por:</span>
          <button
            onClick={() => setOrden("elo")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              orden === "elo" ? "bg-blue-600 text-white" : "border border-white/20 hover:bg-white/10"
            }`}
          >
            Elo
          </button>
          <button
            onClick={() => setOrden("partidas")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              orden === "partidas" ? "bg-blue-600 text-white" : "border border-white/20 hover:bg-white/10"
            }`}
          >
            Partidas jugadas
          </button>
        </div>
      </div>

      {ocultosPorInactividad > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-white/10 px-3 py-2 text-xs text-zinc-400">
          <span>
            {mostrarTodos
              ? `Mostrando a todos, incluidos ${ocultosPorInactividad} que no jugaron en el último año.`
              : `${ocultosPorInactividad} jugador${ocultosPorInactividad === 1 ? "" : "es"} sin partidas en el último año ${
                  ocultosPorInactividad === 1 ? "está oculto" : "están ocultos"
                } de esta lista.`}
          </span>
          <button
            onClick={() => setMostrarTodos((v) => !v)}
            className="shrink-0 font-medium text-blue-400 hover:underline"
          >
            {mostrarTodos ? "Ocultar inactivos" : "Mostrar a todos"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-white/10 text-left text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">ID FIDE</th>
              <th className="px-4 py-3 font-medium">Elo Atlántida</th>
              <th className="px-4 py-3 font-medium">Partidas</th>
              <th className="px-4 py-3 font-medium">V</th>
              <th className="px-4 py-3 font-medium">E</th>
              <th className="px-4 py-3 font-medium">D</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((j, i) =>
              editandoId === j.id && puedeEditar ? (
                <tr key={j.id} className="border-b border-white/5 bg-white/10 last:border-0">
                  <td className="px-4 py-3 text-zinc-400">{i + 1}</td>
                  <td className="px-4 py-3" colSpan={2}>
                    <input
                      type="text"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="w-48 rounded border border-white/20 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={ELO_MINIMO}
                      value={editElo}
                      onChange={(e) => setEditElo(e.target.value)}
                      className="w-24 rounded border border-white/20 px-2 py-1 text-sm"
                    />
                    <div className="mt-0.5 text-[10px] text-zinc-400">Elo inicial</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400" colSpan={3}>
                    Cambiar el nombre o el Elo inicial recalcula todo su historial.
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={guardarEdicion}
                      className="mr-3 text-xs font-medium text-blue-400 hover:underline"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="text-xs text-zinc-400 hover:underline"
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={j.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-zinc-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/jugadores/${j.id}`} className="flex items-center gap-2 hover:underline">
                      {j.fotoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={j.fotoUrl}
                          alt=""
                          className="h-7 w-7 shrink-0 rounded-full border border-white/10 object-cover"
                        />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-semibold text-zinc-400">
                          {nombreVisible(j).charAt(0).toUpperCase()}
                        </span>
                      )}
                      {nombreVisible(j)}
                    </Link>
                    <div>
                      <ApodoCelda
                        jugadorId={j.id}
                        apodoActual={j.apodo}
                        puedeEditar={puedeEditar}
                        onGuardar={actualizarApodo}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <FideIdCelda
                      jugadorId={j.id}
                      fideIdActual={j.fideId}
                      puedeEditar={puedeEditar}
                      onGuardar={actualizarFideId}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono">{j.eloAtlantida}</td>
                  <td className="px-4 py-3">{j.jugadas}</td>
                  <td className="px-4 py-3 text-green-400">{j.victorias}</td>
                  <td className="px-4 py-3 text-zinc-400">{j.empates}</td>
                  <td className="px-4 py-3 text-red-400">{j.derrotas}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {puedeEditar && (
                      <>
                        <button
                          onClick={() => empezarEdicion(j)}
                          className="mr-3 text-xs text-blue-400 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminarJugador(j.id)}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            )}
            {lista.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-zinc-400">
                  {cargando
                    ? "Cargando jugadores..."
                    : busqueda
                    ? "No hay jugadores que coincidan con la búsqueda."
                    : !mostrarTodos && ocultosPorInactividad > 0
                    ? "Nadie jugó en el último año — probá \"Mostrar a todos\"."
                    : "No hay jugadores todavía."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
