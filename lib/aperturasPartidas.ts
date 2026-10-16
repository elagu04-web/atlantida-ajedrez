import { Chess } from "chess.js";
import { validarPgnEntrenamiento, type SesionEntrenamiento } from "./entrenamientoPersonal";
import type { AnalisisPosicion } from "./stockfish";

export function cargarPartidasAperturas(texto:string){
  if(texto.length>2000000)throw new Error("Usá un archivo de hasta 2 MB.");
  const bloques=texto.split(/(?=\[Event\s+")/).map(x=>x.trim()).filter(Boolean);
  if(!bloques.length||bloques.length>30)throw new Error("Cargá entre 1 y 30 partidas por vez.");
  return bloques.map((bloque,i)=>{
    try{const entrada=validarPgnEntrenamiento(bloque);const c=new Chess();c.loadPgn(entrada.pgn);const h=c.getHeaders();return {...entrada,blancas:h.White||"Blancas",negras:h.Black||"Negras",fecha:/^\d{4}\.\d{2}\.\d{2}$/.test(h.UTCDate||h.Date||"")?(h.UTCDate||h.Date):"",jugadas:c.history().length};}
    catch{throw new Error(`No pudimos leer la partida ${i+1}. Revisá que el archivo esté en formato PGN internacional.`);}
  });
}
export function erroresDeApertura(s:SesionEntrenamiento){
  return s.resultado.jugadas.map((jugada,indice)=>({jugada,indice}))
    .filter(({jugada:j})=>j.color===s.color&&j.numero<=15&&j.perdidaCentipeones>=100&&j.mejorJugadaSan&&j.varianteSan?.length)
    .sort((a,b)=>b.jugada.perdidaCentipeones-a.jugada.perdidaCentipeones);
}
const valor=(a:AnalisisPosicion)=>a.mateEn!==null?Math.sign(a.mateEn)*(100000-Math.abs(a.mateEn)*100):a.evaluacionCentipawns;
/** Same White-relative convention as the engine; good alternatives are accepted. */
export function valorarIntentoApertura(antes:AnalisisPosicion,despues:AnalisisPosicion,color:'w'|'b',jugada?:string){
  const a=valor(antes),b=valor(despues);
  if(a===null||b===null)throw new Error("No se pudo comprobar tu jugada.");
  if(jugada&&jugada===antes.mejorJugada)return {acierto:true,perdida:0};
  const signo=color==='w'?1:-1;
  if(antes.mateEn!==null&&despues.mateEn!==null&&Math.sign(antes.mateEn)===signo&&Math.sign(despues.mateEn)===signo)return {acierto:true,perdida:0};
  const perdida=Math.max(0,color==='w'?a-b:b-a);
  return {acierto:perdida<=50,perdida:Math.min(1000,perdida)};
}

export function detectarColorPartida(p:{blancas:string;negras:string},usuario:string):'w'|'b'|null{
 const normalizar=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const u=normalizar(usuario);if(!u)return null;const blancas=normalizar(p.blancas)===u,negras=normalizar(p.negras)===u;
 return blancas===negras?null:blancas?'w':'b';
}
