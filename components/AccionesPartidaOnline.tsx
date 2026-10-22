"use client";

import { useRef, useState } from 'react';
import type { AccionOnline } from '@/lib/partidaOnline';
import styles from './SalaOnline.module.css';

export function AccionesPartidaOnline({ color, oferta, bloqueado, enviar }: {
  color: 'w' | 'b'; oferta: 'w' | 'b' | null; bloqueado: boolean; enviar: (accion: AccionOnline) => void;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const rendirse = useRef<HTMLButtonElement>(null);
  function cancelar() { setConfirmar(false); rendirse.current?.focus(); }
  return <div className={styles.controlesPartida}>
    {oferta && <div className={styles.propuesta} role="status">
      <p>{oferta === color ? 'Ofreciste tablas. Esperando la respuesta del rival.' : 'Tu rival te ofrece tablas.'}</p>
      {oferta !== color && <div className={styles.acciones}>
        <button className="button-primary" disabled={bloqueado} onClick={() => enviar({ tipo: 'aceptar' })}>Aceptar tablas</button>
        <button className="button-secondary" disabled={bloqueado} onClick={() => enviar({ tipo: 'rechazar' })}>Seguir jugando</button>
      </div>}
    </div>}
    <div className={styles.accionesJuego} role="group" aria-label="Acciones de la partida">
      <button disabled={bloqueado || oferta !== null} onClick={() => enviar({ tipo: 'ofrecer' })}><span aria-hidden="true">½</span>{oferta === color ? 'Tablas ofrecidas' : 'Ofrecer tablas'}</button>
      <button ref={rendirse} className={styles.rendirse} disabled={bloqueado} aria-expanded={confirmar} onClick={() => setConfirmar(c => !c)}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>Rendirme</button>
    </div>
    {confirmar && <div className={styles.confirmar} role="group" aria-label="Confirmar abandono" onKeyDown={ev => { if (ev.key === 'Escape') cancelar(); }}>
      <p>¿Querés rendirte? Tu rival ganará esta partida.</p>
      <div className={styles.acciones}>
        <button className={`button-secondary ${styles.rendirse}`} disabled={bloqueado} onClick={() => { setConfirmar(false); enviar({ tipo: 'rendirse' }); }}>Sí, rendirme</button>
        <button className="button-secondary" onClick={cancelar}>Seguir jugando</button>
      </div>
    </div>}
  </div>;
}
