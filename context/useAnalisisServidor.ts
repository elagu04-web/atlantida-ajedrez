"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {Chess} from 'chess.js';
import {supabase} from '@/lib/supabase';
import {rpcDeCuenta} from '@/lib/rpcCuenta';
import {validarPgnEntrenamiento} from '@/lib/entrenamientoPersonal';
export type TrabajoEnServidor={id:string;lote_id:string;titulo:string;color:'w'|'b';estado:'pendiente'|'procesando'|'terminado'|'cancelado'|'error';evaluadas:number;total:number;sesion_id:string;error:string|null;creada:string;actualizada:string};
export function useAnalisisServidor(cuenta:string,conCuenta:boolean,alListo:()=>Promise<void>){
 const [disponible,setDisponible]=useState(false),[trabajos,setTrabajos]=useState<TrabajoEnServidor[]>([]),[enviando,setEnviando]=useState(false),[error,setError]=useState('');
 const activo=useRef(true),ocupado=useRef(false),terminados=useRef(''),alSincronizar=useRef(alListo),solicitud=useRef<{firma:string;id:string}|null>(null);useEffect(()=>{alSincronizar.current=alListo;},[alListo]);
 const actualizar=useCallback(async()=>{
  try{
   const estado=await supabase.rpc('estado_entrenamiento_analisis');if(!activo.current)return;
   setDisponible(!estado.error&&estado.data===true);
   if(!conCuenta)return;
   const {data:sesion}=await supabase.auth.getSession();if(sesion.session?.user.id!==cuenta)return;
   const {data,error}=await supabase.from('entrenamiento_analisis').select('id,lote_id,titulo,color,estado,evaluadas,total,sesion_id,error,creada,actualizada').eq('usuario_id',cuenta).order('creada',{ascending:false}).limit(120);
   if(!activo.current)return;if(error)throw error;
   const lista=(data??[]) as TrabajoEnServidor[];setTrabajos(lista);setError(prev=>prev.startsWith('No pudimos actualizar la cola.')?'':prev);
   const firma=lista.filter(j=>j.estado==='terminado').map(j=>j.id+j.actualizada).sort().join(':');
   if(firma&&terminados.current!==firma){terminados.current=firma;await alSincronizar.current();}
  }catch{if(activo.current)setError('No pudimos actualizar la cola. Tus trabajos siguen en el servidor.');}
 },[cuenta,conCuenta]);
 useEffect(()=>{activo.current=true;const carga=setTimeout(()=>void actualizar(),0);const alVolver=()=>{if(document.visibilityState==='visible')void actualizar();};const timer=conCuenta?setInterval(alVolver,10000):null;window.addEventListener('focus',alVolver);window.addEventListener('online',alVolver);document.addEventListener('visibilitychange',alVolver);return()=>{activo.current=false;clearTimeout(carga);if(timer)clearInterval(timer);window.removeEventListener('focus',alVolver);window.removeEventListener('online',alVolver);document.removeEventListener('visibilitychange',alVolver);};},[actualizar,conCuenta]);
 async function encolar(partidas:{pgn:string;color:'w'|'b'}[]){
  if(ocupado.current)return false;ocupado.current=true;setEnviando(true);setError('');
  try{
   if(!conCuenta)throw new Error('Iniciá sesión para continuar con la página cerrada.');
   const entradas=partidas.map(p=>{const e=validarPgnEntrenamiento(p.pgn),c=new Chess();c.loadPgn(e.pgn);return {...e,color:p.color,total:c.history().length+1};});
   if(!entradas.length||entradas.length>30)throw new Error('Cargá hasta 30 partidas.');
   const firma=JSON.stringify(entradas);if(solicitud.current?.firma!==firma)solicitud.current={firma,id:crypto.randomUUID()};
   const {error}=await rpcDeCuenta(supabase,cuenta,'encolar_entrenamiento_analisis',{p_partidas:entradas,p_solicitud:solicitud.current.id},AbortSignal.timeout(30000));
   if(error)throw error;
   solicitud.current=null;await actualizar();return true;
  }catch(e){if(activo.current)setError((e as Error).message||'No pudimos confirmar la recepción del PGN. Actualizá la cola antes de reenviarlo.');return false;}
  finally{ocupado.current=false;if(activo.current)setEnviando(false);}
 }
 async function cambiar(lote:string,reintentar:boolean){setError('');try{const {error}=await rpcDeCuenta(supabase,cuenta,'cambiar_lote_entrenamiento_analisis',{p_lote:lote,p_reintentar:reintentar},AbortSignal.timeout(20000));if(error)throw error;await actualizar();}catch{setError('No pudimos cambiar ese lote. Actualizá la cola para comprobar su estado.');}}
 return {disponible,trabajos,enviando,error,encolar,actualizar,cambiar};
}
