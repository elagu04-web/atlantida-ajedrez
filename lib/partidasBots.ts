import { Chess } from "chess.js";
import { DATOS_BOTS_PRACTICA, NIVELES_PRACTICA, type PartidaPractica, type PerfilBot, type ColorPractica } from "./partidaPractica";
export type PartidaBotRegistrada={id:string;fecha:string;perfil:PerfilBot;color:ColorPractica;elo:number|null;nivel:string;resultado:string;pgn:string;jugadas:number;sincronizada:boolean};
export const claveArchivoBots=(cuenta:string)=>`atlantida-partidas-bots-v1:${cuenta}`;
export function pgnDePartidasBots(partidas:PartidaBotRegistrada[]){return [...partidas].sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.id.localeCompare(b.id)).map(p=>p.pgn.trim()).join("\n\n")+"\n";}
export function registroDePartidaBot(partida:PartidaPractica,previa?:PartidaBotRegistrada):PartidaBotRegistrada|null{
  if(!partida.terminada||partida.jugadas.length<=partida.jugadasIniciales)return null;
  const pgn=partida.pgn();
  if(previa?.pgn===pgn&&previa.resultado===partida.estado().resultado)return previa;
  return {id:partida.id,fecha:new Date().toISOString(),perfil:partida.perfil,color:partida.color,elo:partida.eloBot,nivel:NIVELES_PRACTICA.find(n=>n.id===partida.nivel)!.nombre,resultado:partida.estado().resultado,pgn,jugadas:partida.jugadas.length,sincronizada:false};
}
export function leerPartidasBots(valor:unknown):PartidaBotRegistrada[]{
  try{
    const v=typeof valor==="string"?JSON.parse(valor):valor;
    if(!Array.isArray(v))return [];
    const validas:PartidaBotRegistrada[]=[];
    for(const p of v){
      if(!p||typeof p.id!=="string"||!/^[a-zA-Z0-9-]{1,100}$/.test(p.id)||typeof p.fecha!=="string"||!Number.isFinite(Date.parse(p.fecha))||!Object.hasOwn(DATOS_BOTS_PRACTICA,p.perfil)||!["w","b"].includes(p.color)||!["1-0","0-1","1/2-1/2"].includes(p.resultado)||typeof p.pgn!=="string"||p.pgn.length>200000||!Number.isInteger(p.jugadas)||p.jugadas<1||p.jugadas>1000||typeof p.nivel!=="string"||p.nivel.length>30||p.elo!==null&&(!Number.isInteger(p.elo)||p.elo<1320||p.elo>3190))continue;
      try{const chess=new Chess();chess.loadPgn(p.pgn);if(chess.history().length!==p.jugadas||chess.getHeaders().Result!==p.resultado)continue;}catch{continue;}
      validas.push({...p,sincronizada:p.sincronizada===true});
    }
    return unirPartidasBots(validas);
  }catch{return [];}
}
export function unirPartidasBots(...listas:PartidaBotRegistrada[][]){
  const mapa=new Map<string,PartidaBotRegistrada>();
  for(const p of listas.flat()){const anterior=mapa.get(p.id);if(!anterior||p.fecha>anterior.fecha||p.fecha===anterior.fecha&&(p.sincronizada||!anterior.sincronizada))mapa.set(p.id,p);}
  return [...mapa.values()].sort((a,b)=>b.fecha.localeCompare(a.fecha)||a.id.localeCompare(b.id));
}
