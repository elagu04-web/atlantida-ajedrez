"use client";
import {useEffect,useRef,useSyncExternalStore} from 'react';
import {SonidoTablero} from './sonidoTablero';
const CLAVE='atlantida-sonido-practicas-v1',EVENTO='atlantida-sonido-practicas';
let memoria=true;
function leer(){try{const valor=localStorage.getItem(CLAVE);return valor===null?memoria:valor!=='no';}catch{return memoria;}}
function escuchar(cb:()=>void){window.addEventListener('storage',cb);window.addEventListener(EVENTO,cb);return()=>{window.removeEventListener('storage',cb);window.removeEventListener(EVENTO,cb);};}
export function useSonidoPiezas(){
 const activo=useSyncExternalStore(escuchar,leer,()=>true),sonido=useRef<SonidoTablero|null>(null);
 useEffect(()=>()=>{sonido.current?.cerrar();sonido.current=null;},[]);
 function preparar(){if(!activo)return;sonido.current??=new SonidoTablero();sonido.current.configurar(true,.8);sonido.current.activar();}
 function golpear(captura=false){if(!activo)return;preparar();sonido.current?.golpe(captura);}
 function setActivo(valor:boolean){memoria=valor;try{localStorage.setItem(CLAVE,valor?'si':'no');}catch{}window.dispatchEvent(new Event(EVENTO));}
 return {activo,setActivo,preparar,golpear};
}
