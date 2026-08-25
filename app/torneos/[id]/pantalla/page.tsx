"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useTorneos } from "@/context/TorneosContext";
import { supabase } from "@/lib/supabase";
import { standingsConDesempates, type RondaTorneo, type EstadoTorneo } from "@/lib/tournaments";
import { nombreVisible } from "@/lib/players";

const ETIQUETA_RESULTADO: Record<string, string> = {
  "1-0": "1 – 0",
  "0-1": "0 – 1",
  "1/2-1/2": "½ – ½",
};

const MEDALLA: Record<number, string> = { 0: "🥇", 1: "🥈", 2: "🥉" };

const LOGO_CLUB_URL = "/imagenes/logo-club.png";

function LogoClub() {
  const [falloLogo, setFalloLogo] = useState(false);
  if (falloLogo) {
    return <span className="text-2xl">♞</span>;
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={LOGO_CLUB_URL}
      alt=""
      className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]"
      onError={() => setFalloLogo(true)}
    />
  );
}

function FotoJugador({
  fotoUrl,
  nombre,
  tam,
}: {
  fotoUrl: string | null | undefined;
  nombre: string;
  tam: number;
}) {
  const estilo = { width: tam, height: tam };
  if (fotoUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={fotoUrl}
        alt=""
        style={estilo}
        className="shrink-0 rounded-full border-2 border-white/20 object-cover"
      />
    );
  }
  return (
    <span
      style={estilo}
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 font-bold text-zinc-300"
    >
      {nombre.charAt(0).toUpperCase()}
    </span>
  );
}

