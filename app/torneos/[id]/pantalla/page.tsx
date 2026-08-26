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
    return <span className="text-3xl">♞</span>;
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={LOGO_CLUB_URL}
      alt=""
      className="h-14 w-14 object-contain drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]"
      onError={() => setFalloLogo(true)}
    />
  );
}

function FotoJugador({
  fotoUrl,
  nombre,
  claseTam,
}: {
  fotoUrl: string | null | undefined;
  nombre: string;
  claseTam: string;
}) {
  if (fotoUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={fotoUrl}
        alt=""
        className={`shrink-0 rounded-full border-2 border-white/20 object-cover ${claseTam}`}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 font-bold text-zinc-300 ${claseTam}`}
    >
      {nombre.charAt(0).toUpperCase()}
    </span>
  );
}

const TAM_FOTO_PARTIDO = "h-8 w-8 text-sm sm:h-12 sm:w-12 sm:text-lg lg:h-16 lg:w-16 lg:text-2xl";
const TAM_FOTO_PODIO = "h-10 w-10 text-base sm:h-14 sm:w-14 sm:text-xl lg:h-[72px] lg:w-[72px] lg:text-2xl";
const TAM_FOTO_TABLA = "h-7 w-7 text-xs sm:h-9 sm:w-9 sm:text-sm lg:h-11 lg:w-11 lg:text-base";

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
      className="rounded-xl bg-white/10 px-5 py-3 text-base font-semibold text-zinc-300 ring-1 ring-white/10 hover:bg-white/20"
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
  // null = seguir siempre la última ronda jugada (modo en vivo). Un número
  // fijo = quedarse mirando esa ronda pasada hasta que alguien navegue de
  // nuevo.
  const [rondaSeleccionada, setRondaSeleccionada] = useState<number | null>(null);

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
  const numeroAMostrar = rondaSeleccionada ?? rondaActual?.numero ?? null;
  const rondaAMostrar = torneo.rondas.find((r) => r.numero === numeroAMostrar) ?? rondaActual;
  const enVivoMostrando = rondaSeleccionada === null;
  const standings = standingsConDesempates(torneo);
  const podio = standings.slice(0, 3);
  const resto = standings.slice(3);

  function seleccionarRonda(numero: number) {
    setRondaSeleccionada(numero === rondaActual?.numero ? null : numero);
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-zinc-950 p-4 text-white sm:p-6 lg:p-10"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(37,99,235,0.28), transparent), " +
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 40px, transparent 40px 80px)",
      }}
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 lg:mb-8 lg:pb-7">
        <div className="flex min-w-0 items-center gap-3 sm:gap-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-900/20 ring-1 ring-white/10 sm:h-14 sm:w-14 lg:h-20 lg:w-20 lg:rounded-2xl">
            <LogoClub />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-blue-400 sm:text-base">
              Atlántida Ajedrez
              {enVivoMostrando && (
                <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-bold tracking-normal text-red-400 ring-1 ring-red-500/30">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                  EN VIVO
                </span>
              )}
            </div>
            <h1 className="truncate bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-4xl lg:text-6xl">
              {torneo.nombre}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <BotonPantallaCompleta />
          {rondaAMostrar && (
            <div className="rounded-xl bg-gradient-to-b from-blue-500 to-blue-700 px-4 py-2 text-center shadow-lg shadow-blue-900/40 sm:px-9 sm:py-4 lg:rounded-2xl">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-100 sm:text-xs">Ronda</div>
              <div className="text-2xl font-extrabold leading-none sm:text-5xl">{rondaAMostrar.numero}</div>
            </div>
          )}
        </div>
      </div>

      {torneo.rondas.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 lg:mb-8">
          <span className="mr-1 text-xs font-semibold uppercase tracking-widest text-zinc-500 sm:text-sm">
            Rondas:
          </span>
          {torneo.rondas.map((r) => (
            <button
              key={r.numero}
              onClick={() => seleccionarRonda(r.numero)}
              className={`rounded-lg px-3 py-1.5 text-base font-bold sm:px-4 sm:py-2 sm:text-lg ${
                r.numero === numeroAMostrar
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10"
              }`}
            >
              {r.numero}
              {r.numero === rondaActual?.numero && " 🔴"}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:gap-10 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-3 text-xl font-bold text-zinc-300 sm:text-2xl lg:mb-5 lg:text-3xl">
            Partidos {enVivoMostrando ? "de esta ronda" : `— Ronda ${rondaAMostrar?.numero}`}
          </h2>
          {!rondaAMostrar ? (
            <p className="text-base text-zinc-500 sm:text-xl">El torneo todavía no arrancó.</p>
          ) : (
            <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4">
              {rondaAMostrar.emparejamientos.map((e) => {
                const ganoBlancas = e.resultado === "1-0";
                const ganoNegras = e.resultado === "0-1";
                return (
                  <div
                    key={e.numero}
                    className="grid grid-cols-[24px_1fr_44px_1fr_56px] items-center gap-1.5 rounded-xl bg-white/[0.04] px-2.5 py-2.5 ring-1 ring-white/10 sm:grid-cols-[36px_1fr_70px_1fr_90px] sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-4 lg:grid-cols-[56px_1fr_110px_1fr_140px] lg:gap-5 lg:px-7 lg:py-6"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-zinc-300 sm:h-8 sm:w-8 sm:text-base lg:h-11 lg:w-11 lg:text-xl">
                      {e.numero}
                    </span>
                    {e.negrasId ? (
                      <>
                        <span className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-3 lg:gap-4">
                          <span
                            className={`min-w-0 truncate text-right text-sm font-bold sm:text-xl lg:text-4xl ${
                              ganoBlancas ? "text-amber-300" : "text-white"
                            }`}
                          >
                            {nombreDe(e.blancasId)}
                          </span>
                          <FotoJugador fotoUrl={fotoDe(e.blancasId)} nombre={nombreDe(e.blancasId)} claseTam={TAM_FOTO_PARTIDO} />
                        </span>
                        <span className="flex shrink-0 items-center justify-center gap-1 text-xs text-zinc-500 sm:gap-1.5 sm:text-lg lg:gap-2 lg:text-2xl">
                          <span className="hidden h-3 w-3 rounded-sm border border-zinc-500 bg-white sm:block sm:h-5 sm:w-5" />
                          <span className="font-medium">vs</span>
                          <span className="hidden h-3 w-3 rounded-sm border border-zinc-500 bg-zinc-900 sm:block sm:h-5 sm:w-5" />
                        </span>
                        <span className="flex min-w-0 items-center gap-1.5 sm:gap-3 lg:gap-4">
                          <FotoJugador fotoUrl={fotoDe(e.negrasId)} nombre={nombreDe(e.negrasId)} claseTam={TAM_FOTO_PARTIDO} />
                          <span
                            className={`min-w-0 truncate text-sm font-bold sm:text-xl lg:text-4xl ${
                              ganoNegras ? "text-amber-300" : "text-white"
                            }`}
                          >
                            {nombreDe(e.negrasId)}
                          </span>
                        </span>
                        <span
                          className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-center text-[10px] font-extrabold sm:gap-1.5 sm:rounded-lg sm:py-2 sm:text-base lg:rounded-xl lg:py-3 lg:text-2xl ${
                            e.resultado
                              ? "bg-gradient-to-b from-emerald-500 to-emerald-700 text-white shadow shadow-emerald-900/40"
                              : "text-zinc-600"
                          }`}
                        >
                          {e.resultado ? (
                            ETIQUETA_RESULTADO[e.resultado]
                          ) : (
                            <>
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-500 sm:h-2.5 sm:w-2.5" />
                              <span className="hidden font-semibold sm:inline">jugando</span>
                            </>
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="col-span-4 flex min-w-0 items-center gap-1.5 text-sm font-bold text-zinc-400 sm:gap-3 sm:text-xl lg:gap-4 lg:text-4xl">
                        <FotoJugador fotoUrl={fotoDe(e.blancasId)} nombre={nombreDe(e.blancasId)} claseTam={TAM_FOTO_PARTIDO} />
                        <span className="truncate">{nombreDe(e.blancasId)}</span>
                        <span className="shrink-0 text-xs font-medium sm:text-lg lg:text-2xl">— descansa</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-xl font-bold text-zinc-300 sm:text-2xl lg:mb-5 lg:text-3xl">Tabla de posiciones</h2>

          {podio.length > 0 && (
            <div className="mb-3 grid grid-cols-3 gap-1.5 sm:gap-2.5 lg:mb-5 lg:gap-3">
              {podio.map((s, i) => (
                <div
                  key={s.jugadorId}
                  className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-center ring-1 sm:gap-1.5 sm:rounded-2xl sm:px-3 sm:py-4 lg:gap-2 lg:py-5 ${
                    i === 0
                      ? "bg-amber-400/10 ring-amber-400/30"
                      : "bg-white/[0.04] ring-white/10"
                  }`}
                >
                  <span className="text-lg sm:text-2xl lg:text-3xl">{MEDALLA[i]}</span>
                  <FotoJugador fotoUrl={fotoDe(s.jugadorId)} nombre={nombreDe(s.jugadorId)} claseTam={TAM_FOTO_PODIO} />
                  <span className="truncate text-xs font-bold leading-tight sm:text-base lg:text-lg">{nombreDe(s.jugadorId)}</span>
                  <span className="font-mono text-base font-extrabold text-blue-400 sm:text-xl lg:text-2xl">{s.puntos}</span>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/10 sm:rounded-2xl">
            <table className="w-full">
              <tbody>
                {resto.map((s, i) => (
                  <tr key={s.jugadorId} className="border-b border-white/5 last:border-0">
                    <td className="w-8 px-2 py-2 text-sm text-zinc-500 sm:w-10 sm:px-3 sm:py-3 sm:text-lg lg:w-14 lg:px-4 lg:py-4 lg:text-xl">{i + 4}</td>
                    <td className="px-1 py-2 sm:px-2 sm:py-3 lg:py-4">
                      <span className="flex items-center gap-1.5 text-sm font-semibold sm:gap-2 sm:text-lg lg:gap-3 lg:text-2xl">
                        <FotoJugador fotoUrl={fotoDe(s.jugadorId)} nombre={nombreDe(s.jugadorId)} claseTam={TAM_FOTO_TABLA} />
                        {nombreDe(s.jugadorId)}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right font-mono text-lg font-extrabold text-blue-400 sm:px-3 sm:py-3 sm:text-2xl lg:px-4 lg:py-4 lg:text-3xl">
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
        <p className="mt-6 text-center text-xs text-zinc-600 sm:text-sm lg:mt-10">
          Se actualiza solo · última actualización{" "}
          {ultimaActualizacion.toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </p>
      )}
    </div>
  );
}
