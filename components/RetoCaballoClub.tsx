"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useMiJugador } from "@/context/useMiJugador";
import { supabase } from "@/lib/supabase";
import { nombreVisible } from "@/lib/players";
import { casillaCaballo, claveCaballo, destinosCaballo, retoCaballoLocal, validarRecorridoCaballo, validarRetoCaballo, type MarcaCaballo, type RetoCaballo } from "@/lib/caballoClub";
import { Chessboard } from "react-chessboard";
import { Icono } from "./Icono";
import { IdentidadJugador } from "./IdentidadJugador";
import { SonidoTablero } from "@/lib/sonidoTablero";

export function RetoCaballoClub(){
 const {session}=useAuth();const [reto,setReto]=useState<(RetoCaballo & {cuenta:string})|null>(null),[filas,setFilas]=useState<MarcaCaballo[]>([]),[estado,setEstado]=useState("cargando"),[revision,setRevision]=useState(0),[historicas,setHistoricas]=useState<MarcaCaballo[]>([]),[estadoHistorico,setEstadoHistorico]=useState("cargando");
 useEffect(()=>{const cuenta=session?.user.id??"anon";let cancelado=false,pendiente=false;const abort=new AbortController();
  async function cargar(){if(pendiente||cancelado)return;pendiente=true;
   try{const {data,error}=await supabase.rpc("obtener_reto_caballo").abortSignal(AbortSignal.any([abort.signal,AbortSignal.timeout(10000)]));if(error)throw error;const r=validarRetoCaballo(data);const [tabla,historial]=await Promise.all([supabase.rpc("tabla_reto_caballo").abortSignal(AbortSignal.any([abort.signal,AbortSignal.timeout(10000)])),supabase.rpc("tabla_reto_caballo_records").abortSignal(AbortSignal.any([abort.signal,AbortSignal.timeout(10000)]))]);if(cancelado)return;setReto({...r,cuenta});if(tabla.error){setFilas([]);setEstado("error");}else{setFilas(tabla.data??[]);setEstado("listo");}if(historial.error){setHistoricas([]);setEstadoHistorico(historial.error.code==="PGRST202"?"preparando":"error");}else{setHistoricas(historial.data??[]);setEstadoHistorico("listo");}}
   catch(e){if(!cancelado){setReto(actual=>actual&&actual.cuenta===cuenta&&actual.semana===retoCaballoLocal().semana?actual:{...retoCaballoLocal(),cuenta});setEstadoHistorico("error");setEstado((e as {code?:string}).code==="PGRST202"?"preparando":"error");}}
   finally{pendiente=false;}
  }
  void cargar();const intervalo=setInterval(()=>void cargar(),30000);const visible=()=>{if(document.visibilityState==="visible")void cargar();};const actualizar=()=>void cargar();
  window.addEventListener("caballo-guardado",actualizar);window.addEventListener("online",actualizar);document.addEventListener("visibilitychange",visible);
  return()=>{cancelado=true;abort.abort();clearInterval(intervalo);window.removeEventListener("caballo-guardado",actualizar);window.removeEventListener("online",actualizar);document.removeEventListener("visibilitychange",visible);};
 },[session?.user.id,revision]);
 if(!reto||reto.cuenta!==(session?.user.id??"anon"))return <div className="panel p-6" role="status">Preparando el recorrido del club…</div>;
 return <JuegoCaballo key={claveCaballo(session?.user.id,reto)} reto={reto} filas={filas} estado={estado} historicas={historicas} estadoHistorico={estadoHistorico} actualizar={()=>setRevision(n=>n+1)}/>;
}
function leerIntento(clave:string,inicial:number):{recorrido:number[];mejor:number}{try{const d=JSON.parse(localStorage.getItem(clave)??"null");return {recorrido:validarRecorridoCaballo(d?.recorrido,inicial),mejor:Number.isInteger(d?.mejor)&&d.mejor>=0&&d.mejor<=64?d.mejor:0};}catch{return {recorrido:[inicial],mejor:0};}}
function JuegoCaballo({reto,filas,estado,historicas,estadoHistorico,actualizar}:{reto:RetoCaballo;filas:MarcaCaballo[];estado:string;historicas:MarcaCaballo[];estadoHistorico:string;actualizar:()=>void}){
 const {session}=useAuth();const {jugador,ambigua,error,cargando}=useMiJugador();const clave=claveCaballo(session?.user.id,reto);
 const [inicial]=useState(()=>leerIntento(clave,reto.inicial));const [recorrido,setRecorrido]=useState(inicial.recorrido),[mejorLocal,setMejorLocal]=useState(inicial.mejor),[marcaConfirmada,setMarcaConfirmada]=useState(0);
 const camino=useRef(recorrido),guardando=useRef(false);const [enviando,setEnviando]=useState(false),[mensaje,setMensaje]=useState(""),[objetivo,setObjetivo]=useState<{nombre:string;casillas:number}|null>(null),[compartirManual,setCompartirManual]=useState("");
 const [audio,setAudio]=useState(true),[foco,setFoco]=useState(reto.inicial);const sonido=useRef<SonidoTablero|null>(null);const mesa=useRef<HTMLElement>(null);const celdas=useRef<(HTMLButtonElement|null)[]>([]);
 const visitadas=new Set(recorrido),pos=recorrido[recorrido.length-1],legales=destinosCaballo(recorrido),terminado=recorrido.length===64||!legales.length;
 const [vistaHistorica,setVistaHistorica]=useState(true);const lista=vistaHistorica?historicas:filas,estadoTabla=vistaHistorica?estadoHistorico:estado;
 const marca=Math.max(reto.marca,marcaConfirmada),record=Math.max(reto.record??0,marca,historicas.find(f=>f.es_mio)?.casillas??0),mejor=Math.max(mejorLocal,record),superado=objetivo&&recorrido.length>objetivo.casillas;
 useEffect(()=>{try{localStorage.setItem(clave,JSON.stringify({recorrido,mejor:Math.max(mejorLocal,recorrido.length)}));}catch{/* La partida sigue sin almacenamiento local. */}},[clave,recorrido,mejorLocal]);
 useEffect(()=>()=>sonido.current?.cerrar(),[]);
 useEffect(()=>{if(window.innerHeight<650)requestAnimationFrame(()=>{const m=mesa.current;if(m)window.scrollTo({top:window.scrollY+m.getBoundingClientRect().top-90,behavior:"instant"});});},[]);
 function reproducir(){if(!sonido.current)sonido.current=new SonidoTablero();sonido.current.configurar(audio,.8);sonido.current.activar();sonido.current.golpe();}
 async function guardar(r=camino.current){
  if(r.length<2)return true;
  setMejorLocal(n=>Math.max(n,r.length));
  if(!session||!jugador||ambigua||error||!reto.registrable){setMensaje(!session?"Tu intento queda en este navegador. Iniciá sesión para entrar en la clasificación.":!reto.registrable?"Las marcas del club se están habilitando. Tu recorrido queda en este navegador.":"Vinculá tu jugador para guardar la marca con tu nombre.");return true;}
  if(r.length<=marca){setMensaje(`Tu mejor marca guardada sigue siendo ${marca}/64.`);return true;}
  if(guardando.current)return false;guardando.current=true;setEnviando(true);setMensaje("Guardando tu marca…");
  try{const {data,error}=await supabase.rpc("registrar_recorrido_caballo",{p_semana:reto.semana,p_recorrido:[...r]}).abortSignal(AbortSignal.timeout(10000));if(error||!Number.isInteger(data?.marca)||data.marca<r.length||data.marca>64||data.semana!==reto.semana)throw error??new Error("Sin confirmación");setMarcaConfirmada(data.marca);setMensaje(`¡Marca guardada! ${data.marca}/64 para ${nombreVisible(jugador)}.`);window.dispatchEvent(new Event("caballo-guardado"));return true;}
  catch{setMensaje("No se pudo confirmar tu marca. El recorrido sigue acá; podés reintentar guardarlo.");return false;}
  finally{guardando.current=false;setEnviando(false);}
 }
 function mover(i:number){const actual=camino.current;if(i===actual[actual.length-1])return false;if(!destinosCaballo(actual).includes(i)){setMensaje(actual.includes(i)?"Esa casilla ya cuenta. Buscá una nueva.":"El caballo salta en L: dos casillas y una al costado.");return false;}
  const nuevo=[...actual,i];camino.current=nuevo;setRecorrido(nuevo);setMejorLocal(n=>Math.max(n,nuevo.length));setMensaje("");reproducir();if(nuevo.length===64||!destinosCaballo(nuevo).length)void guardar(nuevo);return true;
 }
 async function reiniciar(){if(enviando)return;if(!await guardar())return;camino.current=[reto.inicial];setRecorrido([reto.inicial]);setFoco(reto.inicial);setCompartirManual("");reproducir();}
 async function compartir(){const puntos=Math.max(mejor,recorrido.length);const texto=`Recorrí ${puntos} de las 64 casillas en el desafío del caballo de Atlántida. ¿Llegás más lejos?`;const url=new URL("/jugar/caballo",window.location.origin).href;
  try{if(navigator.share)await navigator.share({title:"Desafío del caballo · Atlántida",text:texto,url});else{await navigator.clipboard.writeText(`${texto}\n${url}`);setMensaje("Invitación copiada. Pegala en WhatsApp o mandásela a un compañero.");}}
  catch(e){if((e as Error).name!=="AbortError"){setCompartirManual(`${texto}\n${url}`);setMensaje("Copiá esta invitación y compartila.");}}
 }
 const indiceCasilla=(s:string)=>(8-Number(s[1]))*8+"abcdefgh".indexOf(s[0]);
 const estilos:Record<string,CSSProperties>={};
 for(const i of recorrido)estilos[casillaCaballo(i)]={backgroundColor:(Math.floor(i/8)+i%8)%2?"#7d789a":"#c9c4d9"};
 estilos[casillaCaballo(pos)]={backgroundColor:"#d6b779"};
 for(const i of legales)estilos[casillaCaballo(i)]={backgroundImage:"radial-gradient(circle, #184d3b88 0 15%, transparent 17%)"};
 const titulo=recorrido.length===64?"¡Las 64!":terminado?"Hasta acá llegaste.":superado?`¡Superaste a ${objetivo!.nombre}!`:"¿Cuál es tu próximo salto?";
 return <div className="knight-club"><div className="knight-stage"><section ref={mesa} className="knight-table" aria-label="Recorrido del caballo">
  <div className="knight-score-strip"><div><span className="eyebrow">Tu recorrido</span><strong aria-live="polite">{recorrido.length}<small>/64</small></strong></div><div className="knight-best"><span>{session?"Tu récord":"Mejor acá"}</span><strong>{session?record:mejor}<small>/64</small></strong></div></div>
  {!objetivo&&lista[0]&&<div className="knight-challenge-line"><span title={`Marca del club: ${lista[0].nombre} · ${lista[0].casillas}/64`}><span className="knight-leader-name">{lista[0].nombre}</span><strong>{lista[0].casillas}/64</strong></span>{lista[0].casillas<64&&!lista[0].es_mio&&<button type="button" onClick={()=>setObjetivo({nombre:lista[0].nombre,casillas:lista[0].casillas})}>Superar ↗</button>}</div>}
  {objetivo&&<div className="knight-target" role="status">{superado?"✓":"⚑"} Tu reto: superar a <strong>{objetivo.nombre}</strong> · {objetivo.casillas}/64<button type="button" aria-label="Quitar rival objetivo" onClick={()=>setObjetivo(null)}>×</button></div>}
  <div className="knight-board play-board"><Chessboard options={{
   id:"reto-caballo",position:{[casillaCaballo(pos)]:{pieceType:"wN"}},boardOrientation:"white",
   allowDragging:!terminado,allowDragOffBoard:false,allowAutoScroll:false,allowDrawingArrows:false,
   showNotation:true,animationDurationInMs:180,lightSquareStyle:{backgroundColor:"#f0e6ce"},darkSquareStyle:{backgroundColor:"#638480"},squareStyles:estilos,
   canDragPiece:({square})=>!terminado&&square===casillaCaballo(pos),
   onPieceDrop:({sourceSquare,targetSquare})=>sourceSquare===casillaCaballo(camino.current.at(-1)!)&&targetSquare?mover(indiceCasilla(targetSquare)):false,
   onSquareClick:({square})=>mover(indiceCasilla(square)),
   squareRenderer:({square,children})=>{const i=indiceCasilla(square),paso=recorrido.indexOf(i)+1;return <button type="button" ref={el=>{celdas.current[i]=el;}} data-knight-square={i} style={estilos[square]} tabIndex={foco===i?0:-1} onFocus={()=>setFoco(i)} aria-label={`${square}${i===pos?", caballo":""}${paso?`, visitada, paso ${paso}`: ", sin visitar"}${legales.includes(i)?", salto permitido":""}`} className={`play-square knight-cell ${visitadas.has(i)?"visited":""} ${i===pos?"current":""}`} onKeyDown={e=>{const r=Math.floor(i/8),c=i%8;const destino:Record<string,number>={ArrowLeft:c?i-1:i,ArrowRight:c<7?i+1:i,ArrowUp:r?i-8:i,ArrowDown:r<7?i+8:i};if(e.key in destino){e.preventDefault();setFoco(destino[e.key]);celdas.current[destino[e.key]]?.focus();}}}>{children}{paso>0&&<span className="knight-step" aria-hidden="true">{paso}</span>}</button>;}
  }}/></div>
  <div className={`knight-status ${terminado?"finished":""}`} role="status" aria-live="polite"><strong>{titulo}</strong><span>{recorrido.length===64?"Un recorrido completo. Compartí tu hazaña.":terminado?`${recorrido.length} casillas distintas. Probá otra ruta y mejorá tu marca.`:"Tocá un destino marcado o arrastrá el caballo. No se puede repetir."}</span></div>
  <div className="knight-controls"><button type="button" className="button-primary" disabled={enviando} onClick={()=>void reiniciar()}><Icono nombre="reiniciar" className="h-4 w-4"/>Otro intento</button><button type="button" className="button-secondary" disabled={enviando||recorrido.length<2} onClick={()=>void guardar()}>{enviando?"Guardando…":"Guardar marca"}</button><button type="button" className="button-secondary" onClick={()=>void compartir()}>Desafiar a alguien ↗</button></div>
  {mensaje&&<p className="knight-save-status" role="status">{mensaje}</p>}{compartirManual&&<textarea aria-label="Invitación para copiar" readOnly value={compartirManual} onFocus={e=>e.currentTarget.select()} className="knight-share-text"/>}
 </section><aside className="knight-aside"><section className="panel knight-rules"><p className="eyebrow text-amber-200">Un caballo. Muchas rutas.</p><h2>Llegá más lejos<br/><span>que tus compañeros.</span></h2><p>Todos empezamos en <strong>{casillaCaballo(reto.inicial)}</strong>. Saltá en L y visitá la mayor cantidad de casillas sin repetir. La primera también cuenta.</p><div className="knight-rule-steps"><span><b>01</b> Buscá un salto.</span><span><b>02</b> Elegí una casilla nueva.</span><span><b>03</b> Superá tu mejor marca.</span></div><p>Podés intentarlo todas las veces que quieras. Al quedar sin salida, se guarda tu mejor recorrido. También podés guardarlo antes de terminar.</p><p className="knight-week">Reto semanal · {new Intl.DateTimeFormat("es-UY",{day:"numeric",month:"short"}).format(new Date(reto.semana+"T12:00:00Z"))} a {new Intl.DateTimeFormat("es-UY",{day:"numeric",month:"short"}).format(new Date(Date.parse(reto.fin+"T12:00:00Z")-86400000))}. El lunes cambia la salida y empieza otra tabla semanal. Tus récords y las marcas anteriores se conservan.</p><label className="knight-audio"><input type="checkbox" checked={audio} onChange={e=>setAudio(e.target.checked)}/>Sonido de piezas</label></section>
  <section className="panel knight-account"><IdentidadJugador/>{!session&&<p>Podés probar sin sesión. Para competir con tu nombre, iniciá sesión y empezá tu recorrido con esa cuenta.</p>}{session&&jugador&&!cargando&&<p>{marca?`Esta semana guardaste ${marca}/64.`:"Todavía no tenés una marca guardada esta semana."} Tu récord no se reinicia al cambiar de semana.</p>}{!reto.registrable&&<p>La clasificación se está habilitando. Mientras tanto, tu recorrido se conserva en este navegador.</p>}</section>
 </aside></div>
 <section className="panel knight-leaderboard" id="clasificacion-caballo" aria-labelledby="titulo-caballo-clasificacion"><div className="knight-leaderboard-heading"><div><p className="eyebrow text-amber-200">A ver quién llega más lejos</p><h2 id="titulo-caballo-clasificacion">Las marcas del club</h2><p>{vistaHistorica?"Tu mejor marca de todas las semanas. Los récords no se reinician.":"El mejor recorrido de esta semana, con la misma salida para todos."}</p></div><button type="button" className="button-secondary" onClick={actualizar}>Actualizar</button></div>
 <div className="knight-ranking-tabs segmented-control" role="group" aria-label="Ver marcas del caballo"><button type="button" aria-pressed={vistaHistorica} onClick={()=>setVistaHistorica(true)}>Récords</button><button type="button" aria-pressed={!vistaHistorica} onClick={()=>setVistaHistorica(false)}>Esta semana</button></div>
 {estadoTabla==="cargando"?<p role="status" className="p-5 text-sm text-zinc-400">Cargando las marcas…</p>:estadoTabla==="preparando"?<p className="p-5 text-sm text-zinc-400">{vistaHistorica?"Los récords todavía no están disponibles. Podés consultar la tabla de Esta semana.":"La clasificación se está preparando. Ya podés probar el recorrido y compartir el juego."}</p>:estadoTabla==="error"?<p role="status" className="p-5 text-sm text-amber-200">No se pudieron actualizar las marcas. Reintentá con el botón Actualizar.</p>:!lista.length?<div className="knight-empty"><Icono nombre="trofeo" className="h-7 w-7"/><h3>La primera marca puede ser tuya.</h3><p>Iniciá sesión, hacé tu recorrido y dejá un número para que los demás lo superen.</p></div>:<table><thead><tr><th scope="col">#</th><th scope="col">Jugador</th><th scope="col">Casillas</th><th scope="col"><span className="sr-only">Desafiar</span></th></tr></thead><tbody>{lista.map(f=><tr key={f.jugador_id} className={f.es_mio?"is-mine":""}><td>{f.puesto}</td><th scope="row"><Link href={`/jugadores/${f.jugador_id}`}>{f.nombre}{f.es_mio&&<small>Vos</small>}</Link></th><td><strong>{f.casillas}</strong><small>/64</small></td><td>{!f.es_mio&&f.casillas<64&&<button type="button" onClick={()=>{setObjetivo({nombre:f.nombre,casillas:f.casillas});const m=mesa.current;if(m)window.scrollTo({top:window.scrollY+m.getBoundingClientRect().top-90,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});}}>Superar<span className="sr-only"> a {f.nombre}</span> ↗</button>}{f.casillas===64&&<span title="Recorrido completo">🏆</span>}</td></tr>)}</tbody></table>}
 <p className="knight-leaderboard-foot">La marca se guarda con tu cuenta y tu jugador del club. {vistaHistorica?"Tus mejores marcas siguen acá al cambiar de semana.":"Se conserva tu mejor recorrido de esta semana; también queda en el historial."}</p></section>
 </div>;
}
