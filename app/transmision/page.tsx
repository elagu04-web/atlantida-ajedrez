"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TableroMini } from "@/components/TableroMini";
import { AnalisisMotor } from "@/components/AnalisisMotor";
import { CAMARA_BUCKET, CAMARA_ARCHIVO_EN_VIVO } from "@/lib/camaraTablero";

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
}: {
  foto: string | null;
  nombre: string;
  elo: number | null;
  icono: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium">
      {foto ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={foto} alt={nombre} className="h-8 w-8 rounded-full border border-zinc-200 object-cover" />
      ) : (
        <span className="text-lg">{icono}</span>
      )}
      <span>
        {nombre}
        {elo != null && <span className="ml-1 font-mono text-xs text-zinc-500">{elo}</span>}
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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transmisión</h1>
        <p className="mt-1 text-zinc-600">Partida en vivo desde el tablero del club.</p>
      </div>

      {cargando ? (
        <p className="text-sm text-zinc-500">Cargando...</p>
      ) : !estado?.activa ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-500">No hay ninguna transmisión en este momento.</p>
        </div>
      ) : (
        <>
          {estado.camaraActiva && (
            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={fotoTick}
                src={`${urlCamaraTablero.publicUrl}?t=${fotoTick}`}
                alt="Cámara apuntando al tablero real"
                className="max-h-[420px] w-full object-contain"
              />
            </div>
          )}
          <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <JugadorFila
              foto={estado.negrasFoto}
              nombre={estado.negras || "Negras"}
              elo={estado.negrasElo}
              icono="♚"
            />
            <div className="my-2">
              <TableroMini fen={estado.fen} />
            </div>
            <JugadorFila
              foto={estado.blancasFoto}
              nombre={estado.blancas || "Blancas"}
              elo={estado.blancasElo}
              icono="♔"
            />
            <div className="mt-3">
              <AnalisisMotor fen={estado.fen} />
            </div>
            {estado.resultado && (
              <div className="mt-3 flex items-center justify-between rounded-md bg-green-50 px-3 py-2">
                <span className="text-sm font-semibold text-green-800">
                  🏁 Partida terminada: {estado.resultado}
                </span>
                {estado.pgn && (
                  <a
                    href={`data:application/x-chess-pgn;charset=utf-8,${encodeURIComponent(estado.pgn)}`}
                    download={`${(estado.blancas || "blancas")}_vs_${(estado.negras || "negras")}.pgn`}
                    className="text-xs font-medium text-blue-700 hover:underline"
                  >
                    Descargar .pgn
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 font-semibold">Jugadas</h2>
            {estado.jugadas.length === 0 ? (
              <p className="text-sm text-zinc-500">Todavía no se jugó ninguna jugada.</p>
            ) : (
              <ol className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                {estado.jugadas.map((j, i) => (
                  <li key={i} className="font-mono">
                    {i % 2 === 0 && (
                      <span className="mr-1 text-zinc-500">{Math.floor(i / 2) + 1}.</span>
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
