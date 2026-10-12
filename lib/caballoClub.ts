import { fechaMontevideo } from "./desafios";
export type RetoCaballo = { semana:string; fin:string; inicial:number; registrable:boolean; marca:number; record?:number };
export type MarcaCaballo = { jugador_id:string; nombre:string; casillas:number; puesto:number; es_mio:boolean };
const MS_DIA=86400000;
export const saltosCaballo=Array.from({length:64},(_,i)=>[[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].map(([dr,dc])=>[Math.floor(i/8)+dr,i%8+dc]).filter(([r,c])=>r>=0&&r<8&&c>=0&&c<8).map(([r,c])=>r*8+c));
export function casillaCaballo(i:number){return "abcdefgh"[i%8]+(8-Math.floor(i/8));}
export function destinosCaballo(recorrido:number[]){return recorrido.length?saltosCaballo[recorrido[recorrido.length-1]].filter(i=>!recorrido.includes(i)):[];}
export function validarRecorridoCaballo(recorrido:unknown,inicial:number):number[] {
  if(!Array.isArray(recorrido)||recorrido.length<1||recorrido.length>64||recorrido[0]!==inicial)throw new Error("Recorrido inválido");
  const vistos=new Set<number>();let anterior:number|undefined;
  for(const i of recorrido){if(!Number.isInteger(i)||i<0||i>63||vistos.has(i)||anterior!==undefined&&!saltosCaballo[anterior].includes(i))throw new Error("Salto inválido");vistos.add(i);anterior=i;}
  return recorrido;
}
export function retoCaballoLocal(fecha=new Date()):RetoCaballo {
  const dia=fechaMontevideo(fecha);const d=new Date(dia+"T12:00:00Z");const lunes=d.getTime()-((d.getUTCDay()+6)%7)*MS_DIA;
  const semana=new Date(lunes).toISOString().slice(0,10),fin=new Date(lunes+7*MS_DIA).toISOString().slice(0,10);
  const semanas=Math.round((lunes-Date.parse("2026-10-05T12:00:00Z"))/(7*MS_DIA));
  const inicial=((56+semanas*17)%64+64)%64;
  return {semana,fin,inicial,registrable:false,marca:0};
}
export function validarRetoCaballo(datos:RetoCaballo):RetoCaballo {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(datos.semana)||!/^\d{4}-\d{2}-\d{2}$/.test(datos.fin)||!Number.isInteger(datos.inicial)||datos.inicial<0||datos.inicial>63||!Number.isInteger(datos.marca)||datos.marca<0||datos.marca>64||datos.registrable!==true||datos.record!==undefined&&(!Number.isInteger(datos.record)||datos.record<0||datos.record>64))throw new Error("Reto no disponible");
  return datos;
}
export function claveCaballo(usuario:string|undefined,reto:RetoCaballo){return `atlantida-caballo-v1:${usuario??"anon"}:${reto.semana}:${reto.inicial}`;}
