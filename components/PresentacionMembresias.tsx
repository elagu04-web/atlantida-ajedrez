"use client";

import { useState } from "react";
import Link from "next/link";
import { Icono } from "./Icono";
import { PRESENTACION_MEMBRESIAS as oferta, contactoPlan, contactoPruebaDocente, costoPorTorneo } from "@/lib/presentacionMembresias";
import s from "./PresentacionMembresias.module.css";

export function PresentacionMembresias() {
  const [torneos, setTorneos] = useState<number>(oferta.referenciaTorneos);
  const diferencia = oferta.torneo * torneos - oferta.planes[0].precio;
  return <div className={s.pagina}>
    {oferta.borrador && <p className={s.borrador}>Borrador para revisar · Precios propuestos, todavía no vigentes.</p>}
    <header className={s.hero}>
      <div className={s.heroTexto}><p className={s.ceja}>ATLÁNTIDA AJEDREZ · MEMBRESÍAS · PRÓXIMAMENTE</p>
        <h1>Tu lugar<br/>en el <em>club.</em></h1>
        <p>Más partidas, más encuentros y una forma de seguir mejorando. Elegí cómo querés sumarte.</p>
      </div>
      <div className={s.heroFirma} aria-hidden="true"><span>♞</span><p>EL CLUB,<br/>JUGADA A JUGADA.</p></div>
    </header>

    <section id="planes-membresia" className={s.planes} aria-label="Planes de membresía">
      {oferta.planes.map((p, i) => <article key={p.id} className={s.plan} data-destacado={i === 1}>
        <div className={s.planArriba}><span className={s.numero}>0{i + 1}</span><span className={s.tipo}>{i === 0 ? "JUGAR EN EL CLUB" : "JUGAR + MEJORAR"}</span><Icono nombre={i === 0 ? "trofeo" : "idea"}/></div>
        <h2>{p.nombre}</h2><p className={s.bajada}>{p.bajada}</p>
        <div className={s.precio}><span>$</span><strong>{p.precio}</strong><span>UYU<br/><small>por mes</small></span></div>
        <p className={s.porTorneo}>Con {oferta.referenciaTorneos} torneos en el mes: <strong>${costoPorTorneo(p.precio, oferta.referenciaTorneos)} por torneo</strong>{i === 1 && " · entrenamiento incluido"}.</p>
        <ul>{p.beneficios.map(b => <li key={b}><Icono nombre="check"/><span>{b}</span></li>)}</ul>
        <p className={s.detalle}>{p.detalle}</p>
        <a className={i === 1 ? "button-primary" : "button-secondary"} href={contactoPlan(p.nombre)} target="_blank" rel="noopener noreferrer">Consultar por este plan <Icono nombre="whatsapp"/></a>
      </article>)}
    </section>

    <section className={s.docentes} aria-labelledby="recursos-docentes">
      <div className={s.docentesTexto}><p className={s.ceja}>PARA ENSEÑAR AJEDREZ <span className={s.proximamente}>Próximamente</span></p><h2 id="recursos-docentes">{oferta.docentes.nombre}</h2><p>{oferta.docentes.descripcion}</p><p className={s.pruebaDocente}>¿Querés probarla gratis?</p></div>
      <div className={s.docentesPrecio}><strong>${oferta.docentes.precio}</strong><span>UYU<br/>por mes</span></div>
      <a className="button-secondary" href={contactoPruebaDocente()} target="_blank" rel="noopener noreferrer">Quiero probarla gratis <Icono nombre="whatsapp"/></a>
    </section>

    <section className={s.comparador} aria-labelledby="comparar-cuota">
      <div><p className={s.ceja}>HACÉ TUS CUENTAS</p><h2 id="comparar-cuota">¿Cuánto venís a jugar?</h2><p>Compará la cuota Club con pagar cada torneo por separado.</p>
        <label className={s.control}>Torneos por mes <output htmlFor="cantidad-torneos">{torneos}</output><input id="cantidad-torneos" type="range" min="1" max="5" step="1" value={torneos} onChange={e => setTorneos(Number(e.target.value))}/></label>
      </div>
      <div className={s.cuenta}><div><span>{torneos} {torneos === 1 ? "torneo suelto" : "torneos sueltos"}</span><strong>${torneos * oferta.torneo}</strong></div><div><span>Plan Club · mes</span><strong>${oferta.planes[0].precio}</strong></div>
        <p data-conviene={diferencia > 0}>{diferencia > 0 ? `Con ${torneos} torneos, el plan Club te permite ahorrar $${diferencia}.` : diferencia === 0 ? "Mismo importe: la cuota te cubre los torneos habituales del mes." : `Si venís a ${torneos === 1 ? "un torneo" : `${torneos} torneos`}, pagar suelto cuesta $${Math.abs(diferencia)} menos.`}</p>
      </div>
    </section>

    <div className={s.suelto}><Icono nombre="trofeo"/><div><strong>Torneo sin membresía</strong><p>Para venir a jugar de vez en cuando.</p></div><span><strong>${oferta.torneo}</strong> UYU por torneo</span></div>
    <section className={s.pasos} aria-label="Cómo sumarte"><h2>Nos escribís. Lo coordinamos.<br/><span>Y nos vemos en el tablero.</span></h2><div><p><b>01</b> Elegí tu plan</p><p><b>02</b> Consultá por WhatsApp</p><p><b>03</b> Confirmamos tu vigencia</p></div><a href={contactoPlan("membresías")} className="button-primary" target="_blank" rel="noopener noreferrer"><Icono nombre="whatsapp"/> Hablar con Agustín</a></section>
    <section className={s.aclaraciones} aria-label="Sobre los planes"><p><strong>La misma cuenta, siempre.</strong> Tus partidas y tu progreso se conservan. La cuota se coordina con el club, sin débito automático.</p><p>{oferta.borrador ? "Esta es una propuesta para revisar. Los torneos mantienen su precio actual y el entrenamiento sigue en prueba gratuita hasta que el club anuncie el lanzamiento." : "El entrenamiento continúa en prueba gratuita hasta que anunciemos el inicio de los planes. Consultá por la fecha de activación y los torneos incluidos."}</p><Link href="/membresia">Ya tengo membresía: consultar mi vigencia →</Link><a href="/imagenes/membresias-whatsapp-20261103-v2.png" download="membresias-atlantida.png">Descargar imagen para WhatsApp →</a><a href="/imagenes/membresias-instagram-20261103.png" download="membresias-instagram.png">Descargar imagen para Instagram →</a></section>
  </div>;
}
