"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Chess, type Move } from "chess.js";
import { useAuth } from "@/context/AuthContext";
import { useTorneos } from "@/context/TorneosContext";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { supabase } from "@/lib/supabase";
import { conectarPegasus } from "@/lib/pegasus";
import { RegistroPegasus, recuperarPartida, hacerJugadaManual, type LecturaPegasus } from "@/lib/registroPegasus";
import { ColaTransmision } from "@/lib/colaTransmision";
import { fechaMontevideo } from "@/lib/desafios";
import { TableroMini } from "@/components/TableroMini";
import { EditorPosicion } from "@/components/EditorPosicion";
import { CamaraTablero, type CamaraTableroHandle } from "@/components/CamaraTablero";
import { AuthWidget } from "@/components/AuthWidget";
import { EncabezadoPagina } from "@/components/EncabezadoPagina";
import { GuiaPegasus } from "@/components/GuiaPegasus";
import type { ResultadoPartida } from "@/lib/tournaments";

type Borrador={pgn:string;fen:string;jugadas:string[];blancas:string;negras:string;resultado:ResultadoPartida|null;fecha:string};
type Publicacion={activa:boolean;fen:string;jugadas:string[];blancas:string|null;negras:string|null;blancas_foto:string|null;negras_foto:string|null;blancas_elo:number|null;negras_elo:number|null;torneo_id:string|null;ronda_numero:number|null;emparejamiento_numero:number|null;resultado:ResultadoPartida|null;pgn:string;actualizado_en:string};
const CORONACIONES:Record<string,string>={q:"Dama",r:"Torre",b:"Alfil",n:"Caballo"};

export default function TransmitirPage(){
  const {esAdmin,cargando,session}=useAuth();
  return <><EncabezadoPagina titulo="Transmitir con Pegasus" subtitulo="Registrá la partida completa y compartí cada jugada con el club."/>
    {cargando?<p className="mt-6 text-zinc-400">Comprobando tu sesión…</p>:esAdmin?<Suspense fallback={<p>Cargando partida…</p>}><MesaTransmitir key={session!.user.id}/></Suspense>:<section className="panel my-6 p-5"><p className="mb-3 text-zinc-400">El registro y la transmisión están disponibles para el administrador del club.</p><AuthWidget/></section>}
    <GuiaPegasus/>
  </>;
}
function MesaTransmitir(){const parametros=useSearchParams();return <TransmitirContenido key={`${parametros.get("torneo")??"libre"}:${parametros.get("ronda")??0}:${parametros.get("emp")??0}`}/>;}

