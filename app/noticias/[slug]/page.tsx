import type { Metadata } from "next";
import { URL_SITIO, NOMBRE_SITIO, serializarDatosEstructurados } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icono } from "@/components/Icono";
import { ContenidoNoticia } from "@/components/ContenidoNoticia";
import { CompartirNoticia } from "@/components/CompartirNoticia";
import { CarruselNoticias } from "@/components/CarruselNoticias";
import { noticias, noticiasRecientes, obtenerNoticia, fechaNoticia, minutosNoticia } from "@/lib/noticias";
import styles from "@/components/NoticiasClub.module.css";
export function generateStaticParams(){return noticias.map(n=>({slug:n.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const n=obtenerNoticia(slug);if(!n)return {title:"Noticia no encontrada"};return {title:`${n.titulo} · Atlántida Ajedrez`,description:n.bajada,alternates:{canonical:`https://atlantida-ajedrez.vercel.app/noticias/${n.slug}`},openGraph:{type:"article",title:n.titulo,description:n.bajada,url:`https://atlantida-ajedrez.vercel.app/noticias/${n.slug}`,publishedTime:n.fecha,images:[{url:`https://atlantida-ajedrez.vercel.app${n.imagen}`,alt:n.imagenAlt}]}};}
export default async function NoticiaPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const noticia=obtenerNoticia(slug);if(!noticia)notFound();
 const otras=noticiasRecientes().filter(n=>n.slug!==slug);
 return <article className={`news-article ${styles.lectura}`}><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializarDatosEstructurados({"@context":"https://schema.org","@type":"Article",headline:noticia.titulo,description:noticia.bajada,datePublished:noticia.fecha,image:[URL_SITIO+noticia.imagen],mainEntityOfPage:URL_SITIO+"/noticias/"+noticia.slug,inLanguage:"es-UY",author:{"@type":"Organization",name:NOMBRE_SITIO,url:URL_SITIO+"/"},publisher:{"@id":URL_SITIO+"/#club","@type":"Organization",name:NOMBRE_SITIO,logo:{"@type":"ImageObject",url:URL_SITIO+"/imagenes/logo-club.png"}}})}}/><Link href="/noticias" className="text-link"><Icono nombre="flecha" className="h-4 w-4 rotate-180"/>Volver a las noticias</Link><header className="news-article-heading"><p className="eyebrow text-amber-200">{noticia.categoria}</p><h1>{noticia.titulo}</h1><p className="news-article-deck">{noticia.bajada}</p><div className="news-article-meta"><span className="news-author-mark" aria-hidden="true"><Image src="/imagenes/logo-club.png" width={30} height={30} alt=""/></span><span><strong>Atlántida Ajedrez</strong><span><time dateTime={noticia.fecha}>{fechaNoticia(noticia.fecha)}</time> · {minutosNoticia(noticia)} min de lectura</span></span></div></header>
 <figure className="news-article-figure" style={noticia.imagenVertical?{width:"100%",maxWidth:noticia.imagenAncho??720,marginInline:"auto"}:undefined}><div className="news-article-photo" style={noticia.imagenVertical?{aspectRatio:noticia.imagenAspecto??"3 / 4"}:undefined}><Image src={noticia.imagen} alt={noticia.imagenAlt} fill quality={noticia.imagenCalidad??75} unoptimized={noticia.imagenSinCompresion} sizes={noticia.imagenVertical?`(max-width: 767px) 100vw, ${noticia.imagenAncho??720}px`:"(max-width: 767px) 100vw, 1152px"} preload style={{objectFit:"cover",objectPosition:noticia.imagenPosicion??"50% 50%"}}/></div>{noticia.pieFoto&&<figcaption>{noticia.pieFoto}</figcaption>}</figure>
 <div className="news-article-body"><ContenidoNoticia bloques={noticia.bloques??noticia.parrafos.map(texto=>({tipo:"parrafo" as const,texto}))}/>{noticia.galeria?.map(f=><figure key={f.imagen} className="news-gallery-photo" style={f.maxAncho?{maxWidth:f.maxAncho,marginInline:"auto"}:undefined}><Image src={f.imagen} alt={f.alt} quality={noticia.imagenCalidad??75} unoptimized={noticia.imagenSinCompresion} width={f.ancho??1200} height={f.alto??900} sizes={`(max-width: 767px) 100vw, ${f.maxAncho??720}px`} style={{width:"100%",height:"auto"}}/>{f.pie&&<figcaption>{f.pie}</figcaption>}</figure>)}<div className="news-article-end"><p>Una comunidad. Muchas historias.</p><CompartirNoticia titulo={noticia.titulo}/></div></div>
 {otras.length>0&&<CarruselNoticias noticias={otras.slice(0,6)}/>}
 </article>;
}
