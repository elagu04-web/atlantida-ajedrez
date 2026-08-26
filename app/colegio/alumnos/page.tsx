"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useColegioJugadores } from "@/context/ColegioJugadoresContext";
import { useColegioJugadoresEnVivo } from "@/context/useColegioJugadoresEnVivo";
import { nombreVisible } from "@/lib/players";
import { ELO_MINIMO, type JugadorEnVivo } from "@/lib/elo";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";

function LichessCelda({
  jugadorId,
  usuarioActual,
  onGuardar,
}: {
  jugadorId: string;
  usuarioActual: string | null | undefined;
  onGuardar: (id: string, usuario: string) => void;
}) {
  const [valor, setValor] = useState(usuarioActual ?? "");
  return (
    <input
      type="text"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={() => {
        if (valor.trim() !== (usuarioActual ?? "")) onGuardar(jugadorId, valor);
      }}
      placeholder="usuario Lichess..."
      className="w-32 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-zinc-400 hover:border-white/10 focus:border-white/20 focus:bg-white/5 focus:outline-none"
    />
  );
}

export default function ColegioAlumnosPage() {
  const { esAdmin } = useAuth();
  const { agregarJugador, eliminarJugador, actualizarJugador, actualizarLichess } = useColegioJugadores();
  const alumnos = useColegioJugadoresEnVivo();

  const [nombre, setNombre] = useState("");
  const [elo, setElo] = useState("1500");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editElo, setEditElo] = useState("");

  if (!esAdmin) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-zinc-400">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  function empezarEdicion(j: JugadorEnVivo) {
    setEditandoId(j.id);
    setEditNombre(j.nombre);
    setEditElo(String(j.eloAtlantida));
  }

  function guardarEdicion() {
    if (!editandoId) return;
    const eloNumero = Number(editElo);
    const eloValido = Number.isFinite(eloNumero) ? eloNumero : 1500;
    actualizarJugador(editandoId, editNombre, Math.max(ELO_MINIMO, eloValido));
    setEditandoId(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) return;
    const eloNumero = Math.max(ELO_MINIMO, Number(elo) || 1500);
    agregarJugador(nombreLimpio, eloNumero);
    setNombre("");
    setElo("1500");
  }

  const lista = [...alumnos].sort((a, b) => b.eloAtlantida - a.eloAtlantida);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link href="/colegio" className="text-sm text-blue-400 hover:underline">
          ← Volver a Colegio Pinares
        </Link>
        <EncabezadoPagina titulo="Alumnos" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-white/5 p-4"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="nombre" className="text-xs font-medium text-zinc-400">
            Nombre del alumno
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Ana Rodríguez"
            className="w-48 rounded-md border border-white/20 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="elo" className="text-xs font-medium text-zinc-400">
            Elo inicial
          </label>
          <input
            id="elo"
            type="number"
            min={ELO_MINIMO}
            value={elo}
            onChange={(e) => setElo(e.target.value)}
            className="w-28 rounded-md border border-white/20 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Agregar alumno
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 bg-white/10 text-left text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Elo</th>
              <th className="px-4 py-3 font-medium">Partidas</th>
              <th className="px-4 py-3 font-medium">Lichess</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((j, i) =>
              editandoId === j.id ? (
                <tr key={j.id} className="border-b border-white/5 bg-white/10 last:border-0">
                  <td className="px-4 py-3 text-zinc-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      className="w-48 rounded border border-white/20 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={ELO_MINIMO}
                      value={editElo}
                      onChange={(e) => setEditElo(e.target.value)}
                      className="w-24 rounded border border-white/20 px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{j.jugadas}</td>
                  <td className="px-4 py-3 text-zinc-400">—</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={guardarEdicion}
                      className="mr-3 text-xs font-medium text-blue-400 hover:underline"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setEditandoId(null)}
                      className="text-xs text-zinc-400 hover:underline"
                    >
                      Cancelar
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={j.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-zinc-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{nombreVisible(j)}</td>
                  <td className="px-4 py-3 font-mono">{j.eloAtlantida}</td>
                  <td className="px-4 py-3">{j.jugadas}</td>
                  <td className="px-4 py-3">
                    <LichessCelda jugadorId={j.id} usuarioActual={j.lichessUsuario} onGuardar={actualizarLichess} />
                    {j.lichessUsuario && (
                      <Link
                        href={`/entrenamiento?usuario=${encodeURIComponent(j.lichessUsuario)}`}
                        className="ml-1 text-xs text-blue-400 hover:underline"
                      >
                        Analizar
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => empezarEdicion(j)}
                      className="mr-3 text-xs text-blue-400 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminarJugador(j.id)}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              )
            )}
            {lista.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-400">
                  Todavía no hay alumnos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
