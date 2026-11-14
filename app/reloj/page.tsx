import { RelojAjedrez } from "@/components/RelojAjedrez";
import { metadatosPagina } from "@/lib/seo";
export const metadata = metadatosPagina("/reloj", "Reloj de ajedrez · Atlántida Ajedrez", "Usá tu celular como reloj de ajedrez para dos jugadores. Ritmos con incremento, pausa, pantalla completa y tiempos personalizados. Sin iniciar sesión.");
export default function RelojPage() {
  return <div className="play-page"><header className="play-heading"><div><p className="eyebrow text-amber-200">El tablero lo ponen ustedes</p><h1>Dos jugadores.<br/><span>Un reloj.</span></h1></div><p>Dejá el celular entre los dos y jugá con tu tablero. Elegí el ritmo, empezá con blancas y tocá tu lado después de cada jugada.</p></header><RelojAjedrez/></div>;
}
