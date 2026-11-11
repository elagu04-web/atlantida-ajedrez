"use client";

import Link from "next/link";

export function RevisionDesafio({ autenticado, terminado, puzzleId, solucion }: {
  autenticado: boolean; terminado: boolean; puzzleId: string; solucion: string[];
}) {
  if (!autenticado || !terminado) return <p className="puzzle-review-locked">
    {!autenticado ? "Iniciá sesión y terminá tu intento para ver la solución y abrir el original." : "La solución y el original se habilitan cuando resolvés el desafío o fallás el intento."}
  </p>;

  return <div className="puzzle-review">
    <details className="play-engine-details"><summary>Repasar la solución</summary><p>{solucion.join(" · ")}</p></details>
    <a className="text-link" href={`https://lichess.org/training/${encodeURIComponent(puzzleId)}`} target="_blank" rel="noopener noreferrer">Ver el original en Lichess ↗</a>
  </div>;
}

export function BotonTablaDesafio() {
  return <div className="puzzle-result-actions"><Link href="/desafios#rachas" className="button-primary" onClick={event => {
    const tabla = document.getElementById("rachas");
    if (!tabla) return;
    event.preventDefault();
    window.dispatchEvent(new Event("desafio-resuelto"));
    window.history.replaceState(null, "", "#rachas");
    document.getElementById("titulo-rachas")?.focus({ preventScroll: true });
    tabla.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }}>Ver tabla de rachas <span aria-hidden="true">→</span></Link></div>;
}
