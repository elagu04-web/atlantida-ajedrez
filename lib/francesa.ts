import { type Chess } from "chess.js";
import { uciPractica } from "./partidaPractica";

// Francesa contra e4; ante otras primeras jugadas busca el mismo centro e6/d5.
// Una vez definida la variante, el motor continúa la partida normalmente.
export function jugadasFrancesa(ajedrez:Chess):string[]|undefined{
  if(ajedrez.turn()!=="b"||ajedrez.isGameOver())return undefined;
  const negras=ajedrez.history({verbose:true}).filter(m=>m.color==="b");
  if(negras.length>=3)return undefined;
  const legales=ajedrez.moves({verbose:true}).map(uciPractica);
  const filtrar=(candidatas:string[])=>{const validas=candidatas.filter(m=>legales.includes(m));return validas.length?validas:undefined;};
  if(negras.length===0)return filtrar(["e7e6"]);
  if(ajedrez.isCheck())return undefined;
  if(negras.length===1)return filtrar(["d7d5"]);
  if(legales.includes("e6d5")&&ajedrez.get("d5")?.color==="w")return ["e6d5"];
  if(ajedrez.get("e5")?.color==="w")return filtrar(["c7c5"]);
  if(ajedrez.get("c3")?.type==="n"&&ajedrez.get("c3")?.color==="w")return filtrar(["f8b4"]); // Winawer.
  if(ajedrez.get("d2")?.type==="n"&&ajedrez.get("d2")?.color==="w")return filtrar(["c7c5"]);
  return filtrar(["g8f6","c7c5"]);
}
