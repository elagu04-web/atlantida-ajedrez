import { metadatosPagina } from "@/lib/seo";
import { CarruselNoticias } from "@/components/CarruselNoticias";
import { noticiasRecientes } from "@/lib/noticias";
import { ArchivoNoticias } from "@/components/ArchivoNoticias";
import { Icono } from "@/components/Icono";
import styles from "@/components/NoticiasClub.module.css";
export const metadata=metadatosPagina("/noticias","Fuera del tablero · Noticias de Atlántida","Noticias, logros deportivos, novedades y anécdotas del club Atlántida Ajedrez.");
export default function NoticiasPage(){
  const noticias=noticiasRecientes();
  return <div className={styles.pagina}>
    <header className={styles.masthead}><div><p className="eyebrow">Crónicas de Atlántida</p><h1>Fuera del <span>tablero.</span></h1></div><div className={styles.presentacion}><p>Lo que pasa en el club, las alegrías que compartimos y las historias que quedan después de cada partida.</p><a href="#archivo-noticias">Explorar las {noticias.length} historias<Icono nombre="flecha" className="h-4 w-4 rotate-90"/></a></div></header>
    <CarruselNoticias noticias={noticias} titulo="En primera fila."/>
    <ArchivoNoticias noticias={noticias}/>
  </div>;
}
