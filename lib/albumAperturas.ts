import {Chess, type Square} from 'chess.js';
import catalogo from '../data/aperturas-catalogo.json';

export type TipoCartaApertura='apertura'|'defensa'|'gambito'|'sistema';
export const tiposCartaApertura={apertura:'Aperturas',defensa:'Defensas',gambito:'Gambitos',sistema:'Sistemas'};
export type PartidaAperturas={id:string;fecha:string;color:'w'|'b';rival:string;resultado:'1-0'|'0-1'|'1/2-1/2';movimientos:string[];amistosa?:boolean};
export type HallazgoApertura={id:string;nombre:string;original:string;tipo:TipoCartaApertura;eco:string|null;fen:string;variante:string;pgn:string;profundidad:number;lado:'w'|'b'};
export type CartaApertura=HallazgoApertura&{partidas:Omit<PartidaAperturas,'movimientos'>[];victorias:number;tablas:number;blancas:number;negras:number;rareza:'comun'|'rara'|'mitica';acabado:'normal'|'foil';ramaCompleta?:{cartas:number;partidaId:string;fecha:string}};
const clave=(fen:string)=>fen.split(' ').slice(0,4).join(' ');
const posiciones=new Map(catalogo.map(a=>[a.fen,a]));
const nombres:Record<string,string>={
 'Sicilian Defense':'Defensa Siciliana','French Defense':'Defensa Francesa','Caro-Kann Defense':'Defensa Caro-Kann',
 'Scandinavian Defense':'Defensa Escandinava','Pirc Defense':'Defensa Pirc','Modern Defense':'Defensa Moderna',
 "King's Indian Defense":'Defensa India de Rey',"Queen's Indian Defense":'Defensa India de Dama','Nimzo-Indian Defense':'Defensa Nimzoindia',
 'Indian Defense':'Defensa India','Dutch Defense':'Defensa Holandesa','Slav Defense':'Defensa Eslava','Semi-Slav Defense':'Defensa Semieslava',
 'Italian Game':'Apertura Italiana','Ruy Lopez':'Apertura Española','Scotch Game':'Apertura Escocesa','English Opening':'Apertura Inglesa',
 'Réti Opening':'Apertura Réti','Reti Opening':'Apertura Réti','Vienna Game':'Apertura Vienesa','Four Knights Game':'Apertura de los Cuatro Caballos',
 "Queen's Gambit":'Gambito de Dama',"Queen's Gambit Declined":'Gambito de Dama Rehusado',"Queen's Gambit Accepted":'Gambito de Dama Aceptado',
 "King's Gambit":'Gambito de Rey',"King's Gambit Accepted":'Gambito de Rey Aceptado',"King's Gambit Declined":'Gambito de Rey Rehusado',
 'London System':'Sistema Londres','Hippopotamus Defense':'Sistema Hipopótamo','Stonewall Attack':'Sistema Muro de Piedra',
 "King's Pawn Game":'Apertura de Peón de Rey',"Queen's Pawn Game":'Apertura de Peón de Dama','Russian Game':'Defensa Petrov',
 'Philidor Defense':'Defensa Philidor','Alekhine Defense':'Defensa Alekhine','Nimzowitsch Defense':'Defensa Nimzowitsch',
 "King's Fianchetto Opening":'Apertura de Fianchetto de Rey','Hungarian Opening':'Apertura Húngara','Mieses Opening':'Apertura Mieses',
 'Benko Gambit':'Gambito Benko','Benoni Defense':'Defensa Benoni','Bogo-Indian Defense':'Defensa Bogoindia',
 'Evans Gambit':'Gambito Evans','Smith-Morra Gambit':'Gambito Smith-Morra','Budapest Defense':'Defensa Budapest',
 'Slav Formation':'Formación Eslava',
 'Closed':'Cerrada','Open':'Abierta','English Attack':'Ataque Inglés','Classical Variation':'Variante Clásica',
 'Dragon Variation':'Variante del Dragón','Accelerated Dragon':'Dragón Acelerado','Modern Line':'Línea Moderna','Traditional Line':'Línea Tradicional','Poisoned Pawn':'Peón Envenenado',
};
export function nombreApertura(nombre:string):string {
 if(nombres[nombre])return nombres[nombre];
 return nombre.split(': ').map(parte=>nombres[parte]??parte.split(', ').map(detalle=>nombres[detalle]??detalle
  .replace(/^(.*) Gambit Accepted$/,'Gambito $1 Aceptado').replace(/^(.*) Gambit Declined$/,'Gambito $1 Rehusado')
  .replace(/^(.*) Gambit$/,'Gambito $1').replace(/^(.*) Defense$/,'Defensa $1')
  .replace(/^(.*) System$/,'Sistema $1').replace(/^(.*) Opening$/,'Apertura $1')
  .replace(/^(.*) Variation$/,'Variante $1').replace(/^(.*) Attack$/,'Ataque $1')
  .replace(/^(.*) Formation$/,'Formación $1')
  .replace(/^(.*) Game$/,'Apertura $1')).join(' · ')).join(' · ');
}
function tipoDe(nombre:string):TipoCartaApertura {
 if(/Hippopotamus|Stonewall/.test(nombre))return 'sistema';
 if(/Gambit/i.test(nombre))return 'gambito';
 if(/System|Formation/i.test(nombre))return 'sistema';
 if(/Defense|Russian Game/i.test(nombre))return 'defensa';
 return 'apertura';
}
function hallazgo(original:string,tipo:TipoCartaApertura,fen:string,eco:string|null,variante=original):HallazgoApertura {
 return {id:`formacion:${original}`,nombre:nombreApertura(original),original,tipo,fen,eco,variante:nombreApertura(variante),pgn:'',profundidad:0,lado:'w'};
}
/** Identidad de la posición, independiente de la partida y del orden del catálogo. */
export function idPosicionApertura(fen:string):string {
 let hash=2166136261;for(const caracter of clave(fen)){hash^=caracter.charCodeAt(0);hash=Math.imul(hash,16777619);}
 return `posicion:${(hash>>>0).toString(36)}`;
}
export function cartaDePosicion(entrada:(typeof catalogo)[number]):HallazgoApertura {
 const hipopotamoCatalogo=entrada.nombre.startsWith('Hippopotamus Defense'),nombre=hipopotamoCatalogo?nombreApertura(entrada.nombre).replace('Sistema Hipopótamo','Defensa Hipopótamo'):nombreApertura(entrada.nombre);
 return {id:idPosicionApertura(entrada.fen),nombre,original:entrada.nombre,tipo:hipopotamoCatalogo?'defensa':tipoDe(entrada.nombre),eco:entrada.eco,fen:entrada.fen,variante:nombre,pgn:entrada.pgn,profundidad:entrada.pgn.split(/\s+/).filter(t=>!/^\d+\./.test(t)).length,lado:entrada.fen.split(' ')[1]==='w'?'b':'w'};
}
// Las formaciones propias también se reconocen cuando cambia el orden de jugadas
// o la respuesta del rival. Se exige la estructura completa, no un primer peón.
function sistemas(c:Chess,color:'w'|'b'):HallazgoApertura[] {
 const casilla=(s:string)=>(color==='w'?s:s[0]+(9-Number(s[1]))) as Square;
 const tiene=(s:string,p:string)=>{const v=c.get(casilla(s));return v?.color===color&&v.type===p;};
 const todos=(lista:[string,string][])=>lista.every(([s,p])=>tiene(s,p));
 const salida:HallazgoApertura[]=[];
 if(todos([['d4','p'],['e3','p'],['f3','n'],['f4','b']])&&color==='w')salida.push(hallazgo('London System','sistema',c.fen(),null));
 if(todos([['b3','p'],['g3','p'],['d3','p'],['e3','p'],['b2','b'],['g2','b'],['d2','n'],['e2','n']]))salida.push(hallazgo('Hippopotamus Defense','sistema',c.fen(),null));
 if(todos([['c3','p'],['d4','p'],['e3','p'],['f4','p']]))salida.push(hallazgo('Stonewall Attack','sistema',c.fen(),null));
 return salida.map(f=>({...f,lado:color}));
}
/** Cada posición catalogada realmente alcanzada entrega su propia carta.
 * La ilustración y el nombre siempre corresponden a esa misma posición. */
