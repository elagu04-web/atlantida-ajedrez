"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useJugadores } from "@/context/JugadoresContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { nombreVisible } from "@/lib/players";
import { GraficoElo } from "@/components/GraficoElo";

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
  const { actualizarFoto, actualizarDescripcion, cargando } = useJugadores();
  const { esAdmin } = useAuth();
  const puedeEditar = esAdmin;
  const inputFotoRef = useRef<HTMLInputElement>(null);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [verTodasLasPartidas, setVerTodasLasPartidas] = useState(false);
  const [editandoDescripcion, setEditandoDescripcion] = useState(false);
  const [descripcionValor, setDescripcionValor] = useState("");

  function empezarEdicionDescripcion() {
    setDescripcionValor(jugador?.descripcion ?? "");
    setEditandoDescripcion(true);
  }

  async function guardarDescripcion() {
    if (jugador) await actualizarDescripcion(jugador.id, descripcionValor);
    setEditandoDescripcion(false);
  }

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

  const puntosElo = useMemo(() => {
    if (!jugador) return [];
    return jugador.partidas
      .filter((p) => p.eloDespues !== undefined)
      .map((p) => ({ fecha: p.fecha, elo: p.eloDespues as number, torneo: p.torneo }));
  }, [jugador]);

  const rachaActual = useMemo(() => {
    if (!jugador || jugador.partidas.length === 0) return null;
    const ultimas = jugador.partidas;
    const tipo = ultimas[ultimas.length - 1].resultado;
    let cantidad = 0;
    for (let i = ultimas.length - 1; i >= 0 && ultimas[i].resultado === tipo; i--) cantidad++;
    return { tipo, cantidad };
  }, [jugador]);

  const mejorVictoria = useMemo(() => {
    if (!jugador) return null;
    let mejor: { rival: string; elo: number } | null = null;
    for (const p of jugador.partidas) {
      if (p.resultado !== "victoria") continue;
      const rivalJugador = jugadoresEnVivo.find((j) => nombreVisible(j) === p.rival);
      if (!rivalJugador) continue;
      if (!mejor || rivalJugador.eloAtlantida > mejor.elo) {
        mejor = { rival: p.rival, elo: rivalJugador.eloAtlantida };
      }
    }
    return mejor;
  }, [jugador, jugadoresEnVivo]);

  const rendimientoPorColor = useMemo(() => {
    if (!jugador) return null;
    function calcular(color: "blancas" | "negras") {
      const partidasColor = jugador!.partidas.filter((p) => p.color === color);
      const victorias = partidasColor.filter((p) => p.resultado === "victoria").length;
      return {
        jugadas: partidasColor.length,
        porcentaje: partidasColor.length > 0 ? Math.round((victorias / partidasColor.length) * 100) : 0,
      };
    }
    return { blancas: calcular("blancas"), negras: calcular("negras") };
  }, [jugador]);

  if (!jugador) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/jugadores" className="text-sm text-blue-600 hover:underline">
          ← Volver a jugadores
        </Link>
        <p className="text-zinc-600">
          {cargando ? "Cargando..." : "Ese jugador no existe (o fue eliminado)."}
        </p>
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
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-2xl font-semibold text-zinc-500">
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
            {jugador.apodo && <p className="text-sm text-zinc-500">{jugador.nombre}</p>}
          </div>
        </div>
        {errorFoto && <p className="mt-2 text-sm text-red-600">{errorFoto}</p>}
      </div>

      {(editandoDescripcion || jugador.descripcion || puedeEditar) && (
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        {editandoDescripcion ? (
          <div className="flex flex-col gap-2">
            <textarea
              autoFocus
              value={descripcionValor}
              onChange={(e) => setDescripcionValor(e.target.value)}
              placeholder="Estilo de juego, observaciones, notas para el coach..."
              rows={3}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-3 text-xs">
              <button
                onClick={guardarDescripcion}
                className="font-medium text-blue-600 hover:underline"
              >
                Guardar
              </button>
              <button
                onClick={() => setEditandoDescripcion(false)}
                className="text-zinc-500 hover:underline"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : jugador.descripcion ? (
          <div className="flex items-start justify-between gap-3">
            <p className="whitespace-pre-wrap text-sm text-zinc-700">{jugador.descripcion}</p>
            {puedeEditar && (
              <button
                onClick={empezarEdicionDescripcion}
                className="shrink-0 text-xs text-blue-600 hover:underline"
              >
                Editar
              </button>
            )}
          </div>
        ) : puedeEditar ? (
          <button
            onClick={empezarEdicionDescripcion}
            className="text-xs text-zinc-500 hover:text-blue-600 hover:underline"
          >
            + agregar descripción
          </button>
        ) : null}
      </div>
      )}

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

      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Evolución de Elo</h2>
        <GraficoElo puntos={puntosElo} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-xs text-zinc-500">Racha actual</div>
          <div className="mt-1 text-xl font-semibold">
            {rachaActual ? (
              <span className={resultadoColor[rachaActual.tipo]}>
                {rachaActual.cantidad} {resultadoLabel[rachaActual.tipo].toLowerCase()}
                {rachaActual.cantidad > 1 ? "s" : ""} seguida
                {rachaActual.cantidad > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-zinc-500 text-base">Sin partidas</span>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-xs text-zinc-500">Mejor victoria</div>
          <div className="mt-1 text-xl font-semibold">
            {mejorVictoria ? (
              <>
                {mejorVictoria.rival}{" "}
                <span className="font-mono text-sm text-zinc-500">{mejorVictoria.elo}</span>
              </>
            ) : (
              <span className="text-zinc-500 text-base">Sin victorias todavía</span>
            )}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="text-xs text-zinc-500">Rendimiento por color</div>
          {rendimientoPorColor && (rendimientoPorColor.blancas.jugadas > 0 || rendimientoPorColor.negras.jugadas > 0) ? (
            <div className="mt-1 flex gap-4 text-sm">
              <span>
                ♔ {rendimientoPorColor.blancas.porcentaje}%{" "}
                <span className="text-zinc-500">({rendimientoPorColor.blancas.jugadas})</span>
              </span>
              <span>
                ♚ {rendimientoPorColor.negras.porcentaje}%{" "}
                <span className="text-zinc-500">({rendimientoPorColor.negras.jugadas})</span>
              </span>
            </div>
          ) : (
            <div className="mt-1 text-base text-zinc-500">Sin partidas</div>
          )}
        </div>
      </div>

      <div>
        <button
          onClick={() => setVerTodasLasPartidas((v) => !v)}
          className="mb-3 text-sm font-medium text-blue-600 hover:underline"
        >
          {verTodasLasPartidas ? "▾" : "▸"} Ver todas las partidas ({jugador.partidas.length})
        </button>
        {verTodasLasPartidas && (
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
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
                  Todavía no tiene partidas cargadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        )}
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
                  <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
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
