import { Chess } from "chess.js";
import catalogo from "../data/aperturas-catalogo.json";
import { normalizarPractica, practicaValida, type PracticaError, type SesionEntrenamiento } from "./entrenamientoPersonal";

export type LineaApertura = { id:string; nombre:string; color:"w"|"b"; fen:string; movimientos:string[]; notas:string; activa:boolean; actualizada:string; practica?:PracticaError; practicaActualizada?:string };
export type RecorridoApertura = { lineaId:string; indice:number; ayudado:boolean; terminada:boolean; actualizada:string };
export type RepertorioAperturas = { lineas:Record<string,LineaApertura>; recorrido:RecorridoApertura|null; recorridoActualizado:string };
const cero="1970-01-01T00:00:00.000Z";
export const repertorioInicial=():RepertorioAperturas=>({lineas:{},recorrido:null,recorridoActualizado:cero});
const fecha=(v:unknown):v is string=>typeof v==="string"&&v.length<=30&&/^\d{4}-\d\d-\d\dT/.test(v)&&Number.isFinite(Date.parse(v));
const objeto=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
export const uciApertura=(m:{from:string;to:string;promotion?:string})=>m.from+m.to+(m.promotion??"");
export function moverUci(c:Chess,u:string){return c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});}
export function posicionLinea(l:LineaApertura,indice:number){const c=new Chess(l.fen);for(const u of l.movimientos.slice(0,indice))moverUci(c,u);return c;}
function firma(s:string){let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return (h>>>0).toString(36);}
export function nuevaLinea(nombre:string,color:"w"|"b",fen:string,movimientos:string[],ahora=new Date()):LineaApertura{
 const c=new Chess(fen);if(!movimientos.length||movimientos.length>120)throw new Error("Cada variante debe tener entre 1 y 120 medias jugadas.");
 let propias=0;for(const u of movimientos){if(c.turn()===color)propias++;moverUci(c,u);}if(!propias)throw new Error("La variante no tiene jugadas del color elegido.");
 return {id:`ap-${firma(fen+color+movimientos.join(' '))}`,nombre:nombre.trim().slice(0,100)||"Mi variante",color,fen,movimientos,notas:"",activa:true,actualizada:ahora.toISOString()};
}
/** Parse RAV branches from the position before the preceding move, never flatten them. */
export function importarRepertorio(pgn:string,color:"w"|"b",nombre="Mi repertorio",limite=40):LineaApertura[]{
 if(!pgn.trim()||pgn.length>200000)throw new Error("Usá un PGN de hasta 200 KB.");
 const bloques=pgn.split(/(?=\[Event\s+")/).map(s=>s.trim()).filter(Boolean);if(bloques.length>30)throw new Error("Cargá hasta 30 partidas por vez.");
 const lineas:LineaApertura[]=[];
 for(const bloque of bloques){
  const fen=bloque.match(/\[FEN\s+"([^"]+)"\]/)?.[1]??new Chess().fen();
  const cuerpo=bloque.replace(/\[(?:[^"\]]|"(?:\\.|[^"\\])*")*\]/g,' ').replace(/\{[^}]*\}/g,' ').replace(/;[^\n]*/g,' ').replace(/\$\d+/g,' ').replace(/\d+\.(?:\.\.)?/g,' ');
  if(/[{}\[\]]/.test(cuerpo))throw new Error("Revisá los comentarios y encabezados del PGN.");
  const tokens=cuerpo.match(/\(|\)|[^\s()]+/g)??[];if(tokens.length>5000)throw new Error("El PGN tiene demasiadas variantes.");
  let c=new Chess(fen),ruta:string[]=[];const pila:{fen:string;ruta:string[]}[]=[];
  const agregar=()=>{if(ruta.length){lineas.push(nuevaLinea(nombre,color,fen,ruta.slice(0,Math.max(2,Math.min(120,limite)))));if(lineas.length>100)throw new Error("Cargá hasta 100 variantes por vez.");}};
  for(const t of tokens){
   if(t==='('){if(!ruta.length||pila.length>=12)throw new Error("La variante empieza en una posición inválida.");pila.push({fen:c.fen(),ruta:[...ruta]});ruta=ruta.slice(0,-1);c=new Chess(fen);for(const u of ruta)moverUci(c,u);}
   else if(t===')'){if(!pila.length)throw new Error("Falta abrir un paréntesis en el PGN.");agregar();const previa=pila.pop()!;c=new Chess(previa.fen);ruta=previa.ruta;}
   else if(!['1-0','0-1','1/2-1/2','*','...'].includes(t)){if(ruta.length>=600)throw new Error("Una partida supera el límite de jugadas.");try{ruta.push(uciApertura(c.move(t.replace(/[!?]+$/,''))));}catch{throw new Error(`No se pudo leer la jugada «${t}». Usá notación PGN internacional.`);}}
  }
  if(pila.length)throw new Error("Falta cerrar un paréntesis del PGN.");agregar();
 }
 const unicas=[...new Map(lineas.map(l=>[l.id,l])).values()];if(!unicas.length)throw new Error("El PGN no tiene jugadas para practicar.");
 return unicas.map((l,i)=>({...l,nombre:unicas.length>1?`${nombre.slice(0,90)} · ${i+1}`:nombre.slice(0,100)}));
}
export function leerRepertorio(v:unknown):RepertorioAperturas{
 const r=repertorioInicial();if(!objeto(v))return r;
 if(objeto(v.lineas))for(const [id,valor] of Object.entries(v.lineas).slice(0,500)){
  if(!objeto(valor)||valor.id!==id||typeof valor.nombre!=="string"||valor.nombre.length>100||!['w','b'].includes(String(valor.color))||typeof valor.fen!=="string"||!Array.isArray(valor.movimientos)||valor.movimientos.some(u=>typeof u!=="string"||!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u))||typeof valor.notas!=="string"||valor.notas.length>800||typeof valor.activa!=="boolean"||!fecha(valor.actualizada))continue;
  try{const l=nuevaLinea(valor.nombre,valor.color as "w"|"b",valor.fen,valor.movimientos);if(l.id!==id)continue;r.lineas[id]={...l,activa:valor.activa,notas:valor.notas,actualizada:valor.actualizada};if(practicaValida(valor.practica)&&fecha(valor.practicaActualizada)){r.lineas[id].practica=normalizarPractica(valor.practica);r.lineas[id].practicaActualizada=valor.practicaActualizada;}}catch{}
 }
 if(fecha(v.recorridoActualizado)){r.recorridoActualizado=v.recorridoActualizado;const s=v.recorrido;
  if(objeto(s)&&typeof s.lineaId==='string'&&r.lineas[s.lineaId]&&Number.isInteger(s.indice)&&Number(s.indice)>=0&&Number(s.indice)<=r.lineas[s.lineaId].movimientos.length&&typeof s.ayudado==='boolean'&&typeof s.terminada==='boolean'&&fecha(s.actualizada))r.recorrido=s as RecorridoApertura;
 }
 return r;
}
export function combinarRepertorios(a?:RepertorioAperturas,b?:RepertorioAperturas):RepertorioAperturas{
 const x=leerRepertorio(a),y=leerRepertorio(b),r=repertorioInicial();
 for(const id of new Set([...Object.keys(x.lineas),...Object.keys(y.lineas)])){
  const p=x.lineas[id],q=y.lineas[id];const ultima=!p?q:!q?p:q.actualizada>p.actualizada?q:p;r.lineas[id]={...ultima};
  const practica=!p?.practica?q:!q?.practica?p:(q.practicaActualizada??'')>(p.practicaActualizada??'')?q:p;
  if(practica?.practica){r.lineas[id].practica={...practica.practica,aciertos:Math.max(p?.practica?.aciertos??0,q?.practica?.aciertos??0),fallos:Math.max(p?.practica?.fallos??0,q?.practica?.fallos??0)};r.lineas[id].practicaActualizada=practica.practicaActualizada;
   const ayuda=[p?.practica,q?.practica].find(v=>v?.diaAyuda&&v.diaAyuda===r.lineas[id].practica?.ultimoDia);if(ayuda)r.lineas[id].practica={...r.lineas[id].practica!,etapa:0,ayudado:true,diaAyuda:ayuda.diaAyuda,proxima:ayuda.proxima};
  }
 }
 const reciente=y.recorridoActualizado>x.recorridoActualizado?y:x;r.recorrido=reciente.recorrido;r.recorridoActualizado=reciente.recorridoActualizado;return leerRepertorio(r);
}
export function agregarLineas(r:RepertorioAperturas,lineas:LineaApertura[]):RepertorioAperturas{
 const nuevos=lineas.filter(l=>!r.lineas[l.id]);if(Object.keys(r.lineas).length+nuevos.length>100)throw new Error("Tu repertorio admite 100 variantes. Exportá una copia para conservar otras.");
 const resultado={...r,lineas:{...r.lineas}};for(const l of lineas){const previa=r.lineas[l.id];resultado.lineas[l.id]=previa?{...previa,activa:true,actualizada:l.actualizada}:l;}return resultado;
}
export function comenzarLinea(r:RepertorioAperturas,l:LineaApertura,ahora=new Date()):RepertorioAperturas{
 let indice=0;const c=new Chess(l.fen);while(indice<l.movimientos.length&&c.turn()!==l.color)moverUci(c,l.movimientos[indice++]);
 return {...r,recorrido:{lineaId:l.id,indice,ayudado:false,terminada:false,actualizada:ahora.toISOString()},recorridoActualizado:ahora.toISOString()};
}
export function exportarRepertorio(lineas:LineaApertura[]){return lineas.map(l=>{const c=new Chess(l.fen);c.setHeader('Event',l.nombre);c.setHeader('White',l.color==='w'?'Mi repertorio':'Rival');c.setHeader('Black',l.color==='b'?'Mi repertorio':'Rival');for(const u of l.movimientos)moverUci(c,u);return c.pgn();}).join('\n\n');}
const clave=(fen:string)=>fen.split(' ').slice(0,4).join(' ');
const posiciones=new Map(catalogo.map(a=>[a.fen,a]));
export function reconocerApertura(pgn:string){const c=new Chess();c.loadPgn(pgn);const h=c.history({verbose:true});for(const m of [...h.slice(0,40)].reverse()){const a=posiciones.get(clave(m.after));if(a)return a;}return null;}
export function buscarAperturas(q:string){const limpia=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const texto=limpia(q).replace(/siciliana/g,'sicilian').replace(/francesa/g,'french').replace(/espanola/g,'ruy lopez').replace(/italiana/g,'italian').replace(/defensa/g,'defense').replace(/gambito/g,'gambit');if(!texto)return ['Sicilian Defense','French Defense','Italian Game','Caro-Kann Defense','Queen’s Gambit',"Queen's Gambit",'Ruy Lopez','Scandinavian Defense','Pirc Defense',"King's Indian Defense"].flatMap(n=>{const a=catalogo.find(x=>x.nombre===n);return a?[a]:[];});return catalogo.filter(a=>limpia(a.nombre+' '+a.eco).includes(texto)).slice(0,12);}
export function diagnosticoAperturas(sesiones:SesionEntrenamiento[]){
 const grupos=new Map<string,{nombre:string;color:"w"|"b";partidas:number;errores:number}>();
 for(const s of sesiones){let a;try{a=reconocerApertura(s.pgn);}catch{continue;}const nombre=a?`${a.eco} · ${a.nombre}`:'Sin clasificación de apertura';const k=s.color+nombre;const g=grupos.get(k)??{nombre,color:s.color,partidas:0,errores:0};g.partidas++;g.errores+=s.resultado.jugadas.filter(j=>j.color===s.color&&j.numero<=15&&j.perdidaCentipeones>=100).length;grupos.set(k,g);}
 return [...grupos.values()].sort((a,b)=>b.partidas-a.partidas);
}
export function mejoraDeApertura(s:SesionEntrenamiento,indice:number){
 const j=s.resultado.jugadas[indice];if(!j||j.color!==s.color||j.numero>15||!j.varianteSan?.length)throw new Error("Ese momento no tiene una mejora de apertura para tu color.");
 const partida=new Chess();partida.loadPgn(s.pgn);const h=partida.history({verbose:true});const c=new Chess(h[0].before);const fen=c.fen(),movimientos:string[]=[];for(const m of h.slice(0,indice))movimientos.push(uciApertura(c.move(m.san)));
 for(const san of j.varianteSan.slice(0,8))movimientos.push(uciApertura(c.move(san)));
 const l=nuevaLinea(`Mejora · ${j.numero}${j.color==='w'?'.':'…'} ${j.mejorJugadaSan}`,s.color,fen,movimientos);return {...l,notas:`En ${s.titulo} jugué ${j.san}. Pérdida estimada: ${(j.perdidaCentipeones/100).toFixed(1)} peones. Revisar la respuesta del rival.`};
}
