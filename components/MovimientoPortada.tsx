"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { PiezaAjedrez } from "./PiezaAjedrez";
import styles from "./MovimientoPortada.module.css";

export function MovimientoPortada({ children }: { children: ReactNode }) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = raiz.current;
    if (!elemento || !window.IntersectionObserver) return;
    const preferencia = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animaciones = new Set<Animation>();
    const observador = new IntersectionObserver(entradas => {
      if (preferencia.matches || document.hidden) return;
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        observador.unobserve(entrada.target);
        // Content stays visible and usable without JS, observers or animations.
        if (!(entrada.target instanceof HTMLElement) || !entrada.target.animate) continue;
        const animacion = entrada.target.animate([
          { opacity: 0.35, transform: "translateY(14px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 480, easing: "cubic-bezier(.22,1,.36,1)" });
        animaciones.add(animacion);
        animacion.onfinish = () => animaciones.delete(animacion);
      }
    }, { threshold: 0.08 });
    elemento.querySelectorAll(".home-competition, .home-agenda, .home-daily, .home-knight, .news-heading, .news-track, .club-study, .ranking-panel, .broadcast-card, .club-first-visit, .club-metrics").forEach(seccion => observador.observe(seccion));
    const terminar = () => {
      for (const animacion of animaciones) animacion.cancel();
      animaciones.clear();
    };
    const cambiarPreferencia = () => { if (preferencia.matches) terminar(); };
    const cambiarVisibilidad = () => { if (document.hidden) terminar(); };
    elemento.addEventListener("focusin", terminar);
    preferencia.addEventListener("change", cambiarPreferencia);
    document.addEventListener("visibilitychange", cambiarVisibilidad);
    return () => {
      observador.disconnect();
      terminar();
      elemento.removeEventListener("focusin", terminar);
      preferencia.removeEventListener("change", cambiarPreferencia);
      document.removeEventListener("visibilitychange", cambiarVisibilidad);
    };
  }, []);

  return <div ref={raiz} className={`${styles.portada} flex flex-col gap-10 sm:gap-14`}>{children}</div>;
}

/** A short, replayable graphic; no perpetual animation or real game state. */
export function CaballoPortada() {
  const patron = useId();
  const [repeticion, setRepeticion] = useState(0);
  return <button type="button" className={styles.grafica} aria-label="Repetir la animación del caballo" title="Una jugada más" onClick={() => setRepeticion(n => n + 1)}>
    <span key={repeticion} className={styles.escena} aria-hidden="true">
      <svg className={styles.tablero} viewBox="0 0 192 192" fill="none">
        <defs><pattern id={patron} width="48" height="48" patternUnits="userSpaceOnUse"><path d="M0 0h24v24H0zm24 24h24v24H24z" fill="currentColor"/></pattern></defs>
        <rect width="192" height="192" rx="12" fill={`url(#${patron})`}/>
        <path d="M36 180V132H60V84H84V60H132" className={styles.ruta}/>
        <circle cx="36" cy="180" r="3" className={styles.origen}/>
        <circle cx="132" cy="60" r="9" className={styles.destino}/>
      </svg>
      <span className={styles.caballo}><PiezaAjedrez tipo="n" color="w"/></span>
    </span>
    <span className={styles.repetir} aria-hidden="true">↻</span>
  </button>;
}
