import { GRUPOS_TACTICOS, obtenerTema, revisarTemas, type TemaTactico } from "./temasTacticos";
import type { AvanceGuiado, EjercicioGuiado, ProgresoGuiado } from "./entrenamientoGuiado";

export type OrigenIntentoTactico = "jugada" | "pista" | "solucion";
/** Last observation per position. Same-day errors stay sticky; a later independent
 * review replaces them. Lifetime practice counts remain in AvanceGuiado.practica. */
export type PerfilTemaEjercicio = {
  dia:string; actualizada:string; temas:string[]; temasActualizados:string; errorCalculo:boolean;
  ayuda:boolean; completado:boolean; revelado:boolean;
};
const iso=(v:unknown):v is string=>typeof v==="string"&&v.length<=30&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
export function perfilTemaValido(v:unknown):v is PerfilTemaEjercicio {
  if(!v||typeof v!=="object"||Array.isArray(v))return false;
  const p=v as Record<string,unknown>;
  return typeof p.dia==="string"&&/^\d{4}-\d\d-\d\d$/.test(p.dia)&&Number.isFinite(Date.parse(p.dia))&&iso(p.actualizada)&&iso(p.temasActualizados)&&Array.isArray(p.temas)&&p.temas.length<=3&&new Set(p.temas).size===p.temas.length&&p.temas.every(t=>typeof t==="string"&&!!obtenerTema(t))&&["errorCalculo","ayuda","completado","revelado"].every(k=>typeof p[k]==="boolean");
}
export function combinarPerfilTema(a:PerfilTemaEjercicio|undefined,b:PerfilTemaEjercicio|undefined):PerfilTemaEjercicio|undefined {
  if(!a)return b;if(!b)return a;
  if(a.dia!==b.dia)return a.dia>b.dia?a:b;
  // Two devices observing the same position/day represent one sample, not two.
  const reciente=a.actualizada>b.actualizada?a:b.actualizada>a.actualizada?b:JSON.stringify(a)>JSON.stringify(b)?a:b;
  const conTemas=[a,b].sort((x,y)=>Number(y.temas.length>0)-Number(x.temas.length>0)||y.temasActualizados.localeCompare(x.temasActualizados)||JSON.stringify(y.temas).localeCompare(JSON.stringify(x.temas)))[0];
  return {...reciente,temas:conTemas.temas,temasActualizados:conTemas.temasActualizados,errorCalculo:a.errorCalculo||b.errorCalculo,ayuda:a.ayuda||b.ayuda,completado:a.completado||b.completado,revelado:a.revelado||b.revelado};
}
export function perfilTemaAnterior(e:EjercicioGuiado,a:AvanceGuiado):PerfilTemaEjercicio|undefined {
  if(a.perfilTema)return a.perfilTema;
  if(e.actividad!=="tactica"||!a.practica?.ultimoDia||!a.actualizada)return undefined;
  const r=a.razonamiento,terminado=!!r&&(r.resuelto||r.revelado);
  // Legacy practice did not distinguish hints from wrong moves. Do not invent
  // calculation errors, and do not grade a hypothesis that was never submitted.
  return {dia:a.practica.ultimoDia,actualizada:a.actualizada,temas:terminado?r.temas.slice(0,3):[],temasActualizados:a.razonamientoActualizada??a.actualizada,errorCalculo:false,ayuda:a.practica.ayudado,completado:terminado?!!r.resuelto:!a.practica.ayudado,revelado:terminado?!!r.revelado:false};
}
export function observarTema(e:EjercicioGuiado,a:AvanceGuiado,acierto:boolean,ayudado:boolean,dia:string,ahora:string,origen?:OrigenIntentoTactico):PerfilTemaEjercicio|undefined {
  if(e.actividad!=="tactica")return undefined;
  const anterior=perfilTemaAnterior(e,a),r=a.razonamiento;
  return combinarPerfilTema(anterior,{dia,actualizada:ahora,temas:r?.temas.slice(0,3)??[],temasActualizados:a.razonamientoActualizada??ahora,errorCalculo:!acierto&&(origen==="jugada"||(!origen&&!ayudado)),ayuda:origen==="pista"||origen==="solucion"||(!origen&&ayudado),completado:acierto,revelado:origen==="solucion"});
}
export type EstadisticaTema = {
  tema:TemaTactico; posiciones:number; erroresCalculo:number; conAyuda:number;
  etiquetasRevisar:number; sinAyuda:number; reconocimientos:number; hipotesisConfirmadas:number; prioridad:number; mejorando:boolean;
};
export type EstadisticaFamilia = Omit<EstadisticaTema,"tema"> & {id:string;nombre:string};
export type ResumenTemas = {temas:EstadisticaTema[];focos:EstadisticaTema[];familias:EstadisticaFamilia[];posiciones:number};
// Prefer a concrete motif to the goal "mate" or its move count.
function motivosEspecificos(temas:string[]):string[]{
  const concretos=temas.filter(t=>!/^mate(?:In[1-5])?$/.test(t));
  return [...new Set(concretos.length?concretos:temas.filter(t=>t!=="mate"))];
}
type MuestraTema = {perfil:PerfilTemaEjercicio;revisar:boolean;falloReconocimiento:boolean;reconocida:boolean|null};
function calcularIndices(lista:MuestraTema[]):Omit<EstadisticaTema,"tema"> {
  const erroresCalculo=lista.filter(s=>s.perfil.errorCalculo).length,conAyuda=lista.filter(s=>s.perfil.ayuda).length,etiquetasRevisar=lista.filter(s=>s.revisar).length;
  const limpio=(s:MuestraTema)=>s.perfil.completado&&!s.perfil.errorCalculo&&!s.perfil.ayuda&&!s.revisar;
  const mejorando=lista.length>=3&&lista.slice(0,3).every(limpio);
  let peso=0,necesidad=0;
  for(const [i,s] of lista.entries()){const w=.84**i;peso+=w;necesidad+=w*Math.max(s.perfil.errorCalculo?1:0,s.perfil.ayuda ? .7 : 0,s.falloReconocimiento ? .65 : s.revisar ? .25 : 0);}
  const prioridad=mejorando?0:necesidad/(peso||1)*Math.min(1,lista.length/3);
  return {posiciones:lista.length,erroresCalculo,conAyuda,etiquetasRevisar,sinAyuda:lista.filter(s=>s.perfil.completado&&!s.perfil.errorCalculo&&!s.perfil.ayuda).length,reconocimientos:lista.filter(s=>s.reconocida!==null).length,hipotesisConfirmadas:lista.filter(s=>s.reconocida===true).length,prioridad,mejorando};
}
export function analizarTemas(p:ProgresoGuiado,banco:EjercicioGuiado[]):ResumenTemas {
  const observaciones: {e:EjercicioGuiado;p:PerfilTemaEjercicio}[]=[];
  for(const e of banco){const a=p.ejercicios[e.id];if(!a||e.actividad!=="tactica")continue;const perfil=perfilTemaAnterior(e,a);if(perfil)observaciones.push({e,p:perfil});}
  observaciones.sort((a,b)=>b.p.actualizada.localeCompare(a.p.actualizada)||a.e.id.localeCompare(b.e.id));
  const muestras=new Map<string,MuestraTema[]>(),porFamilia=new Map<string,MuestraTema[]>();
  for(const {e,p:perfil} of observaciones){
    const revision=revisarTemas(perfil.temas,e.temas);
    // Missing secondary labels are not mistakes; classify only a submitted,
    // completed hypothesis without hints. A related concept alone is unknown.
    const clasificada=(perfil.completado||perfil.revelado)&&!perfil.ayuda&&revision.length>0;
    const revisar=clasificada&&revision.some(t=>t.estado==="sinConfirmar");
    const valida=revision.some(t=>t.estado==="confirmada"||t.estado==="general");
    const falloReconocimiento=revisar&&!valida;
    const reconocida=clasificada&&(valida||revisar)?valida&&!revisar:null;
    const muestra={perfil,revisar,falloReconocimiento,reconocida};
    for(const id of motivosEspecificos(e.temas)){const lista=muestras.get(id)??[];if(lista.length<12)lista.push(muestra);muestras.set(id,lista);}
    const grupos=new Set(e.temas.map(id=>obtenerTema(id)?.grupo).filter(g=>!!g));
    for(const grupo of grupos){const lista=porFamilia.get(grupo)??[];if(lista.length<12)lista.push(muestra);porFamilia.set(grupo,lista);}
  }
  const temas:EstadisticaTema[]=[];
  for(const [id,lista] of muestras){const tema=obtenerTema(id);if(tema)temas.push({tema,...calcularIndices(lista)});}
  temas.sort((a,b)=>b.prioridad-a.prioridad||b.posiciones-a.posiciones||a.tema.nombre.localeCompare(b.tema.nombre));
  const familias=GRUPOS_TACTICOS.map(g=>({...g,...calcularIndices(porFamilia.get(g.id)??[])}));
  return {temas,focos:temas.filter(t=>t.prioridad>0).slice(0,3),familias,posiciones:observaciones.length};
}
export function elegirNuevosTematicos(nuevos:EjercicioGuiado[],resumen:ResumenTemas,nivel:number,rotacion:number):EjercicioGuiado[]{
  if(!resumen.focos.length)return nuevos.slice(0,2);
  const ciclo=[0,0,1,0,1,2],indice=ciclo[rotacion%ciclo.length]%resumen.focos.length;
  const focos=[...resumen.focos.slice(indice),...resumen.focos.slice(0,indice)];
  for(const foco of focos){
    const dirigido=nuevos.find(e=>e.temas.includes(foco.tema.id)&&typeof e.rating==="number"&&Math.abs(e.rating-nivel)<=200);
    if(!dirigido)continue;
    const resto=nuevos.filter(e=>e.id!==dirigido.id);
    // Do not leave the current rating band just to force a different theme.
    const variado=resto.find(e=>!e.temas.includes(foco.tema.id)&&typeof e.rating==="number"&&Math.abs(e.rating-nivel)<=200)??resto[0];
    return variado?[dirigido,variado]:[dirigido];
  }
  return nuevos.slice(0,2);
}
