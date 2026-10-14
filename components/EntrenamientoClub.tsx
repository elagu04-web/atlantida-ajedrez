"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import Link from "next/link";
import { TallerAperturas } from "./TallerAperturas";
import {EntrenarHoy} from "./EntrenarHoy";
import {useEntrenamientoCuenta} from "@/context/useEntrenamientoCuenta";
import {useMiJugador} from "@/context/useMiJugador";
import {useJugadoresEnVivo} from "@/context/useJugadoresEnVivo";
import {useTorneos} from "@/context/TorneosContext";
import {leerProgresoGuiado} from "@/lib/entrenamientoGuiado";
import {fechaMontevideo} from "@/lib/desafios";
import {PartidasBotsEntrenamiento} from "./PartidasBotsEntrenamiento";
import type {PartidaBotRegistrada} from "@/lib/partidasBots";
import { useAuth } from "@/context/AuthContext";
import { AuthWidget } from "./AuthWidget";
import { Icono } from "./Icono";
import { EjercicioEntrenamiento } from "./EjercicioEntrenamiento";
import { MotorEntrenamiento } from "@/lib/motorEntrenamiento";
import { analizarPartida, obtenerPartidasLichess, obtenerPartidasChessCom, type FuentePartida, type PartidaExterna } from "@/lib/analisisPartidas";
import { crearSesionEntrenamiento, ejerciciosPersonales, leerBibliotecaEntrenamiento, registrarPractica, resumenEntrenamiento, validarPgnEntrenamiento, PLAN_ENTRENAMIENTO, PGN_EJEMPLO, type SesionEntrenamiento } from "@/lib/entrenamientoPersonal";

