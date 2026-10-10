import type { VarianteMotor } from "./motorPractica";
export type EventoRival={tipo:"perdida"|"dudosa";id:number};
// Ambas evaluaciones son desde las negras, antes y después de la jugada blanca.
// Una búsqueda superficial o un mate previo no justifican burlarse de una jugada.
export function jugadaDudosa(antes:VarianteMotor|undefined,despues:VarianteMotor|undefined):boolean{
  if(!antes||!despues||antes.profundidad<10||despues.profundidad<10||antes.tipo!=="cp")return false;
  return despues.tipo==="mate"?despues.valor>0:despues.valor-antes.valor>=150;
}
export function mejorEvaluacion(variantes:readonly VarianteMotor[]):VarianteMotor|undefined{
  const profundidad=Math.max(0,...variantes.map(v=>v.profundidad));
  return variantes.filter(v=>v.profundidad>=profundidad-1).sort((a,b)=>{const valor=(v:VarianteMotor)=>v.tipo==="cp"?v.valor:v.valor>0?100000-v.valor*100:-100000+Math.abs(v.valor)*100;return valor(b)-valor(a);})[0];
}
