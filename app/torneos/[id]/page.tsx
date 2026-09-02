"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useJugadores } from "@/context/JugadoresContext";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useTorneos } from "@/context/TorneosContext";
import { useAuth } from "@/context/AuthContext";
import { ELO_MINIMO } from "@/lib/elo";
import {
  rondaCompleta,
  puedeEditarJugadores,
  puedeEditarEmparejamientos,
  determinarCampeon,
  SlotEmparejamiento,
  DESEMPATES_DISPONIBLES,
  type FormatoTorneo,
} from "@/lib/tournaments";
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

const ABREVIATURA_DESEMPATE: Record<string, string> = {
  Buchholz: "Bch",
  "Sonneborn-Berger": "SB",
  Progresivo: "Prog",
  "Enfrentamiento directo": "ED",
  "Mayor número de victorias": "Vict",
};

export default function TorneoPage() {
  const { id } = useParams<{ id: string }>();
  const { agregarJugador } = useJugadores();
  const jugadores = useJugadoresEnVivo();
  const {
    obtenerTorneo,
    agregarJugadorATorneo,
    quitarJugadorDeTorneo,
    generarRondas,
    registrarResultado,
    corregirColor,
    eliminarUltimaRonda,
    intercambiarJugadores,
    finalizarTorneo,
    standingsDeTorneo,
    registrarFinalDesempate,
    cambiarFormato,
    convertirASuizo,
    cambiarIdaYVuelta,
    cambiarDesempates,
    alternarAsistencia,
    alternarPago,
    cargando,
  } = useTorneos();
  const { esAdmin } = useAuth();
  const puedeEditar = esAdmin;

  const [byeElegido, setByeElegido] = useState("");
  const [jugadorAAgregar, setJugadorAAgregar] = useState("");
  const [busquedaAgregar, setBusquedaAgregar] = useState("");
  const [mostrarListaAgregar, setMostrarListaAgregar] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [eloNuevo, setEloNuevo] = useState("1500");
  const [modoEdicion, setModoEdicion] = useState(false);
  const [modoEmergencia, setModoEmergencia] = useState(false);
  const [arrastrando, setArrastrando] = useState<SlotEmparejamiento | null>(null);
  const arrastrandoRef = useRef<SlotEmparejamiento | null>(null);
  const [sobreSlot, setSobreSlot] = useState<SlotEmparejamiento | null>(null);
  const [mensajeEdicion, setMensajeEdicion] = useState<string | null>(null);

  const torneo = obtenerTorneo(id);

  if (!torneo) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/torneos" className="text-sm text-blue-400 hover:underline">
          ← Volver a torneos
        </Link>
        <p className="text-zinc-400">
          {cargando ? "Cargando..." : "Ese torneo no existe."}
        </p>
      </div>
    );
  }

  function nombreDe(jugadorId: string) {
    const j = jugadores.find((j) => j.id === jugadorId);
    return j ? nombreVisible(j) : "?";
  }

  function toggleDesempate(nombreDesempate: string) {
    const actuales = torneo!.desempates;
    const nuevo = actuales.includes(nombreDesempate)
      ? actuales.filter((d) => d !== nombreDesempate)
      : [...actuales, nombreDesempate];
    cambiarDesempates(torneo!.id, nuevo);
  }

  function moverDesempate(nombreDesempate: string, direccion: -1 | 1) {
    const actuales = torneo!.desempates;
    const i = actuales.indexOf(nombreDesempate);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= actuales.length) return;
    const copia = [...actuales];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    cambiarDesempates(torneo!.id, copia);
  }

  async function handleNuevoJugador(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nombreNuevo.trim();
    if (!nombreLimpio) return;
    const eloNumero = Math.max(ELO_MINIMO, Number(eloNuevo) || 1500);
    const nuevoId = await agregarJugador(nombreLimpio, eloNumero);
    if (nuevoId) await agregarJugadorATorneo(torneo!.id, nuevoId);
    setNombreNuevo("");
    setEloNuevo("1500");
  }

  function slotDesdeElemento(el: Element | null): SlotEmparejamiento | null {
    const objetivo = el?.closest<HTMLElement>("[data-emp]");
    if (!objetivo) return null;
    const emparejamientoNumero = Number(objetivo.dataset.emp);
    const color = objetivo.dataset.color as "blancas" | "negras" | undefined;
    if (!emparejamientoNumero || !color) return null;
    return { emparejamientoNumero, color };
  }

  function handlePointerDown(ev: React.PointerEvent<HTMLButtonElement>, slot: SlotEmparejamiento) {
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId);
    } catch {
      // algunos navegadores/entornos no permiten capturar un puntero sintético; no es crítico
    }
    arrastrandoRef.current = slot;
    setArrastrando(slot);
    setSobreSlot(null);
    setMensajeEdicion(null);
  }

  function handlePointerMove(ev: React.PointerEvent<HTMLButtonElement>) {
    if (!arrastrandoRef.current) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    setSobreSlot(slotDesdeElemento(el));
  }

  async function handlePointerUp(ev: React.PointerEvent<HTMLButtonElement>, rondaNumero: number) {
    const origen = arrastrandoRef.current;
    arrastrandoRef.current = null;
    setArrastrando(null);
    setSobreSlot(null);
    if (!origen) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY);
    const destino = slotDesdeElemento(el);
    if (!destino) return;
    if (destino.emparejamientoNumero === origen.emparejamientoNumero && destino.color === origen.color) {
      return;
    }
    const ok = await intercambiarJugadores(torneo!.id, rondaNumero, origen, destino, modoEmergencia);
    if (!ok) {
      setMensajeEdicion(
        "Esos dos jugadores ya se enfrentaron antes en este torneo — activá el modo de emergencia para forzarlo igual."
      );
    }
  }

  function handleEliminarUltimaRonda() {
    const ultima = torneo!.rondas[torneo!.rondas.length - 1];
    if (!ultima) return;
    const ok = window.confirm(
      `¿Borrar la ronda ${ultima.numero}? Se pierden los resultados cargados en esa ronda (el Elo se recalcula solo).`
    );
    if (ok) eliminarUltimaRonda(torneo!.id);
  }

  const inscriptos = torneo.jugadoresIds.map((jid) => jugadores.find((j) => j.id === jid)).filter((j) => j !== undefined);
  const disponiblesParaAgregar = jugadores.filter((j) => !torneo.jugadoresIds.includes(j.id));
  const disponiblesFiltrados = disponiblesParaAgregar.filter((j) =>
    `${j.nombre} ${j.apodo ?? ""}`.toLowerCase().includes(busquedaAgregar.trim().toLowerCase())
  );
  const standings = standingsDeTorneo(torneo.id);
  const resultadoCampeon = determinarCampeon(torneo);

  async function handleRegistrarFinal(jugadorIds: string[], ganadorId: string) {
    await registrarFinalDesempate(torneo!.id, jugadorIds, ganadorId);
  }

  const ultimaRonda = torneo.rondas[torneo.rondas.length - 1];
  const puedeEditarEstaRonda = Boolean(ultimaRonda && puedeEditarEmparejamientos(ultimaRonda));
  const alcanzoRondasObjetivo =
    torneo.formato === "suizo" &&
    torneo.rondasObjetivo !== null &&
    torneo.rondas.length >= torneo.rondasObjetivo;
  const generaTodoDeUnaVez = torneo.formato === "round-robin" || torneo.formato === "match";
  const cantidadInvalidaParaMatch = torneo.formato === "match" && torneo.jugadoresIds.length !== 2;
  const puedeGenerarRondas =
    torneo.estado !== "finalizado" &&
    torneo.jugadoresIds.length >= 2 &&
    !cantidadInvalidaParaMatch &&
    !alcanzoRondasObjetivo &&
    (generaTodoDeUnaVez ? torneo.rondas.length === 0 : !ultimaRonda || rondaCompleta(ultimaRonda));

  const textoBotonRondas = generaTodoDeUnaVez
    ? torneo.formato === "match"
      ? "Generar partidas del match"
      : "Generar todas las rondas"
    : torneo.rondas.length === 0
    ? "Generar ronda 1"
    : `Generar ronda ${torneo.rondas.length + 1}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/torneos" className="text-sm text-blue-400 hover:underline">
          ← Volver a torneos
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{torneo.nombre}</h1>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-zinc-400">
              {estadoLabel[torneo.estado]}
            </span>
          </div>
          <Link
            href={`/torneos/${torneo.id}/pantalla`}
            target="_blank"
            className="rounded-md border border-blue-500/40 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/10"
          >
            📺 Abrir pantalla para mostrar
          </Link>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          {formatoLabel[torneo.formato]}
          {torneo.formato === "round-robin" && (torneo.idaYVuelta ? " (ida y vuelta)" : " (ida sola)")}
          {torneo.rondasObjetivo && <> · {torneo.rondasObjetivo} rondas planificadas</>}
          {torneo.desempates.length > 0 && <> · Desempates: {torneo.desempates.join(", ")}</>}
        </p>
        {puedeEditar && torneo.estado === "armado" && torneo.rondas.length === 0 && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="font-medium text-zinc-400">Cambiar formato:</span>
            {(["suizo", "round-robin", "match"] as FormatoTorneo[]).map((f) => (
              <label key={f} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="formatoEdit"
                  checked={torneo.formato === f}
                  onChange={() => cambiarFormato(torneo.id, f)}
                />
                {formatoLabel[f]}
              </label>
            ))}
          </div>
        )}
        {puedeEditar && torneo.estado === "armado" && torneo.rondas.length === 0 && torneo.formato === "round-robin" && (
          <label className="mt-2 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={torneo.idaYVuelta === true}
              onChange={(e) => cambiarIdaYVuelta(torneo.id, e.target.checked)}
            />
            Ida y vuelta (cada rival se enfrenta dos veces, con los colores invertidos)
          </label>
        )}
        {puedeEditar &&
          torneo.formato === "round-robin" &&
          torneo.rondas.length > 0 &&
          torneo.estado !== "finalizado" && (
            <div className="mt-2">
              <button
                onClick={() => {
                  const rondasFuturasVacias = torneo.rondas.filter((r) =>
                    r.emparejamientos.every((e) => e.resultado === null)
                  ).length;
                  const confirmado = window.confirm(
                    `¿Cambiar este torneo a sistema suizo?\n\nDe acá en más las rondas se generan de a una y vas a poder sumar jugadores nuevos aunque el torneo ya haya empezado.${
                      rondasFuturasVacias > 0
                        ? `\n\nSe van a descartar ${rondasFuturasVacias} ronda${
                            rondasFuturasVacias === 1 ? "" : "s"
                          } futuras del calendario de round robin que todavía nadie jugó.`
                        : ""
                    }`
                  );
                  if (confirmado) convertirASuizo(torneo.id);
                }}
                className="text-xs font-medium text-amber-400 hover:underline"
              >
                ⚠ Cambiar a sistema suizo (por si aparece un jugador nuevo)
              </button>
            </div>
          )}
        {puedeEditar && (
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-400">Desempates a usar:</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
              {DESEMPATES_DISPONIBLES.map((d) => (
                <label key={d} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={torneo.desempates.includes(d)}
                    onChange={() => toggleDesempate(d)}
                  />
                  {d}
                </label>
              ))}
            </div>
            {torneo.desempates.length > 0 && (
              <div className="mt-1 flex flex-col gap-1 rounded-md border border-white/10 bg-white/10 p-2">
                <span className="text-xs text-zinc-400">
                  Orden de prioridad (se usa el primero; si empatan, se pasa al siguiente):
                </span>
                {torneo.desempates.map((d, i) => (
                  <div key={d} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-zinc-400">{i + 1}.</span>
                    <span className="flex-1">{d}</span>
                    <button
                      onClick={() => moverDesempate(d, -1)}
                      disabled={i === 0}
                      className="rounded border border-white/20 px-1.5 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moverDesempate(d, 1)}
                      disabled={i === torneo.desempates.length - 1}
                      className="rounded border border-white/20 px-1.5 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {torneo.estado === "armado" && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-blue-200">
              Anotados para este torneo ({torneo.inscriptosIds.length})
            </h2>
            <Link
              href={`/torneos/${torneo.id}/inscribirse`}
              target="_blank"
              className="rounded-md border border-blue-500/40 bg-white/5 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/20"
            >
              🔗 Abrir página para anotarse
            </Link>
          </div>
          {torneo.inscriptosIds.length === 0 ? (
            <p className="text-sm text-blue-300">Todavía no se anotó nadie.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {torneo.inscriptosIds.map((jid) => {
                const j = jugadores.find((x) => x.id === jid);
                const yaEnLista = torneo.jugadoresIds.includes(jid);
                const vino = torneo.asistieronIds.includes(jid);
                return (
                  <li key={jid} className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={vino}
                        onChange={() => alternarAsistencia(torneo.id, jid)}
                        disabled={!puedeEditar}
                        title="Marcar si vino de verdad"
                      />
                      <span className={vino ? "font-medium text-emerald-300" : ""}>
                        {j ? nombreVisible(j) : "?"}
                      </span>
                    </label>
                    {puedeEditar &&
                      (yaEnLista ? (
                        <span className="text-xs text-emerald-400">✓ ya está en el torneo</span>
                      ) : (
                        <button
                          onClick={() => agregarJugadorATorneo(torneo.id, jid)}
                          className="text-xs text-blue-400 hover:underline"
                        >
                          + Agregar al torneo
                        </button>
                      ))}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white/5 p-5">
        <h2 className="mb-3 font-semibold">Jugadores inscriptos ({inscriptos.length})</h2>
        <ul className="flex flex-col gap-1">
          {inscriptos.map((j) => {
            const pago = torneo.pagaronIds.includes(j!.id);
            return (
              <li key={j!.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-3">
                  <span>
                    {nombreVisible(j!)}{" "}
                    <span className="font-mono text-xs text-zinc-400">{j!.eloAtlantida}</span>
                  </span>
                  {puedeEditar && (
                    <label
                      className={`flex items-center gap-1 text-xs ${pago ? "text-amber-300" : "text-zinc-500"}`}
                      title="Marcar si pagó"
                    >
                      <input
                        type="checkbox"
                        checked={pago}
                        onChange={() => alternarPago(torneo.id, j!.id)}
                      />
                      💰 pagó
                    </label>
                  )}
                </span>
                {puedeEditarJugadores(torneo) && puedeEditar && (
                  <button
                    onClick={() => quitarJugadorDeTorneo(torneo.id, j!.id)}
                    className="text-xs text-red-400 hover:underline"
                  >
                    Quitar
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {puedeEditarJugadores(torneo) && puedeEditar && (
          <div className="mt-4 flex flex-col gap-3 border-t border-white/5 pt-4">
            {disponiblesParaAgregar.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={busquedaAgregar}
                    onChange={(e) => {
                      setBusquedaAgregar(e.target.value);
                      setJugadorAAgregar("");
                      setMostrarListaAgregar(true);
                    }}
                    onFocus={() => setMostrarListaAgregar(true)}
                    onBlur={() => setTimeout(() => setMostrarListaAgregar(false), 150)}
                    placeholder="Buscar jugador..."
                    className="w-56 rounded-md border border-white/20 px-2 py-1.5 text-sm"
                  />
                  {mostrarListaAgregar && (
                    <div className="absolute z-10 mt-1 max-h-56 w-56 overflow-y-auto rounded-md border border-white/20 bg-zinc-900 shadow-lg">
                      {disponiblesFiltrados.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-zinc-400">Ningún jugador coincide.</p>
                      ) : (
                        disponiblesFiltrados.map((j) => (
                          <button
                            key={j.id}
                            type="button"
                            onClick={() => {
                              setJugadorAAgregar(j.id);
                              setBusquedaAgregar(nombreVisible(j));
                              setMostrarListaAgregar(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-white/10"
                          >
                            <span>{nombreVisible(j)}</span>
                            <span className="font-mono text-xs text-zinc-400">{j.eloAtlantida}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (!jugadorAAgregar) return;
                    agregarJugadorATorneo(torneo.id, jugadorAAgregar);
                    setJugadorAAgregar("");
                    setBusquedaAgregar("");
                  }}
                  disabled={!jugadorAAgregar}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Agregar
                </button>
              </div>
            )}
            <form onSubmit={handleNuevoJugador} className="flex items-center gap-2">
              <input
                type="text"
                value={nombreNuevo}
                onChange={(e) => setNombreNuevo(e.target.value)}
                placeholder="Nombre de jugador nuevo"
                className="w-52 rounded-md border border-white/20 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={ELO_MINIMO}
                value={eloNuevo}
                onChange={(e) => setEloNuevo(e.target.value)}
                className="w-24 rounded-md border border-white/20 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/10"
              >
                Crear y agregar
              </button>
            </form>
          </div>
        )}
        {!puedeEditarJugadores(torneo) && (
          <p className="mt-3 text-xs text-zinc-400">
            {torneo.estado === "finalizado"
              ? "El torneo ya finalizó — no se puede modificar la lista de jugadores."
              : "En round robin el calendario ya se generó completo — no se puede modificar la lista de jugadores."}
          </p>
        )}
      </div>

      {cantidadInvalidaParaMatch && torneo.rondas.length === 0 && (
        <p className="text-sm text-amber-400">
          El formato Match necesita exactamente 2 jugadores inscriptos (hay {torneo.jugadoresIds.length}).
        </p>
      )}

      {puedeGenerarRondas &&
        puedeEditar &&
        torneo.rondas.length === 0 &&
        torneo.formato !== "match" &&
        torneo.jugadoresIds.length % 2 !== 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-zinc-400">¿Quién descansa en la ronda 1?</span>
            <select
              value={byeElegido}
              onChange={(e) => setByeElegido(e.target.value)}
              className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-xs"
            >
              <option value="">Automático (menor Elo)</option>
              {inscriptos.map((j) => (
                <option key={j!.id} value={j!.id}>
                  {nombreVisible(j!)}
                </option>
              ))}
            </select>
          </div>
        )}

      <div className="flex flex-wrap items-center gap-3">
        {puedeGenerarRondas && puedeEditar && (
          <button
            onClick={() => generarRondas(torneo.id, byeElegido || undefined)}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {textoBotonRondas}
          </button>
        )}
        {torneo.rondas.length > 0 && torneo.estado !== "finalizado" && puedeEditar && (
          <button
            onClick={handleEliminarUltimaRonda}
            className="rounded-md border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
          >
            Eliminar ronda {torneo.rondas.length}
          </button>
        )}
        {torneo.estado === "en_curso" && puedeEditar && (
          <button
            onClick={() => finalizarTorneo(torneo.id)}
            className="rounded-md border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Finalizar torneo
          </button>
        )}
        {alcanzoRondasObjetivo && (
          <p className="text-sm text-zinc-400">
            Se jugaron las {torneo.rondasObjetivo} rondas planificadas.
          </p>
        )}
        {torneo.formato === "suizo" &&
          torneo.estado === "en_curso" &&
          !alcanzoRondasObjetivo &&
          ultimaRonda &&
          !rondaCompleta(ultimaRonda) && (
            <p className="text-sm text-zinc-400">
              Cargá todos los resultados de la ronda {ultimaRonda.numero} para generar la siguiente.
            </p>
          )}
      </div>

      {resultadoCampeon?.tipo === "campeon" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          🏆 Campeón del torneo: <strong>{nombreDe(resultadoCampeon.jugadorId)}</strong>
        </div>
      )}

      {resultadoCampeon?.tipo === "necesita_final" && (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-200">
          <p>
            Empate en la punta{" "}
            {resultadoCampeon.jugadorIds.length > 2 ? "(desempate por planilla no lo resuelve del todo, " : "("}
            se define con una final:{" "}
            <strong>
              {resultadoCampeon.jugadorIds.map((jid) => nombreDe(jid)).join(" vs ")}
            </strong>
            .
          </p>
          {puedeEditar && (
            <div className="mt-2 flex flex-wrap gap-2">
              {resultadoCampeon.jugadorIds.map((jid) => (
                <button
                  key={jid}
                  onClick={() => handleRegistrarFinal(resultadoCampeon.jugadorIds, jid)}
                  className="rounded-md border border-blue-500/40 bg-white/5 px-3 py-1.5 text-xs font-medium hover:bg-blue-500/20"
                >
                  Ganó {nombreDe(jid)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {resultadoCampeon?.tipo === "empate" && (
        <div className="rounded-lg border border-white/10 bg-white/10 p-4 text-sm text-zinc-300">
          Empate en la punta entre {resultadoCampeon.jugadorIds.map((jid) => nombreDe(jid)).join(", ")} — para
          poder elegir quiénes juegan la final hace falta configurar al menos un desempate en el torneo.
        </div>
      )}

      {standings.length > 0 && torneo.rondas.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
          <h2 className="border-b border-white/10 bg-white/10 px-4 py-3 font-semibold">
            Tabla de posiciones
          </h2>
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-left text-zinc-400">
              <tr>
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Jugador</th>
                <th className="px-4 py-2 font-medium">Puntos</th>
                <th className="px-4 py-2 font-medium">Partidas</th>
                {torneo.desempates.map((d) => (
                  <th key={d} className="px-4 py-2 font-medium" title={d}>
                    {ABREVIATURA_DESEMPATE[d] ?? d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.jugadorId} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-2 text-zinc-400">{i + 1}</td>
                  <td className="px-4 py-2">{nombreDe(s.jugadorId)}</td>
                  <td className="px-4 py-2 font-mono">{s.puntos}</td>
                  <td className="px-4 py-2">{s.partidasJugadas}</td>
                  {torneo.desempates.map((d) => (
                    <td key={d} className="px-4 py-2 font-mono text-xs text-zinc-400">
                      {s.desempates[d] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {[...torneo.rondas].reverse().map((ronda) => {
          const esUltima = ronda.numero === ultimaRonda?.numero;
          const editandoEstaRonda = esUltima && modoEdicion && puedeEditarEstaRonda;

          return (
            <div key={ronda.numero} className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/10 px-4 py-3">
                <h3 className="font-semibold">
                  Ronda {ronda.numero}
                  {ronda.advertenciaManual && (
                    <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                      ⚠ emparejamiento forzado manualmente
                    </span>
                  )}
                </h3>
                {esUltima && puedeEditarEstaRonda && puedeEditar && (
                  <button
                    onClick={() => {
                      setModoEdicion((v) => !v);
                      setArrastrando(null);
                      setSobreSlot(null);
                      setMensajeEdicion(null);
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                      modoEdicion
                        ? "bg-blue-600 text-white"
                        : "border border-white/20 hover:bg-white/10"
                    }`}
                  >
                    {modoEdicion ? "Listo" : "✏️ Editar emparejamientos"}
                  </button>
                )}
              </div>

              {editandoEstaRonda && (
                <div className="flex flex-col gap-2 border-b border-white/5 bg-amber-500/10 px-4 py-3 text-sm">
                  <p className="text-zinc-400">
                    Arrastrá un jugador encima de otro para intercambiarlos (también cambia el color).
                  </p>
                  <label className="flex items-center gap-2 font-medium text-amber-300">
                    <input
                      type="checkbox"
                      checked={modoEmergencia}
                      onChange={(ev) => setModoEmergencia(ev.target.checked)}
                    />
                    ⚠ Modo de emergencia: forzar el intercambio aunque no sea válido
                  </label>
                  {mensajeEdicion && <p className="text-red-400">{mensajeEdicion}</p>}
                </div>
              )}

              <div className="flex flex-col divide-y divide-white/5">
                {ronda.emparejamientos.map((e) => {
                  const slotBlancas: SlotEmparejamiento = { emparejamientoNumero: e.numero, color: "blancas" };
                  const slotNegras: SlotEmparejamiento = { emparejamientoNumero: e.numero, color: "negras" };
                  const esSlot = (a: SlotEmparejamiento | null, b: SlotEmparejamiento) =>
                    a?.emparejamientoNumero === b.emparejamientoNumero && a?.color === b.color;

                  function claseSlot(slot: SlotEmparejamiento) {
                    if (esSlot(arrastrando, slot)) {
                      return "cursor-grabbing border-blue-400 bg-blue-500/10 opacity-50";
                    }
                    if (esSlot(sobreSlot, slot)) {
                      return "cursor-grabbing border-blue-400 bg-blue-500/20 ring-2 ring-blue-500 ring-dashed";
                    }
                    return "cursor-grab border-white/20 bg-white/5 hover:bg-white/10";
                  }

                  if (editandoEstaRonda) {
                    return (
                      <div key={e.numero} className="flex items-center gap-2 p-4">
                        <button
                          data-emp={e.numero}
                          data-color="blancas"
                          onPointerDown={(ev) => handlePointerDown(ev, slotBlancas)}
                          onPointerMove={handlePointerMove}
                          onPointerUp={(ev) => handlePointerUp(ev, ronda.numero)}
                          style={{ touchAction: "none" }}
                          className={`flex-1 select-none rounded-md border px-3 py-3 text-sm font-medium ${claseSlot(
                            slotBlancas
                          )}`}
                        >
                          {nombreDe(e.blancasId)}
                        </button>
                        {e.negrasId ? (
                          <>
                            <span className="text-xs text-zinc-400">vs</span>
                            <button
                              data-emp={e.numero}
                              data-color="negras"
                              onPointerDown={(ev) => handlePointerDown(ev, slotNegras)}
                              onPointerMove={handlePointerMove}
                              onPointerUp={(ev) => handlePointerUp(ev, ronda.numero)}
                              style={{ touchAction: "none" }}
                              className={`flex-1 select-none rounded-md border px-3 py-3 text-sm font-medium ${claseSlot(
                                slotNegras
                              )}`}
                            >
                              {nombreDe(e.negrasId)}
                            </button>
                          </>
                        ) : (
                          <span className="flex-1 text-center text-xs text-zinc-400">— descansa —</span>
                        )}
                      </div>
                    );
                  }

                  if (!e.negrasId) {
                    return (
                      <div key={e.numero} className="flex items-center justify-between p-4 text-sm text-zinc-400">
                        <span>{nombreDe(e.blancasId)}</span>
                        <span className="text-zinc-400">— descansa (punto libre) —</span>
                      </div>
                    );
                  }

                  if (!puedeEditar) {
                    return (
                      <div key={e.numero} className="flex items-center justify-between gap-3 p-4 text-sm">
                        <span className={e.resultado === "1-0" ? "font-semibold text-green-400" : ""}>
                          {nombreDe(e.blancasId)}
                        </span>
                        <span className="text-xs text-zinc-400">
                          {e.resultado === "1-0"
                            ? "1 – 0"
                            : e.resultado === "0-1"
                            ? "0 – 1"
                            : e.resultado === "1/2-1/2"
                            ? "½ – ½"
                            : "vs"}
                        </span>
                        <span className={e.resultado === "0-1" ? "font-semibold text-green-400" : ""}>
                          {nombreDe(e.negrasId)}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={e.numero} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="grid flex-1 grid-cols-3 gap-2">
                        <button
                          onClick={() =>
                            registrarResultado(
                              torneo.id,
                              ronda.numero,
                              e.numero,
                              e.resultado === "1-0" ? null : "1-0"
                            )
                          }
                          className={`rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                            e.resultado === "1-0"
                              ? "border-green-500 bg-green-600 text-white"
                              : "border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          🏆 {nombreDe(e.blancasId)}
                        </button>
                        <button
                          onClick={() =>
                            registrarResultado(
                              torneo.id,
                              ronda.numero,
                              e.numero,
                              e.resultado === "1/2-1/2" ? null : "1/2-1/2"
                            )
                          }
                          className={`rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                            e.resultado === "1/2-1/2"
                              ? "border-white/20 bg-white/20 text-white"
                              : "border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          ½ Tablas
                        </button>
                        <button
                          onClick={() =>
                            registrarResultado(
                              torneo.id,
                              ronda.numero,
                              e.numero,
                              e.resultado === "0-1" ? null : "0-1"
                            )
                          }
                          className={`rounded-md border px-3 py-3 text-sm font-medium transition-colors ${
                            e.resultado === "0-1"
                              ? "border-green-500 bg-green-600 text-white"
                              : "border-white/20 bg-white/5 text-zinc-300 hover:bg-white/10"
                          }`}
                        >
                          🏆 {nombreDe(e.negrasId)}
                        </button>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 sm:ml-3">
                        <Link
                          href={`/transmitir?torneo=${torneo.id}&ronda=${ronda.numero}&emp=${e.numero}&blancas=${encodeURIComponent(nombreDe(e.blancasId))}&negras=${encodeURIComponent(nombreDe(e.negrasId))}&blancasId=${e.blancasId}&negrasId=${e.negrasId}`}
                          className="rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
                          title="Transmitir esta partida en vivo desde el tablero"
                        >
                          🔴 Transmitir
                        </Link>
                        <button
                          onClick={() => corregirColor(torneo.id, ronda.numero, e.numero)}
                          className="text-xs text-blue-400 hover:underline"
                          title="Intercambiar quién jugó con blancas y quién con negras"
                        >
                          ↔ colores
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
