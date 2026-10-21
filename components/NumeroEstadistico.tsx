"use client";

import { useEffect, useRef } from "react";

function formatear(n: number, decimales: number, sufijo: string, signo: boolean) {
  const redondeado = Number(n.toFixed(decimales));
  return `${signo && redondeado > 0 ? "+" : ""}${(redondeado || 0).toFixed(decimales)}${sufijo}`;
}
/** El lector de pantalla recibe el dato final; el conteo es solamente visual. */
export function NumeroEstadistico({ valor, desde = 0, decimales = 0, sufijo = "", signo = false }: {
  valor: number; desde?: number; decimales?: number; sufijo?: string; signo?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const anterior = useRef<number | null>(null);
  const texto = formatear(valor, decimales, sufijo, signo);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const inicio = anterior.current ?? desde;
    anterior.current = valor;
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dibujar = (n: number) => { el.textContent = formatear(n, decimales, sufijo, signo); };
    function animar() {
      if (media.matches || inicio === valor) { dibujar(valor); return; }
      const comienzo = performance.now();
      function avanzar(ahora: number) {
        const t = Math.min(1, (ahora - comienzo) / 850);
        dibujar(inicio + (valor - inicio) * (1 - Math.pow(1 - t, 3)));
        if (t < 1 && !media.matches) frame = requestAnimationFrame(avanzar);
        else dibujar(valor);
      }
      frame = requestAnimationFrame(avanzar);
    }
    if (window.IntersectionObserver && !media.matches) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) { observer?.disconnect(); animar(); }
      }, { threshold: .3 });
      observer.observe(el);
    } else animar();
    const reducir = () => { if (media.matches) { cancelAnimationFrame(frame); dibujar(valor); } };
    media.addEventListener("change", reducir);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); media.removeEventListener("change", reducir); };
  }, [valor, desde, decimales, sufijo, signo]);
  return <span><span className="sr-only">{texto}</span><span ref={ref} aria-hidden="true">{texto}</span></span>;
}
