import { PRESENTACION_MEMBRESIAS as oferta, costoPorTorneo } from "@/lib/presentacionMembresias";
import { Icono } from "./Icono";
import s from "./PosterMembresias.module.css";

export function PosterMembresias() {
  return <div className={s.marco}><article className={s.poster} aria-label="Membresías de Atlántida Ajedrez">
    <header className={s.marca}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/imagenes/logo-club.png" alt=""/><div><strong>Atlántida Ajedrez</strong><span>EL CLUB, JUGADA A JUGADA.</span></div>
      <small>{oferta.borrador ? "PROPUESTA" : "PRÓXIMAMENTE"}</small>
    </header>
    <div className={s.titulo}><span>MEMBRESÍAS DEL CLUB</span><h1>Un mes.<br/>Mucho <em>ajedrez.</em></h1><p>Elegí cómo querés sumarte.</p><div className={s.caballo} aria-hidden="true">♞</div></div>
    <div className={s.planes}>
      {oferta.planes.map((p,i) => <section className={s.plan} key={p.id} data-completo={i===1}>
        <div className={s.planTipo}><Icono nombre={i===0?"trofeo":"idea"}/><span>{i===0?"JUGAR EN EL CLUB":"JUGAR + MEJORAR"}</span></div>
        <h2>{p.nombre}</h2><div className={s.precio}><sup>$</sup><strong>{p.precio}</strong><span>UYU<br/>por mes</span></div>
        <p className={s.porTorneo}>Con {oferta.referenciaTorneos} torneos: <strong>${costoPorTorneo(p.precio,oferta.referenciaTorneos)} por torneo</strong></p>
        {i===0 ? <><ul><li><Icono nombre="check"/>Torneos habituales<br/>del club incluidos.</li><li><Icono nombre="check"/>Una cuota para<br/>jugar todo el mes.</li></ul><div className={s.ahorro}><span>SI JUGÁS 4 TORNEOS</span><p>Sueltos: <s>${oferta.torneo*4}</s><br/><strong>Con Club: ${p.precio}</strong></p></div></> : <><p className={s.todo}>Todo el plan Club, más:</p><ul><li><Icono nombre="check"/>Táctica a tu nivel</li><li><Icono nombre="check"/>Cálculo y evaluación</li><li><Icono nombre="check"/>Análisis de tus partidas</li><li><Icono nombre="check"/>Aperturas y finales</li><li><Icono nombre="check"/>Repasos de tus errores</li><li><Icono nombre="check"/>Progreso en tu cuenta</li></ul></>}
      </section>)}
    </div>
    <div className={s.suelto}><span>SIN MEMBRESÍA</span><strong><b>${oferta.torneo}</b> UYU por torneo</strong></div>
    <footer><div><span>CONSULTÁ CON AGUSTÍN</span><strong><Icono nombre="whatsapp"/>099 861 116</strong></div><p>atlantida-ajedrez.vercel.app</p></footer>
    <p className={s.nota}>{oferta.borrador ? "BORRADOR · Precios propuestos, todavía no vigentes." : "Cuota mensual en pesos uruguayos. Activación con el club."}<br/>Torneos habituales durante tu vigencia. Eventos especiales: consultar.{oferta.borrador && " El entrenamiento sigue en prueba gratuita."}</p>
  </article></div>;
}
