"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useJugadores } from "@/context/JugadoresContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { nombreVisible } from "@/lib/players";

const FOTOS_BUCKET = "fotos-jugadores";

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
  const { actualizarFoto } = useJugadores();
  const { session } = useAuth();
  const puedeEditar = Boolean(session);
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  async function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !jugador) return;
    setSubiendoFoto(true);
    setErrorFoto(null);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${jugador.id}.${ext}`;
    const { error } = await supabase.storage
      .from(FOTOS_BUCKET)
      .upload(path, file, { upsert: true, cacheControl: "3600" });
    if (error) {
      setErrorFoto(`No se pudo subir la foto: ${error.message}`);
      setSubiendoFoto(false);
      return;
    }
    const { data } = supabase.storage.from(FOTOS_BUCKET).getPublicUrl(path);
    await actualizarFoto(jugador.id, `${data.publicUrl}?v=${Date.now()}`);
    setSubiendoFoto(false);
  }

  const cabezaACabeza = useMemo(() => {
    if (!jugador) return [];
    const porRival = new Map<
      string,
      { victorias: number; empates: number; derrotas: number }
    >();
    for (const p of jugador.partidas) {
      if (!porRival.has(p.rival)) {
        porRival.set(p.rival, { victorias: 0, empates: 0, derrotas: 0 });
      }
      const r = porRival.get(p.rival)!;
      if (p.resultado === "victoria") r.victorias += 1;
      else if (p.resultado === "empate") r.empates += 1;
      else r.derrotas += 1;
    }
    return [...porRival.entries()]
      .map(([rival, r]) => {
        const rivalJugador = jugadoresEnVivo.find((j) => nombreVisible(j) === rival);
        return {
          rival,
          rivalId: rivalJugador?.id,
          ...r,
          jugadas: r.victorias + r.empates + r.derrotas,
        };
      })
      .sort((a, b) => b.jugadas - a.jugadas || a.rival.localeCompare(b.rival));
  }, [jugador, jugadoresEnVivo]);

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
        <div className="mt-2 flex items-center gap-4">
          <div className="relative shrink-0">
            {jugador.fotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={jugador.fotoUrl}
                alt={nombreVisible(jugador)}
                className="h-20 w-20 rounded-full border border-zinc-200 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-2xl font-semibold text-zinc-400">
                {nombreVisible(jugador).charAt(0).toUpperCase()}
              </div>
            )}
            {puedeEditar && (
              <button
                onClick={() => inputFotoRef.current?.click()}
                disabled={subiendoFoto}
                className="absolute -bottom-1 -right-1 rounded-full border border-zinc-300 bg-white px-1.5 py-1 text-xs shadow-sm hover:bg-zinc-50 disabled:opacity-50"
                title="Cambiar foto"
              >
                {subiendoFoto ? "..." : "✏️"}
              </button>
            )}
            <input
              ref={inputFotoRef}
              type="file"
              accept="image/*"
              onChange={handleFotoChange}
              className="hidden"
            />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {nombreVisible(jugador)}
            </h1>
            {jugador.apodo && <p className="text-sm text-zinc-400">{jugador.nombre}</p>}
          </div>
        </div>
        {errorFoto && <p className="mt-2 text-sm text-red-600">{errorFoto}</p>}
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

      <div>
        <h2 className="mb-3 font-semibold">Cabeza a cabeza</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Rival</th>
                <th className="px-4 py-3 text-center font-medium">PJ</th>
                <th className="px-4 py-3 text-center font-medium">V</th>
                <th className="px-4 py-3 text-center font-medium">E</th>
                <th className="px-4 py-3 text-center font-medium">D</th>
              </tr>
            </thead>
            <tbody>
              {cabezaACabeza.map((h) => (
                <tr key={h.rival} className="border-b border-zinc-100 last:border-0">
                  <td className="px-4 py-3 font-medium">
                    {h.rivalId ? (
                      <Link href={`/jugadores/${h.rivalId}`} className="hover:underline">
                        {h.rival}
                      </Link>
                    ) : (
                      h.rival
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-mono">{h.jugadas}</td>
                  <td className="px-4 py-3 text-center font-mono text-green-700">{h.victorias}</td>
                  <td className="px-4 py-3 text-center font-mono text-zinc-500">{h.empates}</td>
                  <td className="px-4 py-3 text-center font-mono text-red-700">{h.derrotas}</td>
                </tr>
              ))}
              {cabezaACabeza.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                    Todavía no enfrentó a ningún rival.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
