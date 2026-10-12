"use client";
import {useEffect,useMemo,useRef,useState,useSyncExternalStore} from "react";
import {supabase} from "@/lib/supabase";
import {rpcDeCuenta} from "@/lib/rpcCuenta";
import {claveProgresoAle,eloDeAle,eventosAle,leerProgresoAle,mezclarProgresoAle,validarProgresoAleServidor} from "@/lib/progresoAle";
import {claveArchivoBots,leerPartidasBots,registroDePartidaBot,unirPartidasBots,type PartidaBotRegistrada} from "@/lib/partidasBots";
import type {PartidaPractica} from "@/lib/partidaPractica";
const escuchar=(cb:()=>void)=>{for(const evento of ["storage","ale-guardado","partidas-bots-guardadas"])window.addEventListener(evento,cb);return()=>{for(const evento of ["storage","ale-guardado","partidas-bots-guardadas"])window.removeEventListener(evento,cb);};};
const leer=(clave:string)=>{try{return localStorage.getItem(clave);}catch{return null;}};
export function useCuentaBots(cuenta:string){
  const texto=useSyncExternalStore(escuchar,()=>leer(claveProgresoAle(cuenta)),()=>null);
  const archivoTexto=useSyncExternalStore(escuchar,()=>leer(claveArchivoBots(cuenta)),()=>null);
  const invitadoTexto=useSyncExternalStore(escuchar,()=>cuenta==="invitado"?null:leer(claveArchivoBots("invitado")),()=>null);
  const archivoInvitado=useMemo(()=>leerPartidasBots(invitadoTexto),[invitadoTexto]);
  const [remoto,setRemoto]=useState(()=>leerProgresoAle(null));
  const [archivoRemoto,setArchivoRemoto]=useState<PartidaBotRegistrada[]>([]);
  const [estado,setEstado]=useState<"invitado"|"cargando"|"sincronizado"|"pendiente">(cuenta==="invitado"?"invitado":"cargando");
  const [error,setError]=useState("");
  const [hayMas,setHayMas]=useState(false);
  const offset=useRef(0);
  const memoria=useRef<PartidaBotRegistrada[]>([]);
  const sincronizador=useRef<(()=>Promise<void>)|null>(null);
  const progreso=mezclarProgresoAle(remoto,leerProgresoAle(texto));
  const archivoLocal=useMemo(()=>leerPartidasBots(archivoTexto),[archivoTexto]);
  const partidas=unirPartidasBots(archivoRemoto,archivoLocal);
  useEffect(()=>{
    if(cuenta==="invitado")return;
    let vigente=true,enCurso=false,repetir=false;
    let controlador:AbortController|null=null;
    async function sincronizar(){
      if(!vigente)return;
      if(enCurso){repetir=true;return;}
      enCurso=true;
      do{
        repetir=false;controlador=new AbortController();
        const signal=AbortSignal.any([controlador.signal,AbortSignal.timeout(15000)]);
        try{
          const {data:datosIniciales,error:ei}=await rpcDeCuenta(supabase,cuenta,"sincronizar_progreso_ale",{p_partidas:eventosAle(leerProgresoAle(leer(claveProgresoAle(cuenta))))},signal);
          if(ei)throw ei;
          let nube=validarProgresoAleServidor(datosIniciales);
          const locales=unirPartidasBots(leerPartidasBots(leer(claveArchivoBots(cuenta))),memoria.current);
          for(const partida of locales.filter(p=>!p.sincronizada)){
            const {data:guardada,error:e}=await rpcDeCuenta(supabase,cuenta,"registrar_partida_bot",{p_partida:partida},signal);
            if(e)throw e;if(!vigente)return;
            if(guardada?.guardada!==true)throw new Error("No se pudo confirmar el guardado.");
            nube=validarProgresoAleServidor(guardada.progreso);
            // Marcar sólo la versión enviada: una partida editada durante el envío sigue pendiente.
            memoria.current=memoria.current.map(p=>p.id===partida.id&&p.fecha===partida.fecha?{...p,sincronizada:true}:p);
            const actual=leerPartidasBots(leer(claveArchivoBots(cuenta))).map(p=>p.id===partida.id&&p.fecha===partida.fecha?{...p,sincronizada:true}:p);
            try{localStorage.setItem(claveArchivoBots(cuenta),JSON.stringify(actual));}catch{/* La copia en la cuenta ya está guardada. */}
          }
          const {data:historial,error:eh}=await rpcDeCuenta(supabase,cuenta,"obtener_partidas_bots",{p_offset:0},signal);
          if(eh)throw eh;if(!vigente)return;
          if(!Array.isArray(historial))throw new Error("No se pudo comprobar tu historial.");
          const guardadas=leerPartidasBots(historial).map(p=>({...p,sincronizada:true}));
          setRemoto(nube);setArchivoRemoto(previas=>unirPartidasBots(previas,guardadas));
          if(offset.current===0){offset.current=guardadas.length;setHayMas(historial.length===50);}
          const union=mezclarProgresoAle(nube,leerProgresoAle(leer(claveProgresoAle(cuenta))));
          const nuevoTexto=JSON.stringify(union);
          try{if(leer(claveProgresoAle(cuenta))!==nuevoTexto)localStorage.setItem(claveProgresoAle(cuenta),nuevoTexto);
            const registros=unirPartidasBots(guardadas,leerPartidasBots(leer(claveArchivoBots(cuenta))),memoria.current),nuevoArchivo=JSON.stringify(registros);
            if(leer(claveArchivoBots(cuenta))!==nuevoArchivo)localStorage.setItem(claveArchivoBots(cuenta),nuevoArchivo);
          }catch{/* El historial remoto se muestra incluso si el navegador no permite caché. */}
          setEstado("sincronizado");setError("");
          window.dispatchEvent(new Event("ale-guardado"));
          window.dispatchEvent(new Event("partidas-bots-guardadas"));
        }catch(causa){
          if(!vigente)return;
          setEstado("pendiente");
          const codigo=(causa as {code?:string})?.code;
          setError(codigo==="PGRST202"||codigo==="42883"?"El guardado en la cuenta todavía necesita activarse. Tu avance local se conserva.":"No pudimos sincronizar con tu cuenta. Conservamos lo pendiente y lo reintentaremos al volver a conectar.");
          repetir=false;
        }
      }while(repetir&&vigente);
      enCurso=false;
    }
    sincronizador.current=sincronizar;
    const visible=()=>{if(document.visibilityState==="visible")void sincronizar();};
    const online=()=>void sincronizar();
    void sincronizar();
    window.addEventListener("online",online);document.addEventListener("visibilitychange",visible);
    const intervalo=setInterval(visible,60000);
    return()=>{vigente=false;controlador?.abort();sincronizador.current=null;clearInterval(intervalo);window.removeEventListener("online",online);document.removeEventListener("visibilitychange",visible);};
  },[cuenta]);
  useEffect(()=>{void sincronizador.current?.();},[texto,archivoTexto]);
  async function archivar(partida:PartidaPractica){
    const locales=unirPartidasBots(leerPartidasBots(leer(claveArchivoBots(cuenta))),memoria.current);
    const registro=registroDePartidaBot(partida,locales.find(p=>p.id===partida.id));if(!registro)return;
    if(cuenta!=="invitado")setEstado("pendiente");
    memoria.current=unirPartidasBots([registro],memoria.current);
    try{localStorage.setItem(claveArchivoBots(cuenta),JSON.stringify(unirPartidasBots([registro],locales)));}catch{setError("No se pudo guardar la copia en este navegador. Intentaremos guardarla en tu cuenta.");}
    setArchivoRemoto(lista=>unirPartidasBots([registro],lista));
    window.dispatchEvent(new Event("partidas-bots-guardadas"));
    await sincronizador.current?.();
  }
  async function traerInvitado(){
    if(cuenta==="invitado")return;
    const union=mezclarProgresoAle(progreso,leerProgresoAle(leer(claveProgresoAle("invitado"))));
    const registros=leerPartidasBots(leer(claveArchivoBots("invitado"))).map(p=>({...p,sincronizada:false}));
    try{localStorage.setItem(claveProgresoAle(cuenta),JSON.stringify(union));localStorage.setItem(claveArchivoBots(cuenta),JSON.stringify(unirPartidasBots(registros,partidas)));window.dispatchEvent(new Event("ale-guardado"));window.dispatchEvent(new Event("partidas-bots-guardadas"));await sincronizador.current?.();}
    catch{setError("No se pudo traer el recorrido de invitado. Probá de nuevo.");}
  }
  async function nivelParaEmpezar(){
    if(cuenta==="invitado")return eloDeAle(progreso);
    try{
      const {data,error:e}=await rpcDeCuenta(supabase,cuenta,"sincronizar_progreso_ale",{p_partidas:eventosAle(leerProgresoAle(leer(claveProgresoAle(cuenta))))},AbortSignal.timeout(12000));
      if(e)throw e;
      const nube=validarProgresoAleServidor(data);setRemoto(nube);
      const union=mezclarProgresoAle(nube,leerProgresoAle(leer(claveProgresoAle(cuenta))));
      try{localStorage.setItem(claveProgresoAle(cuenta),JSON.stringify(union));window.dispatchEvent(new Event("ale-guardado"));}catch{/* Sigue disponible el nivel recibido de la cuenta. */}
      return eloDeAle(union);
    }catch{setEstado("pendiente");setError("No pudimos consultar la cuenta. Esta partida usará el último nivel disponible; tu avance se sincronizará al reconectar.");return eloDeAle(progreso);}
  }
  async function cargarMas(){
    if(cuenta==="invitado"||!hayMas)return;
    try{
      const {data,error:e}=await rpcDeCuenta(supabase,cuenta,"obtener_partidas_bots",{p_offset:offset.current},AbortSignal.timeout(15000));
      if(e)throw e;if(!Array.isArray(data))throw new Error("Historial inválido");
      const nuevas=leerPartidasBots(data).map(p=>({...p,sincronizada:true}));
      offset.current+=data.length;setHayMas(data.length===50);setArchivoRemoto(previas=>unirPartidasBots(previas,nuevas));
    }catch{setError("No se pudieron cargar las partidas anteriores. Probá de nuevo.");}
  }
  const tieneInvitado=cuenta!=="invitado"&&(leerProgresoAle(leer(claveProgresoAle("invitado"))).partidas.some(id=>!progreso.partidas.includes(id))||archivoInvitado.some(p=>!partidas.some(q=>q.id===p.id)));
  return {progreso,partidas,estado,error,archivar,traerInvitado,tieneInvitado,nivelParaEmpezar,hayMas,cargarMas,sincronizar:()=>sincronizador.current?.()};
}
