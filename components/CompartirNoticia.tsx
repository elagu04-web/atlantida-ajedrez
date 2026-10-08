"use client";
import { useState } from "react";
import { Icono } from "./Icono";

export function CompartirNoticia({titulo}:{titulo:string}) {
  const [estado,setEstado]=useState(""); const [enviando,setEnviando]=useState(false); const [enlace,setEnlace]=useState("");
  async function compartir() {
    if(enviando)return;setEnviando(true);setEstado("");
    const url=window.location.origin+window.location.pathname;
    try {
      if(navigator.share) {await navigator.share({title:titulo,url});setEstado("Noticia compartida.");}
      else if(navigator.clipboard?.writeText) {await navigator.clipboard.writeText(url);setEstado("Enlace copiado.");}
      else {setEnlace(url);setEstado("Copiá este enlace para compartir la noticia.");}
    } catch(error) {if((error as DOMException)?.name!=="AbortError"){setEnlace(url);setEstado("Copiá este enlace para compartir la noticia.");}}
    finally {setEnviando(false);}
  }
  return <div className="news-share"><button type="button" onClick={()=>void compartir()} disabled={enviando} className="button-secondary"><Icono nombre="flecha" className="h-4 w-4 -rotate-45"/>{enviando?"Compartiendo…":"Compartir noticia"}</button><p role="status" className="text-xs text-zinc-400">{estado}</p>{enlace&&<label className="text-xs text-zinc-400">Enlace de la noticia<input type="text" readOnly value={enlace} onFocus={e=>e.target.select()} className="mt-2 w-full rounded-lg border border-white/15 p-2"/></label>}</div>;
}
