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

export default function PantallaTorneoPage() {
  const { id } = useParams<{ id: string }>();
  const { obtenerTorneo } = useTorneos();
  const jugadores = useJugadoresEnVivo();
  const torneoBase = obtenerTorneo(id);

  const [enVivo, setEnVivo] = useState<{ rondas: RondaTorneo[]; estado: EstadoTorneo } | null>(null);

  useEffect(() => {
    let activo = true;
    async function refrescar() {
      const { data } = await supabase.from("torneos").select("rondas, estado").eq("id", id).single();
      if (activo && data) setEnVivo({ rondas: data.rondas ?? [], estado: data.estado });
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

  return (
    <div className="min-h-screen bg-zinc-950 p-8 text-white">
      <div className="mb-8 flex items-center justify-between border-b border-zinc-800 pb-6">
        <div>
          <div className="text-lg font-medium text-blue-400">♞ Atlántida Ajedrez</div>
          <h1 className="text-4xl font-bold tracking-tight">{torneo.nombre}</h1>
        </div>
        {rondaActual && (
          <div className="rounded-xl bg-blue-600 px-6 py-3 text-2xl font-bold">
            Ronda {rondaActual.numero}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.6fr_1fr]">
        <div>
          <h2 className="mb-4 text-2xl font-semibold text-zinc-400">Partidos de esta ronda</h2>
          {!rondaActual ? (
            <p className="text-xl text-zinc-500">El torneo todavía no arrancó.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rondaActual.emparejamientos.map((e) => (
                <div
                  key={e.numero}
                  className="flex items-center gap-4 rounded-xl bg-zinc-900 px-6 py-4"
                >
                  <span className="w-10 shrink-0 text-xl font-medium text-zinc-500">{e.numero}</span>
                  {e.negrasId ? (
                    <>
                      <span className="flex-1 truncate text-right text-3xl font-semibold">
                        {nombreDe(e.blancasId)}
                      </span>
                      <span className="shrink-0 text-2xl text-zinc-600">⚪ vs ⚫</span>
                      <span className="flex-1 truncate text-3xl font-semibold">
                        {nombreDe(e.negrasId)}
                      </span>
                      <span
                        className={`w-24 shrink-0 rounded-lg py-1 text-center text-xl font-bold ${
                          e.resultado ? "bg-emerald-700 text-white" : "text-zinc-600"
                        }`}
                      >
                        {e.resultado ? ETIQUETA_RESULTADO[e.resultado] : "—"}
                      </span>
                    </>
                  ) : (
                    <span className="flex-1 text-3xl font-semibold text-zinc-400">
                      {nombreDe(e.blancasId)} — descansa
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-semibold text-zinc-400">Tabla de posiciones</h2>
          <div className="overflow-hidden rounded-xl bg-zinc-900">
            <table className="w-full">
              <tbody>
                {standings.map((s, i) => (
                  <tr key={s.jugadorId} className="border-b border-zinc-800 last:border-0">
                    <td className="px-4 py-3 text-lg text-zinc-500">{i + 1}</td>
                    <td className="px-4 py-3 text-xl font-medium">{nombreDe(s.jugadorId)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xl font-bold text-blue-400">
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
    </div>
  );
}
