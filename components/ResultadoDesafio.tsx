"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TablaRachas } from "./TablaRachas";
import s from "./ResultadoDesafio.module.css";

export function ResultadoDesafio({finalizado,miNombre,alVolver,children}:{finalizado:boolean;miNombre?:string;alVolver?:()=>void;children:ReactNode}) {
  const [vista,setVista]=useState<"tablero"|"tabla">("tablero");
  const [tablaMontada,setTablaMontada]=useState(false);
  const [mostrado,setMostrado]=useState(false);
  const [anunciado,setAnunciado]=useState(false);
  const titulo=useRef<HTMLHeadingElement>(null),volver=useRef<HTMLButtonElement>(null);
  const region=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const abrir=()=>{if(window.location.hash==="#rachas"){setTablaMontada(true);setVista("tabla");setAnunciado(true);}};
    const id=setTimeout(abrir,0);window.addEventListener("hashchange",abrir);return()=>{clearTimeout(id);window.removeEventListener("hashchange",abrir);};
  },[]);
  // Se da tiempo para leer el resultado y se abre una sola vez. Volver a
  // analizar no provoca otro cambio automático ni reinicia el intento.
  useEffect(()=>{
    if(!finalizado||mostrado)return;
    const id=setTimeout(()=>{setTablaMontada(true);setMostrado(true);setVista("tabla");setAnunciado(true);},1800);
    return()=>clearTimeout(id);
  },[finalizado,mostrado]);
  useEffect(()=>{
    if(vista!=="tabla")return;
    window.dispatchEvent(new Event("desafio-resuelto"));
    const id=setTimeout(()=>{
      // Conserva el foco si la persona estaba leyendo o usando otra zona.
      if(region.current?.contains(document.activeElement))titulo.current?.focus({preventScroll:true});
    },900);
    return()=>clearTimeout(id);
  },[vista]);
  useEffect(()=>{if(vista!=="tablero"||!anunciado)return;const id=setTimeout(()=>volver.current?.focus({preventScroll:true}),900);return()=>clearTimeout(id);},[vista,anunciado]);
  function mostrarTabla(){setTablaMontada(true);if(finalizado)setMostrado(true);setVista("tabla");setAnunciado(true);}
  return <div ref={region} className={s.raiz} data-vista={vista}>
    <p className="sr-only" role="status">{anunciado&&vista==="tabla"?"La tabla de rachas y desafíos resueltos aparece en el lugar del tablero.":""}</p>
    <div className={s.cambio}>
      <div className={s.tablero} inert={vista==="tabla"} aria-hidden={vista==="tabla"}>
        {children}
        <div className={s.acciones}><button ref={volver} type="button" className="button-secondary" onClick={mostrarTabla}>Ver rachas y resueltos <span aria-hidden="true">→</span></button></div>
      </div>
      <div className={s.resultado} inert={vista!=="tabla"} aria-hidden={vista!=="tabla"}>
        {tablaMontada&&<>
          <div className={s.cabecera}><div><p className="eyebrow text-amber-200">El desafío, entre todos</p><h2 ref={titulo} tabIndex={-1}>Así viene el club</h2><p>Tu racha y tus desafíos resueltos, junto a los de tus compañeros.</p></div><button type="button" className="button-primary" onClick={()=>{alVolver?.();setVista("tablero");if(window.location.hash==="#rachas")window.history.replaceState(null,"",window.location.pathname+window.location.search);}}>{finalizado?"Volver a analizar el problema":"Volver al problema"}<span aria-hidden="true">↩</span></button></div>
          <TablaRachas enResultado miNombre={miNombre}/>
        </>}
      </div>
    </div>
  </div>;
}
