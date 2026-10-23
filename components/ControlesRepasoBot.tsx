"use client";
import {useEffect,useState,type KeyboardEvent} from 'react';
import s from './ControlesRepasoBot.module.css';

export function ControlesRepasoBot({paso,total,texto,ir}:{paso:number;total:number;texto:string;ir:(paso:number)=>void}){
 const [auto,setAuto]=useState(false);
 useEffect(()=>{if(!auto||paso>=total)return;const t=setTimeout(()=>{ir(paso+1);if(paso+1>=total)setAuto(false);},850);return()=>clearTimeout(t);},[auto,paso,total,ir]);
 useEffect(()=>{const parar=()=>{if(document.hidden)setAuto(false);};document.addEventListener('visibilitychange',parar);return()=>document.removeEventListener('visibilitychange',parar);},[]);
 function elegir(n:number){setAuto(false);ir(Math.max(0,Math.min(total,n)));}
 function reproducir(){if(auto)setAuto(false);else{if(paso===total)ir(0);setAuto(true);}}
 function teclado(e:KeyboardEvent){if(e.target instanceof HTMLInputElement)return;const n=({ArrowLeft:paso-1,ArrowRight:paso+1,Home:0,End:total} as Record<string,number>)[e.key];if(typeof n==='number'){e.preventDefault();elegir(n);}}
 return <div className={s.repaso}>
  <div className={s.botones} role="group" aria-label="Repasar la partida terminada" onKeyDown={teclado}>
   <button aria-label="Ir al inicio de la partida" disabled={paso===0} onClick={()=>elegir(0)}>↤</button>
   <button aria-label="Jugada anterior" disabled={paso===0} onClick={()=>elegir(paso-1)}>←</button>
   <button className={s.play} disabled={!total} aria-pressed={auto} onClick={reproducir}>{auto?'Pausar':'Reproducir'}</button>
   <button aria-label="Jugada siguiente" disabled={paso===total} onClick={()=>elegir(paso+1)}>→</button>
   <button aria-label="Ir al final de la partida" disabled={paso===total} onClick={()=>elegir(total)}>↦</button>
  </div>
  <label className={s.posicion}><span aria-live={auto?'off':'polite'}>{texto}<small>{paso}/{total}</small></span><input type="range" aria-label="Elegir jugada para repasar" min={0} max={total} value={paso} disabled={!total} onChange={e=>elegir(Number(e.target.value))}/></label>
 </div>;
}

export function RendicionBot({disabled,rendirse}:{disabled:boolean;rendirse:()=>void}){
 const [confirmar,setConfirmar]=useState(false);
 return <div className={s.rendicion}><button className={s.rendirse} disabled={disabled} aria-expanded={confirmar} onClick={()=>setConfirmar(v=>!v)}><span aria-hidden="true">⚑</span>Rendirme</button>{confirmar&&<div className={s.confirmar} role="group" aria-label="Confirmar rendición" onKeyDown={e=>{if(e.key==='Escape')setConfirmar(false);}}><p>¿Querés rendirte? El bot ganará esta partida.</p><div><button disabled={disabled} onClick={()=>{setConfirmar(false);rendirse();}}>Sí, rendirme</button><button onClick={()=>setConfirmar(false)}>Seguir jugando</button></div></div>}</div>;
}
