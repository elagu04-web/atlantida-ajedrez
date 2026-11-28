'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {coleccionarAperturas,type PartidaAperturas} from '@/lib/albumAperturas';
import {miticasDeRamas} from '@/lib/recompensasAperturas';
import {useAuth} from './AuthContext';

export function useAlbumAperturas(jugadorId:string|null){
 const {session}=useAuth(),cuenta=session?.user.id??null;
 const [revision,actualizar]=useState(0);
 const [estado,setEstado]=useState<{jugador:string|null;cuenta:string|null;partidas:PartidaAperturas[];cargando:boolean;error:string}>({jugador:null,cuenta:null,partidas:[],cargando:true,error:''});
 const refrescar=useCallback(()=>actualizar(v=>v+1),[]);
 useEffect(()=>{
  if(!jugadorId)return;
  const volver=()=>{if(document.visibilityState==='visible')refrescar();};
  document.addEventListener('visibilitychange',volver);
  return()=>document.removeEventListener('visibilitychange',volver);
 },[jugadorId,refrescar]);
 useEffect(()=>{
  if(!jugadorId)return;
  const control=new AbortController();
  void (async()=>{
   await Promise.resolve();
   if(control.signal.aborted)return;
   setEstado({jugador:jugadorId,cuenta,partidas:[],cargando:true,error:''});
   try {
    const partidas:PartidaAperturas[]=[];
    for(let desde=0;;){
     const r=await supabase.rpc('aperturas_partidas_jugador',{p_jugador:jugadorId,p_desde:desde,p_limite:100}).abortSignal(control.signal);
     if(control.signal.aborted)return;
     if(r.error)throw r.error;
     if(!r.data||!Array.isArray(r.data.partidas)||!Number.isInteger(r.data.total))throw Error('Respuesta incompleta');
     partidas.push(...r.data.partidas);desde+=r.data.partidas.length;
     if(desde>=r.data.total)break;
     if(!r.data.partidas.length)throw Error('Faltan partidas');
    }
    setEstado({jugador:jugadorId,cuenta,partidas,cargando:false,error:''});
   }catch{if(!control.signal.aborted)setEstado({jugador:jugadorId,cuenta,partidas:[],cargando:false,error:'No pudimos cargar tus aperturas. Tus partidas siguen guardadas; volvé a intentar.'});}
  })();
  return()=>control.abort();
 },[jugadorId,cuenta,revision]);
 const vigente=estado.jugador===jugadorId&&estado.cuenta===cuenta;
 const cartas=useMemo(()=>vigente?coleccionarAperturas(estado.partidas):[],[vigente,estado.partidas]);
 const miticas=useMemo(()=>miticasDeRamas(cartas),[cartas]);
 return {cartas,miticas,partidas:vigente?estado.partidas:[],cargando:!!jugadorId&&(!vigente||estado.cargando),error:vigente?estado.error:'',refrescar};
}
