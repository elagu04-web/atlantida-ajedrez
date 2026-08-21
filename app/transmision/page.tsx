"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { TableroMini } from "@/components/TableroMini";

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
};

export default function TransmisionPage() {
  const [estado, setEstado] = useState<EstadoTransmision | null>(null);
  const [cargando, setCargando] = useState(true);

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
        });
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
        <p className="text-sm text-zinc-400">Cargando...</p>
      ) : !estado?.activa ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <p className="text-zinc-500">No hay ninguna transmisión en este momento.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              {[
                { foto: estado.blancasFoto, nombre: estado.blancas || "Blancas", elo: estado.blancasElo, icono: "♔" },
                { foto: estado.negrasFoto, nombre: estado.negras || "Negras", elo: estado.negrasElo, icono: "♚" },
              ].map(({ foto, nombre, elo, icono }, i) => (
                <div key={i} className="flex items-center gap-2 text-sm font-medium">
                  {foto ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={foto}
                      alt={nombre}
                      className="h-8 w-8 rounded-full border border-zinc-200 object-cover"
                    />
                  ) : (
                    <span className="text-lg">{icono}</span>
                  )}
                  <span>
                    {nombre}
                    {elo != null && <span className="ml-1 font-mono text-xs text-zinc-400">{elo}</span>}
                  </span>
                </div>
              ))}
            </div>
            <TableroMini fen={estado.fen} />
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
      )}
    </div>
  );
}
