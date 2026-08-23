"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useColegioJugadoresEnVivo } from "@/context/useColegioJugadoresEnVivo";
import { useColegioTorneos } from "@/context/ColegioTorneosContext";

export default function ColegioPage() {
  const { session } = useAuth();
  const alumnos = useColegioJugadoresEnVivo();
  const { torneos } = useColegioTorneos();

  if (!session) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
        <p className="text-zinc-500">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Colegio Pinares</h1>
        <p className="mt-2 text-zinc-600">
          Torneos y alumnos de la escuela — completamente separado del club Atlántida.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/colegio/alumnos"
          className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm"
        >
          <div className="font-semibold">Alumnos</div>
          <div className="mt-1 text-sm text-zinc-500">{alumnos.length} cargados</div>
        </Link>
        <Link
          href="/colegio/torneos"
          className="rounded-lg border border-zinc-200 bg-white p-4 hover:border-zinc-300 hover:shadow-sm"
        >
          <div className="font-semibold">Torneos</div>
          <div className="mt-1 text-sm text-zinc-500">{torneos.length} creados</div>
        </Link>
      </div>
    </div>
  );
}
