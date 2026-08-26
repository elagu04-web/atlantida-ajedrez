import { ReactNode } from "react";

/**
 * Banner de encabezado oscuro con fondo "aurora" — el mismo look que
 * arrancó en la portada, ahora reutilizado en el resto de las páginas
 * para que el sitio tenga una sola estética coherente en vez de portada
 * con banner y el resto con un <h1> pelado.
 */
export function EncabezadoPagina({
  titulo,
  subtitulo,
  accion,
}: {
  titulo: ReactNode;
  subtitulo?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-zinc-950 p-6">
      <div className="fondo-aurora fondo-aurora-oscuro" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{titulo}</h1>
          {subtitulo && <p className="mt-2 text-zinc-400">{subtitulo}</p>}
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </div>
    </div>
  );
}
