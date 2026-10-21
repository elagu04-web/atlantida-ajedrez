"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { JugadorEnVivo } from "@/lib/elo";
import { nombreVisible } from "@/lib/players";
import { rendimientoPeriodo } from "@/lib/rendimiento";
import s from "./EstadisticasVisuales.module.css";

const GABI = "d1c933d4-197b-434a-924c-d404421e02a6";
type Fila = ReturnType<typeof rendimientoPeriodo>;
const porcentaje = (n: number | null) => n === null ? "—" : `${n.toFixed(1)}%`;
const cambio = (n: number) => `${n > 0 ? "+" : ""}${n}`;
function foto(j: JugadorEnVivo) { return j.id === GABI ? "/imagenes/gabi-campeon-20-octubre-2026.jpg" : j.fotoUrl; }

export function FotoEstadisticas({ jugador }: { jugador?: JugadorEnVivo }) {
  const [fallo, setFallo] = useState<string | null>(null);
  const src = jugador && foto(jugador);
  return <span className={s.avatar} aria-hidden="true">{src && fallo !== src ?
    // Las fotos públicas de los socios pueden venir de distintos proveedores.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" onError={() => setFallo(src)} /> :
    <span>{jugador ? nombreVisible(jugador).split(/\s+/).slice(0, 2).map(n => n[0]).join("") : "♟"}</span>}</span>;
}

/** Animaciones finitas al entrar en pantalla; los valores siguen siendo texto real. */
export function useEstadisticasMotion() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || !window.IntersectionObserver) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.setAttribute("data-visible", "true");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    root.querySelectorAll("[data-stats-motion]").forEach(el => observer.observe(el));
    const changes = new MutationObserver(() => root.querySelectorAll('[data-stats-motion]:not([data-visible])').forEach(el => observer.observe(el)));
    changes.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); changes.disconnect(); };
  }, []);
  return ref;
}

