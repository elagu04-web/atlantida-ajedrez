"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useJugadores } from "@/context/JugadoresContext";
import { useTorneos } from "@/context/TorneosContext";
import { useAuth } from "@/context/AuthContext";
import { nombreVisible } from "@/lib/players";

export default function InscribirseTorneoPage() {
  const { id } = useParams<{ id: string }>();
  const { obtenerTorneo, alternarInscripcion, cargando } = useTorneos();
  const { reclamarJugador } = useJugadores();
  const jugadores = useJugadoresEnVivo();
  const { session, cargando: cargandoAuth, iniciarSesionConGoogle, cerrarSesion } = useAuth();
  const torneo = obtenerTorneo(id);

  const [busqueda, setBusqueda] = useState("");
  const [enVuelo, setEnVuelo] = useState<string | null>(null);
  const [errorReclamo, setErrorReclamo] = useState<string | null>(null);

  const elegibles = useMemo(() => {
    const filtrados = busqueda.trim()
      ? jugadores.filter((j) => nombreVisible(j).toLowerCase().includes(busqueda.trim().toLowerCase()))
      : jugadores;
    return [...filtrados].sort((a, b) => nombreVisible(a).localeCompare(nombreVisible(b)));
  }, [jugadores, busqueda]);

  const miJugador = session ? jugadores.find((j) => j.email === session.user.email) : undefined;

  if (cargando || cargandoAuth) {
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
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-zinc-400">
            La inscripción para &quot;{torneo.nombre}&quot; ya está cerrada — el torneo ya arrancó.
          </p>
        </div>
      </div>
    );
  }

  async function alternar(jugadorId: string) {
    setEnVuelo(jugadorId);
    await alternarInscripcion(torneo!.id, jugadorId);
    setEnVuelo(null);
  }

  async function reclamar(jugadorId: string) {
    if (!session) return;
    setEnVuelo(jugadorId);
    setErrorReclamo(null);
    const resultado = await reclamarJugador(jugadorId, session.user.email!);
    setEnVuelo(null);
    if (!resultado.ok) {
      setErrorReclamo(
        resultado.error
          ? `No se pudo guardar: ${resultado.error}`
          : "Ese nombre ya fue reclamado por otra persona. Si te parece que es un error, avisale al admin."
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/torneos/${torneo.id}`} className="text-sm text-blue-400 hover:underline">
          ← Ver el torneo
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Anotarse — {torneo.nombre}</h1>
      </div>

      {!session ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="mb-4 text-zinc-400">
            Iniciá sesión con Google para anotarte — así solo vos podés anotarte o sacarte a vos
            mismo.
          </p>
          <button
            onClick={() => iniciarSesionConGoogle()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Iniciar sesión con Google
          </button>
        </div>
      ) : !miJugador ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-sm text-blue-200">
            <span>
              Entraste como <strong>{session.user.email}</strong> — ¿cuál de estos nombres sos vos?
              Elegilo una sola vez.
            </span>
            <button onClick={() => cerrarSesion()} className="shrink-0 text-xs text-blue-300 hover:underline">
              No soy yo, cerrar sesión
            </button>
          </div>

          {errorReclamo && <p className="text-sm text-red-400">{errorReclamo}</p>}

          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar tu nombre..."
            className="w-full max-w-sm rounded-md border border-white/20 px-3 py-2 text-sm"
          />

          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            {elegibles.length === 0 ? (
              <p className="p-4 text-center text-sm text-zinc-400">
                {busqueda ? "Nadie coincide con la búsqueda." : "No hay jugadores activos cargados."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {elegibles.map((j) => {
                  const reclamado = Boolean(j.email);
                  return (
                    <button
                      key={j.id}
                      onClick={() => reclamar(j.id)}
                      disabled={reclamado || enVuelo === j.id}
                      className={`flex items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium disabled:cursor-not-allowed ${
                        reclamado ? "text-zinc-400" : "hover:bg-white/10"
                      }`}
                    >
                      <span>{nombreVisible(j)}</span>
                      {reclamado && <span className="text-xs">ya reclamado</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
            <span>
              Sos <strong>{nombreVisible(miJugador)}</strong>. Tocá tu nombre abajo para
              anotarte o sacarte.
            </span>
            <button onClick={() => cerrarSesion()} className="shrink-0 text-xs text-emerald-400 hover:underline">
              Cerrar sesión
            </button>
          </div>

          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar un nombre..."
            className="w-full max-w-sm rounded-md border border-white/20 px-3 py-2 text-sm"
          />

          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
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
                    <span>{anotado ? "✓ Anotado" : esVos ? "Anotarme" : ""}</span>
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
