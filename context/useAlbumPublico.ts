'use client';
import {useCallback,useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import type {AlbumPublico,DirectorioAlbumes} from '@/lib/albumesPublicos';

export function useAlbumPublico<T extends AlbumPublico|DirectorioAlbumes>(jugadorId:string|null){
 const [revision,setRevision]=useState(0);
 const [estado,setEstado]=useState<{id:string|null;datos:T|null;cargando:boolean;error:string}>({id:null,datos:null,cargando:true,error:''});
 const refrescar=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{
  const control=new AbortController();
  void (async()=>{
   await Promise.resolve();if(control.signal.aborted)return;
   setEstado({id:jugadorId,datos:null,cargando:true,error:''});
   try{
    const r=await supabase.rpc('albumes_publicos_club',{p_jugador:jugadorId}).abortSignal(control.signal);
    if(control.signal.aborted)return;if(r.error)throw r.error;
    setEstado({id:jugadorId,datos:r.data as T|null,cargando:false,error:''});
   }catch{if(!control.signal.aborted)setEstado({id:jugadorId,datos:null,cargando:false,error:'No pudimos abrir los álbumes del club. Volvé a intentar.'});}
  })();
  return()=>control.abort();
 },[jugadorId,revision]);
 useEffect(()=>{const volver=()=>{if(document.visibilityState==='visible')refrescar();};document.addEventListener('visibilitychange',volver);return()=>document.removeEventListener('visibilitychange',volver);},[refrescar]);
 const vigente=estado.id===jugadorId;
 return {datos:vigente?estado.datos:null,cargando:!vigente||estado.cargando,error:vigente?estado.error:'',refrescar};
}
