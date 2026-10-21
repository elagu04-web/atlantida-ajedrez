"use client";

import { useState, type PointerEvent } from "react";
import s from "./GabiPerfilRetrato.module.css";

/** La fotografía permanece intacta; el movimiento y la luz pertenecen a la interfaz. */
export function GabiPerfilRetrato() {
  const [repeticion, setRepeticion] = useState(0);
  function mover(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const caja = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - caja.left) / caja.width;
    const y = (e.clientY - caja.top) / caja.height;
    e.currentTarget.style.setProperty("--shift-x", `${(x - .5) * 12}px`);
    e.currentTarget.style.setProperty("--shift-y", `${(y - .5) * 8}px`);
    e.currentTarget.style.setProperty("--light-x", `${x * 100}%`);
    e.currentTarget.style.setProperty("--light-y", `${y * 100}%`);
  }
  function salir(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.style.setProperty("--shift-x", "0px");
    e.currentTarget.style.setProperty("--shift-y", "0px");
    e.currentTarget.style.setProperty("--light-x", "60%");
    e.currentTarget.style.setProperty("--light-y", "45%");
  }
  return <>
    <div key={repeticion} className={s.art} onPointerMove={mover} onPointerLeave={salir}>
      <div className={s.light} aria-hidden="true" />
      <div className={s.halo} aria-hidden="true"><i /><i /><i /></div>
      <div className={s.chessGrid} aria-hidden="true" />
      <div className={s.particles} aria-hidden="true">{Array.from({ length: 9 }, (_, i) => <i key={i} style={{ left: `${12 + i * 9}%`, top: `${25 + i % 4 * 17}%`, animationDelay: `${i * 90}ms` }} />)}</div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={s.photo} src="/imagenes/gabi-estadisticas-transparente.png" alt="Gabi jugando ajedrez" />
      <div className={s.frontLight} aria-hidden="true" />
      <span className={s.caption} aria-hidden="true">GABI <small>ATLÁNTIDA AJEDREZ</small></span>
    </div>
    <button className={s.replay} onClick={() => setRepeticion(n => n + 1)} aria-label="Repetir efectos del retrato de Gabi">↻ <span>Repetir efectos</span></button>
  </>;
}
