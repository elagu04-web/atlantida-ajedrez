import { fechaMontevideo } from "./desafios";

export const PLANES_MEMBRESIA = {
  club: {nombre:"Club",torneos:true,entrenamiento:false,descripcion:"Los torneos habituales del club durante tu vigencia."},
  completo: {nombre:"Club + entrenamiento",torneos:true,entrenamiento:true,descripcion:"Torneos habituales y entrenamiento personal en la plataforma."},
  entrenamiento: {nombre:"Entrenamiento",torneos:false,entrenamiento:true,descripcion:"Entrenamiento para socios y público general, sin torneos incluidos."},
} as const;
export type PlanMembresia = keyof typeof PLANES_MEMBRESIA;
export const MEDIOS_CUOTA = {efectivo:"Efectivo",transferencia:"Transferencia",mercadopago:"Mercado Pago",bonificacion:"Bonificación"} as const;
export type MedioCuota = keyof typeof MEDIOS_CUOTA;
export type ConfigMembresias = {torneo:number;club:number;completo:number;entrenamiento:number;revision:number};
export type PeriodoMembresia = {id:string;jugadorId:string;nombre:string;cuentaVinculada:boolean;plan:PlanMembresia;desde:string;hasta:string;importe:number;medio:MedioCuota;referencia:string;anulada:boolean;motivoAnulacion:string|null;creada:string};
export type JugadorMembresia = {id:string;nombre:string;cuentaDisponible:boolean};
export type GestionMembresias = {hoy:string;config:ConfigMembresias;jugadores:JugadorMembresia[];periodos:PeriodoMembresia[]};
export type MiMembresia = {hoy:string;periodos:PeriodoMembresia[]};
export const PROPUESTA_MEMBRESIAS:ConfigMembresias = {torneo:20000,club:50000,completo:75000,entrenamiento:30000,revision:1};
export const pesos = (centavos:number) => new Intl.NumberFormat("es-UY",{style:"currency",currency:"UYU",maximumFractionDigits:centavos%100?2:0}).format(centavos/100);
export function importeCentavos(entrada:string):number|null {
  if(!/^\d{1,6}(?:[.,]\d{1,2})?$/.test(entrada.trim()))return null;
  const n=Math.round(Number(entrada.trim().replace(",","."))*100);
  return Number.isSafeInteger(n)&&n>=0&&n<=100000000?n:null;
}
export const hoyMembresias = () => fechaMontevideo(new Date());
export function sumarMeses(fecha:string,meses:number):string {
  const [y,m,d]=fecha.split("-").map(Number), destino=new Date(Date.UTC(y,m-1+meses,1)),ultimo=new Date(Date.UTC(destino.getUTCFullYear(),destino.getUTCMonth()+1,0)).getUTCDate();
  destino.setUTCDate(Math.min(d,ultimo));return destino.toISOString().slice(0,10);
}
export function fechaCuota(fecha:string){const [y,m,d]=fecha.split("-");return `${d}/${m}/${y}`;}
export function estadoPeriodo(p:PeriodoMembresia,hoy:string):"anulada"|"programada"|"vencida"|"vigente" {
  return p.anulada?"anulada":p.desde>hoy?"programada":p.hasta<=hoy?"vencida":"vigente";
}
export function beneficiosMembresia(periodos:PeriodoMembresia[],hoy:string){
  const vigentes=periodos.filter(p=>estadoPeriodo(p,hoy)==="vigente");
  return {torneos:vigentes.some(p=>PLANES_MEMBRESIA[p.plan].torneos),entrenamiento:vigentes.some(p=>PLANES_MEMBRESIA[p.plan].entrenamiento),vigentes};
}
export function inicioRenovacion(periodos:PeriodoMembresia[],jugadorId:string,plan:PlanMembresia,desde:string){
  const nuevo=PLANES_MEMBRESIA[plan];
  return periodos.filter(p=>!p.anulada&&p.jugadorId===jugadorId&&((nuevo.torneos&&PLANES_MEMBRESIA[p.plan].torneos)||(nuevo.entrenamiento&&PLANES_MEMBRESIA[p.plan].entrenamiento))).reduce((fecha,p)=>p.hasta>fecha?p.hasta:fecha,desde);
}
export function compararMembresia(config:ConfigMembresias,torneos:number){
  const sueltos=config.torneo*torneos;
  return {actual:10000*torneos,sueltos,club:config.club,completo:config.completo,ahorro:sueltos-config.club};
}
