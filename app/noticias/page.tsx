import { metadatosPagina } from "@/lib/seo";
import { CarruselNoticias } from "@/components/CarruselNoticias";
import { noticiasRecientes } from "@/lib/noticias";
export const metadata=metadatosPagina("/noticias","Fuera del tablero · Noticias de Atlántida","Noticias, logros deportivos, novedades y anécdotas del club Atlántida Ajedrez.");
export default function NoticiasPage(){return <div className="news-page"><header className="news-page-heading"><p className="eyebrow text-amber-200">Crónicas de Atlántida</p><h1>Fuera del<br/><span>tablero.</span></h1><p>Buenas jugadas. Mejores historias. Este es el rincón de los logros, las novedades y las historias del club.</p></header><CarruselNoticias noticias={noticiasRecientes()}/></div>;}