function TransmitirContenido(){
  const {session}=useAuth(),parametros=useSearchParams();
  const {torneos,registrarResultado}=useTorneos();const jugadores=useJugadoresEnVivo();
  const torneoId=parametros.get("torneo"),ronda=Number(parametros.get("ronda"))||null,emp=Number(parametros.get("emp"))||null;
  const clave=`atlantida-pegasus-v2:${session!.user.id}:${torneoId??"libre"}:${ronda??0}:${emp??0}`;
  const partida=useRef(new Chess()),registro=useRef(new RegistroPegasus());
  const bluetooth=useRef<Awaited<ReturnType<typeof conectarPegasus>>|null>(null),cola=useRef<ColaTransmision<Publicacion>|null>(null);
  const id=useRef<string|null>(null),version=useRef<string|null>(null),activa=useRef(false),final=useRef<ResultadoPartida|null>(null);
  const nombres=useRef({blancas:parametros.get("blancas")??"",negras:parametros.get("negras")??""});
  const [blancas,setBlancas]=useState(nombres.current.blancas),[negras,setNegras]=useState(nombres.current.negras);
  const [personalizadas,setPersonalizadas]=useState({blancas:false,negras:false});
  const [vista,setVista]=useState({fen:partida.current.fen(),jugadas:[] as string[],pgn:partida.current.pgn()});
  const [conexion,setConexion]=useState<"sin-conectar"|"conectando"|"conectado">("sin-conectar");
  const [bateria,setBateria]=useState<number|null>(null),[lectura,setLectura]=useState<LecturaPegasus|null>(null);
  const [estadoGuardado,setEstadoGuardado]=useState("Preparando canal…"),[lista,setLista]=useState(false),[cargaError,setCargaError]=useState("");
  const [transmitiendo,setTransmitiendo]=useState(false),[resultado,setResultado]=useState<ResultadoPartida|null>(null);
  const [editando,setEditando]=useState(false),[manual,setManual]=useState(""),[log,setLog]=useState<string[]>([]);
  const [copias,setCopias]=useState<Borrador[]>([]),[finalizando,setFinalizando]=useState(false);
  const timer=useRef<ReturnType<typeof setTimeout>|null>(null),cierre=useRef(false),ultimoAviso=useRef(""),errorGuardado=useRef(false),pausado=useRef(false);
  const camara=useRef<CamaraTableroHandle>(null);
  const diagnostico=useRef<{fecha:string;evento:string;datos:unknown}[]>([]);
  const jugadorBlancas=personalizadas.blancas?null:jugadores.find(j=>j.id===parametros.get("blancasId"));
  const jugadorNegras=personalizadas.negras?null:jugadores.find(j=>j.id===parametros.get("negrasId"));
  const perfiles=useRef({blancasFoto:null as string|null,negrasFoto:null as string|null,blancasElo:null as number|null,negrasElo:null as number|null});
  useEffect(()=>{perfiles.current={blancasFoto:jugadorBlancas?.fotoUrl??null,negrasFoto:jugadorNegras?.fotoUrl??null,blancasElo:jugadorBlancas?.eloAtlantida??null,negrasElo:jugadorNegras?.eloAtlantida??null};},[jugadorBlancas,jugadorNegras]);
  function anotar(texto:string){if(!cierre.current)setLog(l=>[...l.slice(-99),`${new Date().toLocaleTimeString("es-UY")} · ${texto}`]);}
  function trazar(evento:string,datos:unknown){diagnostico.current.push({fecha:new Date().toISOString(),evento,datos});if(diagnostico.current.length>2000)diagnostico.current.shift();}
  function borrador():Borrador{return {pgn:partida.current.pgn(),fen:partida.current.fen(),jugadas:partida.current.history(),...nombres.current,resultado:final.current,fecha:new Date().toISOString()};}
  function refrescar(){
    const datos=borrador();setVista({fen:datos.fen,jugadas:datos.jugadas,pgn:datos.pgn});
    try{localStorage.setItem(clave,JSON.stringify(datos));}catch{anotar("No se pudo guardar la copia local. Descargá el PGN para conservar la partida.");}
  }
  function archivar(){if(!partida.current.history().length)return true;try{const anteriores: Borrador[]=JSON.parse(localStorage.getItem(`${clave}:copias`)??"[]");const nuevas=[borrador(),...anteriores].slice(0,10);localStorage.setItem(`${clave}:copias`,JSON.stringify(nuevas));setCopias(nuevas);return true;}catch{anotar("No se pudo archivar la copia local. Descargá el PGN antes de continuar.");return false;}}
  useEffect(()=>{
    let cancelado=false;cierre.current=false;
    async function cargar(){
      let local:Borrador|null=null;try{local=JSON.parse(localStorage.getItem(clave)??"null");const guardadas=JSON.parse(localStorage.getItem(`${clave}:copias`)??"[]");if(Array.isArray(guardadas))setCopias(guardadas);}catch{}
      const {data,error}=await supabase.from("transmision").select("*").limit(1).abortSignal(AbortSignal.timeout(12000)).maybeSingle();if(cancelado)return;
      if(error)setCargaError("No se pudo cargar el canal. La copia local sigue disponible; recargá para reintentar.");
      if(data){
        id.current=data.id;version.current=data.actualizado_en??null;
        cola.current=new ColaTransmision(async datos=>{
          let consulta=supabase.from("transmision").update(datos).eq("id",id.current!);
          consulta=version.current===null?consulta.is("actualizado_en",null):consulta.eq("actualizado_en",version.current);
          const {data:confirmada,error:e}=await consulta.select("id,actualizado_en").maybeSingle();
          if(e)throw e;if(!confirmada)throw new Error("Otra pantalla cambió la transmisión. Tu copia está conservada; recargá para revisar antes de reemplazarla.");version.current=confirmada.actualizado_en;
        },(estado,err)=>{if(cancelado)return;setEstadoGuardado(estado==="guardado"?"Guardado en el servidor":estado==="guardando"?"Guardando…":"Pendiente de conexión · copia local conservada");if(estado==="pendiente"&&!errorGuardado.current){errorGuardado.current=true;anotar(err instanceof Error?err.message:"No se pudo publicar. Se reintentará sin borrar la partida.");}if(estado==="guardado"){errorGuardado.current=false;setTransmitiendo(activa.current);}});
      }else if(!error)setCargaError("No existe un canal de transmisión en Supabase. Podés registrar y descargar la partida; el administrador debe crear el canal para publicarla.");
      const coincide=!torneoId||(data?.torneo_id===torneoId&&data.ronda_numero===ronda&&data.emparejamiento_numero===emp);
      const fuente=local&&(!data||!coincide||local.fecha>(data.actualizado_en??""))?local:coincide&&(data?.activa||data?.resultado||data?.jugadas?.length)?{...data,fecha:data.actualizado_en}:local;
      if(fuente){try{partida.current=recuperarPartida(fuente);final.current=fuente.resultado??null;setResultado(final.current);if(!parametros.get("blancas")){nombres.current.blancas=fuente.blancas??"";setBlancas(nombres.current.blancas);}if(!parametros.get("negras")){nombres.current.negras=fuente.negras??"";setNegras(nombres.current.negras);}setVista({fen:partida.current.fen(),jugadas:partida.current.history(),pgn:partida.current.pgn()});anotar(`Partida recuperada: ${partida.current.history().length} medias jugadas. Conectá y verificá las piezas para continuar.`);}catch{setCargaError("La partida guardada no pudo reconstruirse. Se conserva el borrador; revisá su PGN antes de empezar otra partida.");}}
      activa.current=Boolean(coincide&&data?.activa);setTransmitiendo(activa.current);setLista(true);if(data)setEstadoGuardado("Canal preparado");
    }
    void cargar();const reintento=setInterval(()=>void cola.current?.reintentar(),5000);
    const online=()=>void cola.current?.reintentar();window.addEventListener("online",online);
    return()=>{cancelado=true;cierre.current=true;clearInterval(reintento);window.removeEventListener("online",online);if(timer.current)clearTimeout(timer.current);cola.current?.cerrar();bluetooth.current?.desconectar();};
    // La identidad de esta mesa es fija hasta navegar a otra partida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[clave]);
  function publicar(valor=activa.current){
    refrescar();if(!cola.current)return Promise.resolve(false);
    const datos:Publicacion={activa:valor,fen:partida.current.fen(),jugadas:partida.current.history(),blancas:nombres.current.blancas.trim()||null,negras:nombres.current.negras.trim()||null,blancas_foto:perfiles.current.blancasFoto,negras_foto:perfiles.current.negrasFoto,blancas_elo:perfiles.current.blancasElo,negras_elo:perfiles.current.negrasElo,torneo_id:torneoId,ronda_numero:ronda,emparejamiento_numero:emp,resultado:final.current,pgn:partida.current.pgn(),actualizado_en:new Date().toISOString()};
    return cola.current.agregar(datos);
  }
  function aceptar(m:Move,yaRegistrada=false){
    if(!yaRegistrada)registro.current.confirmarJugada(partida.current,m.san);setLectura(registro.current.evaluar(partida.current));ultimoAviso.current="";anotar(`Registrada: ${m.san}`);refrescar();if(activa.current)void publicar();
    if(partida.current.isCheckmate())anotar("Jaque mate. Confirmá el resultado para guardarlo también en el torneo.");
  }
  function resolver(){
    if(timer.current)clearTimeout(timer.current);timer.current=null;if(final.current||pausado.current)return;
    const estado=registro.current.evaluar(partida.current);setLectura(estado);
    if(estado.tipo==="jugada"){aceptar(estado.candidatos[0]);return;}
    if(estado.tipo==="moviendo"){timer.current=setTimeout(resolver,250);return;}
    if(estado.tipo==="desajuste"||estado.tipo==="acomodar"){
      const aviso=`${estado.tipo}:${estado.diferencias.join(",")}`;if(aviso!==ultimoAviso.current){ultimoAviso.current=aviso;anotar(`Acomodá las casillas ${estado.diferencias.join(", ")}. La partida registrada se conserva.`);if(estado.tipo==="desajuste")camara.current?.capturarDesajuste();}
    }
  }
  function programar(){if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(resolver,950);}
  function campo(casilla:string,ocupada:boolean){trazar("casilla",{casilla,ocupada});if(final.current||pausado.current)return;const anterior=registro.current.campoConPartida(partida.current,casilla,ocupada);if(anterior)aceptar(anterior,true);programar();}
  async function conectar(){
    setConexion("conectando");registro.current.iniciarConexion();setLectura(null);
    trazar("conectar",{fen:partida.current.fen()});
    try{const enlace=await conectarPegasus({onLog:anotar,onBateria:setBateria,onDesconectado:()=>{trazar("desconectar",null);bluetooth.current=null;if(!cierre.current){setConexion("sin-conectar");setBateria(null);setLectura(null);}if(timer.current)clearTimeout(timer.current);registro.current.iniciarConexion();},onPiezaLevantada:c=>campo(c,false),onPiezaApoyada:c=>campo(c,true),onVolcadoTablero:foto=>{trazar("foto",foto);registro.current.foto(foto);resolver();}});if(cierre.current){enlace.desconectar();return;}bluetooth.current=enlace;setConexion("conectado");}catch(e){setConexion("sin-conectar");anotar(e instanceof Error?e.message:"No se pudo conectar.");}
  }
  function deshacer(){const m=partida.current.undo();if(!m)return;final.current=null;partida.current.removeHeader("Result");setResultado(null);registro.current.exigirAcomodo();refrescar();if(activa.current)void publicar();resolver();anotar(`Se deshizo ${m.san}. Acomodá las piezas antes de seguir.`);}
  function nueva(){if(!archivar())return;partida.current=new Chess();final.current=null;setResultado(null);registro.current.exigirAcomodo();pausado.current=false;setEditando(false);refrescar();resolver();if(activa.current)void publicar();anotar("Nueva partida. La anterior quedó en Copias recientes de este navegador.");}
  async function transmitir(valor:boolean){activa.current=valor;const ok=await publicar(valor);if(ok)anotar(valor?"Transmisión confirmada: visible en En directo.":"Transmisión apagada. Se conservaron las jugadas, el resultado y el PGN.");else anotar("Cambio pendiente de guardar. El registro local sigue funcionando.");}
  async function terminar(res:ResultadoPartida){
    if(finalizando)return;setFinalizando(true);
    try{final.current=res;partida.current.header("White",nombres.current.blancas.trim()||"Blancas","Black",nombres.current.negras.trim()||"Negras","Result",res,"Date",fechaMontevideo().replaceAll("-","."),"Event",torneos.find(t=>t.id===torneoId)?.nombre??"Atlántida Ajedrez",...(ronda?["Round",String(ronda)]:[]));setResultado(res);refrescar();archivar();
      if(cola.current){const ok=await publicar();anotar(ok?"Partida y PGN guardados en el servidor.":"PGN conservado localmente; la publicación se reintentará.");}
      if(torneoId&&ronda&&emp){const ok=await registrarResultado(torneoId,ronda,emp,res);anotar(ok?"Resultado confirmado también en el torneo.":"El resultado no se guardó en el torneo. Reintentá confirmándolo de nuevo.");}
    }finally{setFinalizando(false);}
  }
  function descargar(texto=partida.current.pgn()){
    const url=URL.createObjectURL(new Blob([texto],{type:"application/x-chess-pgn;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download=`atlantida-${fechaMontevideo()}.pgn`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function descargarDiagnostico(){
    const texto=JSON.stringify({version:2,fen:partida.current.fen(),pgn:partida.current.pgn(),bateria,lectura,registro:diagnostico.current},null,2);
    const url=URL.createObjectURL(new Blob([texto],{type:"application/json;charset=utf-8"})),a=document.createElement("a");a.href=url;a.download=`pegasus-diagnostico-${fechaMontevideo()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function corregir(){try{const m=hacerJugadaManual(partida.current,manual);final.current=null;partida.current.removeHeader("Result");setResultado(null);registro.current.exigirAcomodo();setManual("");refrescar();if(activa.current)void publicar();resolver();anotar(`Jugada añadida sin borrar el historial: ${m.san}. Verificá las piezas.`);}catch{anotar("La jugada no es legal. Usá origen y destino: e2e4; para coronar, a7a8q/r/b/n.");}}
  return <div className="my-6 flex flex-col gap-5">
    <section className="panel flex flex-wrap items-center gap-4 p-5"><div className="min-w-48 flex-1"><p className="font-semibold">{conexion==="conectado"?"Pegasus conectado":conexion==="conectando"?"Conectando…":"Conectá el tablero para continuar"}</p><p role="status" className="mt-1 text-xs text-zinc-400">{estadoGuardado}{bateria!==null?` · Batería ${bateria}%`:""}</p></div><button className="button-primary" disabled={!lista||conexion!=="sin-conectar"} onClick={()=>void conectar()}>Conectar Pegasus</button>{conexion==="conectado"&&<><button className="button-secondary" onClick={()=>void bluetooth.current?.pedirEstado()}>Comprobar piezas</button><button className="button-secondary" onClick={()=>bluetooth.current?.desconectar()}>Desconectar</button></>}</section>
    {cargaError&&<p role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">{cargaError}</p>}
    {torneoId&&<p className="text-sm text-blue-300">{torneos.find(t=>t.id===torneoId)?.nombre??"Torneo vinculado"} · ronda {ronda} · mesa {emp}</p>}
    <section className="panel flex flex-wrap items-end gap-3 p-5"><label className="flex-1 text-xs text-zinc-400">Blancas<input value={blancas} onChange={e=>{setBlancas(e.target.value);nombres.current.blancas=e.target.value;setPersonalizadas(v=>({...v,blancas:true}));perfiles.current.blancasFoto=null;perfiles.current.blancasElo=null;refrescar();}} className="mt-1 w-full min-w-40 rounded-lg border border-white/15 p-2.5"/></label><label className="flex-1 text-xs text-zinc-400">Negras<input value={negras} onChange={e=>{setNegras(e.target.value);nombres.current.negras=e.target.value;setPersonalizadas(v=>({...v,negras:true}));perfiles.current.negrasFoto=null;perfiles.current.negrasElo=null;refrescar();}} className="mt-1 w-full min-w-40 rounded-lg border border-white/15 p-2.5"/></label><button className="button-primary" disabled={!lista||!id.current||estadoGuardado==="Guardando…"} onClick={()=>void transmitir(!transmitiendo)}>{transmitiendo?"Apagar transmisión":"Publicar en directo"}</button><button className="button-secondary" onClick={()=>descargar()} disabled={!vista.jugadas.length}>Descargar PGN</button></section>
    <div className="grid gap-5 lg:grid-cols-2"><section className="panel p-5"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Posición registrada</h2><span className="text-xs text-zinc-400">{vista.jugadas.length} medias jugadas</span></div><TableroMini fen={vista.fen}/><p className="mt-4 text-sm text-zinc-400">{resultado?`Partida terminada: ${resultado}`:`Turno de ${partida.current.turn()==="w"?"blancas":"negras"}`}</p></section><div className="flex flex-col gap-5">
      <section className="panel p-5"><h2 className="font-semibold">Seguimiento del tablero</h2><p role="status" className="mt-3 text-sm text-zinc-300">{!lectura||lectura.tipo==="sin-foto"?"Esperando una foto completa de las 64 casillas.":lectura.tipo==="sin-cambio"?"Las piezas coinciden. Podés continuar.":lectura.tipo==="moviendo"?"Esperando que termines de mover las piezas…":lectura.tipo==="elegir"?(lectura.candidatos.length===1&&lectura.candidatos[0].piece==="r"&&!lectura.candidatos[0].captured?"Puede ser el inicio de un enroque: terminá de mover el rey o confirmá la jugada de torre.":"Confirmá la jugada: el sensor no distingue estas continuaciones."):`Acomodá estas casillas: ${lectura.diferencias.join(", ")}. El historial está conservado.`}</p>{lectura?.tipo==="elegir"&&<div className="mt-4 flex flex-wrap gap-2">{lectura.candidatos.map(m=><button key={m.lan} className="button-secondary" onClick={()=>aceptar(m)}>{m.san}{m.promotion?` · ${CORONACIONES[m.promotion]??m.promotion}`:""}</button>)}</div>}</section>
      <section className="panel p-5"><h2 className="font-semibold">Recuperar una jugada</h2><p className="mt-2 text-xs text-zinc-400">Si faltó una jugada, agregala por origen y destino. Conserva todas las anteriores.</p><form className="mt-3 flex gap-2" onSubmit={e=>{e.preventDefault();corregir();}}><input aria-label="Jugada de origen y destino" value={manual} onChange={e=>setManual(e.target.value)} placeholder="e2e4" maxLength={5} className="min-w-0 flex-1 rounded-lg border border-white/15 p-2.5 font-mono"/><button className="button-secondary" disabled={!lista||!manual}>Agregar</button></form><div className="mt-3 flex flex-wrap gap-2"><button className="button-secondary" disabled={!vista.jugadas.length} onClick={deshacer}>Deshacer última</button><button className="button-secondary" onClick={()=>{registro.current.exigirAcomodo();pausado.current=true;setEditando(true);}}>Editar posición</button><button className="button-secondary" onClick={nueva} disabled={!lista}>Nueva partida</button></div></section>
      <section className="panel p-5"><h2 className="font-semibold">Confirmar resultado</h2><p className="mt-2 text-xs text-zinc-400">Guardá el PGN final y, si esta mesa está vinculada, el resultado del torneo.</p><div className="mt-3 flex gap-2">{(["1-0","1/2-1/2","0-1"] as const).map(res=><button key={res} disabled={!lista||finalizando||lectura?.tipo==="elegir"||lectura?.tipo==="moviendo"} className="button-secondary" onClick={()=>void terminar(res)}>{res}</button>)}</div></section>
    </div></div>
    {editando&&<><p className="text-xs text-amber-200">La edición libre inicia un nuevo tramo del PGN. La partida anterior se conserva en Copias recientes. Para corregir una sola jugada, usá Agregar o Deshacer.</p><EditorPosicion chess={partida.current} casillasSospechosas={lectura?.diferencias} onCancelar={()=>{pausado.current=false;setEditando(false);resolver();}} onAplicar={fen=>{if(!archivar())return;partida.current=new Chess(fen);final.current=null;setResultado(null);registro.current.exigirAcomodo();pausado.current=false;setEditando(false);refrescar();if(activa.current)void publicar();anotar("Posición aplicada. Verificá las piezas antes de seguir.");}}/></>}
    <CamaraTablero ref={camara} onCambiaActiva={async valor=>{if(!id.current)return;const {error}=await supabase.from("transmision").update({camara_activa:valor}).eq("id",id.current);if(error)anotar("No se pudo publicar el estado de la cámara. El registro de jugadas sigue disponible.");}}/>
    <div className="grid gap-5 lg:grid-cols-2"><section className="panel p-5"><h2 className="font-semibold">Planilla completa</h2><ol className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-sm">{vista.jugadas.map((san,i)=><li key={i}>{i%2===0?`${Math.floor(i/2)+1}. `:"… "}{san}</li>)}</ol><details className="mt-4"><summary className="text-sm text-zinc-400">Ver PGN y copias recientes</summary><textarea aria-label="PGN de la partida" readOnly value={vista.pgn} className="mt-3 h-44 w-full rounded-lg border border-white/15 p-3 font-mono text-xs"/>{copias.map((c,i)=><button key={i} onClick={()=>descargar(c.pgn)} className="mt-2 block text-xs text-blue-300">Descargar copia {i+1} · {c.blancas||"Blancas"} / {c.negras||"Negras"} · {c.jugadas.length} medias jugadas</button>)}</details></section><section className="panel p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Registro de conexión</h2><button className="button-secondary" onClick={descargarDiagnostico}>Descargar diagnóstico</button></div><p className="mt-2 text-xs text-zinc-500">Guarda los últimos eventos y el PGN en tu computadora para revisar un fallo.</p><div className="mt-4 h-72 overflow-y-auto rounded-lg bg-black/20 p-3 font-mono text-xs leading-relaxed text-zinc-400">{log.map((l,i)=><p key={i}>{l}</p>)}</div></section></div>
  </div>;
}
