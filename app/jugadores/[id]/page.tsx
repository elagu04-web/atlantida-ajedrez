"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { nombreVisible } from "@/lib/players";

const resultadoColor: Record<string, string> = {
  victoria: "text-green-700",
  empate: "text-zinc-500",
  derrota: "text-red-700",
};

const resultadoLabel: Record<string, string> = {
  victoria: "Victoria",
  empate: "Tablas",
  derrota: "Derrota",
};

export default function JugadorPage() {
  const { id } = useParams<{ id: string }>();
  const jugadoresEnVivo = useJugadoresEnVivo();
  const jugador = jugadoresEnVivo.find((j) => j.id === id);

  if (!jugador) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/jugadores" className="text-sm text-blue-600 hover:underline">
          ← Volver a jugadores
        </Link>
        <p className="text-zinc-600">Ese jugador no existe (o fue eliminado).</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/jugadores" className="text-sm text-blue-600 hover:underline">
          ← Volver a jugadores
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {nombreVisible(jugador)}
        </h1>
        {jugador.apodo && <p className="text-sm text-zinc-400">{jugador.nombre}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Elo Atlántida", value: jugador.eloAtlantida },
          { label: "Partidas", value: jugador.jugadas },
          { label: "Victorias", value: jugador.victorias },
          { label: "Derrotas", value: jugador.derrotas },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <div className="text-xs text-zinc-500">{stat.label}</div>
            <div className="mt-1 text-xl font-semibold font-mono">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Torneo</th>
              <th className="px-4 py-3 font-medium">Rival</th>
              <th className="px-4 py-3 font-medium">Color</th>
              <th className="px-4 py-3 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {jugador.partidas.map((p, i) => (
              <tr key={i} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 text-zinc-500">{p.fecha}</td>
                <td className="px-4 py-3">{p.torneo}</td>
                <td className="px-4 py-3">{p.rival}</td>
                <td className="px-4 py-3 capitalize">{p.color}</td>
                <td className={`px-4 py-3 font-medium ${resultadoColor[p.resultado]}`}>
                  {resultadoLabel[p.resultado]}
                </td>
              </tr>
            ))}
            {jugador.partidas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  Todavía no tiene partidas cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
