"use client";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import Link from "next/link";
import {PartidasBotsEntrenamiento} from "./PartidasBotsEntrenamiento";
import type {PartidaBotRegistrada} from "@/lib/partidasBots";
import { useAuth } from "@/context/AuthContext";
import { AuthWidget } from "./AuthWidget";
import { Icono } from "./Icono";
import { EjercicioEntrenamiento } from "./EjercicioEntrenamiento";
import { MotorEntrenamiento } from "@/lib/motorEntrenamiento";
import { analizarPartida, obtenerPartidasLichess, obtenerPartidasChessCom, type FuentePartida, type PartidaExterna } from "@/lib/analisisPartidas";
import { crearSesionEntrenamiento, ejerciciosPersonales, leerBibliotecaEntrenamiento, registrarPractica, resumenEntrenamiento, validarPgnEntrenamiento, PLAN_ENTRENAMIENTO, PGN_EJEMPLO, type SesionEntrenamiento } from "@/lib/entrenamientoPersonal";

function escucharBiblioteca(cb: () => void) { window.addEventListener("storage", cb); window.addEventListener("entrenamiento-guardado", cb); return () => { window.removeEventListener("storage", cb); window.removeEventListener("entrenamiento-guardado", cb); }; }
export function EntrenamientoClub() {
  const { session, esAdmin, cargando } = useAuth();
  const solicitada=useSyncExternalStore(cb=>{window.addEventListener("popstate",cb);return()=>window.removeEventListener("popstate",cb);},()=>new URL(window.location.href).searchParams.get("partida"),()=>null);
  if (cargando) return <p role="status" className="panel p-6">Preparando tu entrenamiento…</p>;
  return <TallerEntrenamiento key={(session?.user.id ?? "invitado")+":"+(solicitada??"")} solicitada={solicitada} cuenta={session?.user.id ?? "invitado"} conCuenta={!!session} esAdmin={esAdmin}/>;
}
function TallerEntrenamiento({ cuenta, conCuenta, esAdmin, solicitada }: { cuenta: string; conCuenta: boolean; esAdmin: boolean; solicitada?:string|null }) {
  const clave = `atlantida-entrenamiento-v1:${cuenta}`;
  const leer = () => { try { return localStorage.getItem(clave) ?? "[]"; } catch { return "[]"; } };
  const guardado = useSyncExternalStore(escucharBiblioteca, leer, () => "[]");
  const sesiones = useMemo(() => leerBibliotecaEntrenamiento(guardado), [guardado]);
  const resumen = useMemo(() => resumenEntrenamiento(sesiones), [sesiones]);
  const [semana, setSemana] = useState(0), [vista, setVista] = useState<"plan" | "analizar" | "practicar" | "biblioteca">(solicitada?"analizar":"plan");
  const [pgn, setPgn] = useState(""), [color, setColor] = useState<"w" | "b">("w"), [error, setError] = useState("");
  const [fuente, setFuente] = useState<FuentePartida>("lichess"), [usuario, setUsuario] = useState(""), [partidas, setPartidas] = useState<PartidaExterna[]>([]), [buscando, setBuscando] = useState(false);
  const [usuarioConsultado, setUsuarioConsultado] = useState("");
  const [analizando, setAnalizando] = useState(false), [progreso, setProgreso] = useState({ hechas: 0, total: 0 });
  const [activa, setActiva] = useState<SesionEntrenamiento | null>(null), [indice, setIndice] = useState(0), [aviso, setAviso] = useState("");
  const motor = useRef<MotorEntrenamiento | null>(null), abort = useRef<AbortController | null>(null), generacion = useRef(0), buscandoRef = useRef(false);
  const archivo = useRef<HTMLInputElement>(null), respaldo = useRef<HTMLInputElement>(null), editor = useRef<HTMLTextAreaElement>(null);
  const practicaRef = useRef<HTMLElement>(null);
  const idActiva = activa?.id;
  useEffect(() => {
    if (vista !== "practicar" || !window.matchMedia("(max-width: 767px)").matches) return;
    const frame = requestAnimationFrame(() => practicaRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));
    return () => cancelAnimationFrame(frame);
  }, [vista, idActiva]);
  useEffect(() => () => { generacion.current++; abort.current?.abort(); motor.current?.destruir(); }, []);
  const ejercicios = activa ? ejerciciosPersonales(activa) : [];
  const ejercicio = ejercicios[indice];
  function guardar(sesion: SesionEntrenamiento) {
    const todas = leerBibliotecaEntrenamiento(leer());
    const nuevas = [sesion, ...todas.filter(s => s.id !== sesion.id)].sort((a, b) => b.creada.localeCompare(a.creada));
    try { localStorage.setItem(clave, JSON.stringify(nuevas)); window.dispatchEvent(new Event("entrenamiento-guardado")); }
    catch { setAviso("El navegador no pudo guardar el avance. Descargá una copia de tu biblioteca antes de cerrar."); }
    setActiva(sesion);
  }
  async function analizar() {
    if (analizando) return;
    setError(""); setAviso("");
    let entrada;
    try { entrada = validarPgnEntrenamiento(pgn); } catch (e) { setError(e instanceof Error ? e.message : "Revisá que el PGN sea válido."); return; }
    const turno = ++generacion.current;
    const controlador = new AbortController(); abort.current = controlador;
    let actual: MotorEntrenamiento | null = null;
    setAnalizando(true); setProgreso({ hechas: 0, total: 0 });
    try {
      actual = new MotorEntrenamiento(); motor.current = actual;
      const resultado = await analizarPartida(entrada.pgn, actual, (hechas, total) => { if (generacion.current === turno) setProgreso({ hechas, total }); }, () => ({ evaluacionCentipawns: null, mateEn: null, mejorJugada: null, variantePrincipal: null }), 650, controlador.signal);
      if (generacion.current !== turno) return;
      const sesion = crearSesionEntrenamiento(leerBibliotecaEntrenamiento(leer()), entrada.pgn, color, resultado, crypto.randomUUID());
      guardar(sesion); setIndice(0); setVista("practicar");
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
        const importadas = leerBibliotecaEntrenamiento(texto);
        if (!importadas.length) throw new Error("Esa copia no contiene sesiones válidas de entrenamiento.");
        for (const s of importadas) validarPgnEntrenamiento(s.pgn);
        const porId = new Map(sesiones.map(s => [s.id, s]));
        for (const s of importadas) { const previa = porId.get(s.id); if (!previa || s.actualizada > previa.actualizada) porId.set(s.id, s); }
        localStorage.setItem(clave, JSON.stringify([...porId.values()].sort((a, b) => b.creada.localeCompare(a.creada)))); window.dispatchEvent(new Event("entrenamiento-guardado")); setAviso("Biblioteca recuperada. Tus sesiones anteriores se conservaron.");
      } else { setPgn(validarPgnEntrenamiento(texto).pgn); setError(""); }
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos abrir ese archivo."); }
  }
  function descargar() {
    const copia = activa ? [activa, ...sesiones.filter(s => s.id !== activa.id)] : sesiones;
    const url = URL.createObjectURL(new Blob([JSON.stringify(copia, null, 2)], { type: "application/json" }));
    const enlace = document.createElement("a"); enlace.href = url; enlace.download = "atlantida-mi-entrenamiento.json"; enlace.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function practicar(s: SesionEntrenamiento, i = 0) { setActiva(s); setIndice(i); setVista("practicar"); }
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
    <section className="training-hero panel"><div><p className="eyebrow">Entrenamiento Atlántida · Versión de prueba</p><h1>Tu próxima mejora<br/><span>está en tus partidas.</span></h1><p>Encontrá el error, practicá la decisión y volvé a verla otro día. Un plan concreto para que estudiar se convierta en jugar mejor.</p></div><div className="training-hero-action"><button type="button" className="button-primary" onClick={resumen.pendientes.length ? () => { const e = resumen.pendientes[0]; practicar(e.sesion, ejerciciosPersonales(e.sesion).findIndex(x => x.id === e.id)); } : empezar}>{resumen.pendientes.length ? "Retomar mi repaso" : "Empezar con una partida"}<Icono nombre="flecha" className="h-4 w-4"/></button><span>Sesiones cortas · A tu ritmo</span>{esAdmin && <Link href="/entrenamiento/entrenador" className="text-link">Herramientas del profe ↗</Link>}</div></section>
    <div className="training-account"><p>{conCuenta ? "Tus notas, ejercicios y repasos se guardan en este navegador. Las partidas contra bots también quedan en tu cuenta." : "Podés probar sin sesión. El avance de invitado queda en este navegador y separado del de tu cuenta."} Usá una copia para llevarlo a otro dispositivo.</p><AuthWidget/></div>
    <div className="training-metrics">{[{ titulo: "Partidas revisadas", valor: resumen.partidas }, { titulo: "Posiciones resueltas sin ayuda", valor: resumen.resueltos }, { titulo: "Repasos pendientes", valor: resumen.pendientes.length }].map(m => <div key={m.titulo} className="panel"><strong>{m.valor}</strong><span>{m.titulo}</span></div>)}</div>
    <div className="training-tabs segmented-control" role="group" aria-label="Tu entrenamiento">{([{ id: "plan", texto: "Mi plan" }, { id: "analizar", texto: "Revisar partida" }, { id: "practicar", texto: "Practicar errores" }, { id: "biblioteca", texto: "Mi biblioteca" }] as const).map(t => <button type="button" key={t.id} aria-pressed={vista === t.id} onClick={() => setVista(t.id)}>{t.texto}</button>)}</div>
    {analizando && <div className="training-analysis-progress panel" role="status"><div><strong>Revisando tu partida con Stockfish</strong><p>{progreso.total ? `${progreso.hechas} de ${progreso.total} posiciones` : "Cargando el motor…"} · Podés recorrer el plan mientras termina.</p><progress value={progreso.hechas} max={progreso.total || 1}/></div><button type="button" className="button-secondary" onClick={cancelar}>Detener</button></div>}
    {error && <p role="alert" className="training-message">{error}</p>}{aviso && <p role="status" className="training-message">{aviso}</p>}
    {vista === "plan" && <section className="training-plan panel"><div className="training-section-heading"><div><p className="eyebrow">Un primer mes con dirección</p><h2>Revisar. Pensar. Volver a probar.</h2><p>Tres sesiones por semana de unos 15 minutos. Reservá la primera para analizar una partida; las siguientes, para practicar y repasar.</p></div><span className="training-focus">{resumen.foco ? <>Tu foco actual: <strong>{resumen.foco}</strong></> : "Tu primera partida nos dará un punto de partida."}</span></div><div className="training-weeks" role="group" aria-label="Semanas del plan">{PLAN_ENTRENAMIENTO.map((s, i) => <button type="button" key={s.titulo} aria-pressed={semana === i} onClick={() => setSemana(i)}><span>Semana {i + 1}</span><strong>{s.titulo}</strong></button>)}</div><div className="training-week-detail"><h3>{PLAN_ENTRENAMIENTO[semana].objetivo}</h3><ol>{PLAN_ENTRENAMIENTO[semana].pasos.map((p, i) => <li key={p}><span>{String(i + 1).padStart(2, "0")}</span>{p}</li>)}</ol></div><div className="training-plan-actions"><button type="button" className="button-primary" onClick={empezar}>Revisar mi partida →</button><Link href="/jugar" className="button-secondary">Practicar contra un bot</Link><Link href="/noticias/sumate-a-nuestro-grupo-de-estudio" className="text-link">Estudio con el club · jueves 18:30 ↗</Link></div><p className="training-plan-note">El motor ayuda a comparar jugadas. Las posiciones difíciles también merecen una conversación con el profe: no todas se explican con un número.</p></section>}
    {vista === "analizar" && <PartidasBotsEntrenamiento cuenta={cuenta} elegir={elegirBot} disabled={analizando} solicitada={solicitada}/>}
    {vista === "analizar" && <section className="training-import panel"><div><p className="eyebrow">01 · Traé una partida</p><h2>Una que te haya dejado pensando.</h2><p>Abrí un PGN o elegí una partida pública de Lichess o Chess.com. Marcá tu color: practicaremos tus decisiones.</p></div><div className="training-import-grid"><div><div className="training-file-actions"><button type="button" className="button-secondary" disabled={analizando} onClick={() => archivo.current?.click()}>Abrir PGN</button><button type="button" className="text-link" disabled={analizando} onClick={() => { setPgn(PGN_EJEMPLO); setColor("w"); setError(""); editor.current?.focus(); }}>Probar con un ejemplo</button></div><label className="training-field">PGN de la partida<textarea ref={editor} value={pgn} maxLength={200000} disabled={analizando} onChange={e => setPgn(e.target.value)} placeholder="Pegá aquí las jugadas de tu partida…"/></label><fieldset className="training-color"><legend>¿Con qué color jugaste?</legend>{(["w", "b"] as const).map(c => <label key={c}><input type="radio" name="training-color" checked={color === c} disabled={analizando} onChange={() => setColor(c)}/>{c === "w" ? "Blancas" : "Negras"}</label>)}</fieldset><button type="button" className="button-primary" disabled={analizando || !pgn.trim()} onClick={() => void analizar()}>{analizando ? "Analizando…" : "Encontrar mis momentos críticos"}</button></div><div className="training-online"><h3>Desde tu cuenta de ajedrez</h3><form onSubmit={e => { e.preventDefault(); void buscar(); }}><label className="training-field">Plataforma<select value={fuente} disabled={buscando || analizando} onChange={e => { setFuente(e.target.value as FuentePartida); setPartidas([]); }}><option value="lichess">Lichess</option><option value="chesscom">Chess.com</option></select></label><label className="training-field">Nombre de usuario<input value={usuario} maxLength={80} disabled={buscando || analizando} onChange={e => setUsuario(e.target.value)} required placeholder="Tu usuario de ajedrez"/></label><button type="submit" className="button-secondary" disabled={buscando || analizando || !usuario.trim()}>{buscando ? "Buscando…" : "Buscar últimas partidas"}</button></form><div className="training-game-picker">{partidas.map((p, i) => <button type="button" key={i} disabled={analizando} onClick={() => { elegirPartida(p); }}><strong>{p.blancas} · {p.negras}</strong><span>{p.fecha} · {p.resultado} · {p.apertura}</span></button>)}</div></div></div><input ref={archivo} type="file" accept=".pgn,text/plain,application/x-chess-pgn" className="sr-only" tabIndex={-1} aria-label="Archivo de partida PGN" onChange={e => void abrirArchivo(e)}/></section>}
    {vista === "practicar" && <section ref={practicaRef} className="training-practice panel"><div className="training-section-heading"><div><p className="eyebrow">02 · Elegí otra decisión</p><h2>{activa ? activa.titulo : "El tablero te está esperando."}</h2><p>Sin respuesta a la vista. Pensá la amenaza, elegí candidatos y recién después mové.</p></div>{activa && <span className="training-focus">{activa.color === "w" ? "Tus jugadas de blancas" : "Tus jugadas de negras"}</span>}</div>{ejercicio && activa ? <div className="training-practice-grid"><EjercicioEntrenamiento key={`${activa.id}:${ejercicio.id}`} ejercicio={ejercicio} practica={activa.practicas[ejercicio.id]} nota={activa.notas?.[ejercicio.id]} alGuardarNota={nota => actualizarActiva(s => ({ ...s, actualizada: new Date().toISOString(), notas: { ...s.notas, [ejercicio.id]: nota } }))} alIntentar={(acierto, ayudado) => actualizarActiva(s => ({ ...s, actualizada: new Date().toISOString(), practicas: { ...s.practicas, [ejercicio.id]: registrarPractica(s.practicas[ejercicio.id], acierto, ayudado) } }))}/><aside className="training-practice-aside"><p className="eyebrow">Tu rutina de cálculo</p><ol><li>¿Qué cambió con la última jugada?</li><li>¿Qué jaques, capturas y amenazas hay?</li><li>¿Cuál es la mejor respuesta del rival?</li><li>Comprobá tu decisión antes de mover.</li></ol><h3>Momentos para practicar</h3><div className="training-exercise-picker">{ejercicios.map((e, i) => <button type="button" key={e.id} aria-pressed={indice === i} onClick={() => setIndice(i)}><span>Posición {i + 1} · jugada {e.jugada.numero}</span><strong>{e.tema}</strong><small>{(activa.practicas[e.id]?.aciertos ?? 0) > 0 ? "Ya resuelta sin ayuda" : "Por practicar"}</small></button>)}</div><button type="button" className="text-link" onClick={() => setVista("biblioteca")}>Elegir otra partida ↗</button></aside></div> : <div className="training-empty"><Icono nombre="idea" className="h-8 w-8"/><h3>{activa ? "No encontramos errores claros para este color." : "Primero, una partida tuya."}</h3><p>{activa ? "El análisis es una estimación: no encontrar pérdidas grandes no significa que todas las jugadas sean perfectas. Sumá otra partida para seguir trabajando." : "La práctica se arma con los momentos críticos de tus partidas, no con posiciones al azar."}</p><button type="button" className="button-primary" onClick={empezar}>Revisar una partida</button></div>}</section>}
    {vista === "biblioteca" && <section className="training-library panel"><div className="training-section-heading"><div><p className="eyebrow">03 · Que el trabajo no se pierda</p><h2>Tu biblioteca de entrenamiento.</h2><p>Retomá las posiciones de una partida. La práctica y los errores quedan guardados junto a ella.</p></div><div className="training-file-actions"><button type="button" className="button-secondary" disabled={!sesiones.length && !activa} onClick={descargar}>Descargar copia</button><button type="button" className="text-link" onClick={() => respaldo.current?.click()}>Abrir una copia</button></div></div>{sesiones.length ? <div className="training-library-list">{sesiones.map(s => { const es = ejerciciosPersonales(s), resueltas = es.filter(e => (s.practicas[e.id]?.aciertos ?? 0) > 0).length; return <article key={s.id}><div><h3>{s.titulo}</h3><p>{new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short", timeZone: "America/Montevideo" }).format(new Date(s.creada))} · {s.color === "w" ? "Blancas" : "Negras"} · {es.length} {es.length === 1 ? "posición" : "posiciones"} para practicar</p><span>{resueltas} resueltas sin ayuda</span></div><button type="button" className="button-secondary" onClick={() => practicar(s)}>Retomar →</button></article>; })}</div> : <div className="training-empty"><p>Tu primera revisión aparecerá acá.</p><button type="button" className="button-primary" onClick={empezar}>Empezar mi entrenamiento</button></div>}<input ref={respaldo} type="file" accept=".json,application/json" className="sr-only" tabIndex={-1} aria-label="Copia de biblioteca de entrenamiento" onChange={e => void abrirArchivo(e, true)}/></section>}
  </div>;
}
