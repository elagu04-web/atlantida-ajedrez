"use client";
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';

type SolicitudInstalacion=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
const InstalacionContext=createContext<{disponible:boolean;enApp:boolean;instalar:()=>Promise<'accepted'|'dismissed'|'manual'>}>({disponible:false,enApp:false,instalar:async()=> 'manual'});

export function InstalacionProvider({children}:{children:ReactNode}){
 const [solicitud,setSolicitud]=useState<SolicitudInstalacion|null>(null),[enApp,setEnApp]=useState(false);
 useEffect(()=>{
  const pantalla=window.matchMedia('(display-mode: standalone)');
  const actualizar=()=>setEnApp(pantalla.matches||(navigator as Navigator&{standalone?:boolean}).standalone===true);
  const disponible=(e:Event)=>{e.preventDefault();setSolicitud(e as SolicitudInstalacion);};
  const instalada=()=>{setSolicitud(null);actualizar();};
  actualizar();pantalla.addEventListener('change',actualizar);
  window.addEventListener('beforeinstallprompt',disponible);window.addEventListener('appinstalled',instalada);
  if('serviceWorker' in navigator&&window.isSecureContext){
   void navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{/* Installation instructions remain available when workers are unsupported. */});
  }
  return()=>{pantalla.removeEventListener('change',actualizar);window.removeEventListener('beforeinstallprompt',disponible);window.removeEventListener('appinstalled',instalada);};
 },[]);
 async function instalar(){
  if(!solicitud)return 'manual' as const;
  setSolicitud(null);
  try{await solicitud.prompt();return (await solicitud.userChoice).outcome;}catch{return 'manual' as const;}
 }
 return <InstalacionContext.Provider value={{disponible:!!solicitud,enApp,instalar}}>{children}</InstalacionContext.Provider>;
}
export function useInstalacion(){return useContext(InstalacionContext);}
