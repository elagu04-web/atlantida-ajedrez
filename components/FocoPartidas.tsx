import type { ResumenPareto, FocoPareto, EvidenciaPareto } from "@/lib/entrenamientoPareto";
import styles from "./FocoPartidas.module.css";

export function FocoPartidas({ resumen, alPracticar, alRefuerzo, alCargar, sesionPendiente, esperando }: {
  resumen: ResumenPareto; alPracticar: (e: EvidenciaPareto, foco: FocoPareto) => void;
  alRefuerzo: (f: FocoPareto) => void; alCargar: () => void; sesionPendiente: boolean; esperando: boolean;
}) {
  return <section className={styles.foco} aria-label="Tu foco según tus partidas">
    <header><span>POCAS PRIORIDADES, PRÁCTICA CON DIRECCIÓN</span><h3>Tu foco personal</h3>
      <p>{!resumen.partidas ? "Traé una partida para empezar a descubrir qué te conviene trabajar. Mientras tanto, podés seguir con los ejercicios de tu nivel." : resumen.focos.length ? "Elegimos hasta dos prioridades a partir de tus partidas. Se van ajustando con los repasos y lo que jugás después." : "En las partidas revisadas no hay un foco activo con evidencia suficiente. Seguimos con variedad y repasos; una partida nueva puede cambiar la recomendación."}</p>
    </header>
    {!resumen.partidas ? <button type="button" className="button-secondary" onClick={alCargar}>Traer mi primera partida</button> : <>
      <p className={styles.muestra}>{resumen.partidas} {resumen.partidas === 1 ? "partida distinta revisada" : "partidas distintas revisadas"}{resumen.totalDisponibles > resumen.partidas ? ` · las más recientes de ${resumen.totalDisponibles}` : ""} · Cada partida cuenta una vez por foco.</p>
      {!!resumen.focos.length && <div className={styles.tarjetas}>{resumen.focos.map((f, i) => <article key={f.id}>
        <div className={styles.titulo}><span>{i === 0 ? "Tu prioridad" : "También conviene trabajar"}</span><small>{f.primerasSenales ? "Primeras señales" : "Se repite en tus partidas"}</small></div><h4>{f.nombre}</h4>
        <p>El análisis marcó decisiones para revisar en <strong>{f.partidasConError} de {f.partidasObservadas}</strong> {f.id.startsWith("final-") ? "partidas con este tipo de final" : "partidas donde pudimos observar este tema"}.</p>
        {f.mejoraEnRepasos && <p className={styles.mejora}>Venís mejorando en los repasos. Vamos a comprobarlo también en partidas nuevas.</p>}
        <div className={styles.acciones}>{f.siguiente ? <button type="button" className="button-primary" onClick={() => alPracticar(f.siguiente!, f)}>{f.siguiente.destino === "final" ? "Jugar un final mío" : "Revisar una decisión mía"}</button> : <p>Los repasos de estas posiciones están programados para más adelante.</p>}
          <button type="button" className="button-secondary" disabled={esperando} onClick={() => alRefuerzo(f)}>{sesionPendiente ? "Continuar mi sesión" : f.actividad === "candidatas" ? "Practicar candidatas" : "Practicar el tema y variar"}</button></div>
        <details><summary>Ver de dónde sale este foco</summary><ul>{f.evidencias.slice(0, 3).map(e => <li key={e.sesion.id}><span>{e.sesion.titulo} · jugada {e.sesion.resultado.jugadas[e.indice].numero}</span><span>{e.practica?.proxima && e.practica.proxima > resumen.dia ? `Próximo repaso: ${e.practica.proxima}` : "Lista para revisar"}</span></li>)}</ul>{!f.evidencias.length && <p>Falta una variante válida para practicar estas decisiones. Podés traer otra partida o trabajar con los ejercicios.</p>}</details>
      </article>)}</div>}
      {resumen.temas.some(t => t.mejoraEnPartidas) && <p className={styles.mejora}>Ya no apareció el mismo aviso en las últimas tres partidas donde pudimos observarlo: {resumen.temas.filter(t => t.mejoraEnPartidas).map(t => t.nombre.toLowerCase()).join(", ")}. Bajamos su prioridad y seguimos comprobándolo.</p>}
      <details className={styles.explicacion}><summary>Cómo se ajusta tu entrenamiento</summary><p>Miramos hasta 20 partidas distintas, priorizando las más recientes. Usamos la fecha de juego cuando está disponible; si falta, la fecha de carga. Consideramos la repetición del aviso, la pérdida estimada y tus repasos sin ayuda en días distintos. Un ejercicio memorizado o muchos intentos el mismo día no demuestran que el tema esté aprendido.</p><p>Los finales se reconocen por el material. En apertura y cálculo señalamos decisiones para revisar; una caída del motor no alcanza para atribuir una causa estratégica concreta. Sus avisos son orientativos. Conservamos los repasos pendientes y combinamos refuerzo con posiciones variadas cerca de tu nivel.</p></details>
    </>}
  </section>;
}
