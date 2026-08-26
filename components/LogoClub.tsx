"use client";

import { useState } from "react";

const LOGO_CLUB_URL = "/imagenes/logo-club.png";

/**
 * Logo del club con fallback a un caballo de ajedrez si la imagen no carga
 * (por ejemplo en un entorno sin el archivo subido todavía).
 */
export function LogoClub({ claseTam = "h-14 w-14" }: { claseTam?: string }) {
  const [falloLogo, setFalloLogo] = useState(false);
  if (falloLogo) {
    return <span className="text-3xl">♞</span>;
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={LOGO_CLUB_URL}
      alt=""
      className={`object-contain drop-shadow-[0_0_12px_rgba(96,165,250,0.5)] ${claseTam}`}
      onError={() => setFalloLogo(true)}
    />
  );
}

/**
 * Marca de agua tenue del logo, de fondo, detrás del contenido de un
 * encabezado oscuro — puramente decorativa (no participa del fallback ni
 * de accesibilidad, por eso usa el <img> directo en vez de LogoClub).
 */
export function MarcaDeAguaLogo() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={LOGO_CLUB_URL}
      alt=""
      aria-hidden
      className="pointer-events-none absolute -right-6 -top-8 h-40 w-40 object-contain opacity-[0.06] grayscale"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}
