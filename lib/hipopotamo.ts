import { Chess } from "chess.js";
import { uciPractica } from "./partidaPractica";

// El esquema de De Santis: doble fianchetto, Cd7/Ce7, d6/e6, a6/h6.
// No es un libro de SAN fijo: cada candidato se comprueba contra la posición real.
export const ESQUEMA_HIPOPOTAMO = ["g7g6","f8g7","d7d6","e7e6","g8e7","b7b6","c8b7","b8d7","a7a6","h7h6"] as const;

export function jugadasHipopotamo(ajedrez:Chess):string[]|undefined{
  if(ajedrez.turn()!=="b"||ajedrez.isGameOver()||ajedrez.isCheck())return undefined;
  // Ante una pieza atacada, el motor debe poder retirarla, defenderla,
  // intercambiarla o responder con una táctica, sin restricciones del esquema.
  // En el próximo turno se vuelve a considerar la formación pendiente.
  for(const fila of ajedrez.board())for(const p of fila){
    if(p?.color==="b"&&p.type!=="p"&&p.type!=="k"&&ajedrez.isAttacked(p.square,"w"))return undefined;
  }
  const historial=ajedrez.history({verbose:true}).filter(m=>m.color==="b");
  const pendientes=ESQUEMA_HIPOPOTAMO.filter(uci=>!historial.some(m=>m.from===uci.slice(0,2)));
  // Una vez desarrollado el sistema, Stockfish continúa el medio juego y el final.
  if(!pendientes.length||historial.length>=18)return undefined;
  const legales=ajedrez.moves({verbose:true});
  const porUci=new Map(legales.map(m=>[uciPractica(m),m]));
  let candidatas=pendientes.filter(m=>porUci.has(m)) as string[];
  if(!historial.length&&porUci.has("g7g6"))candidatas=["g7g6"];
  // El libro también considera capturas útiles; el motor evalúa su seguridad.
  for(const m of legales){
    if(m.captured&&(m.captured!=="p"||m.piece==="p"&&m.from[1]==="6"&&m.to[1]==="5"))candidatas.push(uciPractica(m));
  }
  candidatas=[...new Set(candidatas)];
  if(!candidatas.length)return undefined;
  // Una amenaza de mate obliga a defender, aunque retrase un paso del esquema.
  const prueba=new Chess(ajedrez.fen());
  const seguras=candidatas.filter(uci=>{
    prueba.move(uci);
    const mateRival=prueba.moves().some(san=>san.endsWith("#"));
    prueba.undo();return !mateRival;
  });
  return seguras.length?seguras:undefined;
}
