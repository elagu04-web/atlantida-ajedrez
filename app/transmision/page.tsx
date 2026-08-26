"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TableroMini } from "@/components/TableroMini";
import { AnalisisMotor } from "@/components/AnalisisMotor";
import { CAMARA_BUCKET, CAMARA_ARCHIVO_EN_VIVO } from "@/lib/camaraTablero";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";

type EstadoTransmision = {
  activa: boolean;
  fen: string;
  jugadas: string[];
  blancas: string | null;
  negras: string | null;
  blancasFoto: string | null;
  negrasFoto: string | null;
  blancasElo: number | null;
  negrasElo: number | null;
  resultado: string | null;
  pgn: string | null;
  camaraActiva: boolean;
};

const { data: urlCamaraTablero } = supabase.storage
  .from(CAMARA_BUCKET)
  .getPublicUrl(CAMARA_ARCHIVO_EN_VIVO);

function JugadorFila({
  foto,
  nombre,
  elo,
  icono,
  oscuro = false,
}: {
  foto: string | null;
  nombre: string;
  elo: number | null;
  icono: string;
  oscuro?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${oscuro ? "text-white" : ""}`}>
      {foto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={foto}
          alt={nombre}
          className={`h-8 w-8 rounded-full border object-cover ${
            oscuro ? "border-white/20" : "border-white/10"
          }`}
        />
      ) : (
        <span className="text-lg">{icono}</span>
      )}
      <span>
        {nombre}
        {elo != null && (
          <span className={`ml-1 font-mono text-xs ${oscuro ? "text-zinc-400" : "text-zinc-400"}`}>
            {elo}
          </span>
        )}
      </span>
    </div>
  );
}

export default function TransmisionPage() {
  const [estado, setEstado] = useState<EstadoTransmision | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fotoTick, setFotoTick] = useState(0);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      const { data } = await supabase.from("transmision").select("*").limit(1).single();
      if (activo && data) {
        setEstado({
          activa: data.activa,
          fen: data.fen,
          jugadas: data.jugadas ?? [],
          blancas: data.blancas,
          negras: data.negras,
          blancasFoto: data.blancas_foto,
          negrasFoto: data.negras_foto,
          blancasElo: data.blancas_elo,
          negrasElo: data.negras_elo,
          resultado: data.resultado,
          pgn: data.pgn,
          camaraActiva: Boolean(data.camara_activa),
        });
        setFotoTick((t) => t + 1);
        setCargando(false);
      }
    }

    cargar();
    const intervalo = setInterval(cargar, 2000);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  const ultimaJugada = estado?.jugadas.length ? estado.jugadas[estado.jugadas.length - 1] : null;
  const numeroUltimaJugada = estado?.jugadas.length ? Math.ceil(estado.jugadas.length / 2) : null;

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo="Transmisión"
        subtitulo="Partida en vivo desde el tablero del club."
      />

      {cargando ? (
        <p className="text-sm text-zinc-400">Cargando...</p>
      ) : !estado?.activa ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-zinc-400">No hay ninguna transmisión en este momento.</p>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden rounded-lg bg-black">
            {estado.camaraActiva ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={fotoTick}
                src={`${urlCamaraTablero.publicUrl}?t=${fotoTick}`}
                alt="Cámara apuntando al tablero real"
                className="mx-auto max-h-[560px] w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/imagenes/club-fondo.jpg"
                alt="Club de ajedrez Atlántida"
                className="mx-auto max-h-[560px] w-full object-cover opacity-70"
              />
            )}
            <div className="absolute left-1/2 top-3 w-60 -translate-x-1/2 rounded-lg bg-zinc-950/90 p-2.5 shadow-xl backdrop-blur-sm sm:w-64">
              {ultimaJugada && (
                <div className="mb-1.5 flex items-center justify-between border-b border-white/20 pb-1.5 text-[11px] font-medium text-zinc-300">
                  <span>Última jugada</span>
                  <span className="font-mono text-white">
                    {numeroUltimaJugada}. {ultimaJugada}
                  </span>
                </div>
              )}
              <JugadorFila
                oscuro
                foto={estado.negrasFoto}
                nombre={estado.negras || "Negras"}
                elo={estado.negrasElo}
                icono="♚"
              />
              <div className="my-1.5">
                <TableroMini fen={estado.fen} />
              </div>
              <JugadorFila
                oscuro
                foto={estado.blancasFoto}
                nombre={estado.blancas || "Blancas"}
                elo={estado.blancasElo}
                icono="♔"
              />
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <AnalisisMotor fen={estado.fen} />
              {estado.resultado && (
                <div className="mt-3 flex items-center justify-between rounded-md bg-green-500/10 px-3 py-2">
                  <span className="text-sm font-semibold text-green-300">
                    🏁 Partida terminada: {estado.resultado}
                  </span>
                  {estado.pgn && (
                    <a
                      href={`data:application/x-chess-pgn;charset=utf-8,${encodeURIComponent(estado.pgn)}`}
                      download={`${(estado.blancas || "blancas")}_vs_${(estado.negras || "negras")}.pgn`}
                      className="text-xs font-medium text-blue-300 hover:underline"
                    >
                      Descargar .pgn
                    </a>
                  )}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="mb-3 font-semibold">Jugadas</h2>
              {estado.jugadas.length === 0 ? (
                <p className="text-sm text-zinc-400">Todavía no se jugó ninguna jugada.</p>
              ) : (
                <ol className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  {estado.jugadas.map((j, i) => (
                    <li key={i} className="font-mono">
                      {i % 2 === 0 && (
                        <span className="mr-1 text-zinc-400">{Math.floor(i / 2) + 1}.</span>
                      )}
                      {j}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
