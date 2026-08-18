"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useTorneos } from "@/context/TorneosContext";
import { ResultadoPartida, rondaCompleta, puedeEditarJugadores } from "@/lib/tournaments";

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
  const jugadores = useJugadoresEnVivo();
  const {
    obtenerTorneo,
    agregarJugadorATorneo,
    quitarJugadorDeTorneo,
    generarRondas,
    registrarResultado,
    finalizarTorneo,
    standingsDeTorneo,
  } = useTorneos();

  const [jugadorAAgregar, setJugadorAAgregar] = useState("");

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
    return jugadores.find((j) => j.id === jugadorId)?.nombre ?? "?";
  }

  const inscriptos = torneo.jugadoresIds.map((jid) => jugadores.find((j) => j.id === jid)).filter((j) => j !== undefined);
  const disponiblesParaAgregar = jugadores.filter((j) => !torneo.jugadoresIds.includes(j.id));
  const standings = standingsDeTorneo(torneo.id);

  const ultimaRonda = torneo.rondas[torneo.rondas.length - 1];
  const puedeGenerarRondas =
    torneo.estado !== "finalizado" &&
    torneo.jugadoresIds.length >= 2 &&
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
          {torneo.desempates.length > 0 && <> · Desempates: {torneo.desempates.join(", ")}</>}
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="mb-3 font-semibold">Jugadores inscriptos ({inscriptos.length})</h2>
        <ul className="flex flex-col gap-1">
          {inscriptos.map((j) => (
            <li key={j!.id} className="flex items-center justify-between text-sm">
              <span>
                {j!.nombre}{" "}
                <span className="font-mono text-xs text-zinc-400">{j!.eloAtlantida}</span>
              </span>
              {puedeEditarJugadores(torneo) && (
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

        {puedeEditarJugadores(torneo) && disponiblesParaAgregar.length > 0 && (
          <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-4">
            <select
              value={jugadorAAgregar}
              onChange={(e) => setJugadorAAgregar(e.target.value)}
              className="rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
            >
              <option value="">Elegir jugador...</option>
              {disponiblesParaAgregar.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nombre}
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
        {!puedeEditarJugadores(torneo) && (
          <p className="mt-3 text-xs text-zinc-400">
            {torneo.estado === "finalizado"
              ? "El torneo ya finalizó — no se puede modificar la lista de jugadores."
              : "En round robin el calendario ya se generó completo — no se puede modificar la lista de jugadores."}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {puedeGenerarRondas && (
          <button
            onClick={() => generarRondas(torneo.id)}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            {textoBotonRondas}
          </button>
        )}
        {torneo.estado === "en_curso" && (
          <button
            onClick={() => finalizarTorneo(torneo.id)}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            Finalizar torneo
          </button>
        )}
        {torneo.formato === "suizo" &&
          torneo.estado === "en_curso" &&
          ultimaRonda &&
          !rondaCompleta(ultimaRonda) && (
            <p className="self-center text-sm text-zinc-500">
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
        {[...torneo.rondas].reverse().map((ronda) => (
          <div key={ronda.numero} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <h3 className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 font-semibold">
              Ronda {ronda.numero}
            </h3>
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 text-left text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Blancas</th>
                  <th className="px-4 py-2 font-medium">Negras</th>
                  <th className="px-4 py-2 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {ronda.emparejamientos.map((e) => (
                  <tr key={e.numero} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-2">{nombreDe(e.blancasId)}</td>
                    <td className="px-4 py-2">
                      {e.negrasId ? nombreDe(e.negrasId) : <span className="text-zinc-400">— descansa —</span>}
                    </td>
                    <td className="px-4 py-2">
                      {e.negrasId ? (
                        <select
                          value={e.resultado ?? ""}
                          onChange={(ev) =>
                            registrarResultado(
                              torneo.id,
                              ronda.numero,
                              e.numero,
                              (ev.target.value || null) as ResultadoPartida | null
                            )
                          }
                          className="rounded-md border border-zinc-300 px-2 py-1 text-sm"
                        >
                          <option value="">Sin resultado</option>
                          <option value="1-0">1 - 0 (ganan blancas)</option>
                          <option value="0-1">0 - 1 (ganan negras)</option>
                          <option value="1/2-1/2">½ - ½ (tablas)</option>
                        </select>
                      ) : (
                        <span className="text-zinc-400">punto libre</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
