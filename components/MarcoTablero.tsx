"use client";
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { CLAVE_TAMANO_TABLERO, dimensionesTablero, leerTamanoTablero, type PreferenciaTablero } from '@/lib/tamanoTablero';
import s from './MarcoTablero.module.css';

export function MarcoTablero({ children, reserva = 240, reservaMovil = reserva, nombre = 'tablero' }: { children: ReactNode; reserva?: number; reservaMovil?: number; nombre?: string }) {
  const root = useRef<HTMLDivElement>(null), gesto = useRef<{ x: number; y: number; lado: number } | null>(null);
  const [preferencia, setPreferencia] = useState<PreferenciaTablero>({ modo: 'auto' });
  const [medidas, setMedidas] = useState({ ancho: 400, alto: 800, cabecera: 140, movil: false });
  const [listo, setListo] = useState(false);
  const id = useId();
  const d = dimensionesTablero(medidas.ancho, medidas.alto, medidas.cabecera, medidas.movil ? reservaMovil : reserva, preferencia);
  useEffect(() => {
    const elemento = root.current;
    if (!elemento) return;
    let raf = 0;
    const leer = () => { try { setPreferencia(leerTamanoTablero(localStorage.getItem(CLAVE_TAMANO_TABLERO))); } catch { setPreferencia({ modo: 'auto' }); } };
    const medir = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const ancho = elemento.clientWidth;
        if (ancho <= 0) return;
        const cabecera = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 0;
        const nuevas = { ancho, alto: window.visualViewport?.height ?? window.innerHeight, cabecera, movil: window.innerWidth <= 900 };
        setMedidas(prev => Object.keys(nuevas).every(k => prev[k as keyof typeof prev] === nuevas[k as keyof typeof nuevas]) ? prev : nuevas);
        setListo(true);
      });
    };
    leer(); medir();
    const observador = new ResizeObserver(medir);
    observador.observe(elemento);
    const cabecera = document.querySelector('.site-header');
    if (cabecera) observador.observe(cabecera);
    window.addEventListener('resize', medir);
    window.visualViewport?.addEventListener('resize', medir);
    window.addEventListener('storage', leer);
    window.addEventListener('atlantida:tamano-tablero', leer);
    return () => { cancelAnimationFrame(raf); observador.disconnect(); window.removeEventListener('resize', medir); window.visualViewport?.removeEventListener('resize', medir); window.removeEventListener('storage', leer); window.removeEventListener('atlantida:tamano-tablero', leer); };
  }, []);
  function elegir(p: PreferenciaTablero) {
    setPreferencia(p);
    try { localStorage.setItem(CLAVE_TAMANO_TABLERO, JSON.stringify(p)); window.dispatchEvent(new Event('atlantida:tamano-tablero')); } catch { /* El control funciona aunque el navegador no permita guardar. */ }
  }
  function manual(lado: number) { elegir({ modo: 'manual', lado: Math.round(Math.max(d.minimo, Math.min(d.maximo, lado))) }); }
  return <div ref={root} className={s.marco} data-tablero-ajustable data-tamano={preferencia.modo} style={{ '--tablero-lado': listo ? `${d.lado}px` : '100%' } as CSSProperties}>
    <div className={s.superficie}>{children}</div>
    <div className={s.controles} role="group" aria-label={`Tamaño del ${nombre}`}>
      <label htmlFor={id}>Tamaño <output>{listo ? `${Math.round(d.lado)} px` : 'Auto'}</output></label>
      <input id={id} type="range" aria-label={`Ajustar tamaño del ${nombre}`} min={d.minimo} max={d.maximo} step={1} value={d.lado} onChange={e => manual(Number(e.target.value))}/>
      <button type="button" className={s.auto} aria-pressed={preferencia.modo === 'auto'} onClick={() => elegir({ modo: 'auto' })} title="Ajustar el tablero al espacio y la altura de esta pantalla">Auto</button>
      <button type="button" className={s.tirador} aria-label={`Arrastrar para ajustar el ${nombre}`} title="Arrastrá esta esquina para cambiar el tamaño. También podés usar las flechas del teclado." onPointerDown={e => { e.preventDefault(); e.stopPropagation(); gesto.current = { x: e.clientX, y: e.clientY, lado: d.lado }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { const g = gesto.current; if (g) manual(g.lado + ((e.clientX - g.x) + (e.clientY - g.y)) / 2); }} onPointerUp={e => { gesto.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }} onPointerCancel={() => { gesto.current = null; }} onLostPointerCapture={() => { gesto.current = null; }} onKeyDown={e => { if (['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'].includes(e.key)) { e.preventDefault(); manual(d.lado + (['ArrowRight', 'ArrowUp'].includes(e.key) ? 8 : -8)); } }}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M8 5h7v7M5 8v7h7"/></svg></button>
    </div>
  </div>;
}
