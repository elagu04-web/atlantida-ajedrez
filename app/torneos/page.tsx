"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useTorneos } from "@/context/TorneosContext";
import { useAuth } from "@/context/AuthContext";
import { DESEMPATES_DISPONIBLES, FormatoTorneo } from "@/lib/tournaments";
import { nombreVisible } from "@/lib/players";
import { TarjetaTorneo } from "@/components/TarjetaTorneo";
import { Icono } from "@/components/Icono";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";

const formatoLabel: Record<string, string> = {
  "round-robin": "Round robin",
  suizo: "Sistema suizo",
  match: "Match",
};


export default function TorneosPage() {
  const router = useRouter();
  const jugadoresConStats = useJugadoresEnVivo();
  const { torneos, crearTorneo, crearTorneoRapido, eliminarTorneo, cargando, errorCarga } = useTorneos();
  const { esAdmin } = useAuth();
  const puedeEditar = esAdmin;

  const [buscarTorneo, setBuscarTorneo] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const listaTorneos = [...torneos].filter(t => (estadoFiltro === "todos" || t.estado === estadoFiltro) && t.nombre.toLocaleLowerCase().includes(buscarTorneo.trim().toLocaleLowerCase())).sort((a, b) => (b.iniciadoEn ?? b.creadoEn).localeCompare(a.iniciadoEn ?? a.creadoEn));
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
  const [idaYVuelta, setIdaYVuelta] = useState(false);
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
      `¿Crear el torneo "${nombreLimpio}"?\n\nFormato: ${formatoLabel[formato]}${
        formato === "round-robin" ? (idaYVuelta ? " (ida y vuelta)" : " (ida sola)") : ""
      }\nJugadores: ${seleccionados.size}${rondas ? `\nRondas planificadas: ${rondas}` : ""}`
    );
    if (!confirmado) return;
    const id = await crearTorneo(
      nombreLimpio,
      formato,
      [...seleccionados],
      [...desempates],
      rondas && rondas > 0 ? rondas : null,
      formato === "round-robin" ? idaYVuelta : false
    );
    if (id) router.push(`/torneos/${id}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Torneos"
        subtitulo={puedeEditar ? "Administrá los torneos, jugadores y desempates." : "Consultá resultados, posiciones e inscripciones del club."}
      />

      {!puedeEditar && (
        <p className="text-sm text-zinc-400">
          Encontrá el próximo torneo o consultá los resultados de las competencias anteriores.
        </p>
      )}

      {puedeEditar && (
        <form
          onSubmit={handleCrearRapido}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="nombreRapido" className="text-xs font-medium text-blue-300">
              Creación rápida — solo el nombre
            </label>
            <input
              id="nombreRapido"
              type="text"
              value={nombreRapido}
              onChange={(e) => setNombreRapido(e.target.value)}
              placeholder="Ej: Torneo del jueves"
              className="w-64 rounded-md border border-blue-500/40 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={!nombreRapido.trim() || creandoRapido}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {creandoRapido ? "Creando..." : "Crear y abrir inscripción"}
          </button>
          <span className="text-xs text-blue-300">
            Formato, jugadores y desempates se eligen después — esto solo publica el torneo para
            que la gente se pueda anotar.
          </span>
        </form>
      )}

      {puedeEditar && (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 panel p-5"
      >
        <span className="text-xs font-medium text-zinc-400">
          O crear con todos los detalles de una:
        </span>
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-xs font-medium text-zinc-400">
            Nombre del torneo
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Copa de Primavera"
            className="w-full max-w-sm rounded-md border border-white/20 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-400">Formato</span>
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
          {formato === "round-robin" && (
            <label className="mt-1 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={idaYVuelta}
                onChange={(e) => setIdaYVuelta(e.target.checked)}
              />
              Ida y vuelta (cada rival se enfrenta dos veces, con los colores invertidos)
            </label>
          )}
          {formato === "match" && (
            <span className="text-xs text-zinc-400">
              Para cuando vienen solo dos personas: se enfrentan varias partidas seguidas,
              alternando quién juega con blancas. Elegí exactamente 2 jugadores abajo.
            </span>
          )}
        </div>

        {(formato === "suizo" || formato === "match") && (
          <div className="flex flex-col gap-1">
            <label htmlFor="rondasObjetivo" className="text-xs font-medium text-zinc-400">
              {formato === "match" ? "Cantidad de partidas" : "Cantidad de rondas (opcional)"}
            </label>
            <input
              id="rondasObjetivo"
              type="number"
              min={1}
              value={rondasObjetivo}
              onChange={(e) => setRondasObjetivo(e.target.value)}
              placeholder={formato === "match" ? "Ej: 2" : "Ej: 5"}
              className="w-28 rounded-md border border-white/20 px-3 py-2 text-sm"
            />
            <span className="text-xs text-zinc-400">
              {formato === "match"
                ? "Si la dejás vacía, el match es a 2 partidas."
                : "Si la dejás vacía, vas generando rondas de a una sin límite fijo."}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-zinc-400">
              Jugadores ({seleccionados.size} seleccionados)
            </span>
            {jugadoresConStats.length > 0 && (
              <div className="flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setSeleccionados(new Set(jugadoresFiltrados.map((j) => j.id)))
                  }
                  className="text-blue-400 hover:underline"
                >
                  Seleccionar {busquedaJugadores ? "filtrados" : "todos"}
                </button>
                <button
                  type="button"
                  onClick={() => setSeleccionados(new Set())}
                  className="text-blue-400 hover:underline"
                >
                  Deseleccionar todos
                </button>
              </div>
            )}
          </div>

          {jugadoresConStats.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No hay jugadores cargados todavía —{" "}
              <Link href="/jugadores" className="text-blue-400 hover:underline">
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
                className="w-full max-w-sm rounded-md border border-white/20 px-3 py-2 text-sm"
              />
              <div className="grid max-h-64 grid-cols-2 gap-x-4 gap-y-1 overflow-y-auto rounded-md border border-white/5 p-2 sm:grid-cols-3">
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
          <span className="text-xs font-medium text-zinc-400">
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
            <div className="mt-2 flex flex-col gap-1 rounded-md border border-white/10 bg-white/10 p-2">
              <span className="text-xs text-zinc-400">
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
                    className="rounded border border-white/20 px-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moverDesempate(d, 1)}
                    disabled={i === desempates.length - 1}
                    className="rounded border border-white/20 px-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {formatoInvalido && (
          <p className="text-xs text-amber-400">
            El formato Match necesita exactamente 2 jugadores seleccionados (elegiste{" "}
            {seleccionados.size}).
          </p>
        )}

        <button
          type="submit"
          disabled={!nombre.trim() || seleccionados.size < 2 || formatoInvalido}
          className="w-fit rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Crear torneo
        </button>
      </form>
      )}

      <section aria-labelledby="titulo-torneos">
        <div className="section-heading"><h2 id="titulo-torneos">Calendario del club</h2><span className="text-xs text-zinc-400">{listaTorneos.length} {listaTorneos.length === 1 ? "torneo" : "torneos"}</span></div>
        {errorCarga && <p role="status" className="mb-4 text-sm text-amber-300">{errorCarga}</p>}
        <div className="filter-toolbar mb-6">
          <div className="search-field"><Icono nombre="buscar" className="h-4 w-4 shrink-0 text-zinc-500" /><input aria-label="Buscar torneo" placeholder="Buscar por nombre…" value={buscarTorneo} onChange={e=>setBuscarTorneo(e.target.value)} />{buscarTorneo&&<button type="button" aria-label="Limpiar búsqueda de torneos" onClick={()=>setBuscarTorneo("")}><Icono nombre="cerrar" className="h-4 w-4 text-zinc-400" /></button>}</div>
          <div className="segmented-control" role="group" aria-label="Filtrar torneos por estado">{[{id:"todos",texto:"Todos"},{id:"en_curso",texto:"En curso"},{id:"armado",texto:"Próximos"},{id:"finalizado",texto:"Finalizados"}].map(f=><button type="button" key={f.id} aria-pressed={estadoFiltro===f.id} onClick={()=>setEstadoFiltro(f.id)}>{f.texto}</button>)}</div>
        </div>
        {cargando ? <div role="status" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><span className="sr-only">Cargando torneos</span>{[0,1,2].map(i=><div key={i} className="panel h-60 p-6" aria-hidden="true"><div className="skeleton h-5 w-20" /><div className="skeleton mt-8 h-6 w-3/4" /><div className="skeleton mt-3 h-3 w-1/2" /></div>)}</div> : listaTorneos.length ? <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{listaTorneos.map(t=><TarjetaTorneo key={t.id} torneo={t} nombreJugador={id=>{const j=jugadoresConStats.find(j=>j.id===id);return j?nombreVisible(j):"Jugador";}} accion={puedeEditar&&<button type="button" className="text-xs text-red-300 hover:text-red-200" onClick={()=>{if(window.confirm('¿Borrar el torneo "'+t.nombre+'"? Esto no se puede deshacer.'))void eliminarTorneo(t.id);}}>Eliminar torneo</button>} />)}</div> : <div className="empty-state"><Icono nombre="trofeo" className="h-8 w-8 text-zinc-500" /><h3>{torneos.length?"No hay torneos con estos filtros":"La próxima competencia empieza acá"}</h3><p>{torneos.length?"Probá otro nombre o consultá todos los estados.":"Los torneos publicados aparecerán en este calendario."}</p>{torneos.length>0&&<button type="button" onClick={()=>{setBuscarTorneo("");setEstadoFiltro("todos");}} className="text-link">Limpiar filtros<Icono nombre="flecha" className="h-4 w-4" /></button>}</div>}
      </section>
    </div>
  );
}
