"use client";

import { useEffect, useId, useState, type PointerEvent } from "react";
import s from "./RecorridoElo.module.css";

type Punto = { elo: number; texto: string; partida?: number };

export function RecorridoElo({ puntos, nombre }: { puntos: Punto[]; nombre: string }) {
  const [seleccionado, setSeleccionado] = useState(puntos.length - 1);
  const [hover, setHover] = useState<number | null>(null);
  const [reproduciendo, setReproduciendo] = useState(false);
  const id = useId().replaceAll(":", "");
  const ultimo = puntos.length - 1;
  const indice = Math.max(0, Math.min(hover ?? seleccionado, ultimo));
  const min = Math.min(...puntos.map(p => p.elo)) - 8;
  const max = Math.max(...puntos.map(p => p.elo)) + 8;
  const x = (i: number) => 44 + i / Math.max(1, ultimo) * 564;
  const y = (v: number) => 158 - (v - min) / (max - min) * 124;
  const linea = puntos.map((p, i) => `${x(i)},${y(p.elo)}`).join(" ");
  const cambio = puntos[indice].elo - puntos[0].elo;

  useEffect(() => {
    if (!reproduciendo) return;
    const timer = setTimeout(() => {
      const siguiente = Math.min(seleccionado + 1, ultimo);
      setSeleccionado(siguiente);
      if (siguiente === ultimo) setReproduciendo(false);
    }, Math.max(120, Math.min(620, 6000 / Math.max(1, ultimo))));
    return () => clearTimeout(timer);
  }, [reproduciendo, seleccionado, ultimo]);

  useEffect(() => {
    const pausar = () => { if (document.hidden) setReproduciendo(false); };
    document.addEventListener("visibilitychange", pausar);
    return () => document.removeEventListener("visibilitychange", pausar);
  }, []);

  function elegir(i: number) {
    setHover(null); setSeleccionado(Math.max(0, Math.min(i, ultimo))); setReproduciendo(false);
  }
  function indicePuntero(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(ultimo, Math.round(((e.clientX - rect.left) / rect.width * 640 - 44) / 564 * ultimo)));
  }
  function reproducir() {
    setHover(null);
    if (reproduciendo) setReproduciendo(false);
    else { if (seleccionado >= ultimo) setSeleccionado(0); setReproduciendo(true); }
  }
  return <div className={s.recorrido}>
    <div className={s.readout} aria-live={reproduciendo ? "off" : "polite"}>
      <div><span>{hover !== null ? "VISTA PREVIA · " : ""}{indice === 0 ? "PUNTO DE PARTIDA" : `DESPUÉS DE LA PARTIDA ${puntos[indice].partida ?? indice}`}</span><strong>{puntos[indice].elo}<small> Elo</small></strong></div>
      <span className={cambio < 0 ? s.negative : s.positive}>{cambio > 0 ? "+" : ""}{cambio} <small>desde el inicio</small></span>
    </div>
    <svg data-stats-motion className={s.chart} viewBox="0 0 640 190" role="img" aria-label={`Evolución de Elo de ${nombre}: ${puntos[0].elo} a ${puntos[ultimo].elo}. Podés recorrer las partidas con los controles debajo.`}
      onPointerMove={e => { if (e.pointerType === "mouse" && !reproduciendo) setHover(indicePuntero(e)); else if (e.pointerType !== "mouse" && e.buttons) elegir(indicePuntero(e)); }}
      onPointerLeave={() => setHover(null)} onPointerDown={e => elegir(indicePuntero(e))} onPointerCancel={() => setHover(null)}>
      <defs>
        <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#85c5ff" stopOpacity=".26" /><stop offset="100%" stopColor="#85c5ff" stopOpacity="0" /></linearGradient>
        <linearGradient id={`${id}-linea`}><stop stopColor="#688fe1" /><stop offset="100%" stopColor="#b5e5ff" /></linearGradient>
        <clipPath id={`${id}-avance`}><rect x="43" y="15" width={Math.max(1, x(indice) - 42)} height="153" /></clipPath>
      </defs>
      {[0, 1, 2, 3].map(i => { const v = min + (max - min) * i / 3; return <g key={i}><line x1="44" x2="608" y1={y(v)} y2={y(v)} stroke="#ffffff0c" /><text x="0" y={y(v) + 4}>{Math.round(v)}</text></g>; })}
      <polygon points={`44,168 ${linea} 608,168`} fill={`url(#${id}-area)`} />
      <polyline points={linea} className={s.backLine} fill="none" stroke="#6593c440" strokeWidth="2" />
      <g clipPath={`url(#${id}-avance)`}><polyline className={s.line} points={linea} fill="none" stroke={`url(#${id}-linea)`} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" pathLength="1" /></g>
      <g className={s.cursor} style={{ transform: `translateX(${x(indice)}px)` }}><line y1="22" y2="168" stroke="#e4c58765" strokeDasharray="3 5" /></g>
      {puntos.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.elo)} r={i === indice ? 5 : 2.5} fill={i === indice ? "#f2d598" : i < indice ? "#92cafa" : "#38536f"}><title>{p.texto}: {p.elo} Elo</title></circle>)}
      <circle className={s.beacon} cx={x(indice)} cy={y(puntos[indice].elo)} r="11" fill="none" stroke="#e4c58744" strokeWidth="2" />
      <text x="44" y="186">Inicio</text><text x="608" y="186" textAnchor="end">Última partida</text>
    </svg>
    <div className={s.controls}>
      <button aria-label="Partida anterior en la evolución" disabled={seleccionado === 0} onClick={() => elegir(seleccionado - 1)}>‹</button>
      <button className={s.play} onClick={reproducir} aria-label={reproduciendo ? "Pausar evolución de Elo" : "Reproducir evolución de Elo"} aria-pressed={reproduciendo}><span aria-hidden="true">{reproduciendo ? "Ⅱ" : "▶"}</span>{reproduciendo ? "Pausar" : "Ver recorrido"}</button>
      <button aria-label="Partida siguiente en la evolución" disabled={seleccionado === ultimo} onClick={() => elegir(seleccionado + 1)}>›</button>
      <span className={s.position}>{indice}/{ultimo}</span>
    </div>
    <label className={s.timeline}>Recorrer partidas<input type="range" aria-label="Partida de la evolución de Elo" min="0" max={ultimo} value={indice} onChange={e => elegir(Number(e.target.value))} /></label>
    <p className={s.detail} aria-live={reproduciendo ? "off" : "polite"}>{puntos[indice].texto}</p>
  </div>;
}
