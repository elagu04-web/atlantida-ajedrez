"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import s from "./CartaBrillante.module.css";

export function repetirBrilloCarta(desde: HTMLElement) {
  desde.closest("[data-foil-card]")?.dispatchEvent(new Event("repetir-brillo"));
}

/** Luz sobre la superficie impresa; nunca intercepta enlaces ni gestos de scroll. */
export function CartaBrillante({ children, className = "", inclinacion = 7, distinciones = [], ...props }: HTMLAttributes<HTMLDivElement> & { inclinacion?: number; distinciones?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = ref.current;
    if (!card) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mouse = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let pending: { x: number; y: number } | null = null;
    let shimmer: Animation | undefined;
    let introPlayed = false;

    function reset() {
      cancelAnimationFrame(frame);
      frame = 0;
      pending = null;
      card!.removeAttribute("data-foil-active");
      for (const name of ["--foil-x", "--foil-y", "--foil-rx", "--foil-ry"]) card!.style.removeProperty(name);
    }
    function move(e: PointerEvent) {
      if (motion.matches || !mouse.matches || e.pointerType !== "mouse") return;
      const rect = card!.getBoundingClientRect();
      pending = {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
      };
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (!pending) return;
        card!.dataset.foilActive = "true";
        card!.style.setProperty("--foil-x", `${pending.x * 100}%`);
        card!.style.setProperty("--foil-y", `${pending.y * 100}%`);
        card!.style.setProperty("--foil-rx", `${(.5 - pending.y) * 2 * inclinacion}deg`);
        card!.style.setProperty("--foil-ry", `${(pending.x - .5) * 2 * inclinacion}deg`);
      });
    }
    function shine() {
      if (motion.matches || document.hidden) return;
      shimmer?.cancel();
      const light = card!.querySelector(`.${s.sweep}`);
      shimmer = light?.animate([
        { transform: "translateX(-130%) skewX(-18deg)", opacity: 0 },
        { opacity: .65, offset: .3 },
        { transform: "translateX(130%) skewX(-18deg)", opacity: 0 },
      ], { duration: 1600, easing: "ease-in-out" });
    }
    function press(e: PointerEvent) { if (e.pointerType !== "mouse") shine(); }
    function visibility() { if (document.hidden) { reset(); shimmer?.cancel(); } }
    function preference() { reset(); shimmer?.cancel(); }
    const observer = window.IntersectionObserver ? new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting && !introPlayed) {
        introPlayed = true;
        shine();
        observer?.disconnect();
      }
    }, { threshold: .25 }) : undefined;
    observer?.observe(card);
    card.addEventListener("pointermove", move, { passive: true });
    card.addEventListener("pointerleave", reset);
    card.addEventListener("pointercancel", reset);
    card.addEventListener("pointerdown", press, { passive: true });
    card.addEventListener("focusin", shine);
    card.addEventListener("repetir-brillo", shine);
    document.addEventListener("visibilitychange", visibility);
    motion.addEventListener("change", preference);
    mouse.addEventListener("change", preference);
    return () => {
      reset(); shimmer?.cancel(); observer?.disconnect();
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerleave", reset);
      card.removeEventListener("pointercancel", reset);
      card.removeEventListener("pointerdown", press);
      card.removeEventListener("focusin", shine);
      card.removeEventListener("repetir-brillo", shine);
      document.removeEventListener("visibilitychange", visibility);
      motion.removeEventListener("change", preference);
      mouse.removeEventListener("change", preference);
    };
  }, [inclinacion]);

  return <div {...props} ref={ref} className={`${s.card} ${className}`} data-foil-card="true" data-foil-tone={distinciones.length ? "gold" : "blue"}>
    {children}
    {distinciones.length > 0 && <div className={s.distinciones} aria-label="Distinciones del jugador">{distinciones.map(d => <span key={d}><b aria-hidden="true">♛</b>{d}</span>)}</div>}
    <div className={s.finish} aria-hidden="true">
      <i className={s.foil} /><i className={s.glare} /><i className={s.sweep} />
    </div>
    <div className={s.rim} aria-hidden="true" />
  </div>;
}
