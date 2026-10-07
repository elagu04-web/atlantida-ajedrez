"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useJugadores } from "@/context/JugadoresContext";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useAuth } from "@/context/AuthContext";
import { nombreVisible } from "@/lib/players";
import { ELO_MINIMO, jugoRecientemente, type JugadorEnVivo } from "@/lib/elo";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";
import { Icono } from "@/components/Icono";
import { GraficoBarras } from "@/components/GraficoBarras";
import { useTorneos } from "@/context/TorneosContext";
import { ultimoTorneoConResultados } from "@/lib/tournaments";
import { normalizarBusqueda, posicionesElo, formaReciente, resumirPartidas } from "@/lib/rendimiento";

type Orden = "elo" | "partidas" | "progreso";

function Forma({ jugador }: { jugador: JugadorEnVivo }) {
  const partidas=formaReciente(jugador);
  return <span className="recent-form" aria-label="Últimas cinco partidas, de la más antigua a la más reciente">{partidas.length?partidas.map((p,i)=><span key={i} className={`form-${p.resultado}`} title={`${p.fecha} · ${p.rival}: ${p.resultado}`}>{p.resultado==="victoria"?"V":p.resultado==="empate"?"T":"D"}</span>):<span className="text-xs text-zinc-500">Sin partidas</span>}</span>;
}

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
  const { obtenerJugador, errorCarga } = useJugadores();
  const jugadoresConStats = useJugadoresEnVivo();
  const {torneos,cargando:cargandoTorneos,errorCarga:errorTorneos}=useTorneos();
  const ultimoTorneo=ultimoTorneoConResultados(torneos);
  const posiciones=posicionesElo(jugadoresConStats.filter(j=>j.jugadas>0));
  const activos=jugadoresConStats.filter(jugoRecientemente);
  const media=activos.length?Math.round(activos.reduce((s,j)=>s+j.eloAtlantida,0)/activos.length):null;
  const { esAdmin } = useAuth();
  const puedeEditar = esAdmin;

  const distribucionElo = useMemo(() => {
    const porFranja = new Map<number, number>();
    for (const j of jugadoresConStats) {
      const franja = Math.floor(j.eloAtlantida / 100) * 100;
      porFranja.set(franja, (porFranja.get(franja) ?? 0) + 1);
    }
    return [...porFranja.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([franja, cantidad]) => ({ etiqueta: `${franja}–${franja + 99}`, valor: cantidad }));
  }, [jugadoresConStats]);

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
    setEditElo(String(obtenerJugador(j.id)?.eloAtlantida ?? j.eloAtlantida));
  }

  async function guardarEdicion() {
    if (!editandoId) return;
    const eloNumero = Number(editElo);
    const eloValido = Number.isFinite(eloNumero) ? eloNumero : 1500;
    if (await actualizarJugador(editandoId, editNombre, Math.max(ELO_MINIMO, eloValido))) setEditandoId(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    const eloNumero = Math.max(ELO_MINIMO, Number(elo) || 1500);
    if (!await agregarJugador(nombreLimpio, eloNumero, apodo)) return;
    setNombre("");
    setApodo("");
    setElo("1500");
  }

  const ocultosPorInactividad = useMemo(
    () => jugadoresConStats.filter((j) => !jugoRecientemente(j)).length,
    [jugadoresConStats]
  );

  const lista = useMemo(() => {
    const visibles = mostrarTodos || busqueda.trim() ? jugadoresConStats : jugadoresConStats.filter(jugoRecientemente);
    const filtrados = busqueda.trim()
      ? visibles.filter((j: JugadorEnVivo) =>
          normalizarBusqueda(`${j.nombre} ${j.apodo ?? ""}`).includes(normalizarBusqueda(busqueda))
        )
      : visibles;
    return [...filtrados].sort((a, b) =>
      (orden === "elo" ? b.eloAtlantida - a.eloAtlantida : orden === "progreso" ? (b.eloAtlantida-b.eloAntesUltimoTorneo)-(a.eloAtlantida-a.eloAntesUltimoTorneo) : b.jugadas - a.jugadas) || a.nombre.localeCompare(b.nombre,"es")
    );
  }, [jugadoresConStats, busqueda, orden, mostrarTodos]);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Ranking Elo"
        subtitulo="El nivel actual, el progreso y la forma reciente de los jugadores del club."
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

      {(errorCarga||errorTorneos) && <p role="status" className="text-sm text-amber-300">{errorCarga||errorTorneos}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[{valor:activos.length,texto:"Activos en el último año"},{valor:media??"—",texto:"Elo medio de activos"},{valor:jugadoresConStats.filter(j=>!j.jugadas).length,texto:"Aún sin partidas"}].map(m=><div key={m.texto} className="panel p-4"><p className="text-2xl font-semibold tabular-nums">{cargando||cargandoTorneos?"…":m.valor}</p><p className="mt-2 text-xs text-zinc-400">{m.texto}</p></div>)}</div>
      {distribucionElo.length > 0 && (
        <div className="panel p-5">
          <details><summary className="flex items-center justify-between gap-3 text-sm font-medium"><span>El plantel en números</span><span className="text-xs text-zinc-400">Distribución de Elo ↓</span></summary><div className="mt-5">
          <GraficoBarras datos={distribucionElo} /></div></details>
        </div>
      )}

      {puedeEditar && (
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 panel p-4"
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

      <div className="filter-toolbar">
        <div className="search-field"><Icono nombre="buscar" className="h-4 w-4 shrink-0 text-zinc-500" /><input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar jugador por nombre o apodo"
          placeholder="Buscar jugador..."
          className="min-w-0 flex-1"
        />{busqueda&&<button type="button" aria-label="Limpiar búsqueda de jugadores" onClick={()=>setBusqueda("")}><Icono nombre="cerrar" className="h-4 w-4 text-zinc-400" /></button>}</div>
        <div className="segmented-control" role="group" aria-label="Ordenar jugadores">
          <button
            aria-pressed={orden === "elo"}
            onClick={() => setOrden("elo")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              orden === "elo" ? "bg-blue-600 text-white" : "border border-white/20 hover:bg-white/10"
            }`}
          >
            Elo
          </button>
          <button
            aria-pressed={orden === "partidas"}
            onClick={() => setOrden("partidas")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              orden === "partidas" ? "bg-blue-600 text-white" : "border border-white/20 hover:bg-white/10"
            }`}
          >
            Partidas jugadas
          </button>
          <button aria-pressed={orden==="progreso"} onClick={()=>setOrden("progreso")}>Progreso</button>
        </div>
      </div>

      {ocultosPorInactividad > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-white/10 px-3 py-2 text-xs text-zinc-400">
          <span>
            {busqueda.trim()
              ? "La búsqueda incluye también a jugadores inactivos y sin partidas."
              : mostrarTodos
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400"><p>{cargando||cargandoTorneos?"Cargando ranking…":`${lista.length} ${lista.length===1?"jugador":"jugadores"} en esta vista`}</p><p>Posición global entre jugadores con partidas · empates de Elo comparten puesto</p></div>
      <p className="text-xs leading-relaxed text-zinc-500">Elo Atlántida es el rating interno del club. Δ Elo compara antes y después de {ultimoTorneo?`“${ultimoTorneo.nombre}”`:"la última competencia"}. La forma muestra hasta cinco resultados, de izquierda a derecha. Sin partidas: Elo inicial, sin puesto competitivo.</p>
      <div className="overflow-x-auto panel">
        <table className="ranking-table w-full text-sm">
          <thead className="border-b border-white/10 bg-white/10 text-left text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              {puedeEditar&&<th className="px-4 py-3 font-medium">ID FIDE</th>}
              <th className="px-4 py-3 font-medium">Elo Atlántida</th>
              <th className="px-4 py-3 font-medium">Δ Elo</th>
              <th className="ranking-secondary px-4 py-3 font-medium">PJ</th>
              <th className="ranking-secondary px-4 py-3 font-medium">Rendimiento</th>
              <th className="ranking-secondary px-4 py-3 font-medium">Forma</th>
              {puedeEditar&&<th className="px-4 py-3 font-medium">Gestión</th>}
            </tr>
          </thead>
          <tbody>
            {(!cargando&&!cargandoTorneos?lista:[]).map((j) =>
              editandoId === j.id && puedeEditar ? (
                <tr key={j.id} className="border-b border-white/5 bg-white/10 last:border-0">
                  <td className="px-4 py-3 text-zinc-400">{posiciones.get(j.id)??"—"}</td>
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
                  <td className="px-4 py-3 text-zinc-400" colSpan={4}>
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
                  <td className="px-4 py-3 text-zinc-400">{posiciones.get(j.id)??"—"}</td>
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
                    <span className="mt-1 block text-[10px] text-zinc-500">{j.jugadas?`${j.jugadas} partidas · ${j.victorias} V / ${j.empates} T / ${j.derrotas} D`:"Elo inicial · sin partidas"}</span>
                    <span className="ranking-mobile-form mt-2"><Forma jugador={j} /></span>
                    <div>
                      <ApodoCelda
                        jugadorId={j.id}
                        apodoActual={j.apodo}
                        puedeEditar={puedeEditar}
                        onGuardar={actualizarApodo}
                      />
                    </div>
                  </td>
                  {puedeEditar&&<td className="px-4 py-3">
                    <FideIdCelda
                      jugadorId={j.id}
                      fideIdActual={j.fideId}
                      puedeEditar={puedeEditar}
                      onGuardar={actualizarFideId}
                    />
                  </td>}
                  <td className="px-4 py-3 font-mono text-lg text-blue-200">{j.eloAtlantida}</td>
                  <td className={`px-4 py-3 font-mono ${j.eloAtlantida>j.eloAntesUltimoTorneo?"text-emerald-300":j.eloAtlantida<j.eloAntesUltimoTorneo?"text-red-300":"text-zinc-500"}`}>{j.eloAtlantida>j.eloAntesUltimoTorneo?"+":""}{j.eloAtlantida-j.eloAntesUltimoTorneo}</td>
                  <td className="ranking-secondary px-4 py-3">{j.jugadas}</td>
                  <td className="ranking-secondary px-4 py-3">{j.jugadas?`${resumirPartidas(j.partidas).rendimiento!.toFixed(1)}%`:"—"}</td>
                  <td className="ranking-secondary px-4 py-3"><Forma jugador={j} /></td>
                  {puedeEditar&&<td className="px-4 py-3 text-right whitespace-nowrap">
                    {puedeEditar && (
                      <>
                        <button
                          onClick={() => empezarEdicion(j)}
                          className="mr-3 text-xs text-blue-400 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => { if (window.confirm(`¿Eliminar a ${nombreVisible(j)}? Solo se permite si no tiene historial en torneos.`)) void eliminarJugador(j.id); }}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>}
                </tr>
              )
            )}
            {(lista.length === 0 || cargando || cargandoTorneos) && (
              <tr>
                <td colSpan={puedeEditar?9:7} className="px-4 py-6 text-center text-zinc-400">
                  {cargando||cargandoTorneos
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
