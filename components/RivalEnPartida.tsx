"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { DATOS_BOTS_PRACTICA, type PerfilBot } from "@/lib/partidaPractica";
import { fraseBot, type EmocionBot } from "@/lib/personalidadBot";
import type { EventoRival } from "@/lib/reaccionesBot";
const GESTOS:Partial<Record<EmocionBot,string>>={risa:"JA JA",perdida:"😭",dudosa:"🤨",elogio:"✨",captura:"✦",jaque:"!",amenazado:"?!",victoria:"🏆",derrota:"😢"};
export function RivalEnPartida({perfil,emocion,reaccion,evento}:{perfil:PerfilBot;emocion:EmocionBot;reaccion:number;evento?:EventoRival|null}){
  const bot=DATOS_BOTS_PRACTICA[perfil],final=["victoria","derrota","tablas"].includes(emocion);
  const base=evento&&!final?evento.tipo:emocion;
  const firma=perfil+":"+reaccion+":"+base+":"+(evento?.id??0);
  const [activo,setActivo]=useState(true);
  const [manual,setManual]=useState<{firma:string;emocion:EmocionBot;numero:number}|null>(null);
  useEffect(()=>{if(!manual)return;const timer=setTimeout(()=>setManual(null),5000);return()=>clearTimeout(timer);},[manual]);
  const respuesta=manual?.firma===firma?manual:null;
  const actual=activo?(respuesta?.emocion??base):"esperando";
  const numero=respuesta?.numero??(["perdida","dudosa"].includes(actual)?0:Math.floor(reaccion/2));
  const frase=activo?fraseBot(perfil,actual,numero):"Modo tranquilo. Vos jugá a tu ritmo.";
  function hablar(e:EmocionBot){if(activo)setManual(m=>({firma,emocion:e,numero:(m?.numero??0)+1}));}
  return <section className="play-rival-card" data-perfil={perfil} data-emocion={actual} data-reacciones={activo} aria-label="Tu rival en esta partida">
    <div className="play-rival-title"><div><p className="eyebrow">Tu rival</p><h2>{bot.nombre}</h2></div><div className="play-rival-settings"><span className="play-rival-rating">{bot.elo?"≈"+bot.elo+" Elo":"Práctica"}</span><button type="button" className="play-rival-pause" aria-label={activo?"Pausar reacciones":"Activar reacciones"} aria-pressed={!activo} onClick={()=>{setActivo(v=>!v);setManual(null);}}>{activo?"☁":"Ⅱ"}</button></div></div>
    <div className="play-rival-body"><button type="button" className="play-rival-art" aria-label={"Hacer reír a "+bot.nombre} disabled={!activo} onClick={()=>hablar("risa")}><div key={reaccion+":"+actual+":"+(respuesta?.numero??0)} className="play-rival-float">{bot.imagen?<Image src={bot.imagen} width={240} height={240} sizes="(max-width:900px) 64px, 140px" alt={perfil==="matias"?"Matías con su celular, tu rival":perfil==="victor"?"Víctor Terminator, tu rival cyborg":"Fonchi abrazado al hipopótamo, tu rival"}/>:<span className="play-rival-knight" aria-hidden="true">♞</span>}</div>{perfil==="victor"&&<span className="play-rival-scan" aria-hidden="true"/>}{activo&&GESTOS[actual]&&<span className="play-rival-gesture" aria-hidden="true">{GESTOS[actual]}</span>}{activo&&actual==="perdida"&&<span className="play-rival-tears" aria-hidden="true"><i/><i/></span>}</button><div className="play-rival-dialogue"><span className="play-rival-style">{perfil==="matias"?"Gambito Morra · Blancas · Ataque":perfil==="victor"?"Max Level · Francesa · Ataque":perfil==="fonchi"?"Defensa Hipopótamo":"Juego libre"}</span><div className="play-rival-bubble" key={frase}><span className="play-rival-speaker">{bot.nombre}</span><p className="play-rival-phrase" role="status" aria-live="polite" aria-atomic="true">{frase}</p>{actual==="pensando"&&activo&&<span className="play-rival-dots" aria-hidden="true"><i/><i/><i/></span>}</div></div></div>
    <div className="play-rival-reactions" role="group" aria-label="Hablar con tu rival"><button type="button" disabled={!activo} onClick={()=>hablar("risa")}>Jajaja</button><button type="button" disabled={!activo} onClick={()=>hablar("elogio")}>¡Bien jugado!</button><button type="button" disabled={!activo} onClick={()=>hablar("charla")}>Decí algo</button><button type="button" className="play-rival-pause-mobile" aria-label={activo?"Pausar reacciones":"Activar reacciones"} aria-pressed={!activo} onClick={()=>{setActivo(v=>!v);setManual(null);}}>{activo?"Ⅱ":"▶"}</button></div>
  </section>;
}
