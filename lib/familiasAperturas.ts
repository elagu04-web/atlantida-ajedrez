import catalogo from '../data/aperturas-catalogo.json';
import {cartaDePosicion,nombreApertura,type CartaApertura,type HallazgoApertura} from './albumAperturas';
import {arbolAperturas} from './arbolAperturas';

export function claveFamiliaApertura(c:Pick<HallazgoApertura,'original'|'eco'>){
 if(/London System/.test(c.original))return 'London System';
 if(c.eco===null)return 'club:'+c.original;
 if(/^Queen's Gambit/.test(c.original))return "Queen's Gambit";
 if(/^King's Gambit/.test(c.original))return "King's Gambit";
 return c.original.split(': ')[0].split(', ')[0];
}
export type FamiliaAperturas={id:string;nombre:string;posiciones:HallazgoApertura[];obtenidas:CartaApertura[];miticas:CartaApertura[];entradaId:string|null;tieneMitica:boolean};
let base:Map<string,HallazgoApertura[]>|undefined;
function catalogoFamilias(){
 if(!base){base=new Map();for(const entrada of catalogo){const carta=cartaDePosicion(entrada),id=claveFamiliaApertura(carta);if(!base.has(id))base.set(id,[]);base.get(id)!.push(carta);}}
 return base;
}
export function familiasAperturas(cartas:CartaApertura[],miticas:CartaApertura[]=[]):FamiliaAperturas[]{
 const familias=new Map<string,FamiliaAperturas>();
 const arbol=arbolAperturas();
 for(const [id,posiciones] of catalogoFamilias()){
  const primera=[...posiciones].sort((a,b)=>a.profundidad-b.profundidad||a.id.localeCompare(b.id))[0];
  const tieneMitica=posiciones.some(c=>{const ruta=arbol.rutasPorCarta.get(c.id);return !!ruta&&arbol.nodos.get(ruta)!.descendientes.length>=3;});
  familias.set(id,{id,nombre:id==='Hippopotamus Defense'?'Defensa Hipopótamo · Nh6':nombreApertura(id),posiciones:[...posiciones],obtenidas:[],miticas:[],entradaId:primera?.id??null,tieneMitica});
 }
 for(const carta of cartas){
  const id=claveFamiliaApertura(carta);let familia=familias.get(id);
  if(!familia){familia={id,nombre:carta.nombre,posiciones:[],obtenidas:[],miticas:[],entradaId:null,tieneMitica:false};familias.set(id,familia);}
  if(!familia.posiciones.some(p=>p.id===carta.id))familia.posiciones.push(carta);
  familia.obtenidas.push(carta);
 }
 for(const carta of miticas)familias.get(claveFamiliaApertura(carta))?.miticas.push(carta);
 return [...familias.values()];
}
export type RamaFamilia={carta:HallazgoApertura;hijos:RamaFamilia[]};
/** La conexión sigue el recorrido real del catálogo, no similitudes del nombre. */
export function ramasDeFamilia(familia:FamiliaAperturas):RamaFamilia[]{
 const arbol=arbolAperturas(),porId=new Map(familia.posiciones.map(c=>[c.id,{carta:c,hijos:[]} as RamaFamilia])),raices:RamaFamilia[]=[];
 for(const rama of porId.values()){
  const ruta=arbol.rutasPorCarta.get(rama.carta.id);let padre=ruta?arbol.nodos.get(ruta)?.padre:null,conectada=false;
  while(padre!==null&&padre!==undefined){const n=arbol.nodos.get(padre)!;const p=n.carta?porId.get(n.carta.id):null;if(p){p.hijos.push(rama);conectada=true;break;}padre=n.padre;}
  if(!conectada)raices.push(rama);
 }
 const ordenar=(ramas:RamaFamilia[])=>{ramas.sort((a,b)=>a.carta.profundidad-b.carta.profundidad||a.carta.nombre.localeCompare(b.carta.nombre,'es'));for(const r of ramas)ordenar(r.hijos);};ordenar(raices);
 return raices;
}

export type IdentidadFamilia={tono:string;simbolo:string;motivo:'arcos'|'olas'|'torres'|'diagonales'|'rombos';lema:string};
export function identidadFamilia(id:string):IdentidadFamilia{
 if(/Sicilian/.test(id))return {tono:'mar',simbolo:'♞',motivo:'olas',lema:'EL CONTRAATAQUE'};
 if(/Italian/.test(id))return {tono:'arcilla',simbolo:'♗',motivo:'arcos',lema:'EL ARTE DEL DESARROLLO'};
 if(/Ruy Lopez/.test(id))return {tono:'vino',simbolo:'♜',motivo:'torres',lema:'LA PRESIÓN SOBRE EL CENTRO'};
 if(/London/.test(id))return {tono:'violeta',simbolo:'♗',motivo:'torres',lema:'UNA ESTRUCTURA, MUCHOS CAMINOS'};
 if(/French/.test(id))return {tono:'cobre',simbolo:'♟',motivo:'arcos',lema:'LA CADENA Y LA RUPTURA'};
 if(/Caro-Kann/.test(id))return {tono:'bosque',simbolo:'♜',motivo:'rombos',lema:'CONSTRUIR PARA RESISTIR'};
 if(/Gambit/.test(id))return {tono:'vino',simbolo:'♙',motivo:'diagonales',lema:'UNA ENTREGA, UNA INICIATIVA'};
 if(/Hippopotamus/.test(id))return {tono:'mar',simbolo:'♚',motivo:'olas',lema:'LA CALMA ANTES DEL AVANCE'};
 if(/Indian|Benoni/.test(id))return {tono:'bosque',simbolo:'♞',motivo:'rombos',lema:'JUGAR CON EL ESPACIO'};
 let hash=0;for(const l of id)hash=(Math.imul(hash,31)+l.charCodeAt(0))>>>0;
 const tonos=['mar','violeta','arcilla','bosque','cobre'] as const,motivos=['arcos','olas','torres','diagonales','rombos'] as const;
 return {tono:tonos[hash%5],simbolo:['♞','♗','♜','♙','♛'][hash%5],motivo:motivos[(hash>>>3)%5],lema:'CADA PARTIDA DEJA SU HUELLA'};
}