function escucharInvitado(cb:()=>void){window.addEventListener("storage",cb);return()=>window.removeEventListener("storage",cb);}
function leerInvitado(){try{return JSON.stringify([localStorage.getItem("atlantida-entrenamiento-v1:invitado"),localStorage.getItem("atlantida-entrenamiento-guiado-v1:invitado")]);}catch{return "[]";}}
export function EntrenamientoClub() {
  const { session, esAdmin, cargando } = useAuth();
  const modo=useSyncExternalStore(cb=>{window.addEventListener("popstate",cb);return()=>window.removeEventListener("popstate",cb);},()=>new URL(window.location.href).searchParams.get("modo"),()=>null);
  const solicitada=useSyncExternalStore(cb=>{window.addEventListener("popstate",cb);return()=>window.removeEventListener("popstate",cb);},()=>new URL(window.location.href).searchParams.get("partida"),()=>null);
  if (cargando) return <p role="status" className="panel p-6">Preparando tu entrenamiento…</p>;
  return <TallerEntrenamiento key={(session?.user.id ?? "invitado")+":"+(solicitada??"")+":"+(modo??"")} modo={modo} solicitada={solicitada} cuenta={session?.user.id ?? "invitado"} conCuenta={!!session} esAdmin={esAdmin}/>;
}
function TallerEntrenamiento({ cuenta, conCuenta, esAdmin, solicitada, modo }: { cuenta: string; conCuenta: boolean; esAdmin: boolean; solicitada?:string|null; modo?:string|null }) {
  const {sesiones,guiado,estado,errorLocal,guardarSesion,guardarGuiado,importar,reintentar}=useEntrenamientoCuenta(cuenta,conCuenta);
  const identidad=useMiJugador(),ranking=useJugadoresEnVivo(),torneos=useTorneos();
  const jugadorActual=ranking.find(j=>j.id===identidad.jugador?.id);
  const eloClub=conCuenta&&!identidad.ambigua&&!identidad.error&&!torneos.errorCarga?jugadorActual?.eloAtlantida??null:null;
  const esperandoNivel=conCuenta&&!guiado.nivelInicial&&(identidad.cargando||torneos.cargando||estado==="cargando"||estado==="guardando");
  const invitadoCrudo=useSyncExternalStore(escucharInvitado,leerInvitado,()=>"[]");
  const invitado=useMemo(()=>{const [biblioteca,guia]=JSON.parse(invitadoCrudo);return {sesiones:leerBibliotecaEntrenamiento(biblioteca??"[]"),guiado:guia?leerProgresoGuiado(guia):undefined};},[invitadoCrudo]);
  const [invitadoImportado,setInvitadoImportado]=useState(false);
  const leer=()=>JSON.stringify(sesiones);
  const resumen = useMemo(() => resumenEntrenamiento(sesiones), [sesiones]);
  const practicasGuiadas = [...Object.values(guiado.ejercicios),...Object.values(guiado.aperturas?.lineas??{}).filter(l=>l.activa)].flatMap(e => e.practica ? [e.practica] : []);
  const resueltosGuiados = practicasGuiadas.filter(p => p.aciertos > 0).length;
  const pendientesGuiados = practicasGuiadas.filter(p => !p.proxima || p.proxima <= fechaMontevideo(new Date())).length;
  const [semana, setSemana] = useState(0), [vista, setVista] = useState<"hoy" | "plan" | "analizar" | "practicar" | "biblioteca" | "aperturas">(solicitada?"analizar":modo==="aperturas"?"aperturas":"hoy");
  const [pgn, setPgn] = useState(""), [color, setColor] = useState<"w" | "b">("w"), [error, setError] = useState("");
  const [fuente, setFuente] = useState<FuentePartida>("lichess"), [usuario, setUsuario] = useState(""), [partidas, setPartidas] = useState<PartidaExterna[]>([]), [buscando, setBuscando] = useState(false);
  const [usuarioConsultado, setUsuarioConsultado] = useState("");
  const [analizando, setAnalizando] = useState(false), [progreso, setProgreso] = useState({ hechas: 0, total: 0 });
  const [posicionApertura,setPosicionApertura]=useState<{sesion:string;indice:number}|null>(null);
  const [seleccionActiva, setActiva] = useState<SesionEntrenamiento | null>(null), [indice, setIndice] = useState(0), [aviso, setAviso] = useState("");
  const motor = useRef<MotorEntrenamiento | null>(null), abort = useRef<AbortController | null>(null), generacion = useRef(0), buscandoRef = useRef(false);
  const archivo = useRef<HTMLInputElement>(null), respaldo = useRef<HTMLInputElement>(null), editor = useRef<HTMLTextAreaElement>(null);
  const practicaRef = useRef<HTMLElement>(null);
  const eleccionRef = useRef<HTMLDivElement>(null);
  function elegirEntrenamiento() {
    setVista("hoy");
    requestAnimationFrame(() => {
      eleccionRef.current?.focus({ preventScroll: true });
      eleccionRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    });
  }
  const activa=sesiones.find(s=>s.id===seleccionActiva?.id)??seleccionActiva;
  const idActiva = activa?.id;
  useEffect(() => {
    if (vista !== "practicar" || !window.matchMedia("(max-width: 767px)").matches) return;
    const frame = requestAnimationFrame(() => practicaRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));
    return () => cancelAnimationFrame(frame);
  }, [vista, idActiva]);
  useEffect(() => () => { generacion.current++; abort.current?.abort(); motor.current?.destruir(); }, []);
  const habituales = activa ? ejerciciosPersonales(activa) : [];
  const elegidaApertura=activa&&posicionApertura?.sesion===activa.id?activa.resultado.jugadas[posicionApertura.indice]:null;
  const ejercicios = elegidaApertura&&posicionApertura?[{id:String(posicionApertura.indice),jugada:elegidaApertura,tema:"Decisiones en la apertura"},...habituales.filter(e=>e.id!==String(posicionApertura.indice))]:habituales;
  const ejercicio = ejercicios[indice];
  function guardar(sesion: SesionEntrenamiento) {
    try { guardarSesion(sesion); setActiva(sesion); }
    catch { setAviso("No pudimos guardar esa sesión. Descargá una copia antes de cerrar."); }
  }
  async function analizar(pgnAnalisis=pgn,colorAnalisis=color,volverAperturas=false) {
    if (analizando) return;
    setError(""); setAviso("");
    let entrada;
    try { entrada = validarPgnEntrenamiento(pgnAnalisis); } catch (e) { setError(e instanceof Error ? e.message : "Revisá que el PGN sea válido."); return; }
    const turno = ++generacion.current;
    const controlador = new AbortController(); abort.current = controlador;
    let actual: MotorEntrenamiento | null = null;
    setAnalizando(true); setProgreso({ hechas: 0, total: 0 });
    try {
      actual = new MotorEntrenamiento(); motor.current = actual;
      const resultado = await analizarPartida(entrada.pgn, actual, (hechas, total) => { if (generacion.current === turno) setProgreso({ hechas, total }); }, () => ({ evaluacionCentipawns: null, mateEn: null, mejorJugada: null, variantePrincipal: null }), 650, controlador.signal);
      if (generacion.current !== turno) return;
      const sesion = crearSesionEntrenamiento(leerBibliotecaEntrenamiento(leer()), entrada.pgn, colorAnalisis, resultado, crypto.randomUUID());
      guardar(sesion); setIndice(0); setVista(volverAperturas?"aperturas":"practicar");
    } catch (e) { if (generacion.current === turno && (e as Error).name !== "AbortError") setError(e instanceof Error ? e.message : "No se pudo analizar la partida."); }
    finally { actual?.destruir(); if (generacion.current === turno) { setAnalizando(false); motor.current = null; abort.current = null; } }
  }
  function cancelar() { generacion.current++; abort.current?.abort(); motor.current?.destruir(); motor.current = null; setAnalizando(false); setAviso("Análisis detenido. Tu PGN sigue listo para reintentar."); }
  async function buscar() {
    if (!usuario.trim() || buscandoRef.current) return;
    buscandoRef.current = true; setBuscando(true); setError(""); setPartidas([]);
    const turno = generacion.current;
    try {
      const obtener = fuente === "lichess" ? obtenerPartidasLichess : obtenerPartidasChessCom;
      const lista = await obtener(usuario, 5);
      if (generacion.current === turno) { setPartidas(lista); setUsuarioConsultado(usuario.trim()); if (!lista.length) setError("No encontramos partidas recientes. También podés abrir tu PGN."); }
    } catch (e) { if (generacion.current === turno) setError(e instanceof Error ? e.message : "No se pudieron buscar las partidas."); }
    finally { buscandoRef.current = false; setBuscando(false); }
  }
  async function abrirArchivo(e: ChangeEvent<HTMLInputElement>, biblioteca = false) {
    const fichero = e.target.files?.[0]; e.target.value = ""; if (!fichero) return;
    try {
      if (fichero.size > (biblioteca ? 8000000 : 200000)) throw new Error("El archivo es demasiado grande.");
      const texto = await fichero.text();
      if (biblioteca) {
        const contenido=JSON.parse(texto);
        const importadas = leerBibliotecaEntrenamiento(JSON.stringify(Array.isArray(contenido)?contenido:contenido?.sesiones));
        const guia=contenido?.version===2&&contenido?.guiado?.version===1?leerProgresoGuiado(JSON.stringify(contenido.guiado)):undefined;
        if (!importadas.length&&!guia) throw new Error("Esa copia no contiene sesiones válidas de entrenamiento.");
        for (const s of importadas) validarPgnEntrenamiento(s.pgn);
        importar(importadas,guia); setAviso("Biblioteca recuperada. Tus sesiones anteriores se conservaron.");
      } else { setPgn(validarPgnEntrenamiento(texto).pgn); setError(""); }
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos abrir ese archivo."); }
  }
  function descargar() {
    const copia = activa ? [activa, ...sesiones.filter(s => s.id !== activa.id)] : sesiones;
    const url = URL.createObjectURL(new Blob([JSON.stringify({version:2,sesiones:copia,guiado}, null, 2)], { type: "application/json" }));
    const enlace = document.createElement("a"); enlace.href = url; enlace.download = "atlantida-mi-entrenamiento.json"; enlace.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function practicar(s: SesionEntrenamiento, i = 0) { setPosicionApertura(null); setActiva(s); setIndice(i); setVista("practicar"); }
  function actualizarActiva(cambiar: (s: SesionEntrenamiento) => SesionEntrenamiento) {
    if (!activa) return;
    const ultima = leerBibliotecaEntrenamiento(leer()).find(s => s.id === activa.id) ?? activa;
    guardar(cambiar(ultima));
  }
  function elegirPartida(p: PartidaExterna) {
    try { setPgn(validarPgnEntrenamiento(p.pgn).pgn); setColor(p.negras.toLowerCase() === usuarioConsultado.toLowerCase() ? "b" : "w"); setError(""); }
    catch { setError("No pudimos abrir esa partida. Probá otra o cargá su PGN."); }
  }
  function elegirBot(p:PartidaBotRegistrada){setPgn(p.pgn);setColor(p.color);setError("");setVista("analizar");setAviso("Partida cargada con tu color. Pulsá «Encontrar mis momentos críticos» para analizarla.");requestAnimationFrame(()=>editor.current?.scrollIntoView({block:"center",behavior:"smooth"}));}
  function empezar() { setVista("analizar"); }
  return <div className="training-club"><aside className="training-beta-notice" aria-label="Entrenamiento en modo prueba"><strong>Estamos en modo prueba.</strong><span>Podés probar el entrenamiento gratis por ahora. Más adelante tendrá un costo.</span></aside>
    <section className="training-hero panel"><div><p className="eyebrow">Entrenamiento Atlántida · Versión de prueba</p><h1>Primero pensá.<br/><span>Después, mové.</span></h1><p>Reconocé una idea, compará candidatas, evaluá la posición o prepará tus aperturas. Elegí lo que necesitás trabajar y volvé a repasarlo cuando toque.</p></div><div className="training-hero-action"><button type="button" className="button-primary" onClick={elegirEntrenamiento}>Elegir mi entrenamiento<Icono nombre="flecha" className="h-4 w-4"/></button><span>Sesiones cortas · A tu ritmo</span>{esAdmin && <Link href="/entrenamiento/entrenador" className="text-link">Herramientas del profe ↗</Link>}</div></section>
    <div className="training-account"><div><p role="status">{!conCuenta ? errorLocal?"No pudimos guardar la copia local. Descargá un respaldo antes de salir.":"Podés probar sin sesión. Tu práctica queda en este navegador; iniciá sesión para continuar desde tu cuenta." : estado==="guardado"?"Guardado en tu cuenta. Podés continuar desde el celular o la computadora.":estado==="cargando"||estado==="guardando"?"Sincronizando tu entrenamiento con la cuenta…":errorLocal?"No pudimos confirmar el guardado. Reintentá o descargá una copia.":"El avance queda en este navegador y está pendiente de sincronizar con tu cuenta."}</p>{conCuenta&&estado==="pendiente"&&<button type="button" className="text-link" onClick={()=>void reintentar()}>Reintentar guardado</button>}{conCuenta&&errorLocal&&estado==="guardado"&&<p>La cuenta está guardada, pero este navegador no pudo conservar una copia local.</p>}</div><AuthWidget/></div>
    {conCuenta&&!invitadoImportado&&(invitado.sesiones.length>0||Object.keys(invitado.guiado?.ejercicios??{}).length>0||Object.keys(invitado.guiado?.aperturas?.lineas??{}).length>0)&&<div className="training-message"><p>Hay práctica de invitado guardada en este navegador. Si es tuya, podés sumarla a tu cuenta.</p><button type="button" className="text-link" onClick={()=>{importar(invitado.sesiones,invitado.guiado);setInvitadoImportado(true);setAviso("Práctica de invitado incorporada a tu entrenamiento.");}}>Traer mi práctica de invitado</button></div>}
    <div className="training-metrics">{[{ titulo: "Partidas revisadas", valor: resumen.partidas }, { titulo: "Posiciones resueltas sin ayuda", valor: resumen.resueltos + resueltosGuiados }, { titulo: "Repasos pendientes", valor: resumen.pendientes.length + pendientesGuiados }].map(m => <div key={m.titulo} className="panel"><strong>{m.valor}</strong><span>{m.titulo}</span></div>)}</div>
    <div className="training-tabs segmented-control" role="group" aria-label="Tu entrenamiento">{([{ id: "hoy", texto: "Entrenar hoy" }, { id: "aperturas", texto: "Mis aperturas" }, { id: "plan", texto: "Mi plan" }, { id: "analizar", texto: "Revisar partida" }, { id: "practicar", texto: "Practicar errores" }, { id: "biblioteca", texto: "Mi biblioteca" }] as const).map(t => <button type="button" key={t.id} aria-pressed={vista === t.id} onClick={() => setVista(t.id)}>{t.texto}</button>)}</div>
    {analizando && <div className="training-analysis-progress panel" role="status"><div><strong>Revisando tu partida con Stockfish</strong><p>{progreso.total ? `${progreso.hechas} de ${progreso.total} posiciones` : "Cargando el motor…"} · Podés recorrer el plan mientras termina.</p><progress value={progreso.hechas} max={progreso.total || 1}/></div><button type="button" className="button-secondary" onClick={cancelar}>Detener</button></div>}
    {error && <p role="alert" className="training-message">{error}</p>}{aviso && <p role="status" className="training-message">{aviso}</p>}
    {vista === "hoy" && <div ref={eleccionRef} tabIndex={-1} style={{scrollMarginTop: "12px"}} aria-label="Elegir mi entrenamiento"><EntrenarHoy sesiones={sesiones} progreso={guiado} eloClub={eloClub} jugadorId={conCuenta?identidad.jugador?.id??null:null} esperandoNivel={esperandoNivel} alGuardarProgreso={guardarGuiado} alRevisarPartida={empezar} alPracticarPersonal={practicar}/></div>}
    {vista === "aperturas" && <TallerAperturas repertorio={guiado.aperturas} sesiones={sesiones} analizando={analizando} alGuardar={aperturas=>guardarGuiado({...guiado,aperturas})} alAnalizar={(entrada,c)=>{setPgn(entrada);setColor(c);void analizar(entrada,c,true);}} alPracticar={(s,i)=>{practicar(s,0);setPosicionApertura({sesion:s.id,indice:i});}}/>}
    {vista === "plan" && <section className="training-plan panel"><div className="training-section-heading"><div><p className="eyebrow">Un primer mes con dirección</p><h2>Revisar. Pensar. Volver a probar.</h2><p>Tres sesiones por semana de unos 15 minutos. Reservá la primera para analizar una partida; las siguientes, para practicar y repasar.</p></div><span className="training-focus">{resumen.foco ? <>Tu foco actual: <strong>{resumen.foco}</strong></> : "Tu primera partida nos dará un punto de partida."}</span></div><div className="training-weeks" role="group" aria-label="Semanas del plan">{PLAN_ENTRENAMIENTO.map((s, i) => <button type="button" key={s.titulo} aria-pressed={semana === i} onClick={() => setSemana(i)}><span>Semana {i + 1}</span><strong>{s.titulo}</strong></button>)}</div><div className="training-week-detail"><h3>{PLAN_ENTRENAMIENTO[semana].objetivo}</h3><ol>{PLAN_ENTRENAMIENTO[semana].pasos.map((p, i) => <li key={p}><span>{String(i + 1).padStart(2, "0")}</span>{p}</li>)}</ol></div><div className="training-plan-actions"><button type="button" className="button-primary" onClick={empezar}>Revisar mi partida →</button><Link href="/jugar" className="button-secondary">Practicar contra un bot</Link><Link href="/noticias/sumate-a-nuestro-grupo-de-estudio" className="text-link">Estudio con el club · jueves 18:30 ↗</Link></div><p className="training-plan-note">El motor ayuda a comparar jugadas. Las posiciones difíciles también merecen una conversación con el profe: no todas se explican con un número.</p></section>}
    {vista === "analizar" && <PartidasBotsEntrenamiento cuenta={cuenta} elegir={elegirBot} disabled={analizando} solicitada={solicitada}/>}
    {vista === "analizar" && <section className="training-import panel"><div><p className="eyebrow">01 · Traé una partida</p><h2>Una que te haya dejado pensando.</h2><p>Abrí un PGN o elegí una partida pública de Lichess o Chess.com. Marcá tu color: practicaremos tus decisiones.</p></div><div className="training-import-grid"><div><div className="training-file-actions"><button type="button" className="button-secondary" disabled={analizando} onClick={() => archivo.current?.click()}>Abrir PGN</button><button type="button" className="text-link" disabled={analizando} onClick={() => { setPgn(PGN_EJEMPLO); setColor("w"); setError(""); editor.current?.focus(); }}>Probar con un ejemplo</button></div><label className="training-field">PGN de la partida<textarea ref={editor} value={pgn} maxLength={200000} disabled={analizando} onChange={e => setPgn(e.target.value)} placeholder="Pegá aquí las jugadas de tu partida…"/></label><fieldset className="training-color"><legend>¿Con qué color jugaste?</legend>{(["w", "b"] as const).map(c => <label key={c}><input type="radio" name="training-color" checked={color === c} disabled={analizando} onChange={() => setColor(c)}/>{c === "w" ? "Blancas" : "Negras"}</label>)}</fieldset><button type="button" className="button-primary" disabled={analizando || !pgn.trim()} onClick={() => void analizar()}>{analizando ? "Analizando…" : "Encontrar mis momentos críticos"}</button></div><div className="training-online"><h3>Desde tu cuenta de ajedrez</h3><form onSubmit={e => { e.preventDefault(); void buscar(); }}><label className="training-field">Plataforma<select value={fuente} disabled={buscando || analizando} onChange={e => { setFuente(e.target.value as FuentePartida); setPartidas([]); }}><option value="lichess">Lichess</option><option value="chesscom">Chess.com</option></select></label><label className="training-field">Nombre de usuario<input value={usuario} maxLength={80} disabled={buscando || analizando} onChange={e => setUsuario(e.target.value)} required placeholder="Tu usuario de ajedrez"/></label><button type="submit" className="button-secondary" disabled={buscando || analizando || !usuario.trim()}>{buscando ? "Buscando…" : "Buscar últimas partidas"}</button></form><div className="training-game-picker">{partidas.map((p, i) => <button type="button" key={i} disabled={analizando} onClick={() => { elegirPartida(p); }}><strong>{p.blancas} · {p.negras}</strong><span>{p.fecha} · {p.resultado} · {p.apertura}</span></button>)}</div></div></div><input ref={archivo} type="file" accept=".pgn,text/plain,application/x-chess-pgn" className="sr-only" tabIndex={-1} aria-label="Archivo de partida PGN" onChange={e => void abrirArchivo(e)}/></section>}
    {vista === "practicar" && <section ref={practicaRef} className="training-practice panel"><div className="training-section-heading"><div><p className="eyebrow">02 · Elegí otra decisión</p><h2>{activa ? activa.titulo : "El tablero te está esperando."}</h2><p>Sin respuesta a la vista. Pensá la amenaza, elegí candidatos y recién después mové.</p></div>{activa && <span className="training-focus">{activa.color === "w" ? "Tus jugadas de blancas" : "Tus jugadas de negras"}</span>}</div>{ejercicio && activa ? <div className="training-practice-grid"><EjercicioEntrenamiento key={`${activa.id}:${ejercicio.id}`} ejercicio={ejercicio} practica={activa.practicas[ejercicio.id]} nota={activa.notas?.[ejercicio.id]} alGuardarNota={nota => actualizarActiva(s => {const ahora=new Date().toISOString();return { ...s, actualizada: ahora, notas: { ...s.notas, [ejercicio.id]: nota }, notasActualizadas:{...s.notasActualizadas,[ejercicio.id]:ahora} };})} alIntentar={(acierto, ayudado) => actualizarActiva(s => {const ahora=new Date().toISOString();return { ...s, actualizada: ahora, practicas: { ...s.practicas, [ejercicio.id]: registrarPractica(s.practicas[ejercicio.id], acierto, ayudado) },practicasActualizadas:{...s.practicasActualizadas,[ejercicio.id]:ahora} };})}/><aside className="training-practice-aside"><p className="eyebrow">Tu rutina de cálculo</p><ol><li>¿Qué cambió con la última jugada?</li><li>¿Qué jaques, capturas y amenazas hay?</li><li>¿Cuál es la mejor respuesta del rival?</li><li>Comprobá tu decisión antes de mover.</li></ol><h3>Momentos para practicar</h3><div className="training-exercise-picker">{ejercicios.map((e, i) => <button type="button" key={e.id} aria-pressed={indice === i} onClick={() => setIndice(i)}><span>Posición {i + 1} · jugada {e.jugada.numero}</span><strong>{e.tema}</strong><small>{(activa.practicas[e.id]?.aciertos ?? 0) > 0 ? "Ya resuelta sin ayuda" : "Por practicar"}</small></button>)}</div><button type="button" className="text-link" onClick={elegirEntrenamiento}>Volver a Entrenar hoy ↗</button><button type="button" className="text-link" onClick={() => setVista("biblioteca")}>Elegir otra partida ↗</button></aside></div> : <div className="training-empty"><Icono nombre="idea" className="h-8 w-8"/><h3>{activa ? "No encontramos errores claros para este color." : "Primero, una partida tuya."}</h3><p>{activa ? "El análisis es una estimación: no encontrar pérdidas grandes no significa que todas las jugadas sean perfectas. Sumá otra partida para seguir trabajando." : "La práctica se arma con los momentos críticos de tus partidas, no con posiciones al azar."}</p><button type="button" className="button-primary" onClick={empezar}>Revisar una partida</button></div>}</section>}
    {vista === "biblioteca" && <section className="training-library panel"><div className="training-section-heading"><div><p className="eyebrow">03 · Que el trabajo no se pierda</p><h2>Tu biblioteca de entrenamiento.</h2><p>Retomá las posiciones de una partida. La práctica y los errores quedan guardados junto a ella.</p></div><div className="training-file-actions"><button type="button" className="button-secondary" disabled={!sesiones.length && !activa && !Object.keys(guiado.ejercicios).length && !Object.keys(guiado.aperturas?.lineas??{}).length} onClick={descargar}>Descargar copia</button><button type="button" className="text-link" onClick={() => respaldo.current?.click()}>Abrir una copia</button></div></div>{sesiones.length ? <div className="training-library-list">{sesiones.map(s => { const es = ejerciciosPersonales(s), resueltas = es.filter(e => (s.practicas[e.id]?.aciertos ?? 0) > 0).length; return <article key={s.id}><div><h3>{s.titulo}</h3><p>{new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short", timeZone: "America/Montevideo" }).format(new Date(s.creada))} · {s.color === "w" ? "Blancas" : "Negras"} · {es.length} {es.length === 1 ? "posición" : "posiciones"} para practicar</p><span>{resueltas} resueltas sin ayuda</span></div><button type="button" className="button-secondary" onClick={() => practicar(s)}>Retomar →</button></article>; })}</div> : <div className="training-empty"><p>Tu primera revisión aparecerá acá.</p><button type="button" className="button-primary" onClick={empezar}>Empezar mi entrenamiento</button></div>}<input ref={respaldo} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="Copia de biblioteca de entrenamiento" onChange={e => void abrirArchivo(e, true)}/></section>}
  </div>;
}
