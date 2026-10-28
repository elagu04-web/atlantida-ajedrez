export type CategoriaClase='game'|'challenge'|'story'|'teacher';
export type JuegoClase={id:string;title:string;description:string;tag:string;meta:string;category:CategoriaClase;size:number;rows:number;preview:string[];order:number};
export const CANAL_CLASES='atlantida-clases-v1';
const categorias=new Set(['game','challenge','story','teacher']);
// Only display data crosses this boundary. Never accept HTML or URLs.
export function leerCatalogoClases(valor:unknown):JuegoClase[]{
 if(!Array.isArray(valor))return [];
 return valor.slice(0,60).flatMap(v=>{
  if(!v||typeof v!=='object'||typeof v.id!=='string'||! /^[a-z][a-z0-9-]{0,50}$/.test(v.id)||typeof v.title!=='string'||!categorias.has(v.category))return [];
  const texto=(x:unknown,n:number)=>typeof x==='string'?x.slice(0,n):'';
  return [{id:v.id,title:texto(v.title,100),description:texto(v.description,450),tag:texto(v.tag,100),meta:texto(v.meta,100),category:v.category as CategoriaClase,size:Math.max(3,Math.min(16,Number(v.size)||8)),rows:Math.max(3,Math.min(16,Number(v.rows)||Number(v.size)||8)),preview:Array.isArray(v.preview)?v.preview.slice(0,256).map((p:unknown)=>texto(p,8)):[],order:Number(v.order)||0}];
 }).sort((a,b)=>a.order-b.order);
}
export const PIEZAS_CLASE:Record<string,string>={'♔':'wK','♕':'wQ','♖':'wR','♗':'wB','♘':'wN','♙':'wP','♚':'bK','♛':'bQ','♜':'bR','♝':'bB','♞':'bN','♟':'bP'};
