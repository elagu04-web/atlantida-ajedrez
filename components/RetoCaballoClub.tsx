"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useMiJugador } from "@/context/useMiJugador";
import { supabase } from "@/lib/supabase";
import { nombreVisible } from "@/lib/players";
import { casillaCaballo, claveCaballo, destinosCaballo, retoCaballoLocal, validarRecorridoCaballo, validarRetoCaballo, type MarcaCaballo, type RetoCaballo } from "@/lib/caballoClub";
import { PiezaAjedrez } from "./PiezaAjedrez";
import { Icono } from "./Icono";
import { IdentidadJugador } from "./IdentidadJugador";
import { SonidoTablero } from "@/lib/sonidoTablero";

export function RetoCaballoClub(){
 const {session}=useAuth();const [reto,setReto]=useState<(RetoCaballo & {cuenta:string})|null>(null),[filas,setFilas]=useState<MarcaCaballo[]>([]),[estado,setEstado]=useState("cargando"),[revision,setRevision]=useState(0);
 useEffect(()=>{const cuenta=session?.user.id??"anon";let cancelado=false,pendiente=false;const abort=new AbortController();
  async function cargar(){if(pendiente||cancelado)return;pendiente=true;
   try{const {data,error}=await supabase.rpc("obtener_reto_caballo").abortSignal(AbortSignal.any([abort.signal,AbortSignal.timeout(10000)]));if(error)throw error;const r=validarRetoCaballo(data);const tabla=await supabase.rpc("tabla_reto_caballo").abortSignal(AbortSignal.any([abort.signal,AbortSignal.timeout(10000)]));if(cancelado)return;setReto({...r,cuenta});if(tabla.error){setEstado("error");}else{setFilas(tabla.data??[]);setEstado("listo");}}
   catch(e){if(!cancelado){setReto(actual=>actual&&actual.cuenta===cuenta&&actual.semana===retoCaballoLocal().semana?actual:{...retoCaballoLocal(),cuenta});setEstado((e as {code?:string}).code==="PGRST202"?"preparando":"error");}}
   finally{pendiente=false;}
  }
  void cargar();const intervalo=setInterval(()=>void cargar(),30000);const visible=()=>{if(document.visibilityState==="visible")void cargar();};const actualizar=()=>void cargar();
  window.addEventListener("caballo-guardado",actualizar);window.addEventListener("online",actualizar);document.addEventListener("visibilitychange",visible);
  return()=>{cancelado=true;abort.abort();clearInterval(intervalo);window.removeEventListener("caballo-guardado",actualizar);window.removeEventListener("online",actualizar);document.removeEventListener("visibilitychange",visible);};
 },[session?.user.id,revision]);
 if(!reto||reto.cuenta!==(session?.user.id??"anon"))return <div className="panel p-6" role="status">Preparando el recorrido del club…</div>;
 return <JuegoCaballo key={claveCaballo(session?.user.id,reto)} reto={reto} filas={filas} estado={estado} actualizar={()=>setRevision(n=>n+1)}/>;
}
function leerIntento(clave:string,inicial:number):{recorrido:number[];mejor:number}{try{const d=JSON.parse(localStorage.getItem(clave)??"null");return {recorrido:validarRecorridoCaballo(d?.recorrido,inicial),mejor:Number.isInteger(d?.mejor)&&d.mejor>=0&&d.mejor<=64?d.mejor:0};}catch{return {recorrido:[inicial],mejor:0};}}
function JuegoCaballo({reto,filas,estado,actualizar}:{reto:RetoCaballo;filas:MarcaCaballo[];estado:string;actualizar:()=>void}){
 const {session}=useAuth();const {jugador,ambigua,error,cargando}=useMiJugador();const clave=claveCaballo(session?.user.id,reto);
 const [inicial]=useState(()=>leerIntento(clave,reto.inicial));const [recorrido,setRecorrido]=useState(inicial.recorrido),[mejorLocal,setMejorLocal]=useState(inicial.mejor),[marcaConfirmada,setMarcaConfirmada]=useState(0);
 const camino=useRef(recorrido),guardando=useRef(false);const [enviando,setEnviando]=useState(false),[mensaje,setMensaje]=useState(""),[objetivo,setObjetivo]=useState<{nombre:string;casillas:number}|null>(null),[compartirManual,setCompartirManual]=useState("");
 const [audio,setAudio]=useState(true),[foco,setFoco]=useState(reto.inicial);const sonido=useRef<SonidoTablero|null>(null);const mesa=useRef<HTMLElement>(null);const celdas=useRef<(HTMLButtonElement|null)[]>([]);const gesto=useRef<{x:number;y:number;desde:number;movido:boolean}|null>(null),ignorarClick=useRef(false);
 const visitadas=new Set(recorrido),pos=recorrido[recorrido.length-1],legales=destinosCaballo(recorrido),terminado=recorrido.length===64||!legales.length;
 const marca=Math.max(reto.marca,marcaConfirmada),mejor=Math.max(mejorLocal,marca),superado=objetivo&&recorrido.length>objetivo.casillas;
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
 function mover(i:number){const actual=camino.current;if(i===actual[actual.length-1])return;if(!destinosCaballo(actual).includes(i)){setMensaje(actual.includes(i)?"Esa casilla ya cuenta. Buscá una nueva.":"El caballo salta en L: dos casillas y una al costado.");return;}
  const nuevo=[...actual,i];camino.current=nuevo;setRecorrido(nuevo);setMejorLocal(n=>Math.max(n,nuevo.length));setMensaje("");reproducir();if(nuevo.length===64||!destinosCaballo(nuevo).length)void guardar(nuevo);
 }
 async function reiniciar(){if(enviando)return;if(!await guardar())return;camino.current=[reto.inicial];setRecorrido([reto.inicial]);setFoco(reto.inicial);setCompartirManual("");reproducir();}
 function empezarArrastre(e:PointerEvent<HTMLButtonElement>,i:number){if(i!==pos||terminado||e.button!==0)return;gesto.current={x:e.clientX,y:e.clientY,desde:i,movido:false};e.currentTarget.setPointerCapture(e.pointerId);}
 function acabarArrastre(e:PointerEvent<HTMLButtonElement>){const g=gesto.current;gesto.current=null;if(!g?.movido)return;ignorarClick.current=true;const celda=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLButtonElement>("[data-knight-square]");if(celda)mover(Number(celda.dataset.knightSquare));}
 async function compartir(){const puntos=Math.max(mejor,recorrido.length);const texto=`Recorrí ${puntos} de las 64 casillas en el desafío del caballo de Atlántida. ¿Llegás más lejos?`;const url=new URL("/jugar/caballo",window.location.origin).href;
  try{if(navigator.share)await navigator.share({title:"Desafío del caballo · Atlántida",text:texto,url});else{await navigator.clipboard.writeText(`${texto}\n${url}`);setMensaje("Invitación copiada. Pegala en WhatsApp o mandásela a un compañero.");}}
  catch(e){if((e as Error).name!=="AbortError"){setCompartirManual(`${texto}\n${url}`);setMensaje("Copiá esta invitación y compartila.");}}
 }
 const titulo=recorrido.length===64?"¡Las 64!":terminado?"Hasta acá llegaste.":superado?`¡Superaste a ${objetivo!.nombre}!`:"¿Cuál es tu próximo salto?";
 return <div className="knight-club"><div className="knight-stage"><section ref={mesa} className="knight-table" aria-label="Recorrido del caballo">
  <div className="knight-score-strip"><div><span className="eyebrow">Tu recorrido</span><strong aria-live="polite">{recorrido.length}<small>/64</small></strong></div><div className="knight-best"><span>{session?"Marca guardada":"Mejor acá"}</span><strong>{session?marca:mejor}<small>/64</small></strong></div></div>
  {!objetivo&&filas[0]&&<div className="knight-challenge-line"><span title={`Marca del club: ${filas[0].nombre} · ${filas[0].casillas}/64`}><span className="knight-leader-name">{filas[0].nombre}</span><strong>{filas[0].casillas}/64</strong></span>{filas[0].casillas<64&&!filas[0].es_mio&&<button type="button" onClick={()=>setObjetivo({nombre:filas[0].nombre,casillas:filas[0].casillas})}>Superar ↗</button>}</div>}
  {objetivo&&<div className="knight-target" role="status">{superado?"✓":"⚑"} Tu reto: superar a <strong>{objetivo.nombre}</strong> · {objetivo.casillas}/64<button type="button" aria-label="Quitar rival objetivo" onClick={()=>setObjetivo(null)}>×</button></div>}
  <div className="knight-board-frame"><div className="knight-ranks" aria-hidden="true">{[8,7,6,5,4,3,2,1].map(n=><span key={n}>{n}</span>)}</div><div className="knight-board" role="group" aria-label="64 casillas. Usá las flechas para recorrer y Enter para saltar.">
   {Array.from({length:64},(_,i)=>{const paso=recorrido.indexOf(i)+1;return <button type="button" key={i} ref={el=>{celdas.current[i]=el;}} data-knight-square={i} tabIndex={foco===i?0:-1} onFocus={()=>setFoco(i)} aria-label={`${casillaCaballo(i)}${i===pos?", caballo":""}${paso?`, visitada, paso ${paso}`:", sin visitar"}${legales.includes(i)?", salto permitido":""}`} className={`knight-cell ${(Math.floor(i/8)+i%8)%2?"dark":"light"} ${visitadas.has(i)?"visited":""} ${i===pos?"current":""} ${legales.includes(i)?"available":""}`} onClick={()=>{if(ignorarClick.current){ignorarClick.current=false;return;}mover(i);}} onPointerDown={e=>empezarArrastre(e,i)} onPointerMove={e=>{const g=gesto.current;if(g&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>6)g.movido=true;}} onPointerUp={acabarArrastre} onPointerCancel={()=>{gesto.current=null;}} onKeyDown={e=>{const r=Math.floor(i/8),c=i%8;const destino:Record<string,number>={ArrowLeft:c?i-1:i,ArrowRight:c<7?i+1:i,ArrowUp:r?i-8:i,ArrowDown:r<7?i+8:i};if(e.key in destino){e.preventDefault();setFoco(destino[e.key]);celdas.current[destino[e.key]]?.focus();}}}>
    {paso>0&&<span className="knight-step" aria-hidden="true">{paso}</span>}{i===pos&&<span className="knight-piece" key={recorrido.length}><PiezaAjedrez tipo="n" color="w"/></span>}{legales.includes(i)&&<span className="knight-destination" aria-hidden="true"/>}
   </button>;})}
  </div><div className="knight-files" aria-hidden="true">{"abcdefgh".split("").map(l=><span key={l}>{l}</span>)}</div></div>
  <div className={`knight-status ${terminado?"finished":""}`} role="status" aria-live="polite"><strong>{titulo}</strong><span>{recorrido.length===64?"Un recorrido completo. Compartí tu hazaña.":terminado?`${recorrido.length} casillas distintas. Probá otra ruta y mejorá tu marca.`:"Tocá un destino marcado o arrastrá el caballo. No se puede repetir."}</span></div>
  <div className="knight-controls"><button type="button" className="button-primary" disabled={enviando} onClick={()=>void reiniciar()}><Icono nombre="reiniciar" className="h-4 w-4"/>Otro intento</button><button type="button" className="button-secondary" disabled={enviando||recorrido.length<2} onClick={()=>void guardar()}>{enviando?"Guardando…":"Guardar marca"}</button><button type="button" className="button-secondary" onClick={()=>void compartir()}>Desafiar a alguien ↗</button></div>
  {mensaje&&<p className="knight-save-status" role="status">{mensaje}</p>}{compartirManual&&<textarea aria-label="Invitación para copiar" readOnly value={compartirManual} onFocus={e=>e.currentTarget.select()} className="knight-share-text"/>}
 </section><aside className="knight-aside"><section className="panel knight-rules"><p className="eyebrow text-amber-200">Un caballo. Muchas rutas.</p><h2>Llegá más lejos<br/><span>que tus compañeros.</span></h2><p>Todos empezamos en <strong>{casillaCaballo(reto.inicial)}</strong>. Saltá en L y visitá la mayor cantidad de casillas sin repetir. La primera también cuenta.</p><div className="knight-rule-steps"><span><b>01</b> Buscá un salto.</span><span><b>02</b> Elegí una casilla nueva.</span><span><b>03</b> Superá tu mejor marca.</span></div><p>Podés intentarlo todas las veces que quieras. Al quedar sin salida, se guarda tu mejor recorrido. También podés guardarlo antes de terminar.</p><p className="knight-week">Reto semanal · {new Intl.DateTimeFormat("es-UY",{day:"numeric",month:"short"}).format(new Date(reto.semana+"T12:00:00Z"))} a {new Intl.DateTimeFormat("es-UY",{day:"numeric",month:"short"}).format(new Date(Date.parse(reto.fin+"T12:00:00Z")-86400000))}. El lunes cambia la salida y empieza una nueva clasificación.</p><label className="knight-audio"><input type="checkbox" checked={audio} onChange={e=>setAudio(e.target.checked)}/>Sonido de piezas</label></section>
  <section className="panel knight-account"><IdentidadJugador/>{!session&&<p>Podés probar sin sesión. Para competir con tu nombre, iniciá sesión y empezá tu recorrido con esa cuenta.</p>}{session&&jugador&&!cargando&&<p>{marca?`Tu marca confirmada es ${marca}/64.`:"Todavía no tenés una marca guardada esta semana."} Los saltos se comprueban antes de sumarte a la tabla.</p>}{!reto.registrable&&<p>La clasificación se está habilitando. Mientras tanto, tu recorrido se conserva en este navegador.</p>}</section>
 </aside></div>
 <section className="panel knight-leaderboard" id="clasificacion-caballo" aria-labelledby="titulo-caballo-clasificacion"><div className="knight-leaderboard-heading"><div><p className="eyebrow text-amber-200">A ver quién llega más lejos</p><h2 id="titulo-caballo-clasificacion">Las marcas del club</h2><p>Casillas distintas. Empates compartidos. Tu mejor intento de esta semana.</p></div><button type="button" className="button-secondary" onClick={actualizar}>Actualizar</button></div>
 {estado==="preparando"?<p className="p-5 text-sm text-zinc-400">La clasificación se está preparando. Ya podés probar el recorrido y compartir el juego.</p>:estado==="error"?<p role="status" className="p-5 text-sm text-amber-200">No se pudieron actualizar las marcas. Reintentá con el botón Actualizar.</p>:!filas.length?<div className="knight-empty"><Icono nombre="trofeo" className="h-7 w-7"/><h3>La primera marca puede ser tuya.</h3><p>Iniciá sesión, hacé tu recorrido y dejá un número para que los demás lo superen.</p></div>:<table><thead><tr><th scope="col">#</th><th scope="col">Jugador</th><th scope="col">Casillas</th><th scope="col"><span className="sr-only">Desafiar</span></th></tr></thead><tbody>{filas.map(f=><tr key={f.jugador_id} className={f.es_mio?"is-mine":""}><td>{f.puesto}</td><th scope="row"><Link href={`/jugadores/${f.jugador_id}`}>{f.nombre}{f.es_mio&&<small>Vos</small>}</Link></th><td><strong>{f.casillas}</strong><small>/64</small></td><td>{!f.es_mio&&f.casillas<64&&<button type="button" onClick={()=>{setObjetivo({nombre:f.nombre,casillas:f.casillas});const m=mesa.current;if(m)window.scrollTo({top:window.scrollY+m.getBoundingClientRect().top-90,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});}}>Superar<span className="sr-only"> a {f.nombre}</span> ↗</button>}{f.casillas===64&&<span title="Recorrido completo">🏆</span>}</td></tr>)}</tbody></table>}
 <p className="knight-leaderboard-foot">La marca se guarda con tu cuenta y tu jugador del club. Se conserva solo el mejor recorrido.</p></section>
 </div>;
}
