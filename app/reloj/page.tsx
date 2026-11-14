import { RelojAjedrez } from "@/components/RelojAjedrez";
import { metadatosPagina } from "@/lib/seo";
import s from "@/components/RelojAjedrez.module.css";
export const metadata = metadatosPagina("/reloj", "Reloj de ajedrez · Atlántida Ajedrez", "Usá tu celular como reloj de ajedrez para dos jugadores. Ritmos con incremento, pausa, pantalla completa y tiempos personalizados. Sin iniciar sesión.");
export default function RelojPage() {
  return <div className="play-page"><header className={s.encabezado}><div><p className="eyebrow text-amber-200">Para jugar con tu tablero</p><h1>Reloj de ajedrez</h1></div><p>Elegí el ritmo y tocá tu lado al terminar cada jugada.</p></header><RelojAjedrez/></div>;
}
