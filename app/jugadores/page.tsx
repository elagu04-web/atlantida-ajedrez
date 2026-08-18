"use client";

import { useState } from "react";
import Link from "next/link";
import { useJugadores } from "@/context/JugadoresContext";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";

export default function JugadoresPage() {
  const { agregarJugador, eliminarJugador } = useJugadores();
  const jugadoresConStats = useJugadoresEnVivo();
  const [nombre, setNombre] = useState("");
  const [elo, setElo] = useState("1500");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    const eloNumero = Number(elo) || 1500;
    agregarJugador(nombreLimpio, eloNumero);
    setNombre("");
    setElo("1500");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Jugadores</h1>
        <p className="mt-1 text-zinc-600">
          Lista de jugadores del club con su Elo Atlántida y estadísticas.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-xs font-medium text-zinc-600">
            Nombre del jugador
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Ana Rodríguez"
            className="w-56 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="elo" className="text-xs font-medium text-zinc-600">
            Elo inicial
          </label>
          <input
            id="elo"
            type="number"
            value={elo}
            onChange={(e) => setElo(e.target.value)}
            className="w-28 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Agregar jugador
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Elo Atlántida</th>
              <th className="px-4 py-3 font-medium">Partidas</th>
              <th className="px-4 py-3 font-medium">V</th>
              <th className="px-4 py-3 font-medium">E</th>
              <th className="px-4 py-3 font-medium">D</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {jugadoresConStats.map((j, i) => (
              <tr key={j.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-3 text-zinc-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium">
                  <Link href={`/jugadores/${j.id}`} className="hover:underline">
                    {j.nombre}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono">{j.eloAtlantida}</td>
                <td className="px-4 py-3">{j.jugadas}</td>
                <td className="px-4 py-3 text-green-700">{j.victorias}</td>
                <td className="px-4 py-3 text-zinc-500">{j.empates}</td>
                <td className="px-4 py-3 text-red-700">{j.derrotas}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => eliminarJugador(j.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {jugadoresConStats.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-zinc-400">
                  No hay jugadores todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
