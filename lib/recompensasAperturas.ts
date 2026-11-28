import type {CartaApertura,PartidaAperturas} from './albumAperturas';
import {arbolAperturas,type ArbolAperturas} from './arbolAperturas';

type Encuentro=Omit<PartidaAperturas,'movimientos'>;
const orden=(a:Encuentro,b:Encuentro)=>a.fecha.localeCompare(b.fecha)||a.id.localeCompare(b.id);
export function gradoApertura(c:CartaApertura,p:Encuentro){
 if(c.eco!==null&&p.color!==c.lado)return 0;
 return p.resultado===(p.color==='w'?'1-0':'0-1')?2:1;
}
export function nuevasEdicionesPartida(cartas:CartaApertura[],partidaId:string){
 return cartas.flatMap(c=>{
  const i=c.partidas.findIndex(p=>p.id===partidaId);if(i<0)return [];
  const p=c.partidas[i],grado=gradoApertura(c,p),anterior=Math.max(-1,...c.partidas.slice(0,i).map(p=>gradoApertura(c,p)));
  if(grado<=anterior)return [];
  return [{...c,rareza:grado?'rara':'comun',acabado:grado===2?'foil':'normal',partidas:[p],victorias:p.resultado===(p.color==='w'?'1-0':'0-1')?1:0,tablas:p.resultado==='1/2-1/2'?1:0,blancas:p.color==='w'?1:0,negras:p.color==='b'?1:0} as CartaApertura];
 }).sort((a,b)=>gradoApertura(b,b.partidas[0])-gradoApertura(a,a.partidas[0])||b.profundidad-a.profundidad);
}
/** Una mítica por rama con nombre y al menos tres posiciones catalogadas.
 * Completar posiciones y ganar con la jugada definitoria propia son requisitos
 * independientes. La fecha de premio es el encuentro que satisface el último. */
export function miticasDeRamas(cartas:CartaApertura[],arbol:ArbolAperturas=arbolAperturas()):CartaApertura[]{
 const porId=new Map(cartas.map(c=>[c.id,c])),premios:CartaApertura[]=[];
 for(const n of arbol.nodos.values()){
  if(!n.carta||n.descendientes.length<3)continue;
  const base=porId.get(n.carta.id),victoria=base?.partidas.find(p=>gradoApertura(base,p)===2);
  if(!base||!victoria)continue;
  let ultima=victoria,completa=true;
  for(const id of n.descendientes){const primera=porId.get(id)?.partidas[0];if(!primera){completa=false;break;}if(orden(primera,ultima)>0)ultima=primera;}
  if(completa)premios.push({...base,id:'mitica:'+base.id,rareza:'mitica',acabado:'foil',ramaCompleta:{cartas:n.descendientes.length,partidaId:ultima.id,fecha:ultima.fecha}});
 }
 return premios;
}
