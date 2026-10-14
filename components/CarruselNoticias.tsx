"use client";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icono } from "./Icono";
import { fechaNoticia, minutosNoticia, type Noticia } from "@/lib/noticias";

export function CarruselNoticias({noticias,portada=false}:{noticias:Noticia[];portada?:boolean}) {
  const id=useId();
  const pista=useRef<HTMLDivElement>(null);
  const arrastre=useRef<{id:number;tipo:"pointer"|"touch";x:number;y:number;distancia:number;activo:boolean;paso:number;ultimoX:number;tiempo:number;velocidad:number}|null>(null);
  const bloquearClickHasta=useRef(0);
  const [elegida,setElegida]=useState(0);
  const cantidad=noticias.length,actual=cantidad?elegida%cantidad:0;
  const irA=useCallback((indice:number)=>{
    if(cantidad)setElegida((indice%cantidad+cantidad)%cantidad);
  },[cantidad]);
  function distancia(indice:number){
    let d=(indice-actual+cantidad)%cantidad;
    if(d>cantidad/2)d-=cantidad;
    return d;
  }
  const iniciar=useCallback((id:number,x:number,y:number,tipo:"pointer"|"touch")=>{
    const elemento=pista.current;if(!elemento||arrastre.current)return;
    const tarjeta=elemento.querySelector<HTMLElement>('.news-card[data-offset="0"]');
    arrastre.current={id,tipo,x,y,distancia:0,activo:false,paso:Math.max(80,(tarjeta?.offsetWidth??300)*.44),ultimoX:x,tiempo:performance.now(),velocidad:0};
  },[]);
  const mover=useCallback((x:number,y:number)=>{
    const m=arrastre.current,elemento=pista.current;if(!m||!elemento)return false;
    const dx=x-m.x,dy=y-m.y;
    if(!m.activo){
      if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)*1.35){arrastre.current=null;return false;}
      if(Math.abs(dx)<7||Math.abs(dx)<Math.abs(dy)*.85)return false;
      m.activo=true;elemento.dataset.arrastrando="true";
    }
    const ahora=performance.now(),intervalo=ahora-m.tiempo;
    if(intervalo>0)m.velocidad=(x-m.ultimoX)/intervalo;
    m.ultimoX=x;m.tiempo=ahora;m.distancia=dx;
    elemento.dataset.direccion=dx<0?"siguiente":"anterior";
    elemento.style.setProperty("--news-progress",`${Math.max(-1.12,Math.min(1.12,-dx/m.paso))}`);
    return true;
  },[]);
  const terminar=useCallback((cancelado=false)=>{
    const movimiento=arrastre.current,elemento=pista.current;
    arrastre.current=null;
    if(!movimiento||!elemento)return;
    elemento.style.removeProperty("--news-progress");
    delete elemento.dataset.arrastrando;
    delete elemento.dataset.direccion;
    if(movimiento.activo){
      bloquearClickHasta.current=Date.now()+500;
      const recorrido=Math.abs(movimiento.distancia),rapido=Math.abs(movimiento.velocidad)>.45&&performance.now()-movimiento.tiempo<120;
      if(!cancelado&&(recorrido>=movimiento.paso*.3||(rapido&&recorrido>=16)))
        irA(actual+(movimiento.distancia<0?1:-1));
    }
    if(movimiento.tipo==="pointer"&&elemento.hasPointerCapture(movimiento.id))elemento.releasePointerCapture(movimiento.id);
  },[actual,irA]);
  useEffect(()=>{
    const elemento=pista.current;if(!elemento||cantidad<2)return;
    // Touch events keep following the finger even when the browser cancels its
    // pointer stream. Only a horizontal gesture blocks native page scrolling.
    const empezar=(e:TouchEvent)=>{
      if(e.touches.length!==1){terminar(true);return;}
      const t=e.touches[0];iniciar(t.identifier,t.clientX,t.clientY,"touch");
    };
    const desplazar=(e:TouchEvent)=>{
      const m=arrastre.current;if(!m||m.tipo!=="touch")return;
      if(e.touches.length!==1){terminar(true);return;}
      const t=Array.from(e.touches).find(t=>t.identifier===m.id);if(!t)return;
      if(mover(t.clientX,t.clientY)&&e.cancelable)e.preventDefault();
    };
    const soltar=(e:TouchEvent)=>{
      const m=arrastre.current;if(!m||m.tipo!=="touch")return;
      const t=Array.from(e.changedTouches).find(t=>t.identifier===m.id);if(!t)return;
      if(t.clientX!==m.ultimoX)mover(t.clientX,t.clientY);terminar();
    };
    const cancelar=()=>terminar(true);
    elemento.addEventListener("touchstart",empezar,{passive:true});
    elemento.addEventListener("touchmove",desplazar,{passive:false});
    elemento.addEventListener("touchend",soltar);
    elemento.addEventListener("touchcancel",cancelar);
    return()=>{
      elemento.removeEventListener("touchstart",empezar);
      elemento.removeEventListener("touchmove",desplazar);
      elemento.removeEventListener("touchend",soltar);
      elemento.removeEventListener("touchcancel",cancelar);
    };
  },[cantidad,iniciar,mover,terminar]);
  if(!cantidad)return null;
  return <section id={portada?"noticias":undefined} className="news-carousel" data-unica={cantidad===1} aria-labelledby={`${id}-titulo`}>
    <div className="news-heading">
      <div><p className="eyebrow news-eyebrow"><span/>Noticias de Atlántida</p><h2 id={`${id}-titulo`}>{portada?"Fuera del tablero.":"Las últimas del club."}</h2><p className="news-description">Los logros, las novedades y la vida del club, en primera fila.</p></div>
      {portada&&<div className="news-heading-actions"><Link href="/noticias" className="text-link">Todas las noticias<Icono nombre="flecha" className="h-4 w-4"/></Link></div>}
    </div>
    <div id={`${id}-pista`} ref={pista} className="news-track" role="region" aria-roledescription="carrusel" aria-label="Fotos y noticias del club" tabIndex={cantidad>1?0:undefined}
      onKeyDown={e=>{
        if(cantidad<2)return;
        const destino=e.key==="ArrowRight"?actual+1:e.key==="ArrowLeft"?actual-1:e.key==="Home"?0:e.key==="End"?cantidad-1:null;
        if(destino!==null){e.preventDefault();e.currentTarget.focus({preventScroll:true});irA(destino);}
      }}
      onDragStart={e=>e.preventDefault()}
      onPointerDown={e=>{if(cantidad<2||e.pointerType==="touch"||!e.isPrimary||(e.pointerType==="mouse"&&e.button!==0))return;iniciar(e.pointerId,e.clientX,e.clientY,"pointer");}}
      onPointerMove={e=>{
        const m=arrastre.current;if(!m||m.tipo!=="pointer"||m.id!==e.pointerId)return;
        if(e.pointerType==="mouse"&&e.buttons===0){terminar(true);return;}
        if(mover(e.clientX,e.clientY)){
          if(!e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.setPointerCapture(e.pointerId);
          e.preventDefault();
        }
      }}
      onPointerUp={e=>{const m=arrastre.current;if(m?.tipo==="pointer"&&m.id===e.pointerId){if(e.clientX!==m.ultimoX)mover(e.clientX,e.clientY);terminar();}}} onPointerCancel={e=>{if(arrastre.current?.tipo==="pointer"&&arrastre.current.id===e.pointerId)terminar(true);}} onLostPointerCapture={e=>{if(e.target===e.currentTarget&&arrastre.current?.tipo==="pointer")terminar(true);}}
      onPointerLeave={()=>{if(arrastre.current?.tipo==="pointer"&&!arrastre.current.activo)arrastre.current=null;}}
      onClickCapture={e=>{if(e.detail>0&&Date.now()<bloquearClickHasta.current){e.preventDefault();e.stopPropagation();}}}>
      {noticias.map((noticia,indice)=>{
        const offset=distancia(indice),activa=indice===actual;
        return <article key={noticia.slug} className="news-card" data-noticia data-offset={Math.abs(offset)>2?"fuera":offset} style={{"--news-start":offset} as CSSProperties} aria-hidden={!activa} aria-roledescription="diapositiva" aria-label={`${indice+1} de ${cantidad}`}>
          <Image src={noticia.imagen} alt={noticia.imagenAlt} fill quality={noticia.imagenCalidad??75} unoptimized={noticia.imagenSinCompresion} loading={!portada&&indice===0?"eager":"lazy"} sizes="(max-width: 767px) 82vw, (max-width: 1100px) 45vw, 460px" className="news-card-photo" style={{objectPosition:noticia.imagenPosicion??"50% 50%"}} draggable={false}/>
          <div className="news-card-shade"/>
          <div className="news-card-top"><span className="news-category">{noticia.categoria}</span><span className="news-card-number">{String(indice+1).padStart(2,"0")}</span></div>
          <div className="news-card-copy"><div className="news-card-meta"><time dateTime={noticia.fecha}>{fechaNoticia(noticia.fecha)}</time><span>·</span><span>{minutosNoticia(noticia)} min de lectura</span></div><h3>{noticia.tituloTarjeta??noticia.titulo}</h3><p>{noticia.bajada}</p><span className="news-read">Entrar a la historia<span className="news-read-icon"><Icono nombre="flecha" className="h-4 w-4 -rotate-45"/></span></span></div>
          {activa?<Link href={`/noticias/${noticia.slug}`} className="news-card-open" draggable={false} aria-label={`Leer ${noticia.titulo}`}/>:<button type="button" className="news-card-select" tabIndex={-1} aria-label={`Mostrar ${noticia.titulo}`} onClick={()=>irA(indice)}/>}
        </article>;
      })}
    </div>
    <div className="news-bottom"><p>{cantidad>1?"Deslizá o tocá una tarjeta lateral. Abrí la noticia del centro.":"Las historias del club, en primera fila."}</p><div className="news-pagination">{cantidad>1&&<button type="button" className="icon-button news-step" aria-label="Noticia anterior" aria-controls={`${id}-pista`} onClick={()=>irA(actual-1)}><Icono nombre="flecha" className="h-4 w-4 rotate-180"/></button>}<div className="news-position"><span className="news-counter">{String(actual+1).padStart(2,"0")}<span> / {String(cantidad).padStart(2,"0")}</span></span>{cantidad>1&&<div className="news-dots" role="group" aria-label="Elegir noticia">{noticias.map((noticia,indice)=><button type="button" key={noticia.slug} aria-label={`Ver noticia ${indice+1}: ${noticia.titulo}`} aria-pressed={indice===actual} onClick={()=>irA(indice)}/>)}</div>}</div>{cantidad>1&&<button type="button" className="icon-button news-step" aria-label="Noticia siguiente" aria-controls={`${id}-pista`} onClick={()=>irA(actual+1)}><Icono nombre="flecha" className="h-4 w-4"/></button>}</div></div>
    <p className="sr-only" aria-live="polite" aria-atomic="true">Noticia {actual+1} de {cantidad}: {noticias[actual].titulo}</p>
  </section>;
}