export function descubrirAperturas(movimientos:string[],color:'w'|'b'):HallazgoApertura[] {
 if(!Array.isArray(movimientos)||movimientos.length<4)return [];
 const c=new Chess(),resultado=new Map<string,HallazgoApertura>();
 try {
  for(const u of movimientos.slice(0,40)){
   if(typeof u!=='string'||!/^([a-h][1-8]){2}[qrbn]?$/.test(u))return [];
   c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});
   const entrada=posiciones.get(clave(c.fen()));if(entrada){const f=cartaDePosicion(entrada);resultado.set(f.id,f);}
   for(const f of sistemas(c,color))if(!resultado.has(f.id))resultado.set(f.id,{...f,pgn:c.pgn(),profundidad:c.history().length});
  }
 } catch {return [];}
 return [...resultado.values()];
}
export function coleccionarAperturas(partidas:PartidaAperturas[]):CartaApertura[] {
 const cartas=new Map<string,CartaApertura>(),vistas=new Set<string>();
 for(const p of [...partidas].sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.id.localeCompare(b.id))){
  if(vistas.has(p.id))continue;vistas.add(p.id);
  const {movimientos,...datos}=p;
  for(const f of descubrirAperturas(movimientos,p.color)){
   const carta=cartas.get(f.id)??{...f,partidas:[],victorias:0,tablas:0,blancas:0,negras:0,rareza:'comun',acabado:'normal'} as CartaApertura;
   if(f.lado===p.color){carta.rareza='rara';if(p.resultado===(p.color==='w'?'1-0':'0-1'))carta.acabado='foil';}
   carta.partidas.push(datos);carta[p.color==='w'?'blancas':'negras']++;
   if(p.resultado===(p.color==='w'?'1-0':'0-1'))carta.victorias++;
   if(p.resultado==='1/2-1/2')carta.tablas++;
   cartas.set(f.id,carta);
  }
 }
 return [...cartas.values()].sort((a,b)=>b.partidas.length-a.partidas.length||a.nombre.localeCompare(b.nombre,'es'));
}
