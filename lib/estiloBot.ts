import { Chess } from "chess.js";
import { uciPractica } from "./partidaPractica";
import type { VarianteMotor } from "./motorPractica";

// Tendencia atacante entre alternativas evaluadas muy próximas a la respuesta
// del motor limitado a 2000. No reemplaza una combinación de mate por una captura.
export function respuestaAtacante(ajedrez:Chess,original:string,variantes:readonly VarianteMotor[],permitidas?:readonly string[],sacrificarPeones=false):string{
  const base=variantes.find(v=>v.uci===original);
  if(!base||base.tipo!=="cp")return original;
  const legales=ajedrez.moves({verbose:true});
  const puntos=(uci:string)=>{
    const m=legales.find(x=>uciPractica(x)===uci);if(!m)return -Infinity;
    let valor=m.san.includes("+")?6:0;
    if(m.captured)valor+=3;
    if(m.promotion)valor+=4;
    if(m.piece!=="k"&&m.piece!=="p"&&(m.color==="w"?Number(m.to[1])>Number(m.from[1]):Number(m.to[1])<Number(m.from[1])))valor+=1;
    if(m.piece==="p"&&["c","f","g","h"].includes(m.from[0])&&(m.color==="w"?Number(m.to[1])>=4:Number(m.to[1])<=5))valor+=2;
    if(sacrificarPeones&&m.piece==="p"){const despues=new Chess(ajedrez.fen());despues.move(uci);if(despues.moves({verbose:true}).some(r=>r.to===m.to&&r.captured==="p"))valor+=3;}
    return valor;
  };
  let elegida=original,mejor=puntos(original);
  for(const v of variantes){
    if(v.tipo!=="cp"||Math.abs(v.valor-base.valor)>30||Math.abs(v.profundidad-base.profundidad)>1||permitidas&&!permitidas.includes(v.uci))continue;
    const fuerza=puntos(v.uci);if(fuerza>mejor){elegida=v.uci;mejor=fuerza;}
  }
  return elegida;
}
