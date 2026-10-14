"use client";
import {useEffect,useMemo,useSyncExternalStore} from "react";
import {supabase} from "@/lib/supabase";
import {EntrenamientoCuenta,type DocumentoEntrenamiento,type TransporteEntrenamiento,type RespuestaGuardado,type VistaEntrenamientoCuenta} from "@/lib/entrenamientoCuenta";
import {progresoGuiadoInicial} from "@/lib/entrenamientoGuiado";

const servidor:VistaEntrenamientoCuenta={sesiones:[],guiado:progresoGuiadoInicial(),estado:"local",errorLocal:false,pendientes:0};
const almacen={getItem:(k:string)=>typeof window!=="undefined"?localStorage.getItem(k):null,setItem:(k:string,v:string)=>{if(typeof window!=="undefined")localStorage.setItem(k,v);}};
export function transporteEntrenamiento(cuenta:string):TransporteEntrenamiento{
  async function comprobar(){const {data,error}=await supabase.auth.getSession();if(error||data.session?.user.id!==cuenta)throw new Error("La cuenta cambió.");}
  return {
    async listar(conocidos){
      await comprobar();
      const cabeceras:{clave:string;revision:number}[]=[];
      for(let desde=0;;desde+=250){
        const {data,error}=await supabase.from("entrenamiento_documentos").select("clave,revision").eq("usuario_id",cuenta).order("clave").range(desde,desde+249);
        if(error)throw error;cabeceras.push(...data);if(data.length<250)break;
      }
      const cambios=cabeceras.filter(d=>conocidos.get(d.clave)?.revision!==d.revision).map(d=>d.clave),salida:DocumentoEntrenamiento[]=[];
      for(let desde=0;desde<cambios.length;desde+=20){
        await comprobar();
        const {data,error}=await supabase.from("entrenamiento_documentos").select("clave,revision,datos").eq("usuario_id",cuenta).in("clave",cambios.slice(desde,desde+20));
        if(error)throw error;salida.push(...data);
      }
      return salida;
    },
    async guardar(clave,datos,revision){
      await comprobar();
      const {data,error}=await supabase.rpc("guardar_entrenamiento_documento",{p_clave:clave,p_datos:datos,p_revision:revision,p_usuario:cuenta});
      if(error)throw error;
      if(!data||typeof data.conflicto!=="boolean"||!Number.isSafeInteger(data.revision)||data.revision<0)throw new Error("No se pudo comprobar el guardado.");
      return data as RespuestaGuardado;
    }
  };
}
export function useEntrenamientoCuenta(cuenta:string,conCuenta:boolean){
  const controlador=useMemo(()=>new EntrenamientoCuenta(cuenta,almacen,conCuenta?transporteEntrenamiento(cuenta):null),[cuenta,conCuenta]);
  const vista=useSyncExternalStore(controlador.suscribir,controlador.leer,()=>servidor);
  useEffect(()=>{
    controlador.reactivar();void controlador.sincronizar();
    const actualizar=()=>{if(document.visibilityState==="visible")void controlador.sincronizar();};
    const cambios=(e:StorageEvent)=>{if(e.key===controlador.claves.biblioteca||e.key===controlador.claves.guiado)controlador.recargarLocal();};
    const recuperar=()=>{controlador.recargarLocal();actualizar();};
    window.addEventListener("storage",cambios);window.addEventListener("online",actualizar);window.addEventListener("focus",actualizar);document.addEventListener("visibilitychange",actualizar);window.addEventListener("entrenamiento-guardado",recuperar);
    const intervalo=conCuenta?setInterval(actualizar,30000):null;
    return()=>{controlador.detener();if(intervalo)clearInterval(intervalo);window.removeEventListener("storage",cambios);window.removeEventListener("online",actualizar);window.removeEventListener("focus",actualizar);document.removeEventListener("visibilitychange",actualizar);window.removeEventListener("entrenamiento-guardado",recuperar);};
  },[controlador,conCuenta]);
  return {...vista,guardarSesion:controlador.guardarSesion,guardarGuiado:controlador.guardarGuiado,importar:controlador.importar,reintentar:controlador.sincronizar};
}
