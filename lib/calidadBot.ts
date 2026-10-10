import type { Chess } from "chess.js";
import { uciPractica } from "./partidaPractica";
import type { VarianteMotor } from "./motorPractica";
const puntuacion=(v:VarianteMotor)=>v.tipo==="cp"?v.valor:v.valor>0?100000-v.valor*100:-100000-Math.abs(v.valor)*-100;
function coherentes(ajedrez:Chess,variantes:readonly VarianteMotor[],permitidas?:readonly string[]){
  const legales=new Set(ajedrez.moves({verbose:true}).map(uciPractica));
  const validas=variantes.filter(v=>legales.has(v.uci)&&(!permitidas||permitidas.includes(v.uci)));
  const profundidad=Math.max(0,...validas.map(v=>v.profundidad));
  return validas.filter(v=>v.profundidad>=profundidad-1).sort((a,b)=>puntuacion(b)-puntuacion(a));
}
// Conserva la imperfección del Elo objetivo, pero evita errores grandes que el
// propio motor ya reconoció. No interpreta cotas, posiciones ni búsquedas ajenas.
export function respuestaFiable(ajedrez:Chess,original:string,variantes:readonly VarianteMotor[],elo:number,permitidas?:readonly string[]):string{
  const opciones=coherentes(ajedrez,variantes,permitidas),mejor=opciones[0];
  if(!mejor)return original;
  const base=opciones.find(v=>v.uci===original);
  const margen=elo>=2000?90:elo>=1900?100:120;
  return !base||puntuacion(mejor)-puntuacion(base)>margen?mejor.uci:original;
}
// El libro conserva su personalidad salvo una pérdida táctica importante.
// Las dos búsquedas pertenecen a la misma posición, antes de aplicar la jugada.
export function abandonarApertura(ajedrez:Chess,uciLibro:string,libro:readonly VarianteMotor[],uciLibre:string,libre:readonly VarianteMotor[],opciones:{margenCp?:number;exigirEvaluacion?:boolean}={}):boolean{
  if(uciLibro===uciLibre)return false;
  const jugada=ajedrez.moves({verbose:true}).find(m=>uciPractica(m)===uciLibre);
  if(!jugada)return false;
  if(jugada.san.endsWith("#"))return true;
  const antes=coherentes(ajedrez,libro).find(v=>v.uci===uciLibro),despues=coherentes(ajedrez,libre).find(v=>v.uci===uciLibre);
  if(!antes||!despues||Math.min(antes.profundidad,despues.profundidad)<8)return opciones.exigirEvaluacion===true;
  return puntuacion(despues)-puntuacion(antes)>(opciones.margenCp??200);
}
