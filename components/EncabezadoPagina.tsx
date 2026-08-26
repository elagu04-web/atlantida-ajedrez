import { ReactNode } from "react";
import { LogoClub, MarcaDeAguaLogo } from "@/components/LogoClub";

/**
 * Banner de encabezado oscuro — mismo fondo (brillo azul arriba + rayado
 * diagonal sutil) que la pantalla del torneo, para que el resto del sitio
 * se sienta parte de la misma estética en vez de cada uno con la suya.
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
    <div
      className="relative overflow-hidden rounded-lg bg-zinc-950 p-6"
      style={{
        backgroundImage:
          "radial-gradient(ellipse 90% 60% at 50% -10%, rgba(37,99,235,0.28), transparent), " +
          "repeating-linear-gradient(45deg, rgba(255,255,255,0.015) 0 40px, transparent 40px 80px)",
      }}
    >
      <MarcaDeAguaLogo />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-900/20 ring-1 ring-white/10">
            <LogoClub claseTam="h-7 w-7" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white">{titulo}</h1>
            {subtitulo && <p className="mt-2 text-zinc-400">{subtitulo}</p>}
          </div>
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </div>
    </div>
  );
}