export function EstadisticasVisuales({ jugadores, filas, periodo, etiqueta, minimo, jugadorElegido, onElegir }: {
  jugadores: JugadorEnVivo[]; filas: Fila[]; periodo: string; etiqueta: string; minimo: number; jugadorElegido: string | null; onElegir: (id: string) => void;
}) {
  const seleccion = jugadorElegido ?? GABI;
  const [repeticion, setRepeticion] = useState(0);
  const [paso, setPaso] = useState<number | null>(null);
  const [ranking, setRanking] = useState<"rendimiento" | "elo">("rendimiento");
  const gradiente = useId().replaceAll(":", "");
  const fila = filas.find(f => f.jugadorId === seleccion) ?? filas[0];
  const jugador = jugadores.find(j => j.id === fila?.jugadorId);
  if (!fila || !jugador) return null;
  const historial = jugador.partidas.filter(p => p.fecha.startsWith(periodo))
    .map((p, i) => ({ ...p, orden: i })).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.orden - b.orden);
  const puntos = [{ elo: fila.eloInicial, texto: "Inicio del período" }, ...historial.filter(p => p.eloDespues !== undefined).map(p => ({ elo: p.eloDespues!, texto: `${p.fecha} · ${p.resultado} ante ${p.rival} · ${p.torneo}` }))];
  const indice = Math.min(paso ?? puntos.length - 1, puntos.length - 1);
  const min = Math.min(...puntos.map(p => p.elo)) - 8;
  const max = Math.max(...puntos.map(p => p.elo)) + 8;
  const x = (i: number) => 40 + i / Math.max(1, puntos.length - 1) * 570;
  const y = (v: number) => 170 - (v - min) / (max - min) * 142;
  const linea = puntos.map((p, i) => `${x(i)},${y(p.elo)}`).join(" ");
  const lista = [...filas].filter(f => f.partidas >= minimo).sort((a, b) => ranking === "elo" ? b.variacion - a.variacion || b.partidas - a.partidas : (b.rendimiento ?? 0) - (a.rendimiento ?? 0) || b.partidas - a.partidas).slice(0, 8);
  const maxElo = Math.max(1, ...lista.map(f => Math.abs(f.variacion)));
  return <div className={s.visuales}>
    <div className={s.sectionHeading}><div><span className={s.eyebrow}>EL JUEGO DETRÁS DE LOS NÚMEROS</span><h2>El club, en movimiento.</h2></div><span>{etiqueta}</span></div>
    <div className={s.playerPicker} role="group" aria-label="Elegir jugador destacado">{filas.map(f => {
      const j = jugadores.find(j => j.id === f.jugadorId);
      return <button key={f.jugadorId} aria-pressed={f.jugadorId === fila.jugadorId} onClick={() => { onElegir(f.jugadorId); setPaso(null); }}><FotoEstadisticas jugador={j} /><span>{j ? nombreVisible(j) : f.nombre}</span></button>;
    })}</div>
    <section key={`${periodo}-${jugador.id}-${repeticion}`} data-stats-motion className={s.spotlight} aria-label={`Rendimiento de ${nombreVisible(jugador)}`}>
      <div className={s.portrait}>
        <div className={s.orbit} aria-hidden="true" /><div className={s.orbitSmall} aria-hidden="true" />
        <span className={s.portraitLabel}>ATLÁNTIDA · {etiqueta}</span>
        {jugador.id === GABI ?
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.cutout} src="/imagenes/gabi-estadisticas-transparente.png" alt="Gabi jugando ajedrez" /> : foto(jugador) ?
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.original} src={foto(jugador)!} alt={nombreVisible(jugador)} /> :
          <div className={s.noPortrait}><span>♟</span><p>El próximo movimiento<br />también cuenta.</p></div>}
        <div className={s.portraitName}><span>EN PRIMERA PERSONA</span><h3>{jugador.id === GABI ? "Gabi" : nombreVisible(jugador)}</h3><Link href={`/jugadores/${jugador.id}`}>Ver su perfil ↗</Link></div>
      </div>
      <div className={s.analysis}>
        <header className={s.analysisHeader}><span className={s.eyebrow}>SU PERÍODO EN JUEGO</span><button onClick={() => setRepeticion(n => n + 1)} aria-label="Repetir animación de las estadísticas">↻ Repetir</button></header>
        <div className={s.scoreRow}>
          <div><span className={s.smallLabel}>ELO AL CIERRE</span><strong className={s.elo}>{fila.eloFinal}</strong><span className={fila.variacion < 0 ? s.negative : s.positive}>{cambio(fila.variacion)} <small>en el período</small></span></div>
          <div data-stats-motion className={s.ring} style={{ "--score": (fila.rendimiento ?? 0) / 100 } as CSSProperties}>
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="51" /><circle className={s.ringFill} cx="60" cy="60" r="51" pathLength="1" /></svg>
            <div><strong>{porcentaje(fila.rendimiento)}</strong><span>RENDIMIENTO</span></div>
          </div>
        </div>
        <div data-stats-motion className={s.results} aria-label={`${fila.victorias} victorias, ${fila.empates} tablas, ${fila.derrotas} derrotas`}>
          {[{ n: fila.victorias, label: "Victorias", color: "#69d8b5" }, { n: fila.empates, label: "Tablas", color: "#e4c587" }, { n: fila.derrotas, label: "Derrotas", color: "#ed93a4" }].map(r => <div key={r.label} style={{ "--result-color": r.color } as CSSProperties}><strong>{r.n}</strong><span>{r.label}</span><i style={{ "--bar": `${r.n / fila.partidas * 100}%` } as CSSProperties} /></div>)}
        </div>
        <div className={s.chartTitle}><h4>Partida a partida</h4><span>{fila.partidas} partidas · {fila.puntos} puntos</span></div>
        {puntos.length > 1 ? <>
          <svg data-stats-motion className={s.eloChart} viewBox="0 0 640 200" role="img" aria-label={`Evolución de Elo de ${fila.eloInicial} a ${fila.eloFinal}. Consultá cada partida con el control debajo.`}>
            <defs><linearGradient id={gradiente} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#70baff" stopOpacity=".24" /><stop offset="100%" stopColor="#70baff" stopOpacity="0" /></linearGradient></defs>
            {[min + 8, (min + max) / 2, max - 8].map((v, i) => <g key={i}><line x1="40" x2="610" y1={y(v)} y2={y(v)} stroke="#ffffff0d" /><text x="0" y={y(v) + 4}>{Math.round(v)}</text></g>)}
            <polygon points={`40,180 ${linea} ${x(puntos.length - 1)},180`} fill={`url(#${gradiente})`} />
            <polyline className={s.eloLine} points={linea} fill="none" stroke="#8ecbff" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" pathLength="1" />
            <line x1={x(indice)} x2={x(indice)} y1="22" y2="180" stroke="#e4c58760" strokeDasharray="3 4" />
            {puntos.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.elo)} r={i === indice ? 5 : 3} fill={i === indice ? "#e4c587" : "#8ecbff"} onClick={() => setPaso(i)}><title>{p.texto}: {p.elo} Elo</title></circle>)}
            <text x="40" y="198">Inicio</text><text x="610" y="198" textAnchor="end">Cierre</text>
          </svg>
          <label className={s.timelineControl}>Recorrer partidas<input type="range" aria-label="Partida de la evolución de Elo" min="0" max={puntos.length - 1} value={indice} onChange={e => setPaso(Number(e.target.value))} /><strong>{puntos[indice].elo} Elo</strong></label>
          <p className={s.gameDetail} aria-live="polite">{puntos[indice].texto}</p>
        </> : <p className={s.gameDetail}>Sin cambios de Elo registrados para graficar en este período.</p>}
        <p className={s.note}>Rendimiento = puntos obtenidos / partidas. Las tablas valen ½ punto. No incluye descansos.</p>
      </div>
    </section>
    <section key={`${periodo}-${ranking}-${minimo}`} data-stats-motion className={s.ranking} aria-labelledby="ranking-visual-titulo">
      <div className={s.rankingHeader}><div><span className={s.eyebrow}>EL PULSO DEL CLUB</span><h3 id="ranking-visual-titulo">{ranking === "rendimiento" ? "Quién está jugando más fuerte" : "Quién está creciendo más"}</h3><p>Mínimo {minimo} partidas. Tocá un jugador para ver su ficha arriba.</p></div><div className="segmented-control" role="group" aria-label="Métrica del gráfico de jugadores"><button aria-pressed={ranking === "rendimiento"} onClick={() => setRanking("rendimiento")}>Rendimiento</button><button aria-pressed={ranking === "elo"} onClick={() => setRanking("elo")}>Cambio de Elo</button></div></div>
      {lista.length ? <ol className={s.race}>{lista.map((f, i) => {
        const j = jugadores.find(j => j.id === f.jugadorId);
        const valor = ranking === "rendimiento" ? f.rendimiento ?? 0 : f.variacion;
        return <li key={f.jugadorId} style={{ "--delay": `${i * 65}ms` } as CSSProperties}><span className={s.rankNumber}>{String(i + 1).padStart(2, "0")}</span><button aria-label={`Ver estadísticas de ${j ? nombreVisible(j) : f.nombre}`} aria-pressed={fila.jugadorId === f.jugadorId} onClick={() => { onElegir(f.jugadorId); setPaso(null); document.querySelector('[aria-label="Elegir jugador destacado"]')?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); }}><FotoEstadisticas jugador={j} /><span className={s.raceName}>{j ? nombreVisible(j) : f.nombre}<small>{f.partidas} partidas</small></span><span className={s.raceTrack}><i style={{ "--bar": `${ranking === "rendimiento" ? valor : Math.abs(valor) / maxElo * 100}%`, "--result-color": valor < 0 ? "#ed93a4" : "#7bbafa" } as CSSProperties} /></span><strong>{ranking === "rendimiento" ? porcentaje(valor) : cambio(valor)}</strong></button></li>;
      })}</ol> : <p className={s.note}>No hay jugadores que lleguen al mínimo de partidas en este período.</p>}
      <p className={s.note}>{ranking === "elo" ? "La longitud indica la magnitud del cambio. Rosa: bajada de Elo; azul: subida. Ordenado por mayor variación." : "Escala de 0 a 100%. Compará el rendimiento junto con la cantidad de partidas."}</p>
    </section>
  </div>;
}
