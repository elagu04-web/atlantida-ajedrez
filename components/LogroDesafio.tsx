import s from "./LogroDesafio.module.css";

export function LogroDesafio({ guardado, practica }: { guardado: boolean; practica: boolean }) {
  return <div className={s.logro} role="status" aria-live="polite" data-practica={practica} data-desafio-logrado={practica ? undefined : "true"}>
    <span className={s.check} aria-hidden="true">{practica ? "↻" : "✓"}</span>
    <div><span className={s.eyebrow}>{practica ? "DESAFÍO DEL DÍA · PRÁCTICA" : "DESAFÍO DEL DÍA · LOGRADO"}</span>
      <h2>{practica ? "Práctica terminada · no cuenta como logrado" : "¡Lograste el desafío de hoy!"}</h2>
      <p>{guardado ? "Tu logro ya está guardado en tu cuenta. Mañana te espera otro desafío." : practica ? "Terminaste la secuencia en práctica. Este intento no suma racha; mañana podés empezar otra." : "Encontraste la secuencia completa. ¡Buena táctica!"}</p>
    </div>
  </div>;
}
