import { Chess } from "chess.js";

export type Desafio = { id:string; rating:number; fen:string; solution:string[]; temas:string[]; fecha:string; reserva:boolean; registrable?:boolean };
export type PuzzleLichess = { game:{pgn:string}; puzzle:{id:string;rating:number;solution:string[];themes:string[];initialPly:number} };
export function fechaMontevideo(fecha=new Date()) {
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Montevideo",year:"numeric",month:"2-digit",day:"2-digit"}).format(fecha);
}
export function aplicarUci(partida:Chess, uci:string) {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) throw new Error("Movimiento UCI inválido");
  return partida.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});
}
export function convertirPuzzle(datos:PuzzleLichess, fecha:string):Desafio {
  if (!/^[a-zA-Z0-9]{5}$/.test(datos.puzzle.id) || !Number.isFinite(datos.puzzle.rating) || datos.puzzle.rating<1700 || datos.puzzle.rating>1900) throw new Error("Dificultad fuera del objetivo");
  const partida = new Chess(); partida.loadPgn(datos.game.pgn);
  if (partida.history().length!==datos.puzzle.initialPly+1 || !datos.puzzle.solution.length || datos.puzzle.solution.length%2!==1) throw new Error("Posición inicial incompleta");
  const fen=partida.fen();
  for (const uci of datos.puzzle.solution) aplicarUci(partida,uci);
  return {id:datos.puzzle.id,rating:datos.puzzle.rating,fen,solution:datos.puzzle.solution,temas:datos.puzzle.themes,fecha,reserva:false};
}
export function validarDesafio(datos:Desafio) {
  const partida=new Chess(datos.fen);
  if (datos.rating<1700||datos.rating>1900||!datos.solution.length||datos.solution.length%2!==1) throw new Error("Desafío inválido");
  for (const uci of datos.solution) aplicarUci(partida,uci);
  return datos;
}
