"use client";
import { useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icono } from "./Icono";
import { fechaNoticia, minutosNoticia, type Noticia } from "@/lib/noticias";

export function CarruselNoticias({noticias,portada=false}:{noticias:Noticia[];portada?:boolean}) {
  const id=useId();
  const pista=useRef<HTMLDivElement>(null);
  const arrastre=useRef<{id:number;x:number;y:number;distancia:number;activo:boolean}|null>(null);
  const bloquearClickHasta=useRef(0);
  const [elegida,setElegida]=useState(0);
  const cantidad=noticias.length,actual=cantidad?elegida%cantidad:0;
  function irA(indice:number){
    if(cantidad)setElegida((indice%cantidad+cantidad)%cantidad);
  }
  function distancia(indice:number){
    let d=(indice-actual+cantidad)%cantidad;
    if(d>cantidad/2)d-=cantidad;
    return d;
  }
  function terminar(cancelado=false){
    const movimiento=arrastre.current,elemento=pista.current;
    arrastre.current=null;
    if(!movimiento||!elemento)return;
    elemento.style.removeProperty("--news-drag");
    delete elemento.dataset.arrastrando;
    if(movimiento.activo){
      bloquearClickHasta.current=Date.now()+300;
      if(!cancelado&&Math.abs(movimiento.distancia)>=Math.max(32,Math.min(80,elemento.clientWidth*.09)))
        irA(actual+(movimiento.distancia<0?1:-1));
    }
    if(elemento.hasPointerCapture(movimiento.id))elemento.releasePointerCapture(movimiento.id);
  }
  if(!cantidad)return null;
  return <section id={portada?"noticias":undefined} className="news-carousel" data-unica={cantidad===1} aria-labelledby={`${id}-titulo`}>
    <div className="news-heading">
      <div><p className="eyebrow news-eyebrow"><span/>Noticias de Atlántida</p><h2 id={`${id}-titulo`}>{portada?"Fuera del tablero.":"Las últimas del club."}</h2><p className="news-description">Los logros, las novedades y la vida del club, en primera fila.</p></div>
      <div className="news-heading-actions">
        {portada&&<Link href="/noticias" className="text-link">Todas las noticias<Icono nombre="flecha" className="h-4 w-4"/></Link>}
        {cantidad>1&&<div className="news-arrows"><button type="button" className="icon-button" aria-label="Noticia anterior" aria-controls={`${id}-pista`} onClick={()=>irA(actual-1)}><Icono nombre="flecha" className="h-4 w-4 rotate-180"/></button><button type="button" className="icon-button" aria-label="Noticia siguiente" aria-controls={`${id}-pista`} onClick={()=>irA(actual+1)}><Icono nombre="flecha" className="h-4 w-4"/></button></div>}
      </div>
    </div>
    <div id={`${id}-pista`} ref={pista} className="news-track" role="region" aria-roledescription="carrusel" aria-label="Fotos y noticias del club" tabIndex={cantidad>1?0:undefined}
      onKeyDown={e=>{
        if(cantidad<2)return;
        const destino=e.key==="ArrowRight"?actual+1:e.key==="ArrowLeft"?actual-1:e.key==="Home"?0:e.key==="End"?cantidad-1:null;
        if(destino!==null){e.preventDefault();e.currentTarget.focus({preventScroll:true});irA(destino);}
      }}
      onDragStart={e=>e.preventDefault()}
      onPointerDown={e=>{if(cantidad<2||!e.isPrimary||(e.pointerType==="mouse"&&e.button!==0))return;arrastre.current={id:e.pointerId,x:e.clientX,y:e.clientY,distancia:0,activo:false};}}
      onPointerMove={e=>{
        const m=arrastre.current;if(!m||m.id!==e.pointerId)return;
        if(e.pointerType==="mouse"&&e.buttons===0){terminar(true);return;}
        const dx=e.clientX-m.x,dy=e.clientY-m.y;
        if(!m.activo){
          if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){arrastre.current=null;return;}
          if(Math.abs(dx)<10||Math.abs(dx)<Math.abs(dy)*1.2)return;
          m.activo=true;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.dataset.arrastrando="true";
        }
        m.distancia=dx;e.preventDefault();
        e.currentTarget.style.setProperty("--news-drag",`${Math.max(-120,Math.min(120,dx*.45))}px`);
      }}
      onPointerUp={()=>terminar()} onPointerCancel={()=>terminar(true)} onLostPointerCapture={()=>terminar(true)}
      onPointerLeave={()=>{if(!arrastre.current?.activo)arrastre.current=null;}}
      onClickCapture={e=>{if(e.detail>0&&Date.now()<bloquearClickHasta.current){e.preventDefault();e.stopPropagation();}}}>
      {noticias.map((noticia,indice)=>{
        const offset=distancia(indice),activa=indice===actual;
        return <article key={noticia.slug} className="news-card" data-noticia data-offset={Math.abs(offset)>2?"fuera":offset} aria-hidden={!activa} aria-roledescription="diapositiva" aria-label={`${indice+1} de ${cantidad}`}>
          <Image src={noticia.imagen} alt={noticia.imagenAlt} fill quality={noticia.imagenCalidad??75} unoptimized={noticia.imagenSinCompresion} loading={!portada&&indice===0?"eager":"lazy"} sizes="(max-width: 767px) 82vw, (max-width: 1100px) 45vw, 460px" className="news-card-photo" style={{objectPosition:noticia.imagenPosicion??"50% 50%"}} draggable={false}/>
          <div className="news-card-shade"/>
          <div className="news-card-top"><span className="news-category">{noticia.categoria}</span><span className="news-card-number">{String(indice+1).padStart(2,"0")}</span></div>
          <div className="news-card-copy"><div className="news-card-meta"><time dateTime={noticia.fecha}>{fechaNoticia(noticia.fecha)}</time><span>·</span><span>{minutosNoticia(noticia)} min de lectura</span></div><h3>{noticia.tituloTarjeta??noticia.titulo}</h3><p>{noticia.bajada}</p><span className="news-read">Entrar a la historia<span className="news-read-icon"><Icono nombre="flecha" className="h-4 w-4 -rotate-45"/></span></span></div>
          {activa?<Link href={`/noticias/${noticia.slug}`} className="news-card-open" draggable={false} aria-label={`Leer ${noticia.titulo}`}/>:<button type="button" className="news-card-select" tabIndex={-1} aria-label={`Mostrar ${noticia.titulo}`} onClick={()=>irA(indice)}/>}
        </article>;
      })}
    </div>
    <div className="news-bottom"><p>{cantidad>1?"Deslizá o tocá una tarjeta lateral. Abrí la noticia del centro.":"Las historias del club, en primera fila."}</p><div className="news-pagination">{cantidad>1&&<div className="news-dots" role="group" aria-label="Elegir noticia">{noticias.map((noticia,indice)=><button type="button" key={noticia.slug} aria-label={`Ver noticia ${indice+1}: ${noticia.titulo}`} aria-pressed={indice===actual} onClick={()=>irA(indice)}/>)}</div>}<span className="news-counter">{String(actual+1).padStart(2,"0")}<span> / {String(cantidad).padStart(2,"0")}</span></span></div></div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">Noticia {actual+1} de {cantidad}: {noticias[actual].titulo}</p>
  </section>;
}
