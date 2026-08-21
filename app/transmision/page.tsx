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
            <div className="mb-3 flex items-center justify-between text-sm font-medium">
              <span>♔ {estado.blancas || "Blancas"}</span>
              <span className="text-zinc-400">vs</span>
              <span>♚ {estado.negras || "Negras"}</span>
            </div>
            <TableroMini fen={estado.fen} />
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
