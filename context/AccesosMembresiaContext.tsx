"use client";
import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {useAuth} from './AuthContext';
import {supabase} from '@/lib/supabase';
export type AccesoRecurso={permitido:boolean;abierto:boolean;hasta:string|null};
export type AccesosCuenta={hoy:string;entrenamiento:AccesoRecurso;docentes:AccesoRecurso};
type Contexto={datos:AccesosCuenta|null;cargando:boolean;error:string;actualizar:()=>Promise<void>};
const Accesos=createContext<Contexto|null>(null);
export function AccesosMembresiaProvider({children}:{children:ReactNode}){
 const {session,cargando}=useAuth(),cuenta=session?.user.id??'invitado';
 const [estado,setEstado]=useState<{cuenta:string;datos:AccesosCuenta|null;error:string}|null>(null);
 const secuencia=useRef(0);
 const invalidar=useCallback(()=>{++secuencia.current;},[]);
 const actualizar=useCallback(async()=>{
  const n=++secuencia.current;
  try{
   const {data,error}=await supabase.auth.getSession();if(error||(data.session?.user.id??'invitado')!==cuenta)return;
   const token=data.session?.access_token??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
   const r=await supabase.rpc('mi_acceso_membresia').setHeader('Authorization',`Bearer ${token}`);
   if(r.error)throw r.error;if(!r.data?.entrenamiento||!r.data?.docentes)throw new Error('No se pudieron comprobar los accesos.');
   if(secuencia.current===n)setEstado({cuenta,datos:r.data,error:''});
  }catch(e){if(secuencia.current===n)setEstado({cuenta,datos:null,error:(e as Error).message??'No se pudieron comprobar los accesos.'});}
 },[cuenta]);
 useEffect(()=>{
  if(cargando)return;let vivo=true;void Promise.resolve().then(()=>{if(vivo)void actualizar();});
  const refrescar=()=>{if(document.visibilityState==='visible')void actualizar();};
  const reloj=setInterval(refrescar,60000);window.addEventListener('focus',refrescar);document.addEventListener('visibilitychange',refrescar);window.addEventListener('membresia-actualizada',refrescar);
  return()=>{vivo=false;invalidar();clearInterval(reloj);window.removeEventListener('focus',refrescar);document.removeEventListener('visibilitychange',refrescar);window.removeEventListener('membresia-actualizada',refrescar);};
 },[actualizar,cargando,invalidar]);
 const vigente=estado?.cuenta===cuenta?estado:null;
 return <Accesos.Provider value={{datos:vigente?.datos??null,cargando:cargando||!vigente,error:vigente?.error??'',actualizar}}>{children}</Accesos.Provider>;
}
export function useAccesosMembresia(){const c=useContext(Accesos);if(!c)throw new Error('Falta el proveedor de accesos.');return c;}
