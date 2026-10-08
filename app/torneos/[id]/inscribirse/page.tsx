"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useJugadores } from "@/context/JugadoresContext";
import { useTorneos } from "@/context/TorneosContext";
import { useAuth } from "@/context/AuthContext";
import { nombreVisible } from "@/lib/players";
import { useMiJugador } from "@/context/useMiJugador";
import { IdentidadJugador } from "@/components/IdentidadJugador";
import { usePremiosTorneo } from "@/context/usePremiosTorneo";
import { premioAlInscribirse } from "@/lib/premiosTorneo";

export default function InscribirseTorneoPage() {
  const { id } = useParams<{ id: string }>();
  const { obtenerTorneo, alternarInscripcion, cargando } = useTorneos();
  const { liberarJugador } = useJugadores();
  const jugadores = useJugadoresEnVivo();
  const { session, cargando: cargandoAuth, cerrarSesion } = useAuth();
  const torneo = obtenerTorneo(id);

  const [busqueda, setBusqueda] = useState("");
  const [enVuelo, setEnVuelo] = useState<string | null>(null);
  const [liberando, setLiberando] = useState(false);
  const [avisoInscripcion, setAvisoInscripcion] = useState<string | null>(null);
  const { torneos, premios, error: errorPremios } = usePremiosTorneo();

  const elegibles = useMemo(() => {
    const filtrados = busqueda.trim()
      ? jugadores.filter((j) => nombreVisible(j).toLowerCase().includes(busqueda.trim().toLowerCase()))
      : jugadores;
    return [...filtrados].sort((a, b) => nombreVisible(a).localeCompare(nombreVisible(b)));
  }, [jugadores, busqueda]);

  const { jugador: miJugador, cargando: cargandoJugador, error: errorJugador, ambigua } = useMiJugador();
  const miPremio = miJugador && torneo && !errorPremios
    ? premioAlInscribirse(torneos, torneo.id, miJugador.id) : undefined;
  const otroPremio = miJugador && !miPremio && !errorPremios
    ? premios.find(p => p.jugadorId === miJugador.id && p.estado === "reservado") : undefined;

  if (cargando || cargandoAuth || cargandoJugador) {
    return <p className="text-sm text-zinc-400">Cargando...</p>;
  }

  if (!torneo) {
    return <p className="text-sm text-zinc-400">Ese torneo no existe.</p>;
  }

  if (torneo.estado !== "armado") {
    return (
      <div className="flex flex-col gap-4">
        <Link href={`/torneos/${torneo.id}`} className="text-sm text-blue-400 hover:underline">
          ← Ver el torneo
        </Link>
        <div className="panel p-8 text-center">
          <p className="text-zinc-400">
            La inscripción para &quot;{torneo.nombre}&quot; ya está cerrada — el torneo ya arrancó.
          </p>
        </div>
      </div>
    );
  }

  async function alternar(jugadorId: string) {
    if (!miJugador || miJugador.id !== jugadorId || errorJugador || ambigua || enVuelo) return;
    const estabaAnotado = torneo!.inscriptosIds.includes(jugadorId);
    setEnVuelo(jugadorId);
    setAvisoInscripcion(null);
    try {
      const confirmado = await alternarInscripcion(torneo!.id, jugadorId);
      setAvisoInscripcion(confirmado
        ? estabaAnotado ? "Te sacaste de la inscripción." : "Tu inscripción quedó confirmada."
        : "No se pudo confirmar el cambio. Reintentá.");
    } finally { setEnVuelo(null); }
  }

  async function liberar() {
    if (!session || !miJugador) return;
    setLiberando(true);
    await liberarJugador(miJugador.id, session.user.email!);
    setLiberando(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/torneos/${torneo.id}`} className="text-sm text-blue-400 hover:underline">
          ← Ver el torneo
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Anotarse — {torneo.nombre}</h1>
      </div>

      {!session || !miJugador || errorJugador || ambigua ? (
        <div className="panel p-5"><IdentidadJugador/></div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-emerald-500/30 sm:flex-row sm:items-center bg-emerald-500/10 p-3 text-sm text-emerald-200">
            <span>
              Sos <strong>{nombreVisible(miJugador)}</strong>. Tocá tu nombre abajo para
              anotarte o sacarte. Este mismo jugador se usa en tus rachas.
            </span>
            <div className="flex shrink-0 items-center gap-3 text-xs">
              <button
                onClick={liberar}
                disabled={liberando}
                className="text-emerald-400 hover:underline disabled:opacity-50"
              >
                {liberando ? "..." : "¿Te equivocaste? Volver a elegir"}
              </button>
              <button onClick={() => cerrarSesion()} className="text-emerald-400 hover:underline">
                Cerrar sesión
              </button>
            </div>
          </div>

          {miPremio && <section aria-label="Premio para esta inscripción" className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-4">
            <p className="font-semibold text-amber-100">🏆 {torneo.inscriptosIds.includes(miJugador.id) || torneo.jugadoresIds.includes(miJugador.id) ? "Tu inscripción es gratis" : "Este torneo te sale gratis"}</p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">Ganaste <Link href={"/torneos/" + miPremio.origen.id} className="text-amber-200 underline underline-offset-2">{miPremio.origen.nombre}</Link> y tu premio es un torneo sin pagar inscripción.</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{torneo.inscriptosIds.includes(miJugador.id) || torneo.jugadoresIds.includes(miJugador.id) ? "Premio reservado. Si te sacás antes de empezar y todavía no estás en la lista de jugadores, vuelve a estar disponible." : "Se reserva al confirmar que te anotaste. Cada premio se usa una sola vez."}</p>
          </section>}
          {otroPremio?.destino && <p className="rounded-xl border border-white/10 p-3 text-xs leading-relaxed text-zinc-400">Tu torneo gratis está reservado en <Link href={"/torneos/" + otroPremio.destino.id} className="text-amber-200 underline underline-offset-2">{otroPremio.destino.nombre}</Link>.</p>}
          {avisoInscripcion && <p role="status" className="text-sm text-zinc-300">{avisoInscripcion}</p>}

          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar un nombre..."
            className="w-full max-w-sm rounded-md border border-white/20 px-3 py-2 text-sm"
          />

          <div className="panel p-2">
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {elegibles.map((j) => {
                const anotado = torneo.inscriptosIds.includes(j.id);
                const esVos = j.id === miJugador.id;
                return (
                  <button
                    key={j.id}
                    onClick={() => esVos && alternar(j.id)}
                    disabled={!esVos || enVuelo === j.id}
                    className={`flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium ${
                      !esVos ? "cursor-default text-zinc-400" : ""
                    } ${
                      anotado
                        ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                        : esVos
                        ? "hover:bg-white/10"
                        : ""
                    }`}
                  >
                    <span>
                      {nombreVisible(j)} {esVos && <span className="text-xs text-zinc-400">(vos)</span>}
                    </span>
                    <span className="text-right">{esVos && miPremio && <span className="block text-xs text-amber-200">🏆 Gratis</span>}{anotado ? "✓ Anotado" : esVos ? miPremio ? "Anotarme gratis" : "Anotarme" : ""}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-400">
        {torneo.inscriptosIds.length} anotado{torneo.inscriptosIds.length === 1 ? "" : "s"} hasta
        ahora.
      </p>
    </div>
  );
}
