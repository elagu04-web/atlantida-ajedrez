import {createElement,type ReactNode} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {publicacionesHistoria,rutaHistoria,slugHistoria,fechaHistoria} from '@/lib/historiaClub';
import {contenidosHistoria,type NodoHistoria} from '@/lib/historiaContenidos';
import {metadatosPagina,serializarDatosEstructurados,URL_SITIO} from '@/lib/seo';
import s from '@/components/HistoriaClub.module.css';

export const dynamicParams=false;
export function generateStaticParams(){return publicacionesHistoria.map(p=>({slug:slugHistoria(p)}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,p=publicacionesHistoria.find(p=>slugHistoria(p)===slug);if(!p)return {};
 const meta=metadatosPagina(rutaHistoria(p),p.titulo+' · Historia del club',`Archivo de Atlántida Ajedrez · ${fechaHistoria(p.fecha)}. ${p.titulo}`);
 return {...meta,openGraph:{...meta.openGraph,type:'article' as const,publishedTime:p.fecha,images:p.fotos.slice(0,1).map(f=>({url:URL_SITIO+f.src,alt:p.titulo}))}};
}
const enlacesLocales=new Map(publicacionesHistoria.map(p=>[p.fuente.replace(/^http:/,'https:'),rutaHistoria(p)]));
const etiquetas=new Set(['div','h2','h3','h4','h5','h6','strong','b','em','i','u','s','blockquote','ul','ol','li','thead','tbody','tfoot','tr','td','th','pre','code','br','hr']);
const tieneContenido=(nodos:NodoHistoria[]):boolean=>nodos.some(n=>typeof n==='string'?!!n.trim():n.tag==='img'||tieneContenido(n.hijos??[]));
function mostrar(nodos:NodoHistoria[]):ReactNode{
 return nodos.map((n,i)=>{
  if(typeof n==='string')return n;
  if(n.tag==='img'&&n.src?.startsWith('/imagenes/historia/'))return <Image key={i} src={n.src} width={n.ancho??1000} height={n.alto??750} alt={n.alt||'Imagen de la publicación histórica'} unoptimized loading="lazy"/>;
  if(n.tag==='a'){
   const href=n.href&&/^https?:\/\//.test(n.href)?n.href:undefined,local=href&&enlacesLocales.get(href.replace(/^http:/,'https:'));
   if(local)return <Link key={i} href={local}>{mostrar(n.hijos??[])}</Link>;
   return href?<a key={i} href={href} target="_blank" rel="noopener noreferrer">{mostrar(n.hijos??[])}</a>:<span key={i}>{mostrar(n.hijos??[])}</span>;
  }
  if(n.tag==='table')return <div key={i} className={s.tablaHistorica}><table>{mostrar(n.hijos??[])}</table></div>;
  if(!etiquetas.has(n.tag))return <span key={i}>{mostrar(n.hijos??[])}</span>;
  if(n.tag==='br'||n.tag==='hr')return createElement(n.tag,{key:i});
  return createElement(n.tag,{key:i,...(['td','th'].includes(n.tag)?{colSpan:n.colspan,rowSpan:n.rowspan}:{})},mostrar(n.hijos??[]));
 });
}
export default async function PublicacionHistorica({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params,indice=publicacionesHistoria.findIndex(p=>slugHistoria(p)===slug),p=publicacionesHistoria[indice];if(!p)notFound();
 const anterior=publicacionesHistoria[indice+1],siguiente=publicacionesHistoria[indice-1];
 return <article className={s.publicacion}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializarDatosEstructurados({'@context':'https://schema.org','@type':'Article',headline:p.titulo,datePublished:p.fecha,inLanguage:'es-UY',url:URL_SITIO+rutaHistoria(p),isBasedOn:p.fuente,image:p.fotos.map(f=>URL_SITIO+f.src),publisher:{'@type':'Organization',name:'Club de Ajedrez Atlántida'}})}}/>
  <Link className={s.volver} href={'/historia?anio='+p.anio+'#archivo-historia'}>← Volver al archivo de {p.anio}</Link>
  <header className={s.cabeceraPublicacion}><p className="eyebrow">Historia del club · {p.categoria}</p><h1>{p.titulo}</h1><time dateTime={p.fecha}>{fechaHistoria(p.fecha)}</time><p>Del archivo de Club de Ajedrez Atlántida</p></header>
  <div className={s.contenidoHistorico}>{tieneContenido(contenidosHistoria[p.id]??[])?mostrar(contenidosHistoria[p.id]??[]):<p>El contenido de esta entrada no se pudo recuperar. Podés consultarla en <a href={p.fuente} target="_blank" rel="noopener noreferrer">el blog original</a>.</p>}</div>
  <footer className={s.piePublicacion}><p>Publicado originalmente en el blog del club el {fechaHistoria(p.fecha)}. Los horarios y las convocatorias corresponden a esa fecha.</p><a className="text-link" href={p.fuente} target="_blank" rel="noopener noreferrer">Ver publicación original ↗</a></footer>
  <nav className={s.otrosRecuerdos} aria-label="Más publicaciones del archivo">{anterior&&<Link href={rutaHistoria(anterior)}><small>← Un recuerdo anterior</small><strong>{anterior.titulo}</strong></Link>}{siguiente&&<Link href={rutaHistoria(siguiente)}><small>Un recuerdo más reciente →</small><strong>{siguiente.titulo}</strong></Link>}</nav>
 </article>;
}
