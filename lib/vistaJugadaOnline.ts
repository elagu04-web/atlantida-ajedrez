import {Chess} from 'chess.js';
import type {PartidaOnline} from './partidaOnline';

export type VistaJugadaOnline={id:string;version:number;uci:string};

// A visual preview never edits the confirmed game, history, clock or result.
// A newer server version always wins, including a rejection or a timeout.
export function vistaJugadaOnline(p:PartidaOnline,v:VistaJugadaOnline|null):Chess|null{
 if(!v||v.id!==p.id||v.version!==p.version||p.estado.fase!=='activa')return null;
 try{const c=new Chess(p.estado.fen);c.move({from:v.uci.slice(0,2),to:v.uci.slice(2,4),promotion:v.uci[4]});return c;}catch{return null;}
}
