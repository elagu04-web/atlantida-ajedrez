import {Chess, type Square} from 'chess.js';
import catalogo from '../data/aperturas-catalogo.json';

export type TipoCartaApertura='apertura'|'defensa'|'gambito'|'sistema';
export const tiposCartaApertura={apertura:'Aperturas',defensa:'Defensas',gambito:'Gambitos',sistema:'Sistemas'};
export type PartidaAperturas={id:string;fecha:string;color:'w'|'b';rival:string;resultado:'1-0'|'0-1'|'1/2-1/2';movimientos:string[]};
export type HallazgoApertura={id:string;nombre:string;original:string;tipo:TipoCartaApertura;eco:string|null;fen:string;variante:string};
export type CartaApertura=HallazgoApertura&{partidas:Omit<PartidaAperturas,'movimientos'>[];victorias:number;tablas:number;blancas:number;negras:number};
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
};
export function nombreApertura(nombre:string):string {
 if(nombres[nombre])return nombres[nombre];
 return nombre.split(': ').map(parte=>nombres[parte]??parte
  .replace(/^(.*) Gambit Accepted$/,'Gambito $1 Aceptado').replace(/^(.*) Gambit Declined$/,'Gambito $1 Rehusado')
  .replace(/^(.*) Gambit$/,'Gambito $1').replace(/^(.*) Defense$/,'Defensa $1')
  .replace(/^(.*) System$/,'Sistema $1').replace(/^(.*) Opening$/,'Apertura $1')
  .replace(/^(.*) Variation$/,'Variante $1').replace(/^(.*) Attack$/,'Ataque $1')
  .replace(/^(.*) Formation$/,'Formación $1')
  .replace(/^(.*) Game$/,'Apertura $1')).join(' · ');
}
function tipoDe(nombre:string):TipoCartaApertura {
 if(/Hippopotamus|Stonewall/.test(nombre))return 'sistema';
 if(/Gambit/i.test(nombre))return 'gambito';
 if(/System|Formation/i.test(nombre))return 'sistema';
 if(/Defense|Russian Game/i.test(nombre))return 'defensa';
 return 'apertura';
}
function hallazgo(original:string,tipo:TipoCartaApertura,fen:string,eco:string|null,variante=original):HallazgoApertura {
 return {id:`${tipo}:${original}`,nombre:nombreApertura(original),original,tipo,fen,eco,variante:nombreApertura(variante)};
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
 return salida;
}
/** Sólo la apertura más específica del catálogo, más sus gambitos/sistemas y
 * formaciones propias. Nunca entrega todas las aperturas transitorias de 1.e4. */
export function descubrirAperturas(movimientos:string[],color:'w'|'b'):HallazgoApertura[] {
 if(!Array.isArray(movimientos)||movimientos.length<4)return [];
 const c=new Chess(),formaciones=new Map<string,HallazgoApertura>();
 let ultima:{entrada:(typeof catalogo)[number];fen:string}|null=null;
 try {
  for(const u of movimientos.slice(0,40)){
   if(typeof u!=='string'||!/^([a-h][1-8]){2}[qrbn]?$/.test(u))return [];
   c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});
   const entrada=posiciones.get(clave(c.fen()));if(entrada)ultima={entrada,fen:c.fen()};
   for(const f of sistemas(c,color))if(!formaciones.has(f.id))formaciones.set(f.id,f);
  }
 } catch {return [];}
 const resultado=new Map<string,HallazgoApertura>();
 if(ultima){
  const {entrada,fen}=ultima,partes=entrada.nombre.split(': '),raiz=partes[0];
  const base=hallazgo(raiz,tipoDe(raiz),fen,entrada.eco,entrada.nombre);resultado.set(base.id,base);
  for(const detalle of partes.slice(1).flatMap(p=>p.split(', ')).filter(p=>/Gambit|System|Formation/.test(p))){
   const f=hallazgo(detalle,tipoDe(detalle),fen,entrada.eco,entrada.nombre);resultado.set(f.id,f);
  }
 }
 for(const [id,f] of formaciones)resultado.set(id,f);
 return [...resultado.values()];
}
export function coleccionarAperturas(partidas:PartidaAperturas[]):CartaApertura[] {
 const cartas=new Map<string,CartaApertura>(),vistas=new Set<string>();
 for(const p of [...partidas].sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.id.localeCompare(b.id))){
  if(vistas.has(p.id))continue;vistas.add(p.id);
  const {movimientos,...datos}=p;
  for(const f of descubrirAperturas(movimientos,p.color)){
   const carta=cartas.get(f.id)??{...f,partidas:[],victorias:0,tablas:0,blancas:0,negras:0};
   carta.partidas.push(datos);carta[p.color==='w'?'blancas':'negras']++;
   if(p.resultado===(p.color==='w'?'1-0':'0-1'))carta.victorias++;
   if(p.resultado==='1/2-1/2')carta.tablas++;
   cartas.set(f.id,carta);
  }
 }
 return [...cartas.values()].sort((a,b)=>b.partidas.length-a.partidas.length||a.nombre.localeCompare(b.nombre,'es'));
}
