import {Chess} from 'chess.js';
import catalogo from '../data/aperturas-catalogo.json';
import recorridos from '../data/aperturas-recorridos.json';
import {cartaDePosicion,type HallazgoApertura} from './albumAperturas';

export type NodoApertura={ruta:string;padre:string|null;uci:string;profundidad:number;carta:HallazgoApertura|null;hijos:string[];descendientes:string[]};
export function crearArbolAperturas(){
 const nodos=new Map<string,NodoApertura>();
 const agregar=(ruta:string,padre:string|null,uci:string,profundidad:number)=>{const n={ruta,padre,uci,profundidad,carta:null,hijos:[],descendientes:[]} as NodoApertura;nodos.set(ruta,n);return n;};
 agregar('',null,'',0);
 const rutasPorCarta=new Map<string,string>();
 catalogo.forEach((entrada,i)=>{
  const carta=cartaDePosicion(entrada),pasos=recorridos[i].split(' ');let padre='';
  nodos.get('')!.descendientes.push(carta.id);
  pasos.forEach((uci,p)=>{const ruta=padre?padre+' '+uci:uci;let n=nodos.get(ruta);if(!n){n=agregar(ruta,padre,uci,p+1);nodos.get(padre)!.hijos.push(ruta);}n.descendientes.push(carta.id);padre=ruta;});
  nodos.get(padre)!.carta=carta;rutasPorCarta.set(carta.id,padre);
 });
 return {nodos,rutasPorCarta};
}
export type ArbolAperturas=ReturnType<typeof crearArbolAperturas>;
let cache:ArbolAperturas|undefined;
export function arbolAperturas(){return cache??(cache=crearArbolAperturas());}
export function posicionDeRuta(ruta:string){
 const c=new Chess();if(ruta)for(const u of ruta.split(' '))c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});return c;
}
export function progresoRama(nodo:NodoApertura,conseguidas:ReadonlySet<string>){
 return {conseguidas:nodo.descendientes.filter(id=>conseguidas.has(id)).length,total:nodo.descendientes.length};
}
