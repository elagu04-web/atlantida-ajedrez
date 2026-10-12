import Link from "next/link";
import { Icono } from "./Icono";

export function PrimeraVisitaClub() {
  return <section id="sumate" className="club-first-visit panel" aria-labelledby="titulo-visita">
    <div className="club-first-copy"><p className="eyebrow text-blue-300">Siempre hay una silla más</p><h2 id="titulo-visita">¿Es tu primera vez?</h2><p>Podés venir a aprender, jugar un torneo o compartir una buena partida. Empezá por lo que más te guste.</p><Link href="/torneos" className="button-primary">Encontrar un torneo<Icono nombre="flecha" className="h-4 w-4"/></Link></div>
    <div className="club-first-questions">
      <details><summary>¿Cómo me anoto a un torneo?</summary><p>Elegí un torneo con inscripción abierta y tocá «Anotarme». Iniciá sesión con tu mail y vinculá o creá tu perfil para que la inscripción quede a tu nombre.</p></details>
      <details><summary>Recién empiezo, ¿puedo crear mi perfil?</summary><p>Sí. Al iniciar sesión podés crear tu jugador aunque todavía no tengas partidas en el club. Después vas a poder seguir tus resultados y tu evolución de Elo.</p></details>
      <details><summary>¿Cuándo se reúne el grupo de estudio?</summary><p>Todos los jueves a las 18:30. Traé tus dudas, tus ideas o una posición que quieras analizar. <Link href="/noticias/sumate-a-nuestro-grupo-de-estudio">Leé la invitación al grupo.</Link></p></details>
    </div>
  </section>;
}
