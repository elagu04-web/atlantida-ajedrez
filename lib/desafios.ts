import { Chess } from "chess.js";

export type Desafio = { id:string; rating:number; fen:string; solution:string[]; temas:string[]; fecha:string; reserva:boolean; registrable?:boolean; objetivo?:number; rachaBase?:number };
export type PuzzleLichess = { game:{pgn?:string;fen?:string}; puzzle:{id:string;rating:number;solution:string[];themes:string[];initialPly?:number} };
export function fechaMontevideo(fecha=new Date()) {
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Montevideo",year:"numeric",month:"2-digit",day:"2-digit"}).format(fecha);
}
export function aplicarUci(partida:Chess, uci:string) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error("Movimiento UCI inválido");
  return partida.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
}
function validarRating(rating:number) {
  if (!Number.isInteger(rating)||rating<1700||rating>4000) throw new Error("Dificultad fuera del catálogo");
}
export function convertirPuzzle(datos:PuzzleLichess, fecha:string):Desafio {
  if (!/^[a-zA-Z0-9]{5}$/.test(datos.puzzle.id)) throw new Error("Problema inválido");
  validarRating(datos.puzzle.rating);
  let partida:Chess;
  if (datos.game.fen) partida=new Chess(datos.game.fen);
  else {
    if (!datos.game.pgn||!Number.isInteger(datos.puzzle.initialPly)) throw new Error("Posición inicial incompleta");
    partida=new Chess();partida.loadPgn(datos.game.pgn);
    if (partida.history().length!==datos.puzzle.initialPly!+1) throw new Error("Posición inicial incompleta");
  }
  return validarDesafio({id:datos.puzzle.id,rating:datos.puzzle.rating,fen:partida.fen(),solution:datos.puzzle.solution,temas:datos.puzzle.themes,fecha,reserva:false});
}
export function validarDesafio(datos:Desafio) {
  validarRating(datos.rating);
  if (!Array.isArray(datos.solution)||!datos.solution.length||datos.solution.length%2!==1) throw new Error("Desafío inválido");
  const partida=new Chess(datos.fen);
  for (const uci of datos.solution) aplicarUci(partida,uci);
  return datos;
}
