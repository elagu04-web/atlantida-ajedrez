import Link from "next/link";
import { Icono } from "./Icono";
import { ESTUDIO_CLUB } from "@/lib/agendaClub";

export function AgendaClub() {
  return <section className="club-agenda panel" aria-labelledby="titulo-agenda">
    <div className="club-agenda-time"><span>JUEVES</span><strong>18:30</strong><small>Hora de Uruguay</small></div>
    <div className="club-agenda-copy"><p className="eyebrow text-amber-200">Nos encontramos</p><h2 id="titulo-agenda">Un tablero. Muchas ideas.</h2><p>Todos los jueves nos juntamos a estudiar un poco y divertirnos. Traé esa posición que te quedó dando vueltas.</p>
      <div className="club-agenda-actions"><a href="/api/agenda/estudio" download="atlantida-estudio-jueves.ics" className="button-secondary"><Icono nombre="reloj" className="h-4 w-4"/>Guardar en mi calendario</a><Link href="/noticias/sumate-a-nuestro-grupo-de-estudio" className="text-link">Ver invitación<Icono nombre="flecha" className="h-4 w-4"/></Link></div>
      <span className="sr-only">{ESTUDIO_CLUB.horario}</span>
    </div>
  </section>;
}
