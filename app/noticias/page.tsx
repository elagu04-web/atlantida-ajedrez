import type { Metadata } from "next";
import { CarruselNoticias } from "@/components/CarruselNoticias";
import { noticiasRecientes } from "@/lib/noticias";
export const metadata:Metadata={title:"Fuera del tablero · Noticias de Atlántida",description:"Fotos, novedades y anécdotas del club Atlántida Ajedrez. El lado B del club, con espacio para el humor."};
export default function NoticiasPage(){return <div className="news-page"><header className="news-page-heading"><p className="eyebrow text-amber-200">Crónicas de Atlántida</p><h1>Fuera del<br/><span>tablero.</span></h1><p>Buenas jugadas. Mejores historias. Este es el rincón de las novedades, las fotos y el humor del club.</p></header><CarruselNoticias noticias={noticiasRecientes()}/></div>;}
