"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Chessboard } from 'react-chessboard';
import type { PartidaOnline } from '@/lib/partidaOnline';
import { recorridoOnline } from '@/lib/recorridoOnline';
import { descargarOnline } from '@/lib/juegoOnline';
import styles from './VisorPartidaOnline.module.css';

export function VisorPartidaOnline({ partida, color, volver }: { partida: PartidaOnline; color: 'w' | 'b'; volver: () => void }) {
  const [paso, setPaso] = useState(0);
  const [auto, setAuto] = useState(false);
  const [girado, setGirado] = useState(false);
  const lista = useRef<HTMLDivElement>(null);
  const recorrido = useMemo(() => { try { return recorridoOnline(partida.estado); } catch { return null; } }, [partida.estado]);
  const ultimo = recorrido?.jugadas.length ?? 0;
  const indice = Math.min(paso, ultimo);
  const jugada = recorrido?.jugadas[indice - 1];
  const e = partida.estado;
  const elo = e.elo?.[color];

  function ir(n: number) { setAuto(false); setPaso(Math.max(0, Math.min(n, ultimo))); }
  function reproducir() {
    if (auto) setAuto(false);
    else { if (indice === ultimo) setPaso(0); setAuto(true); }
  }
  function teclado(ev: KeyboardEvent) {
    if (ev.target instanceof HTMLInputElement) return;
    const destino = ({ ArrowLeft: indice - 1, ArrowRight: indice + 1, Home: 0, End: ultimo } as Record<string, number>)[ev.key];
    if (destino !== undefined) { ev.preventDefault(); ir(destino); }
  }
  useEffect(() => {
    if (!auto || indice >= ultimo) return;
    const t = setTimeout(() => { setPaso(indice + 1); if (indice + 1 >= ultimo) setAuto(false); }, 950);
    return () => clearTimeout(t);
  }, [auto, indice, ultimo]);
  useEffect(() => {
    const pausar = () => { if (document.hidden) setAuto(false); };
    document.addEventListener('visibilitychange', pausar);
    return () => document.removeEventListener('visibilitychange', pausar);
  }, []);
  useEffect(() => {
    const contenedor = lista.current;
    const actual = contenedor?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!contenedor || !actual) return;
    if (actual.offsetTop < contenedor.scrollTop) contenedor.scrollTop = actual.offsetTop;
    else if (actual.offsetTop + actual.offsetHeight > contenedor.scrollTop + contenedor.clientHeight) contenedor.scrollTop = actual.offsetTop + actual.offsetHeight - contenedor.clientHeight;
  }, [indice]);

  return <section className={styles.visor} aria-label="Revisar partida online">
    <div className={styles.mesa}>
      <div className={styles.jugadores}><span>{girado ? color === 'w' ? e.blancas : e.negras : color === 'w' ? e.negras : e.blancas}</span><strong>{e.resultado}</strong></div>
      {recorrido ? <>
        <div className={`${styles.tablero} play-board`}><Chessboard options={{
          id: `revision-online-${partida.id}`, position: recorrido.posiciones[indice], boardOrientation: (girado ? color === 'w' ? 'b' : 'w' : color) === 'w' ? 'white' : 'black',
          allowDragging: false, allowAutoScroll: false, animationDurationInMs: 160,
          lightSquareStyle: { backgroundColor: '#f0e6ce' }, darkSquareStyle: { backgroundColor: '#638480' },
          squareStyles: jugada ? { [jugada.origen]: { backgroundColor: '#e4be7155' }, [jugada.destino]: { backgroundColor: '#e4be7180' } } : {},
        }} /></div>
        <div className={styles.controles} role="group" aria-label="Recorrer la partida" tabIndex={0} onKeyDown={teclado} aria-keyshortcuts="ArrowLeft ArrowRight Home End">
          <button aria-label="Ir al comienzo de la partida" disabled={indice === 0} onClick={() => ir(0)}>↤</button>
          <button aria-label="Jugada anterior" disabled={indice === 0} onClick={() => ir(indice - 1)}>←</button>
          <button className={styles.reproducir} disabled={!ultimo} onClick={reproducir} aria-pressed={auto}><span aria-hidden="true">{auto ? 'Ⅱ' : '▶'}</span>{auto ? 'Pausar' : 'Reproducir'}</button>
          <button aria-label="Jugada siguiente" disabled={indice === ultimo} onClick={() => ir(indice + 1)}>→</button>
          <button aria-label="Ir al final de la partida" disabled={indice === ultimo} onClick={() => ir(ultimo)}>↦</button>
        </div>
        <label className={styles.progreso}><span aria-live={auto ? 'off' : 'polite'}>{jugada?.texto ?? 'Posición inicial'}<small>{indice}/{ultimo}</small></span><input type="range" aria-label="Elegir jugada de la partida online" min={0} max={ultimo} value={indice} disabled={!ultimo} onChange={ev => ir(Number(ev.target.value))} /></label>
      </> : <p role="alert">No pudimos reconstruir las jugadas. Podés descargar el PGN para revisar la partida.</p>}
      <div className={styles.pieMesa}><span>{girado ? color === 'w' ? e.negras : e.blancas : color === 'w' ? e.blancas : e.negras}</span><button onClick={() => setGirado(v => !v)}>Girar tablero ↻</button></div>
    </div>
    <aside className={styles.resumen}>
      <p className={styles.sello}>Tu partida, jugada a jugada</p><h2>{e.blancas} <span>contra</span> {e.negras}</h2>
      <p className={styles.resultado}><strong>{e.resultado}</strong><span>{e.motivo}</span></p>
      <p className={styles.detalle}>{e.ritmo} · {e.porElo ? 'Por Elo Atlántida' : 'Amistosa'} · {new Date(partida.creada).toLocaleDateString('es-UY', { timeZone: 'America/Montevideo', day: 'numeric', month: 'short' })}</p>
      {elo && <p className={styles.elo}>Tu Elo Atlántida: <strong>{elo.antes} → {elo.despues}</strong> ({elo.variacion >= 0 ? '+' : ''}{elo.variacion})</p>}
      <p className={styles.ayuda}>Usá las flechas o tocá una jugada para volver a esa posición. No hace falta descargar nada.</p>
      {recorrido && <div ref={lista} className={styles.jugadas} role="group" aria-label="Jugadas de la partida online">{recorrido.jugadas.length ? recorrido.jugadas.map((j, i) => <button key={i} aria-current={indice === i + 1 ? 'step' : undefined} onClick={() => ir(i + 1)}>{j.texto}</button>) : <p>La partida terminó sin movimientos.</p>}</div>}
      <div className={styles.acciones}><Link className="button-primary" href={`/entrenamiento?modo=online&partidaOnline=${partida.id}`}>Analizar con el motor →</Link><button className="button-secondary" disabled={!e.pgn} onClick={() => descargarOnline(partida)}>Descargar PGN</button></div>
      <button className={styles.volver} onClick={volver}>← Volver a mis mesas</button>
      {partida.torneo_id&&<Link className="text-link" href={'/torneos/online/'+partida.torneo_id}>Ver posiciones de mi torneo →</Link>}
    </aside>
  </section>;
}
