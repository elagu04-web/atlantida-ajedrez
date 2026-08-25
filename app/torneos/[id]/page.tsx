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
    cambiarDesempates,
    cargando,
  } = useTorneos();
  const { esAdmin } = useAuth();
  const puedeEditar = esAdmin;

  const [jugadorAAgregar, setJugadorAAgregar] = useState("");
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
        <Link href="/torneos" className="text-sm text-blue-600 hover:underline">
          ← Volver a torneos
        </Link>
        <p className="text-zinc-600">
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
        <Link href="/torneos" className="text-sm text-blue-600 hover:underline">
          ← Volver a torneos
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{torneo.nombre}</h1>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
              {estadoLabel[torneo.estado]}
            </span>
          </div>
          <Link
            href={`/torneos/${torneo.id}/pantalla`}
            target="_blank"
            className="rounded-md border border-blue-300 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
          >
            📺 Abrir pantalla para mostrar
          </Link>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {formatoLabel[torneo.formato]}
          {torneo.rondasObjetivo && <> · {torneo.rondasObjetivo} rondas planificadas</>}
          {torneo.desempates.length > 0 && <> · Desempates: {torneo.desempates.join(", ")}</>}
        </p>
        {puedeEditar && torneo.estado === "armado" && torneo.rondas.length === 0 && (
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="font-medium text-zinc-500">Cambiar formato:</span>
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
        {puedeEditar && (
          <div className="mt-3 flex flex-col gap-1">
            <span className="text-xs font-medium text-zinc-500">Desempates a usar:</span>
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
              <div className="mt-1 flex flex-col gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-2">
                <span className="text-xs text-zinc-500">
                  Orden de prioridad (se usa el primero; si empatan, se pasa al siguiente):
                </span>
                {torneo.desempates.map((d, i) => (
                  <div key={d} className="flex items-center gap-2 text-xs">
                    <span className="w-4 text-zinc-400">{i + 1}.</span>
                    <span className="flex-1">{d}</span>
                    <button
                      onClick={() => moverDesempate(d, -1)}
                      disabled={i === 0}
                      className="rounded border border-zinc-300 px-1.5 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moverDesempate(d, 1)}
                      disabled={i === torneo.desempates.length - 1}
                      className="rounded border border-zinc-300 px-1.5 disabled:cursor-not-allowed disabled:opacity-30"
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
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-blue-900">
              Anotados para este torneo ({torneo.inscriptosIds.length})
            </h2>
            <Link
              href={`/torneos/${torneo.id}/inscribirse`}
              target="_blank"
              className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              🔗 Abrir página para anotarse
            </Link>
          </div>
          {torneo.inscriptosIds.length === 0 ? (
            <p className="text-sm text-blue-700">Todavía no se anotó nadie.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {torneo.inscriptosIds.map((jid) => {
                const j = jugadores.find((x) => x.id === jid);
                const yaEnLista = torneo.jugadoresIds.includes(jid);
                return (
                  <li key={jid} className="flex items-center justify-between text-sm">
                    <span>{j ? nombreVisible(j) : "?"}</span>
                    {puedeEditar &&
                      (yaEnLista ? (
                        <span className="text-xs text-emerald-700">✓ ya está en el torneo</span>
                      ) : (
                        <button
                          onClick={() => agregarJugadorATorneo(torneo.id, jid)}
                          className="text-xs text-blue-600 hover:underline"
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

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">Jugadores inscriptos ({inscriptos.length})</h2>
        <ul className="flex flex-col gap-1">
          {inscriptos.map((j) => (
            <li key={j!.id} className="flex items-center justify-between text-sm">
              <span>
                {nombreVisible(j!)}{" "}
                <span className="font-mono text-xs text-zinc-500">{j!.eloAtlantida}</span>
              </span>
              {puedeEditarJugadores(torneo) && puedeEditar && (
                <button
                  onClick={() => quitarJugadorDeTorneo(torneo.id, j!.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Quitar
                </button>
              )}
            </li>
          ))}
        </ul>

        {puedeEditarJugadores(torneo) && puedeEditar && (
          <div className="mt-4 flex flex-col gap-3 border-t border-zinc-100 pt-4">
            {disponiblesParaAgregar.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={jugadorAAgregar}
                  onChange={(e) => setJugadorAAgregar(e.target.value)}
                  className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
                >
                  <option value="">Elegir jugador...</option>
                  {disponiblesParaAgregar.map((j) => (
                    <option key={j.id} value={j.id}>
                      {nombreVisible(j)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (!jugadorAAgregar) return;
                    agregarJugadorATorneo(torneo.id, jugadorAAgregar);
                    setJugadorAAgregar("");
                  }}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700"
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
                className="w-52 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min={ELO_MINIMO}
                value={eloNuevo}
                onChange={(e) => setEloNuevo(e.target.value)}
                className="w-24 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50"
              >
                Crear y agregar
              </button>
            </form>
          </div>
        )}
        {!puedeEditarJugadores(torneo) && (
          <p className="mt-3 text-xs text-zinc-500">
            {torneo.estado === "finalizado"
              ? "El torneo ya finalizó — no se puede modificar la lista de jugadores."
              : "En round robin el calendario ya se generó completo — no se puede modificar la lista de jugadores."}
          </p>
        )}
      </div>

      {cantidadInvalidaParaMatch && torneo.rondas.length === 0 && (
        <p className="text-sm text-amber-600">
          El formato Match necesita exactamente 2 jugadores inscriptos (hay {torneo.jugadoresIds.length}).
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {puedeGenerarRondas && puedeEditar && (
          <button
            onClick={() => generarRondas(torneo.id)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            {textoBotonRondas}
          </button>
        )}
        {torneo.rondas.length > 0 && torneo.estado !== "finalizado" && puedeEditar && (
          <button
            onClick={handleEliminarUltimaRonda}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Eliminar ronda {torneo.rondas.length}
          </button>
        )}
        {torneo.estado === "en_curso" && puedeEditar && (
          <button
            onClick={() => finalizarTorneo(torneo.id)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Finalizar torneo
          </button>
        )}
        {alcanzoRondasObjetivo && (
          <p className="text-sm text-zinc-500">
            Se jugaron las {torneo.rondasObjetivo} rondas planificadas.
          </p>
        )}
        {torneo.formato === "suizo" &&
          torneo.estado === "en_curso" &&
          !alcanzoRondasObjetivo &&
          ultimaRonda &&
          !rondaCompleta(ultimaRonda) && (
            <p className="text-sm text-zinc-500">
              Cargá todos los resultados de la ronda {ultimaRonda.numero} para generar la siguiente.
            </p>
          )}
      </div>

      {resultadoCampeon?.tipo === "campeon" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          🏆 Campeón del torneo: <strong>{nombreDe(resultadoCampeon.jugadorId)}</strong>
        </div>
      )}

      {resultadoCampeon?.tipo === "necesita_final" && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
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
                  className="rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-blue-100"
                >
                  Ganó {nombreDe(jid)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {resultadoCampeon?.tipo === "empate" && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          Empate en la punta entre {resultadoCampeon.jugadorIds.map((jid) => nombreDe(jid)).join(", ")} — para
          poder elegir quiénes juegan la final hace falta configurar al menos un desempate en el torneo.
        </div>
      )}

      {standings.length > 0 && torneo.rondas.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <h2 className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 font-semibold">
            Tabla de posiciones
          </h2>
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 text-left text-zinc-500">
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
                <tr key={s.jugadorId} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2 text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-2">{nombreDe(s.jugadorId)}</td>
                  <td className="px-4 py-2 font-mono">{s.puntos}</td>
                  <td className="px-4 py-2">{s.partidasJugadas}</td>
                  {torneo.desempates.map((d) => (
                    <td key={d} className="px-4 py-2 font-mono text-xs text-zinc-500">
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
            <div key={ronda.numero} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                <h3 className="font-semibold">
                  Ronda {ronda.numero}
                  {ronda.advertenciaManual && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
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
                        ? "bg-zinc-900 text-white"
                        : "border border-zinc-300 hover:bg-zinc-50"
                    }`}
                  >
                    {modoEdicion ? "Listo" : "✏️ Editar emparejamientos"}
                  </button>
                )}
              </div>

              {editandoEstaRonda && (
                <div className="flex flex-col gap-2 border-b border-zinc-100 bg-amber-50 px-4 py-3 text-sm">
                  <p className="text-zinc-600">
                    Arrastrá un jugador encima de otro para intercambiarlos (también cambia el color).
                  </p>
                  <label className="flex items-center gap-2 font-medium text-amber-800">
                    <input
                      type="checkbox"
                      checked={modoEmergencia}
                      onChange={(ev) => setModoEmergencia(ev.target.checked)}
                    />
                    ⚠ Modo de emergencia: forzar el intercambio aunque no sea válido
                  </label>
                  {mensajeEdicion && <p className="text-red-600">{mensajeEdicion}</p>}
                </div>
              )}

              <div className="flex flex-col divide-y divide-zinc-100">
                {ronda.emparejamientos.map((e) => {
                  const slotBlancas: SlotEmparejamiento = { emparejamientoNumero: e.numero, color: "blancas" };
                  const slotNegras: SlotEmparejamiento = { emparejamientoNumero: e.numero, color: "negras" };
                  const esSlot = (a: SlotEmparejamiento | null, b: SlotEmparejamiento) =>
                    a?.emparejamientoNumero === b.emparejamientoNumero && a?.color === b.color;

                  function claseSlot(slot: SlotEmparejamiento) {
                    if (esSlot(arrastrando, slot)) {
                      return "cursor-grabbing border-blue-600 bg-blue-50 opacity-50";
                    }
                    if (esSlot(sobreSlot, slot)) {
                      return "cursor-grabbing border-blue-600 bg-blue-100 ring-2 ring-blue-500 ring-dashed";
                    }
                    return "cursor-grab border-zinc-300 bg-white hover:bg-zinc-50";
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
                            <span className="text-xs text-zinc-500">vs</span>
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
                          <span className="flex-1 text-center text-xs text-zinc-500">— descansa —</span>
                        )}
                      </div>
                    );
                  }

                  if (!e.negrasId) {
                    return (
                      <div key={e.numero} className="flex items-center justify-between p-4 text-sm text-zinc-500">
                        <span>{nombreDe(e.blancasId)}</span>
                        <span className="text-zinc-500">— descansa (punto libre) —</span>
                      </div>
                    );
                  }

                  if (!puedeEditar) {
                    return (
                      <div key={e.numero} className="flex items-center justify-between gap-3 p-4 text-sm">
                        <span className={e.resultado === "1-0" ? "font-semibold text-green-700" : ""}>
                          {nombreDe(e.blancasId)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {e.resultado === "1-0"
                            ? "1 – 0"
                            : e.resultado === "0-1"
                            ? "0 – 1"
                            : e.resultado === "1/2-1/2"
                            ? "½ – ½"
                            : "vs"}
                        </span>
                        <span className={e.resultado === "0-1" ? "font-semibold text-green-700" : ""}>
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
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
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
                              ? "border-zinc-600 bg-zinc-600 text-white"
                              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
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
                              ? "border-green-600 bg-green-600 text-white"
                              : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
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
                          className="text-xs text-blue-600 hover:underline"
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
