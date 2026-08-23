"use client";

import Link from "next/link";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useJugadores } from "@/context/JugadoresContext";
import { nombreVisible } from "@/lib/players";
import { TextoBrillante } from "@/components/TextoBrillante";

function manejarSpotlight(ev: React.MouseEvent<HTMLElement>) {
  const rect = ev.currentTarget.getBoundingClientRect();
  ev.currentTarget.style.setProperty("--x", `${ev.clientX - rect.left}px`);
  ev.currentTarget.style.setProperty("--y", `${ev.clientY - rect.top}px`);
}

export default function Home() {
  const jugadoresEnVivo = useJugadoresEnVivo();
  const { cargando } = useJugadores();
  const top3 = jugadoresEnVivo.slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-lg bg-zinc-950 p-6">
        <div className="fondo-aurora fondo-aurora-oscuro" />
        <div className="relative z-10">
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Bienvenido al sistema de torneos de{" "}
            <TextoBrillante oscuro>Atlántida</TextoBrillante>
          </h1>
          <p className="mt-2 text-zinc-400">
            Ranking, torneos y estadísticas del club de ajedrez Atlántida.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Ranking Elo Atlántida (top 3)</h2>
          <Link href="/jugadores" className="text-sm text-blue-600 hover:underline">
            Ver todos los jugadores →
          </Link>
        </div>
        {top3.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {cargando ? "Cargando..." : "Todavía no hay jugadores cargados."}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {top3.map((j, i) => (
              <li key={j.id} className="flex items-center justify-between text-sm">
                <span>
                  <span className="mr-2 text-zinc-500">{i + 1}.</span>
                  {nombreVisible(j)}
                </span>
                <span className="font-mono font-semibold">{j.eloAtlantida}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { href: "/torneos", label: "Torneos", desc: "Round robin y sistema suizo" },
          { href: "/estadisticas", label: "Estadísticas", desc: "Gráficas de rendimiento" },
          { href: "/transmision", label: "Transmisión", desc: "Partidas en vivo" },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            onMouseMove={manejarSpotlight}
            className="tarjeta-spotlight rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm"
          >
            <div className="font-semibold">{card.label}</div>
            <div className="mt-1 text-sm text-zinc-500">{card.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
