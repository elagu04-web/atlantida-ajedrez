import {analizarPartida} from '../analisisPartidas';
import {crearSesionEntrenamiento,leerBibliotecaEntrenamiento,type SesionEntrenamiento} from '../entrenamientoPersonal';
import {combinarSesionCuenta} from '../entrenamientoCuenta';
import {Chess} from 'chess.js';
import type {AnalisisPosicion} from '../stockfish';

export type TrabajoAnalisis={id:string;pgn:string;color:'w'|'b';total:number;sesion_id:string;evaluaciones:AnalisisPosicion[]};
export type ProgresoAnalisis={vigente:boolean;conflicto?:boolean};
export type TransporteAnalisisServidor={
 guardar:(evaluaciones:AnalisisPosicion[],liberar:boolean,sesion?:SesionEntrenamiento,revision?:number)=>Promise<ProgresoAnalisis>;
 documento:()=>Promise<{datos:unknown;revision:number}|null>;
};
class Pausa extends Error{}class Cancelado extends Error{}
/** Checkpoints are independent of the browser and also of a particular invocation. */
export async function procesarAnalisisServidor(trabajo:TrabajoAnalisis,transporte:TransporteAnalisisServidor,crearMotor:()=>{evaluarPosicion:(fen:string,turno:'w'|'b',ms?:number)=>Promise<AnalisisPosicion>;destruir:()=>void},presupuestoMs=23000,reloj=Date.now){
 const c=new Chess();c.loadPgn(trabajo.pgn);const total=c.history().length+1;
 if(total!==trabajo.total||total<2||total>601||!['w','b'].includes(trabajo.color)||!Array.isArray(trabajo.evaluaciones)||trabajo.evaluaciones.length>total)throw new Error('Trabajo inválido');
 const evaluaciones=[...trabajo.evaluaciones];let cursor=0,guardadas=evaluaciones.length;const recurso:{motor:ReturnType<typeof crearMotor>|null}={motor:null};const inicio=reloj();
 async function guardar(liberar=false,sesion?:SesionEntrenamiento,revision?:number){const r=await transporte.guardar(evaluaciones,liberar,sesion,revision);if(!r.vigente)throw new Cancelado();guardadas=evaluaciones.length;return r;}
 try{
  const resultado=await analizarPartida(trabajo.pgn,{analizar:async()=>{},evaluarPosicion:async(fen,turno)=>{
   if(cursor<evaluaciones.length)return evaluaciones[cursor++];
   if(reloj()-inicio>=presupuestoMs)throw new Pausa();
   recurso.motor??=crearMotor();const valor=await recurso.motor.evaluarPosicion(fen,turno,650);
   if(valor.evaluacionCentipawns===null&&valor.mateEn===null)throw new Error('Evaluación incompleta');
   evaluaciones.push(valor);cursor++;
   if(evaluaciones.length-guardadas>=8)await guardar();return valor;
  }},()=>{},()=>({evaluacionCentipawns:null,mateEn:null,mejorJugada:null,variantePrincipal:null}));
  for(let intento=0;intento<4;intento++){
   const doc=await transporte.documento();if(!doc)throw new Cancelado();
   const anterior=leerBibliotecaEntrenamiento(JSON.stringify([doc.datos]))[0];
   let sesion=crearSesionEntrenamiento(anterior?[anterior]:[],trabajo.pgn,trabajo.color,resultado,trabajo.sesion_id);
   if(anterior){const ahora=new Date().toISOString();sesion=combinarSesionCuenta({...anterior,actualizada:ahora},{...sesion,actualizada:ahora});}
   const r=await guardar(false,sesion,doc.revision);if(!r.conflicto)return 'terminado';
  }
  await guardar(true);return 'pendiente';
 }catch(e){
  if(e instanceof Cancelado)return 'cancelado';
  if(e instanceof Pausa){try{await guardar(true);return 'pendiente';}catch(error){if(error instanceof Cancelado)return 'cancelado';throw error;}}
  throw e;
 }finally{recurso.motor?.destruir();}
}
