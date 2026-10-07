import type { ReactNode } from "react";
export function EncabezadoPagina({titulo,subtitulo,accion}:{titulo:ReactNode;subtitulo?:ReactNode;accion?:ReactNode}) {
  return <div className="page-heading"><div className="min-w-0"><p className="eyebrow mb-3 text-blue-300">Atlántida / El club</p><h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{titulo}</h1>{subtitulo&&<p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{subtitulo}</p>}</div>{accion&&<div className="shrink-0">{accion}</div>}</div>;
}
