import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {join} from 'node:path';
import {MotorEntrenamiento} from '../motorEntrenamiento';

/** Runs the same GPL Stockfish build locally on the server, without external APIs. */
export function motorEntrenamientoServidor(){
 const proceso=spawn(process.execPath,[join(process.cwd(),'public/stockfish/stockfish-18-lite-single.js')],{stdio:['pipe','pipe','pipe'],windowsHide:true});
 const escuchas=new Map<string,Set<(e:MessageEvent)=>void>>();let cerrado=false;
 const emitir=(tipo:string,data:unknown)=>{for(const fn of escuchas.get(tipo)??[])fn({data} as MessageEvent);};
 const lineas=createInterface({input:proceso.stdout});lineas.on('line',linea=>emitir('message',linea));
 proceso.stderr.resume();proceso.on('error',()=>emitir('error',null));proceso.on('exit',()=>{if(!cerrado)emitir('error',null);});proceso.stdin.on('error',()=>{if(!cerrado)emitir('error',null);});
 const adaptador={
  addEventListener:(tipo:string,fn:(e:MessageEvent)=>void)=>{if(!escuchas.has(tipo))escuchas.set(tipo,new Set());escuchas.get(tipo)!.add(fn);},
  removeEventListener:(tipo:string,fn:(e:MessageEvent)=>void)=>escuchas.get(tipo)?.delete(fn),
  postMessage:(orden:string)=>{if(!cerrado)proceso.stdin.write(orden+'\n');},
  terminate:()=>{cerrado=true;lineas.close();proceso.stdin.destroy();proceso.kill();escuchas.clear();},
 };
 return new MotorEntrenamiento(()=>{},()=>adaptador as unknown as Worker,15000,10000);
}