function BotonPantallaCompleta() {
  const [enPantallaCompleta, setEnPantallaCompleta] = useState(false);

  useEffect(() => {
    function actualizar() {
      setEnPantallaCompleta(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", actualizar);
    return () => document.removeEventListener("fullscreenchange", actualizar);
  }, []);

  function alternar() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  return (
    <button
      onClick={alternar}
      className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 ring-1 ring-white/10 hover:bg-white/20"
    >
      {enPantallaCompleta ? "⤡ Salir de pantalla completa" : "⛶ Pantalla completa"}
    </button>
  );
}

export default function PantallaTorneoPage() {
  const { id } = useParams<{ id: string }>();
  const { obtenerTorneo } = useTorneos();
  const jugadores = useJugadoresEnVivo();
  const torneoBase = obtenerTorneo(id);

  const [enVivo, setEnVivo] = useState<{ rondas: RondaTorneo[]; estado: EstadoTorneo } | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  useEffect(() => {
    let activo = true;
    async function refrescar() {
      const { data } = await supabase.from("torneos").select("rondas, estado").eq("id", id).single();
      if (activo && data) {
        setEnVivo({ rondas: data.rondas ?? [], estado: data.estado });
        setUltimaActualizacion(new Date());
      }
    }
    refrescar();
    const intervalo = setInterval(refrescar, 3000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [id]);

  function nombreDe(jugadorId: string) {
    const j = jugadores.find((x) => x.id === jugadorId);
    return j ? nombreVisible(j) : "?";
  }

  function fotoDe(jugadorId: string) {
    return jugadores.find((x) => x.id === jugadorId)?.fotoUrl ?? null;
  }

  if (!torneoBase) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Cargando torneo...
      </div>
    );
  }

  const torneo = enVivo ? { ...torneoBase, rondas: enVivo.rondas, estado: enVivo.estado } : torneoBase;
  const rondaActual = torneo.rondas[torneo.rondas.length - 1] ?? null;
  const standings = standingsConDesempates(torneo);
  const lider = standings[0];

  return (
    <div
      className="min-h-screen bg-zinc-950 p-8 text-white"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(37,99,235,0.28), transparent), " +
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 40px, transparent 40px 80px)",
      }}
    >
      <div className="mb-10 flex items-center justify-between border-b border-white/10 pb-7">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-900/20 ring-1 ring-white/10">
            <LogoClub />
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              Atlántida Ajedrez
              <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold tracking-normal text-red-400 ring-1 ring-red-500/30">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                EN VIVO
              </span>
            </div>
            <h1 className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent">
              {torneo.nombre}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <BotonPantallaCompleta />
          {rondaActual && (
            <div className="rounded-2xl bg-gradient-to-b from-blue-500 to-blue-700 px-8 py-4 text-center shadow-lg shadow-blue-900/40">
              <div className="text-xs font-semibold uppercase tracking-widest text-blue-100">Ronda</div>
              <div className="text-4xl font-extrabold leading-none">{rondaActual.numero}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-4 text-2xl font-bold text-zinc-300">Partidos de esta ronda</h2>
          {!rondaActual ? (
            <p className="text-xl text-zinc-500">El torneo todavía no arrancó.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rondaActual.emparejamientos.map((e) => {
                const ganoBlancas = e.resultado === "1-0";
                const ganoNegras = e.resultado === "0-1";
                return (
                  <div
                    key={e.numero}
                    className="flex items-center gap-4 rounded-2xl bg-white/[0.04] px-6 py-4 ring-1 ring-white/10"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-lg font-bold text-zinc-300">
                      {e.numero}
                    </span>
                    {e.negrasId ? (
                      <>
                        <span className="flex flex-1 items-center justify-end gap-3">
                          <span
                            className={`truncate text-right text-3xl font-bold ${
                              ganoBlancas ? "text-amber-300" : "text-white"
                            }`}
                          >
                            {nombreDe(e.blancasId)}
                          </span>
                          <FotoJugador fotoUrl={fotoDe(e.blancasId)} nombre={nombreDe(e.blancasId)} tam={48} />
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5 text-xl text-zinc-500">
                          <span className="h-4 w-4 rounded-sm border border-zinc-500 bg-white" />
                          <span className="text-sm font-medium">vs</span>
                          <span className="h-4 w-4 rounded-sm border border-zinc-500 bg-zinc-900" />
                        </span>
                        <span className="flex flex-1 items-center gap-3">
                          <FotoJugador fotoUrl={fotoDe(e.negrasId)} nombre={nombreDe(e.negrasId)} tam={48} />
                          <span
                            className={`truncate text-3xl font-bold ${
                              ganoNegras ? "text-amber-300" : "text-white"
                            }`}
                          >
                            {nombreDe(e.negrasId)}
                          </span>
                        </span>
                        <span
                          className={`flex w-28 shrink-0 items-center justify-center gap-1.5 rounded-xl py-2 text-center text-xl font-extrabold ${
                            e.resultado
                              ? "bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow shadow-emerald-900/40"
                              : "text-zinc-600"
                          }`}
                        >
                          {e.resultado ? (
                            ETIQUETA_RESULTADO[e.resultado]
                          ) : (
                            <>
                              <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-500" />
                              <span className="text-sm font-semibold">jugando</span>
                            </>
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="flex flex-1 items-center gap-3 text-3xl font-bold text-zinc-400">
                        <FotoJugador fotoUrl={fotoDe(e.blancasId)} nombre={nombreDe(e.blancasId)} tam={48} />
                        {nombreDe(e.blancasId)} <span className="text-xl font-medium">— descansa</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-bold text-zinc-300">Tabla de posiciones</h2>
          <div className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
            <table className="w-full">
              <tbody>
                {standings.map((s, i) => (
                  <tr
                    key={s.jugadorId}
                    className={`border-b border-white/5 last:border-0 ${
                      i === 0 && lider ? "bg-amber-400/10" : ""
                    }`}
                  >
                    <td className="w-12 px-4 py-3 text-lg text-zinc-500">
                      {MEDALLA[i] ?? i + 1}
                    </td>
                    <td className="px-2 py-3">
                      <span className="flex items-center gap-3 text-xl font-semibold">
                        <FotoJugador fotoUrl={fotoDe(s.jugadorId)} nombre={nombreDe(s.jugadorId)} tam={36} />
                        {nombreDe(s.jugadorId)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-2xl font-extrabold text-blue-400">
                      {s.puntos}
                    </td>
                  </tr>
                ))}
                {standings.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-zinc-500">Sin datos todavía.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {ultimaActualizacion && (
        <p className="mt-8 text-center text-xs text-zinc-600">
          Se actualiza solo · última actualización{" "}
          {ultimaActualizacion.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}
    </div>
  );
}
