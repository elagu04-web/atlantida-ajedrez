import s from "./LogroDesafio.module.css";

export function LogroDesafio({ guardado, practica }: { guardado: boolean; practica: boolean }) {
  return <div className={s.logro} role="status" aria-live="polite" data-desafio-logrado="true">
    <span className={s.check} aria-hidden="true">✓</span>
    <div><span className={s.eyebrow}>DESAFÍO DEL DÍA · COMPLETADO</span>
      <h2>{practica ? "¡Completaste el desafío!" : "¡Lograste el desafío de hoy!"}</h2>
      <p>{guardado ? "Tu logro ya está guardado en tu cuenta. Mañana te espera otro desafío." : practica ? "Terminaste la secuencia en práctica. El error de hoy no suma racha; mañana podés empezar otra." : "Encontraste la secuencia completa. ¡Buena táctica!"}</p>
    </div>
  </div>;
}
