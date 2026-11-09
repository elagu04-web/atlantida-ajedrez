import {Suspense} from 'react';
import Link from 'next/link';
import {ArchivoHistoria} from '@/components/ArchivoHistoria';
import {Icono} from '@/components/Icono';
import {LineaTiempoHistoria} from '@/components/LineaTiempoHistoria';
import {PortadaHistoria,type RecuerdoPortada} from '@/components/PortadaHistoria';
import {imagenesHistoria,publicacionesHistoria,rutaHistoria} from '@/lib/historiaClub';
import {metadatosPagina,serializarDatosEstructurados,URL_SITIO} from '@/lib/seo';
import s from '@/components/HistoriaClub.module.css';

const imagen='/imagenes/historia/archivo-ba57a47bac8d8f34.webp';
const meta=metadatosPagina('/historia','Historia del club · Atlántida Ajedrez',`Recorré la historia de Atlántida Ajedrez desde 2010: encuentros, torneos, talleres y ${publicacionesHistoria.length} recuerdos del club en una línea de tiempo interactiva.`);
export const metadata={...meta,openGraph:{...meta.openGraph,images:[{url:URL_SITIO+imagen,alt:'Encuentro de Atlántida con el Club Solís de Pando en 2010'}]},twitter:{...meta.twitter,card:'summary_large_image' as const,images:[URL_SITIO+imagen]}};
const momentos=[
 {id:'3153606336940460723',descripcion:'Atlántida recibe al Club Solís de Pando.',foto:0},
 {id:'8400866532081339500',descripcion:'Una tarde de ajedrez entre los socios de LIFA.',foto:0},
 {id:'996325375499609458',descripcion:'Encuentros de verano en el club.',foto:0},
 {id:'7914385409771496110',descripcion:'Jugadores de la Costa de Oro comparten el tablero.',foto:0},
 {id:'8941035116955934692',descripcion:'Una tarde de junio en Atlántida.',foto:0},
 {id:'609872161729615249',descripcion:'Simultáneas en Parque del Plata.',foto:0},
 {id:'1713896534185481676',descripcion:'El club participa del Interclubes en Treinta y Tres.',foto:0},
 {id:'7360959878223027023',descripcion:'Ajedrez gigante en la Plaza Varela.',foto:1},
];
const portadas:RecuerdoPortada[]=momentos.flatMap(m=>{const p=publicacionesHistoria.find(p=>p.id===m.id),foto=p?.fotos[m.foto];return p&&foto?[{foto,anio:p.anio,descripcion:m.descripcion,ruta:rutaHistoria(p)}]:[];});
export default function HistoriaPage(){
 return <div className={s.pagina}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializarDatosEstructurados({'@context':'https://schema.org','@type':'CollectionPage',name:'Historia del club Atlántida Ajedrez',url:URL_SITIO+'/historia',description:meta.description,inLanguage:'es-UY',image:URL_SITIO+imagen,mainEntity:{'@type':'ItemList',numberOfItems:publicacionesHistoria.length},isBasedOn:'https://ajedrezenlifa.blogspot.com/'})}}/>
  <header className={s.hero}><div className={s.intro}><p className="eyebrow">Historia del club</p><h1>Los años pasan.<br/>El tablero <em>nos reúne.</em></h1><p>Antes de esta página ya había partidas, amigos y muchas ganas de hacer crecer el ajedrez en Atlántida. Acá guardamos esos encuentros, los torneos y a quienes fueron parte del camino.</p><a className="button-primary" href="#recorrido-historia">Empezar el recorrido en 2010 <Icono nombre="flecha" className="h-4 w-4 rotate-90"/></a></div><PortadaHistoria recuerdos={portadas}/></header>
  <div className={s.numeros}><div><strong>{publicacionesHistoria.length}</strong><span>recuerdos de la vida del club</span></div><div><strong>2010–2023</strong><span>años documentados en el blog</span></div><div><strong>{imagenesHistoria}</strong><span>imágenes para volver a mirar</span></div></div>
  <Suspense fallback={<p role="status">Abriendo la línea de tiempo…</p>}><LineaTiempoHistoria/></Suspense>
  <Suspense fallback={<p role="status">Abriendo el archivo del club…</p>}><ArchivoHistoria/></Suspense>
  <section className={s.hoy}><div><p className="eyebrow">La historia sigue</p><h2>El próximo recuerdo lo hacemos juntos.</h2><p>Hoy seguimos encontrándonos para aprender, competir y compartir el ajedrez.</p></div><Link className="button-primary" href="/noticias">Lo que pasa hoy en el club →</Link></section>
  <details className={s.fuentes}><summary>Sobre este archivo y sus fuentes</summary><p>Esta selección parte del archivo público de <a href="https://ajedrezenlifa.blogspot.com/" target="_blank" rel="noopener noreferrer">Club de Ajedrez Atlántida en Blogger</a>, desde agosto de 2010 hasta junio de 2023. Se dejaron fuera las noticias generales de ajedrez sin relación con la vida del club. Cada recuerdo conserva su fecha, su texto y el enlace al blog original; las imágenes disponibles se pueden recorrer acá mismo.</p><p>Los hitos se apoyan en las crónicas enlazadas. La afiliación de 2011 también fue recogida por <a href="https://pandochess.blogspot.com/2011/12/asamblea-de-la-fua.html" target="_blank" rel="noopener noreferrer">el Club Solís de Pando</a>. La actividad del club en 2016 figura en <a href="https://www.imcanelones.gub.uy/agenda-cultural/torneo-abierto-ajedrez-atlantida" target="_blank" rel="noopener noreferrer">la agenda cultural de Canelones</a>.</p><p>Los horarios, precios y convocatorias del archivo corresponden a su época. Para la actividad actual, consultá <Link href="/torneos">los próximos torneos</Link> o <Link href="/noticias">las noticias del club</Link>.</p></details>
 </div>;
}
