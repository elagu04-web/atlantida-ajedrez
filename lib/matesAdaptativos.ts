import {Chess} from 'chess.js';
import datos from '../data/mates-uno.json';
import type {ProgresoDesdeCero} from './aprenderDesdeCero';
export type MateUno={id:string;fen:string;nivel:number;familia:string;fuente:string;rating?:number;enlace?:string;soluciones:string[]};
export const BANCO_MATES_UNO:readonly MateUno[]=datos;
const banco=new Map(BANCO_MATES_UNO.map(e=>[e.id,e]));
export const NOMBRES_NIVEL_MATES=['Primeros mates','Reyes encerrados','Coordinación','Más piezas','Afinar la mirada'];
export type IntentoMateUno={id:string;ejercicioId:string;creado:string;actualizado:string;nivelAntes:number;fallos:string[];pista:boolean;estado:'activo'|'resuelto'|'revelado'|'omitido';solucion?:string;legado?:boolean};
export type ProgresoMatesUno={version:1;intentos:IntentoMateUno[]};
const fecha=(v:unknown):v is string=>typeof v==='string'&&v.length<=30&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
const uci=(v:unknown):v is string=>typeof v==='string'&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(v);
const nuevo=():ProgresoMatesUno=>({version:1,intentos:[]});
const orden=(a:IntentoMateUno,b:IntentoMateUno)=>a.creado.localeCompare(b.creado)||a.id.localeCompare(b.id);
export function mateUno(id:string){return banco.get(id);}
export function leerMatesUno(v:unknown):ProgresoMatesUno{
 const p=nuevo();if(!v||typeof v!=='object'||!('version' in v)||v.version!==1||!('intentos' in v)||!Array.isArray(v.intentos))return p;
 const ids=new Set<string>();
 for(const x of v.intentos.slice(-1200)){
  if(!x||typeof x.id!=='string'||!/^[a-zA-Z0-9:-]{1,100}$/.test(x.id)||ids.has(x.id)||!banco.has(x.ejercicioId)||!fecha(x.creado)||!fecha(x.actualizado)||!Number.isInteger(x.nivelAntes)||x.nivelAntes<1||x.nivelAntes>5||!Array.isArray(x.fallos)||typeof x.pista!=='boolean'||!['activo','resuelto','revelado','omitido'].includes(x.estado))continue;
  const e=banco.get(x.ejercicioId)!;if(x.estado==='resuelto'&&!e.soluciones.includes(x.solucion))continue;
  ids.add(x.id);p.intentos.push({id:x.id,ejercicioId:x.ejercicioId,creado:x.creado,actualizado:x.actualizado,nivelAntes:x.nivelAntes,fallos:[...new Set<string>(x.fallos.filter(uci).slice(0,64))].sort(),pista:x.pista,estado:x.estado,...e.soluciones.includes(x.solucion)?{solucion:x.solucion}:{},...x.legado===true&&x.id.startsWith('legado:')?{legado:true}:{}});
 }
 p.intentos.sort(orden);return p;
}
export function combinarMatesUno(a:ProgresoMatesUno=nuevo(),b:ProgresoMatesUno=nuevo()):ProgresoMatesUno{
 const mapa=new Map<string,IntentoMateUno>(),prioridad={activo:0,omitido:1,revelado:2,resuelto:3};
 for(const x of [...leerMatesUno(a).intentos,...leerMatesUno(b).intentos]){
  const previo=mapa.get(x.id);if(!previo){mapa.set(x.id,x);continue;}
  if(previo.ejercicioId!==x.ejercicioId||previo.creado!==x.creado){mapa.set(x.id,JSON.stringify(previo)>JSON.stringify(x)?previo:x);continue;}
  const estado=prioridad[x.estado]>prioridad[previo.estado]?x.estado:previo.estado;
  const soluciones=[previo.solucion,x.solucion].filter((s):s is string=>!!s).sort();
  mapa.set(x.id,{...previo,estado,actualizado:[previo.actualizado,x.actualizado].sort().at(-1)!,fallos:[...new Set([...previo.fallos,...x.fallos])].sort(),pista:previo.pista||x.pista,...soluciones.length?{solucion:soluciones[0]}:{}});
 }
 return {version:1,intentos:[...mapa.values()].sort(orden).slice(-1200)};
}
export function conLegadoMates(p:ProgresoMatesUno=nuevo(),curso:ProgresoDesdeCero={}):ProgresoMatesUno{
 const antiguos:IntentoMateUno[]=[];
 for(const [id,x] of Object.entries(curso))if(banco.has(id)&&x.tablero&&x.pregunta&&fecha(x.fecha))antiguos.push({id:'legado:'+id,ejercicioId:id,creado:x.fecha,actualizado:x.fecha,nivelAntes:1,fallos:[],pista:true,estado:'resuelto',solucion:banco.get(id)!.soluciones.includes(x.jugada??'')?x.jugada:banco.get(id)!.soluciones[0],legado:true});
 return combinarMatesUno(p,{version:1,intentos:antiguos});
}
export function resumenMatesUno(p:ProgresoMatesUno){
 const intentos=leerMatesUno(p).intentos;let nivel=intentos[0]?.nivelAntes??1,seguidos=0,dificultades=0,limpios=0,numero=0;const vistos=new Map<string,number>(),resueltos=new Set<string>();
 for(const x of intentos){if(x.estado==='resuelto')resueltos.add(x.ejercicioId);if(x.estado==='activo')continue;const anterior=vistos.get(x.ejercicioId),independiente=anterior===undefined||numero-anterior>=9;vistos.set(x.ejercicioId,numero++);if(x.legado)continue;
  if(x.estado==='resuelto'&&!x.pista&&!x.fallos.length){limpios++;dificultades=0;if(independiente&&banco.get(x.ejercicioId)!.nivel>=nivel&&++seguidos>=3){nivel=Math.min(5,nivel+1);seguidos=0;}}
  else if(x.estado==='revelado'||x.pista||x.fallos.length>=2||x.estado==='omitido'&&x.fallos.length){seguidos=0;if(++dificultades>=2){nivel=Math.max(1,nivel-1);dificultades=0;}}
  else if(x.fallos.length){seguidos=0;dificultades=0;}
 }
 return {nivel,nombre:NOMBRES_NIVEL_MATES[nivel-1],seguidos,resueltos:resueltos.size,limpios,intentos:intentos.filter(x=>x.estado!=='activo'&&!x.legado).length};
}
function hash(s:string){let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
export function elegirMateUno(p:ProgresoMatesUno,semilla:string):MateUno{
 const intentos=leerMatesUno(p).intentos,{nivel}=resumenMatesUno(p),vistos=new Map<string,number>();intentos.forEach((x,i)=>vistos.set(x.ejercicioId,i));
 let candidatos=BANCO_MATES_UNO.filter(e=>e.nivel<=nivel&&e.nivel>=Math.max(1,nivel-1));
 const recientes=intentos.slice(-Math.min(8,Math.floor(candidatos.length/2))).map(x=>x.ejercicioId);
 const frescos=candidatos.filter(e=>!recientes.includes(e.id));if(frescos.length)candidatos=frescos;
 const familias=intentos.slice(-2).map(x=>banco.get(x.ejercicioId)!.familia),variados=candidatos.filter(e=>!familias.includes(e.familia));if(variados.length)candidatos=variados;
 return [...candidatos].sort((a,b)=>Number(vistos.has(a.id))-Number(vistos.has(b.id))||Math.abs(a.nivel-nivel)-Math.abs(b.nivel-nivel)||(vistos.get(a.id)??-1)-(vistos.get(b.id)??-1)||hash(semilla+a.id)-hash(semilla+b.id))[0];
}
export function comenzarMateUno(p:ProgresoMatesUno,semilla:string,id:string,ahora=new Date()):ProgresoMatesUno{
 p=leerMatesUno(p);const e=elegirMateUno(p,semilla),ultima=p.intentos.at(-1);const creado=new Date(Math.max(ahora.getTime(),ultima?Date.parse(ultima.creado)+1:0)).toISOString();
 return combinarMatesUno(p,{version:1,intentos:[{id,ejercicioId:e.id,creado,actualizado:creado,nivelAntes:resumenMatesUno(p).nivel,fallos:[],pista:false,estado:'activo'}]});
}
function actualizarIntento(p:ProgresoMatesUno,id:string,cambio:Partial<IntentoMateUno>,ahora=new Date()):ProgresoMatesUno{
 const previo=p.intentos.find(x=>x.id===id);if(!previo||previo.estado!=='activo')return p;
 return combinarMatesUno(p,{version:1,intentos:[{...previo,...cambio,actualizado:new Date(Math.max(ahora.getTime(),Date.parse(previo.actualizado))).toISOString()}]});
}
export function jugarMateUno(p:ProgresoMatesUno,id:string,movimiento:string,ahora=new Date()){
 const intento=p.intentos.find(x=>x.id===id),e=intento&&banco.get(intento.ejercicioId);if(!e||intento.estado!=='activo'||!uci(movimiento))return {progreso:p,legal:false,mate:false};
 let c:Chess;try{c=new Chess(e.fen);c.move(movimiento);}catch{return {progreso:p,legal:false,mate:false};}
 const mate=c.isCheckmate();return {progreso:actualizarIntento(p,id,mate?{estado:'resuelto',solucion:movimiento}:{fallos:[...intento.fallos,movimiento]},ahora),legal:true,mate};
}
export const pedirPistaMateUno=(p:ProgresoMatesUno,id:string,ahora=new Date())=>actualizarIntento(p,id,{pista:true},ahora);
export function revelarMateUno(p:ProgresoMatesUno,id:string,ahora=new Date()){const i=p.intentos.find(x=>x.id===id);return i?actualizarIntento(p,id,{pista:true,estado:'revelado',solucion:banco.get(i.ejercicioId)!.soluciones[0]},ahora):p;}
export const omitirMateUno=(p:ProgresoMatesUno,id:string,ahora=new Date())=>actualizarIntento(p,id,{estado:'omitido'},ahora);
