"use client";
import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icono } from "./Icono";
import { fechaNoticia, minutosNoticia, type Noticia } from "@/lib/noticias";

export function CarruselNoticias({noticias,portada=false}:{noticias:Noticia[];portada?:boolean}) {
  const id=useId(); const pista=useRef<HTMLDivElement>(null);
  const arrastre=useRef<{id:number;x:number;scroll:number;activo:boolean}|null>(null);
  const bloquearClickHasta=useRef(0);
  const [actual,setActual]=useState(0),[anterior,setAnterior]=useState(false),[siguiente,setSiguiente]=useState(false);
  useEffect(()=>{
    const elemento=pista.current;if(!elemento)return;
    let frame=0;
    function medir(){
      if(!elemento)return;const tarjetas=Array.from(elemento.querySelectorAll<HTMLElement>("[data-noticia]"));
      const limite=elemento.scrollWidth-elemento.clientWidth;
      setAnterior(elemento.scrollLeft>2);setSiguiente(elemento.scrollLeft<limite-2);
      let indice=0,distancia=Infinity;
      if(limite>2&&elemento.scrollLeft>=limite-2)indice=tarjetas.length-1;
      else tarjetas.forEach((tarjeta,i)=>{const diferencia=Math.abs(tarjeta.offsetLeft-elemento.scrollLeft);if(diferencia<distancia){distancia=diferencia;indice=i;}});
      setActual(Math.max(0,indice));
    }
    function programar(){cancelAnimationFrame(frame);frame=requestAnimationFrame(medir);}
    elemento.addEventListener("scroll",programar,{passive:true});const observador=new ResizeObserver(programar);observador.observe(elemento);programar();
    return()=>{cancelAnimationFrame(frame);elemento.removeEventListener("scroll",programar);observador.disconnect();};
  },[noticias.length]);
  function irA(indice:number){const elemento=pista.current;if(!elemento)return;const tarjetas=elemento.querySelectorAll<HTMLElement>("[data-noticia]");const tarjeta=tarjetas[Math.max(0,Math.min(tarjetas.length-1,indice))];if(tarjeta)elemento.scrollTo({left:tarjeta.offsetLeft,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});}
  function terminar(){const elemento=pista.current;const movimiento=arrastre.current;if(movimiento?.activo){bloquearClickHasta.current=Date.now()+200;if(elemento){elemento.style.scrollSnapType="";delete elemento.dataset.arrastrando;if(elemento.hasPointerCapture(movimiento.id))elemento.releasePointerCapture(movimiento.id);}}arrastre.current=null;}
  if(!noticias.length)return null;
  return <section id={portada?"noticias":undefined} className="news-carousel" data-unica={noticias.length===1} aria-labelledby={`${id}-titulo`}>
    <div className="news-heading"><div><p className="eyebrow news-eyebrow"><span/>El lado B de Atlántida</p><h2 id={`${id}-titulo`}>{portada?"Fuera del tablero.":"Las últimas del club."}</h2><p className="news-description">Las fotos, las anécdotas y las ocurrencias del club, en primera fila.</p></div><div className="news-heading-actions">{portada&&<Link href="/noticias" className="text-link">Todas las noticias<Icono nombre="flecha" className="h-4 w-4"/></Link>}{noticias.length>1&&<div className="news-arrows"><button type="button" className="icon-button" aria-label="Noticia anterior" aria-controls={`${id}-pista`} disabled={!anterior} onClick={()=>irA(actual-1)}><Icono nombre="flecha" className="h-4 w-4 rotate-180"/></button><button type="button" className="icon-button" aria-label="Noticia siguiente" aria-controls={`${id}-pista`} disabled={!siguiente} onClick={()=>irA(actual+1)}><Icono nombre="flecha" className="h-4 w-4"/></button></div>}</div></div>
    <div id={`${id}-pista`} ref={pista} className="news-track" role="region" aria-roledescription="carrusel" aria-label="Fotos y noticias del club" tabIndex={noticias.length>1?0:undefined}
      onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();irA(actual+(e.key==="ArrowRight"?1:-1));}}}
      onDragStart={e=>e.preventDefault()}
      onPointerDown={e=>{bloquearClickHasta.current=0;if(e.pointerType!=="mouse"||e.button!==0)return;arrastre.current={id:e.pointerId,x:e.clientX,scroll:e.currentTarget.scrollLeft,activo:false};}}
      onPointerMove={e=>{const movimiento=arrastre.current;if(!movimiento||movimiento.id!==e.pointerId)return;if(e.buttons===0){terminar();return;}const diferencia=e.clientX-movimiento.x;if(!movimiento.activo&&Math.abs(diferencia)>8){movimiento.activo=true;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.style.scrollSnapType="none";e.currentTarget.dataset.arrastrando="true";}if(movimiento.activo){e.preventDefault();e.currentTarget.scrollLeft=movimiento.scroll-diferencia;}}}
      onPointerUp={terminar} onPointerCancel={terminar} onPointerLeave={()=>{if(!arrastre.current?.activo)arrastre.current=null;}}
      onClickCapture={e=>{if(e.detail>0&&Date.now()<bloquearClickHasta.current){e.preventDefault();e.stopPropagation();}}}>
      {noticias.map((noticia,indice)=><Link key={noticia.slug} href={`/noticias/${noticia.slug}`} className="news-card group" data-noticia draggable={false} aria-label={`Leer ${noticia.titulo}`}>
        <Image src={noticia.imagen} alt={noticia.imagenAlt} fill loading={!portada&&indice===0?"eager":"lazy"} sizes={noticias.length===1?"(max-width: 767px) 100vw, 1152px":"(max-width: 767px) 90vw, 740px"} className="news-card-photo" style={{objectPosition:noticia.imagenPosicion??"50% 50%"}} draggable={false}/>
        <div className="news-card-shade"/>
        <div className="news-card-top"><span className="news-category">{noticia.categoria}</span><span className="news-card-number">{String(indice+1).padStart(2,"0")}</span></div>
        <div className="news-card-copy"><div className="news-card-meta"><time dateTime={noticia.fecha}>{fechaNoticia(noticia.fecha)}</time><span>·</span><span>{minutosNoticia(noticia)} min de lectura</span></div><h3>{noticia.titulo}</h3><p>{noticia.bajada}</p><span className="news-read">Entrar a la historia<span className="news-read-icon"><Icono nombre="flecha" className="h-4 w-4 -rotate-45"/></span></span></div>
      </Link>)}
    </div>
    <div className="news-bottom"><p>{noticias.length>1?"Deslizá, arrastrá o usá las flechas para explorar.":"Una nueva sección. Las próximas historias están en camino."}</p><div className="news-pagination">{noticias.length>1&&<div className="news-dots" role="group" aria-label="Elegir noticia">{noticias.map((noticia,indice)=><button type="button" key={noticia.slug} aria-label={`Ver noticia ${indice+1}: ${noticia.titulo}`} aria-pressed={indice===actual} onClick={()=>irA(indice)}/>)}</div>}<span className="news-counter">{String(actual+1).padStart(2,"0")}<span> / {String(noticias.length).padStart(2,"0")}</span></span></div></div>
  </section>;
}
