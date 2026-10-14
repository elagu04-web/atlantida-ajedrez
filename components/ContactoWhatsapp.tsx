"use client";
import {useEffect,useState} from "react";
import {Icono} from "./Icono";

const enlace=`https://wa.me/59899861116?text=${encodeURIComponent("Hola Agustín, quería hacerte una consulta sobre Atlántida Ajedrez.")}`;

export function ContactoWhatsapp({flotante=false}:{flotante?:boolean}){
  const [pieVisible,setPieVisible]=useState(false);
  useEffect(()=>{
    if(!flotante)return;
    const pie=document.querySelector(".site-footer");if(!pie)return;
    const observador=new IntersectionObserver(([entrada])=>setPieVisible(entrada.isIntersecting));
    observador.observe(pie);return()=>observador.disconnect();
  },[flotante]);
  return <a href={enlace} target="_blank" rel="noopener noreferrer" hidden={flotante&&pieVisible} className={flotante?"club-whatsapp-float":"club-whatsapp-footer"} aria-label="Contactar a Agustín por WhatsApp (abre en otra pestaña)">
    <span className="club-whatsapp-icon"><Icono nombre="whatsapp" className="h-6 w-6"/></span>
    <span className="club-whatsapp-label">{flotante?<><strong>¿Una consulta?</strong><span>Escribile a Agustín</span></>:"WhatsApp"}</span>
  </a>;
}
