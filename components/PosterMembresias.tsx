import { PRESENTACION_MEMBRESIAS as oferta } from "@/lib/presentacionMembresias";
import { Icono } from "./Icono";
import s from "./PosterMembresias.module.css";

export function PosterMembresias() {
  return <div className={s.marco}><article className={s.poster} aria-label="Planes de Atlántida Ajedrez para compartir">
    <header className={s.marca}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/imagenes/logo-club.png" alt=""/>
      <div><strong>Atlántida Ajedrez</strong><span>EL CLUB, JUGADA A JUGADA.</span></div>
    </header>
    <div className={s.titulo}><p>TORNEOS DEL CLUB</p><h1>Elegí tu <em>plan.</em></h1></div>
    <section className={s.plan}>
      <div className={s.fila}><h2>Torneos del mes</h2><div className={s.precio}><strong>${oferta.planes[0].precio}</strong><span>UYU<br/>por mes</span></div></div>
      <p>Todos los torneos habituales del club incluidos.</p>
    </section>
    <section className={s.suelto}><h2>Torneo suelto</h2><div className={s.precio}><strong>${oferta.torneo}</strong><span>UYU<br/>por torneo</span></div></section>
    <section className={s.plan} data-completo="true">
      <div className={s.fila}><h2>Torneos +<br/>entrenamiento</h2><div className={s.precio}><strong>${oferta.planes[1].precio}</strong><span>UYU<br/>por mes</span></div></div>
      <p>Táctica, análisis de tus partidas y repasos.<br/>Tu progreso guardado en la cuenta.</p>
    </section>
    <section className={s.docentes}>
      <div className={s.docentesArriba}><span>APP DE JUEGOS PARA DOCENTES</span><small>Próximamente</small></div>
      <div className={s.fila}><div><h2>Juegos para tus clases</h2><p>Distintas formas de enseñar ajedrez.</p></div><div className={s.precio}><strong>${oferta.docentes.precio}</strong><span>UYU<br/>por mes</span></div></div>
      <p className={s.prueba}>¿Querés probarla gratis?</p>
    </section>
    <footer className={s.contacto}><div><span>ESCRIBIME POR WHATSAPP</span><strong><Icono nombre="whatsapp"/>099 861 116</strong></div><p>Elegí tu plan.<br/>Lo coordinamos con el club.</p></footer>
    <p className={s.nota}><span>atlantida-ajedrez.vercel.app/membresias</span>Precios en pesos uruguayos. Eventos especiales: consultar.</p>
  </article></div>;
}
