"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useJugadores } from "@/context/JugadoresContext";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useTorneos } from "@/context/TorneosContext";
import { useAuth } from "@/context/AuthContext";
import {
  rondaCompleta,
  puedeEditarJugadores,
  puedeEditarEmparejamientos,
  SlotEmparejamiento,
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
  } = useTorneos();
  const { session } = useAuth();
  const puedeEditar = Boolean(session);

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
        <p className="text-zinc-600">Ese torneo no existe.</p>
      </div>
    );
  }

  function nombreDe(jugadorId: string) {
    const j = jugadores.find((j) => j.id === jugadorId);
    return j ? nombreVisible(j) : "?";
  }

  async function handleNuevoJugador(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nombreNuevo.trim();
    if (!nombreLimpio) return;
    const eloNumero = Number(eloNuevo) || 1500;
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

  const ultimaRonda = torneo.rondas[torneo.rondas.length - 1];
  const puedeEditarEstaRonda = Boolean(ultimaRonda && puedeEditarEmparejamientos(ultimaRonda));
  const alcanzoRondasObjetivo =
    torneo.formato === "suizo" &&
    torneo.rondasObjetivo !== null &&
    torneo.rondas.length >= torneo.rondasObjetivo;
  const puedeGenerarRondas =
    torneo.estado !== "finalizado" &&
    torneo.jugadoresIds.length >= 2 &&
    !alcanzoRondasObjetivo &&
    (torneo.formato === "round-robin"
      ? torneo.rondas.length === 0
      : !ultimaRonda || rondaCompleta(ultimaRonda));

  const textoBotonRondas =
    torneo.formato === "round-robin"
      ? "Generar todas las rondas"
      : torneo.rondas.length === 0
      ? "Generar ronda 1"
      : `Generar ronda ${torneo.rondas.length + 1}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/torneos" className="text-sm text-blue-600 hover:underline">
          ← Volver a torneos
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{torneo.nombre}</h1>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
            {estadoLabel[torneo.estado]}
          </span>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {formatoLabel[torneo.formato]}
          {torneo.rondasObjetivo && <> · {torneo.rondasObjetivo} rondas planificadas</>}
          {torneo.desempates.length > 0 && <> · Desempates: {torneo.desempates.join(", ")}</>}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">Jugadores inscriptos ({inscriptos.length})</h2>
        <ul className="flex flex-col gap-1">
          {inscriptos.map((j) => (
            <li key={j!.id} className="flex items-center justify-between text-sm">
              <span>
                {nombreVisible(j!)}{" "}
                <span className="font-mono text-xs text-zinc-400">{j!.eloAtlantida}</span>
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
          <p className="mt-3 text-xs text-zinc-400">
            {torneo.estado === "finalizado"
              ? "El torneo ya finalizó — no se puede modificar la lista de jugadores."
              : "En round robin el calendario ya se generó completo — no se puede modificar la lista de jugadores."}
          </p>
        )}
      </div>

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
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr key={s.jugadorId} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-2 text-zinc-400">{i + 1}</td>
                  <td className="px-4 py-2">{nombreDe(s.jugadorId)}</td>
                  <td className="px-4 py-2 font-mono">{s.puntos}</td>
                  <td className="px-4 py-2">{s.partidasJugadas}</td>
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
                      <div key={e.numero} className="flex items-center justify-between p-4 text-sm text-zinc-500">
                        <span>{nombreDe(e.blancasId)}</span>
                        <span className="text-zinc-400">— descansa (punto libre) —</span>
                      </div>
                    );
                  }

                  if (!puedeEditar) {
                    return (
                      <div key={e.numero} className="flex items-center justify-between gap-3 p-4 text-sm">
                        <span className={e.resultado === "1-0" ? "font-semibold text-green-700" : ""}>
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
                      <button
                        onClick={() => corregirColor(torneo.id, ronda.numero, e.numero)}
                        className="shrink-0 text-xs text-blue-600 hover:underline sm:ml-3"
                        title="Intercambiar quién jugó con blancas y quién con negras"
                      >
                        ↔ colores
                      </button>
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
