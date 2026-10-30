import {Chess, type Color} from 'chess.js';

export const RITMOS_ONLINE = {'10+3':{minutos:10,incremento:3},'5+3':{minutos:5,incremento:3},'3+2':{minutos:3,incremento:2}} as const;
export type RitmoOnline=keyof typeof RITMOS_ONLINE;
export type EstadoOnline={
 inicioLibre?:2;
 eloTipo?:'club';clubBlancasId?:string;clubNegrasId?:string;
 torneoNombre?:string;torneoRonda?:number;
 porElo?:boolean;eloCreador?:number;eloInicio?:{w:number;b:number};elo?:{w:{antes:number;despues:number;variacion:number};b:{antes:number;despues:number;variacion:number}};
 fase:'espera'|'activa'|'terminada'|'cancelada';ritmo:RitmoOnline;colorCreador:Color;
 blancas:string;negras:string;fen:string;movimientos:string[];pgn:string;turno:Color;
 blancasMs:number;negrasMs:number;desde:number|null;oferta:Color|null;
 resultado:'*'|'1-0'|'0-1'|'1/2-1/2';motivo:string;
};
export type PartidaOnline={id:string;creador_id:string;rival_id:string|null;estado:EstadoOnline;version:number;creada:string;actualizada:string;expira:string;ultima_accion:string|null;torneo_id?:string|null};
export type AccionOnline={tipo:'mover';uci:string}|{tipo:'rendirse'|'ofrecer'|'aceptar'|'rechazar'|'tiempo'|'cancelar'};
export function colorOnline(p:PartidaOnline,usuario:string):Color|null{
 if(usuario===p.creador_id)return p.estado.colorCreador;
 if(usuario===p.rival_id)return p.estado.colorCreador==='w'?'b':'w';return null;
}
export function crearEstadoOnline(ritmo:RitmoOnline,color:Color,nombre:string,porElo=false):EstadoOnline{
 if(!Object.hasOwn(RITMOS_ONLINE,ritmo))throw Error('Elegí un ritmo disponible.');
 return {inicioLibre:2,porElo,fase:'espera',ritmo,colorCreador:color,blancas:color==='w'?nombre:'Por confirmar',negras:color==='b'?nombre:'Por confirmar',fen:new Chess().fen(),movimientos:[],pgn:'',turno:'w',blancasMs:RITMOS_ONLINE[ritmo].minutos*60000,negrasMs:RITMOS_ONLINE[ritmo].minutos*60000,desde:null,oferta:null,resultado:'*',motivo:''};
}
export function unirEstadoOnline(e:EstadoOnline,nombre:string,ahora:number):EstadoOnline{
 if(e.fase!=='espera')throw Error('Esta mesa ya no está disponible.');
 return {...e,fase:'activa',blancas:e.colorCreador==='b'?nombre:e.blancas,negras:e.colorCreador==='w'?nombre:e.negras,desde:ahora};
}
export function tableroOnline(e:EstadoOnline){const c=new Chess();for(const uci of e.movimientos)c.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]});return c;}
export const MARGEN_INICIO_ONLINE=120000;
export function inicioLibreOnline(e:EstadoOnline){return e.inicioLibre===2&&e.movimientos.length<4;}
export function margenInicioOnline(e:EstadoOnline,ahora:number):number|null{
 return e.fase==='activa'&&inicioLibreOnline(e)&&e.desde!==null?Math.max(0,MARGEN_INICIO_ONLINE-Math.max(0,ahora-e.desde)):null;
}
export function relojesOnline(e:EstadoOnline,ahora:number){
 const transcurrido=e.fase==='activa'&&!inicioLibreOnline(e)&&e.desde!==null?Math.max(0,ahora-e.desde):0;
 return {w:Math.max(0,e.blancasMs-(e.turno==='w'?transcurrido:0)),b:Math.max(0,e.negrasMs-(e.turno==='b'?transcurrido:0))};
}
function finalizar(e:EstadoOnline,resultado:EstadoOnline['resultado'],motivo:string,c:Chess,ahora:number):EstadoOnline{
 const relojes=relojesOnline(e,ahora);
 c.setHeader('Event',e.torneoNombre?e.torneoNombre.replace(/[\u0000-\u001f\u007f\[\]"\\]/g,'').slice(0,90):e.porElo?'Atlántida · Online por Elo':'Atlántida · Partida online');c.setHeader('Site','https://atlantida-ajedrez.vercel.app/jugar/online');
 if(e.torneoRonda)c.setHeader('Round',String(e.torneoRonda));
 if(e.eloTipo==='club')c.setHeader('RatingSystem','Elo Atlántida');
 c.setHeader('Date',new Date(ahora).toISOString().slice(0,10).replaceAll('-','.'));
 c.setHeader('White',e.blancas);c.setHeader('Black',e.negras);c.setHeader('Result',resultado);
 const r=RITMOS_ONLINE[e.ritmo];c.setHeader('TimeControl',`${r.minutos*60}+${r.incremento}`);c.setHeader('Termination',motivo);
 return {...e,fase:'terminada',resultado,motivo,oferta:null,blancasMs:relojes.w,negrasMs:relojes.b,desde:null,pgn:c.pgn()};
}
// Material que no puede dar mate: casos básicos demostrables. Nunca se usa una
// evaluación de Stockfish como árbitro ni se declara una victoria por centipeones.
export function materialParaMate(c:Chess,color:Color){
 const piezas=c.board().flat().filter(p=>p?.color===color&&p.type!=='k');
 if(!piezas.length)return false;
 if(c.isInsufficientMaterial())return false;
 const rival=c.board().flat().filter(p=>p&&p.color!==color&&p.type!=='k');
 if(!rival.length&&piezas.length===1&&['b','n'].includes(piezas[0]!.type))return false;
 return true;
}
export function aplicarAccionOnline(e:EstadoOnline,color:Color,accion:AccionOnline,ahora:number):EstadoOnline{
 if(e.fase==='espera'&&accion.tipo==='cancelar'&&color===e.colorCreador)return {...e,fase:'cancelada',motivo:'Invitación cancelada'};
 if(e.fase!=='activa')throw Error('La partida no está en juego.');
 const c=tableroOnline(e),relojes=relojesOnline(e,ahora);
 if(margenInicioOnline(e,ahora)===0)return finalizar(e,e.turno==='w'?'0-1':'1-0','Tiempo de inicio agotado (2 minutos)',c,ahora);
 if(relojes[e.turno]<=0){const ganador=e.turno==='w'?'b':'w';return finalizar(e,materialParaMate(c,ganador)?ganador==='w'?'1-0':'0-1':'1/2-1/2',materialParaMate(c,ganador)?'Tiempo agotado':'Tablas: tiempo y material insuficiente',c,ahora);}
 if(accion.tipo==='tiempo')return e;
 if(accion.tipo==='rendirse')return finalizar(e,color==='w'?'0-1':'1-0','Abandono',c,ahora);
 if(accion.tipo==='ofrecer'){
  if(e.oferta===color)return e;
  if(e.oferta)throw Error('Ya hay una propuesta de tablas pendiente.');
  return {...e,oferta:color};
 }
 if(accion.tipo==='aceptar'||accion.tipo==='rechazar'){
  if(!e.oferta||e.oferta===color)throw Error('No tenés una propuesta del rival para responder.');
  return accion.tipo==='aceptar'?finalizar(e,'1/2-1/2','Tablas acordadas',c,ahora):{...e,oferta:null};
 }
 if(accion.tipo!=='mover')throw Error('Acción no disponible.');
 if(color!==e.turno)throw Error('Es el turno de tu rival.');
 if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(accion.uci))throw Error('Jugada no válida.');
 let mov;try{mov=c.move({from:accion.uci.slice(0,2),to:accion.uci.slice(2,4),promotion:accion.uci[4]});}catch{throw Error('Esa jugada no es legal.');}
 const incremento=inicioLibreOnline(e)?0:RITMOS_ONLINE[e.ritmo].incremento*1000;
 const siguiente:EstadoOnline={...e,movimientos:[...e.movimientos,mov.from+mov.to+(mov.promotion??'')],fen:c.fen(),turno:c.turn(),blancasMs:relojes.w+(color==='w'?incremento:0),negrasMs:relojes.b+(color==='b'?incremento:0),desde:ahora,oferta:e.oferta&&e.oferta!==color?null:e.oferta};
 if(c.isCheckmate())return finalizar(siguiente,color==='w'?'1-0':'0-1','Jaque mate',c,ahora);
 if(c.isStalemate())return finalizar(siguiente,'1/2-1/2','Ahogado',c,ahora);
 if(c.isInsufficientMaterial())return finalizar(siguiente,'1/2-1/2','Material insuficiente',c,ahora);
 if(c.isThreefoldRepetition())return finalizar(siguiente,'1/2-1/2','Triple repetición',c,ahora);
 if(c.isDrawByFiftyMoves())return finalizar(siguiente,'1/2-1/2','Regla de las 50 jugadas',c,ahora);
 if(siguiente.movimientos.length>=1000)return finalizar(siguiente,'1/2-1/2','Límite de 500 jugadas completas',c,ahora);
 return siguiente;
}
