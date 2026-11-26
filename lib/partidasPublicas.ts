import {Chess} from 'chess.js';
import type {RecorridoPgn} from './recorridoPgn';
export type PartidaPublica={id:string;blancasId:string;negrasId:string;blancas:string;negras:string;resultado:'1-0'|'0-1'|'1/2-1/2';torneo:string;torneoId:string|null;fecha:string;dia:string;ritmo:string|null;mediasJugadas:number;reproducible:boolean};
export type DetallePartidaPublica=PartidaPublica&{movimientos:string[]};
export type ArchivoPartidasPublicas={total:number;reproducibles:number;partidas:PartidaPublica[]};

/** Reconstruye sólo jugadas legales y crea un PGN con la identidad pública del club. */
export function recorridoPartidaPublica(p:DetallePartidaPublica):RecorridoPgn {
 if(!Array.isArray(p.movimientos)||!p.movimientos.length||p.movimientos.length>2000)throw Error('Esta partida no tiene una secuencia de jugadas disponible.');
 const chess=new Chess();
 for(const uci of p.movimientos){if(typeof uci!=='string'||!/^([a-h][1-8]){2}[qrbn]?$/.test(uci))throw Error('No pudimos reconstruir las jugadas guardadas.');chess.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});}
 chess.setHeader('White',p.blancas);chess.setHeader('Black',p.negras);chess.setHeader('Event',p.torneo);chess.setHeader('Site','Atlántida Ajedrez');chess.setHeader('Date',p.dia.replaceAll('-','.'));chess.setHeader('Result',p.resultado);
 if(p.ritmo){const [min,inc]=p.ritmo.split('+').map(Number);if(Number.isFinite(min)&&Number.isFinite(inc))chess.setHeader('TimeControl',`${min*60}+${inc}`);}
 const historial=chess.history({verbose:true}),traduccion:Record<string,string>={K:'R',Q:'D',R:'T',B:'A',N:'C'};
 return {posiciones:[historial[0].before,...historial.map(j=>j.after)],jugadas:historial.map(j=>({texto:`${j.before.split(' ')[5]}${j.color==='w'?'.':'…'} ${j.san.replace(/^[KQRBN]/,c=>traduccion[c]).replace(/=([QRBN])/,(_,c:string)=>`=${traduccion[c]}`)}`,origen:j.from,destino:j.to})),blancas:p.blancas,negras:p.negras,resultado:p.resultado,pgn:chess.pgn()};
}
