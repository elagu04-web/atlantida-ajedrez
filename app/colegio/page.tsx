"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useColegioJugadoresEnVivo } from "@/context/useColegioJugadoresEnVivo";
import { useColegioTorneos } from "@/context/ColegioTorneosContext";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";

export default function ColegioPage() {
  const { esAdmin } = useAuth();
  const alumnos = useColegioJugadoresEnVivo();
  const { torneos } = useColegioTorneos();

  if (!esAdmin) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-zinc-400">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo="Colegio Pinares"
        subtitulo="Torneos y alumnos de la escuela — completamente separado del club Atlántida."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/colegio/alumnos"
          className="rounded-lg border border-white/10 bg-white/5 p-4 hover:border-white/20 hover:shadow-sm"
        >
          <div className="font-semibold">Alumnos</div>
          <div className="mt-1 text-sm text-zinc-400">{alumnos.length} cargados</div>
        </Link>
        <Link
          href="/colegio/torneos"
          className="rounded-lg border border-white/10 bg-white/5 p-4 hover:border-white/20 hover:shadow-sm"
        >
          <div className="font-semibold">Torneos</div>
          <div className="mt-1 text-sm text-zinc-400">{torneos.length} creados</div>
        </Link>
      </div>
    </div>
  );
}
