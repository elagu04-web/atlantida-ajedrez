import type { ResumenTemas } from "@/lib/entrenamientoTemas";
import { GraficaFortalezas } from "./GraficaFortalezas";
import styles from "./FocoEntrenamiento.module.css";

export function FocoEntrenamiento({resumen}:{resumen:ResumenTemas}) {
  return <section className={styles.foco} aria-label="Tu foco de práctica">
    <header><span>SE ADAPTA A VOS</span><h3>Tu foco de práctica</h3><p>{!resumen.posiciones?"A medida que practiques, vamos a detectar los motivos que necesitás reforzar y elegir posiciones para trabajarlos.":resumen.focos.length?"Tus próximas sesiones van a combinar refuerzos de estos temas con posiciones variadas, cerca de tu nivel.":"Buen trabajo. Seguimos con posiciones variadas y tus repasos para comprobar que las ideas se mantienen."}</p></header>
    {!!resumen.focos.length&&<div className={styles.tarjetas}>{resumen.focos.map(({tema,posiciones,erroresCalculo,conAyuda,etiquetasRevisar})=><article key={tema.id}>
      <strong>{tema.nombre}</strong><small>{posiciones} {posiciones===1?"posición observada · Primeras señales":"posiciones observadas"}</small>
      <ul>{erroresCalculo>0&&<li>{erroresCalculo} con errores de cálculo</li>}{etiquetasRevisar>0&&<li>{etiquetasRevisar} con etiquetas para revisar</li>}{conAyuda>0&&<li>{conAyuda} con ayuda o reintentos previos</li>}</ul>
    </article>)}</div>}
    <GraficaFortalezas familias={resumen.familias}/>
    {!!resumen.temas.length&&<details><summary>Ver mi progreso por tema <span>{resumen.temas.length}</span></summary><div className={styles.tabla}><table><caption>Últimas posiciones de cada motivo; una posición puede incluir varios temas.</caption><thead><tr><th scope="col">Tema</th><th scope="col">Posiciones</th><th scope="col">Sin ayuda</th><th scope="col">Errores de cálculo</th><th scope="col">Etiquetas a revisar</th><th scope="col">Ayuda o reintento</th></tr></thead><tbody>{resumen.temas.map(t=><tr key={t.tema.id}><th scope="row">{t.tema.nombre}{t.mejorando&&<small>Buen ritmo</small>}</th><td>{t.posiciones}</td><td>{t.sinAyuda}</td><td>{t.erroresCalculo}</td><td>{t.etiquetasRevisar}</td><td>{t.conAyuda}</td></tr>)}</tbody></table></div></details>}
    <p className={styles.nota}>Los repasos pendientes van primero. Observamos hasta 12 posiciones recientes por motivo; repetir una el mismo día no suma otra muestra. Si un tema tiene pocas posiciones disponibles a tu nivel, seguimos variando.</p>
  </section>;
}
