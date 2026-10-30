"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Icono } from "./Icono";
import {useSonidoPiezas} from '@/lib/useSonidoPiezas';
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { Chessboard } from "react-chessboard";
import { MotorEntrenamiento } from "@/lib/motorEntrenamiento";
import type { AnalisisPosicion } from "@/lib/stockfish";
import { sanPractica } from "@/lib/partidaPractica";
import { ayudaEnDia, resumenEntrenamiento, type SesionEntrenamiento } from "@/lib/entrenamientoPersonal";
import { BANCO_ENTRENAMIENTO, ejercicioGuiado, interpretarJugada, prepararSesionGuiada, puntuarEvaluacion, razonamientoInicial, recomendacionGuiada, registrarResultadoGuiado, resumenTemasGuiado, validarCandidatas, iniciarNivel, nivelEntrenamiento, toleranciaNivel, puntuarCandidatas, pasoTactico, type ActividadGuiada, type EjercicioGuiado, type ProgresoGuiado, type RazonamientoGuiado, type RutaGuiada } from "@/lib/entrenamientoGuiado";
import { SelectorTemasTacticos, RevisionTemasTacticos } from "./SelectorTemasTacticos";
import { PerfilEntrenamiento } from "./PerfilEntrenamiento";
import { FocoEntrenamiento } from "./FocoEntrenamiento";
import type { OrigenIntentoTactico } from "@/lib/entrenamientoTemas";
import { obtenerTema } from "@/lib/temasTacticos";
import styles from "./EntrenarHoy.module.css";
import type { ResumenPareto, EvidenciaPareto, FocoPareto } from "@/lib/entrenamientoPareto";
import { FocoPartidas } from "./FocoPartidas";

const ACTIVIDADES: { id: ActividadGuiada; titulo: string; descripcion: string; numero: string }[] = [
  { id: "tactica", titulo: "Reconocer la idea", descripcion: "Problemas reales a tu nivel. Elegí el tema y calculá la continuación.", numero: "01" },
  { id: "candidatas", titulo: "Comparar candidatas", descripcion: "Escribí dos jugadas, una respuesta a cada una y elegí tu plan.", numero: "02" },
  { id: "evaluacion", titulo: "Evaluar la posición", descripcion: "¿Quién está mejor y por cuánto? Compará tu valoración en peones.", numero: "03" },
];
const piezas: Record<string, string> = { p: "peón", n: "caballo", b: "alfil", r: "torre", q: "dama", k: "rey" };
const valorMotor = (a: AnalisisPosicion) => a.mateEn !== null ? Math.sign(a.mateEn) * (100000 - Math.abs(a.mateEn) * 100) : a.evaluacionCentipawns ?? 0;
const perdida = (a: AnalisisPosicion, b: AnalisisPosicion, color: "w" | "b") => color === "w" ? valorMotor(a) - valorMotor(b) : valorMotor(b) - valorMotor(a);
function varianteLegible(fen: string, jugadas: string[] | null, limite=4) {
  const c = new Chess(fen), textos: string[] = [];
  for (const uci of (jugadas ?? []).slice(0, limite)) { const m = interpretarJugada(c.fen(), uci); if (!m) break; c.load(m.fen); textos.push(sanPractica(m.san)); }
  return textos.join(" · ");
}
function mostrarPanel(elemento: HTMLElement | null) {
  if (!elemento) return;
  const cabecera = document.querySelector<HTMLElement>(".site-header");
  elemento.style.scrollMarginTop = `${Math.ceil(cabecera?.getBoundingClientRect().height ?? 0) + 12}px`;
  elemento.focus({preventScroll:true});
  elemento.scrollIntoView({block:"start",behavior:"instant"});
}
export function EntrenarHoy({ sesiones, progreso, pareto, alGuardarProgreso, alRevisarPartida, alPracticarPersonal, alPracticarFoco, alCambiarSesion, eloClub=null, jugadorId=null, esperandoNivel=false }: { sesiones: SesionEntrenamiento[]; progreso: ProgresoGuiado; pareto: ResumenPareto; alGuardarProgreso: (p: ProgresoGuiado) => void; alRevisarPartida: () => void; alPracticarPersonal: (s: SesionEntrenamiento, indice: number) => void; alPracticarFoco: (e: EvidenciaPareto, foco: FocoPareto) => void; alCambiarSesion?:(activa:boolean)=>void;eloClub?:number|null;jugadorId?:string|null;esperandoNivel?:boolean }) {
  const [abierto, setAbierto] = useState(false), [aviso, setAviso] = useState("");
  const recomendacion = recomendacionGuiada(progreso), resumen = resumenEntrenamiento(sesiones), sesion = progreso.sesionEnCurso;
  const ejercicio = sesion ? ejercicioGuiado(sesion.items[sesion.indice]) : undefined;
  useEffect(()=>{alCambiarSesion?.(abierto&&!sesion?.terminada);return()=>alCambiarSesion?.(false);},[abierto,sesion?.terminada,alCambiarSesion]);
  const sesionRef = useRef<HTMLDivElement>(null),finRef=useRef<HTMLDivElement>(null),avisoRef=useRef<HTMLParagraphElement>(null),panelRef=useRef<HTMLElement>(null);
  const sesionId = sesion?.id, indiceSesion = sesion?.indice, terminada = sesion?.terminada;
  useEffect(() => {
    if (!abierto && !aviso) return;
    // Wait for the parent to hide its overview before measuring the scroll target.
    let segundo=0;
    const frame=requestAnimationFrame(()=>{segundo=requestAnimationFrame(()=>{const destino=aviso?avisoRef.current:terminada?finRef.current:sesionRef.current;mostrarPanel(destino);});});
    return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(segundo);};
  }, [abierto, sesionId, indiceSesion, terminada, aviso]);
  const progresoRef = useRef(progreso);
  useEffect(() => { progresoRef.current = progreso; }, [progreso]);
  function guardar(p: ProgresoGuiado) { progresoRef.current = p; alGuardarProgreso(p); }
  function comenzar() {
    if(esperandoNivel)return;
    const p = prepararSesionGuiada(iniciarNivel(progresoRef.current,eloClub,jugadorId),new Date(),pareto.focos[0]?.temas); guardar(p);
    setAbierto(!!p.sesionEnCurso); setAviso(p.sesionEnCurso ? "" : "No hay más posiciones disponibles en este modo por hoy. Elegí otro entrenamiento o revisá una partida propia.");
  }
  function reforzarFoco(foco: FocoPareto) {
    if (esperandoNivel) return;
    const anterior = progresoRef.current;
    if (anterior.sesionEnCurso && !anterior.sesionEnCurso.terminada) { comenzar(); return; }
    const ahora = new Date();
    const p = prepararSesionGuiada(iniciarNivel({ ...anterior, actividad: foco.actividad, actividadActualizada: ahora.toISOString() }, eloClub, jugadorId, ahora), ahora, foco.temas);
    guardar(p); setAbierto(!!p.sesionEnCurso);
    setAviso(p.sesionEnCurso ? "" : "No hay posiciones nuevas ni repasos para este modo hoy. Podés revisar una partida propia o elegir otra práctica.");
  }
  function reforzarTema(tema:string) {
    if(esperandoNivel)return;
    if(progresoRef.current.sesionEnCurso&&!progresoRef.current.sesionEnCurso.terminada){comenzar();return;}
    const ahora=new Date(),p=prepararSesionGuiada(iniciarNivel({...progresoRef.current,actividad:"tactica",actividadActualizada:ahora.toISOString()},eloClub,jugadorId,ahora),ahora,[tema]);
    guardar(p);setAbierto(!!p.sesionEnCurso);setAviso(p.sesionEnCurso?"":"No hay más posiciones disponibles de este tema. Seguimos con tus repasos y otras ideas a tu nivel.");
  }
  function volverOpciones(){
    setAbierto(false);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{mostrarPanel(panelRef.current);}));
  }
  function elegirModo(actividad: ActividadGuiada) {
    guardar({ ...progresoRef.current, actividad, actividadActualizada: new Date().toISOString() }); setAviso("");
  }
  function cambiarRuta(ruta: RutaGuiada) {
    const ahora = new Date().toISOString();
    guardar({ ...progresoRef.current, ruta, rutaActualizada: ahora });
  }
  function actualizar(id: string, r: RazonamientoGuiado) {
    const p = progresoRef.current, e = p.ejercicios[id] ?? {};
    guardar({ ...p, ejercicios: { ...p.ejercicios, [id]: { ...e, razonamiento: r, razonamientoActualizada: new Date().toISOString() } } });
  }
  function intentar(id: string, acierto: boolean, ayudado: boolean, origen:OrigenIntentoTactico) { guardar(registrarResultadoGuiado(progresoRef.current, id, acierto, ayudado,new Date(),origen)); }
  function siguiente() {
    const p = progresoRef.current, s = p.sesionEnCurso; if (!s) return;
    const ultimo = s.indice === s.items.length - 1, ahora = new Date().toISOString();
    guardar({ ...p, sesionActualizada: ahora, sesionEnCurso: { ...s, indice: ultimo ? s.indice : s.indice + 1, terminada: ultimo, actualizada: ahora } });
  }
  const retenidos = Object.values(progreso.ejercicios).filter(e => (e.practica?.etapa ?? 0) >= 2).length;
  const probados = Object.values(progreso.ejercicios).filter(e => !!e.practica).length;
  const nivel=progreso.nivelInicial?nivelEntrenamiento(progreso):eloClub??1400;
  const niveles={tactica:"táctico",candidatas:"de candidatas",evaluacion:"de evaluación"};
  const entrenando=abierto&&sesion&&!sesion.terminada;
  const actividadActual=ACTIVIDADES.find(a=>a.id===progreso.actividad)!;
  const continuar=!!sesion&&!sesion.terminada;
  return <section ref={panelRef} tabIndex={-1} className={styles.hoy} aria-labelledby="entrenar-hoy-titulo" data-estudiando={!!entrenando}>
    {!entrenando&&<><div className={styles.cabecera}><div><span className={styles.eyebrow}>TU PRÁCTICA DE HOY</span><h2 id="entrenar-hoy-titulo">¿Qué querés mejorar?</h2><p>Elegí una habilidad. Tus repasos aparecen primero.</p></div><div className={styles.progreso}><strong>{probados}</strong><span>posiciones practicadas</span></div></div>
    {continuar&&<div className={styles.retomar}><span className={styles.iconoRetomar}><Icono nombre="actividad" className="h-5 w-5"/></span><div><strong>Te quedó una sesión empezada.</strong><p>{ACTIVIDADES.find(a=>a.id===ejercicio?.actividad)?.titulo} · Posición {sesion.indice+1} de {sesion.items.length}</p></div><button type="button" className="button-primary" disabled={esperandoNivel} onClick={comenzar}>Continuar mi sesión <Icono nombre="flecha" className="h-4 w-4"/></button></div>}
    <FocoPartidas resumen={pareto} alPracticar={alPracticarFoco} alRefuerzo={reforzarFoco} alCargar={alRevisarPartida} sesionPendiente={continuar} esperando={esperandoNivel}/>
    {!continuar&&<div className={styles.empezar}><div><span className={styles.eyebrow}>TU SIGUIENTE PASO</span><h3>{actividadActual.titulo}</h3><p>Hasta 5 repasos y 2 posiciones nuevas. Pensá a tu ritmo, sin reloj.</p><span className={styles.nivel}>{esperandoNivel?"Comprobando tu nivel…":`Nivel ${niveles[progreso.actividad]} · ${nivel}`}</span></div>{!continuar&&<button type="button" className="button-primary" disabled={esperandoNivel} onClick={comenzar}>{sesion?.terminada?"Seguir practicando":"Empezar a practicar"}<Icono nombre="flecha" className="h-4 w-4"/></button>}</div>}
    <div className={styles.modos} role="group" aria-label="Elegir tipo de entrenamiento">{ACTIVIDADES.map(a=><button type="button" key={a.id} aria-pressed={progreso.actividad===a.id} className={`${styles.modo} ${progreso.actividad===a.id?styles.modoActivo:""}`} onClick={()=>elegirModo(a.id)}><span className={styles.modoIcono}><Icono nombre={a.id==="tactica"?"idea":a.id==="candidatas"?"actividad":"grafico"} className="h-6 w-6"/></span><strong>{a.titulo}</strong><small>{a.descripcion}</small><span className={styles.modoPie}>{progreso.actividad===a.id?"Seleccionado":"Elegir práctica"}<span aria-hidden="true">{progreso.actividad===a.id?"✓":"↗"}</span></span></button>)}</div>
    <div className={styles.recomendacion}><Icono nombre="idea" className="h-4 w-4"/><div><strong>Una sugerencia para tu práctica</strong><p>{recomendacion.razon}</p></div><button type="button" className="text-link" onClick={()=>elegirModo(recomendacion.actividad)}>Elegir {ACTIVIDADES.find(a=>a.id===recomendacion.actividad)?.titulo.toLowerCase()} ↗</button></div>
    <PerfilEntrenamiento progreso={progreso} alReforzar={reforzarTema} esperando={esperandoNivel}/>
    {progreso.actividad==="tactica"&&<FocoEntrenamiento resumen={resumenTemasGuiado(progreso)}/>}
    <details className={styles.ajustes}><summary>Nivel y enfoque de la práctica <span aria-hidden="true">+</span></summary><p>{progreso.nivelInicial?.jugadorId?`Tu punto de partida fue tu Elo del club: ${progreso.nivelInicial.elo}.`:eloClub!==null?`Empezamos desde tu Elo del club: ${eloClub}.`:"Sin un Elo vinculado, empezamos en 1400."} Cada habilidad se ajusta según tus primeras respuestas sin ayuda. Tu Elo de torneos no cambia.</p><label className={styles.ruta}>En qué fijarme al pensar<select value={progreso.ruta} onChange={e=>cambiarRuta(e.target.value as RutaGuiada)}><option value="base">Ver amenazas</option><option value="club">Pensar antes de mover</option><option value="competencia">Valorar y comparar</option></select></label><small>{retenidos} posiciones recordadas en repasos de días distintos · {BANCO_ENTRENAMIENTO.length} posiciones en el banco.</small></details>
    </>}
    {entrenando&&<h2 id="entrenar-hoy-titulo" className="sr-only">Entrenamiento en curso</h2>}
    {aviso&&<p ref={avisoRef} tabIndex={-1} className={styles.mensaje} role="status">{aviso}</p>}
    {abierto && sesion && (sesion.terminada ? <div ref={finRef} tabIndex={-1} aria-label="Resumen de la sesión" className={styles.fin}><span className={styles.eyebrow}>SESIÓN TERMINADA</span><h3>Una idea más para tus partidas.</h3><p>Las posiciones con ayuda o error vuelven mañana. Las resueltas sin ayuda se repasan en 1, 3, 7, 14 y 30 días, según su etapa.</p><p>Podés seguir con posiciones nuevas, cambiar de entrenamiento o analizar una decisión de tus partidas.</p><div className={styles.acciones}><button type="button" className="button-primary" disabled={esperandoNivel} onClick={comenzar}>Practicar más posiciones <Icono nombre="flecha" className="h-4 w-4"/></button><button type="button" className="button-secondary" onClick={volverOpciones}>Elegir otro entrenamiento</button><button type="button" className="text-link" onClick={alRevisarPartida}>Revisar una partida</button></div></div> : ejercicio && <div ref={sesionRef} tabIndex={-1} aria-label="Sesión de entrenamiento" style={{scrollMarginTop: "12px"}} className={styles.sesion}><div className={styles.sesionCabecera}><div><span>{ACTIVIDADES.find(a => a.id === ejercicio.actividad)?.titulo}</span><strong>Posición {sesion.indice + 1} de {sesion.items.length}</strong></div><button type="button" className="text-link" onClick={volverOpciones}>← Volver a mis opciones</button></div><div className={styles.barraSesion} role="progressbar" aria-label="Avance de la sesión" aria-valuenow={sesion.indice} aria-valuemin={0} aria-valuemax={sesion.items.length}><span style={{width:`${sesion.indice/sesion.items.length*100}%`}}/></div><EjercicioDeHoy key={ejercicio.id + sesion.id} ejercicio={ejercicio} avance={progreso.ejercicios[ejercicio.id]?.razonamiento ?? razonamientoInicial()} practica={progreso.ejercicios[ejercicio.id]?.practica} alCambiar={r => actualizar(ejercicio.id, r)} alIntentar={(a, h, origen) => intentar(ejercicio.id, a, h, origen)} alSiguiente={siguiente} ultimo={sesion.indice === sesion.items.length - 1} nivel={nivelEntrenamiento(progreso,ejercicio.actividad)}/></div>)}
    {!entrenando&&resumen.pendientes.length > 0 && <div className={styles.propias}><h3>Volver a tus decisiones</h3><p>{resumen.pendientes.length} posiciones de tus partidas están listas para revisar.</p><div>{resumen.pendientes.slice(0, 3).map(e => <button type="button" key={`${e.sesion.id}-${e.id}`} className="button-secondary" onClick={() => alPracticarPersonal(e.sesion, resumen.ejercicios.filter(x => x.sesion.id === e.sesion.id).findIndex(x => x.id === e.id))}>{e.tema} · {e.jugada.numero}{e.jugada.color === "w" ? "." : "…"}</button>)}</div></div>}
    {!entrenando&&<details className={styles.metodo}><summary>Cómo entrenamos</summary><p>Tomamos de Aagaard una rutina para observar la posición: debilidades, peor pieza e idea del rival. Después comparamos candidatas y calculamos una respuesta antes de mover. Este recorrido y sus posiciones fueron preparados para el club.</p><p>La repetición espaciada vuelve a traer una posición cuando toca recordarla. Un error, una pista o un reintento no suma como acierto independiente ese día. Practicar antes del próximo repaso tampoco acelera el calendario.</p><p>La práctica táctica usa problemas reales de Lichess. Tu Elo del club fija el punto de partida; las primeras respuestas sin ayuda ajustan la dificultad. Los repasos y reintentos no suman otra vez. Candidatas y evaluación usan posiciones reales con dificultad orientativa, seleccionadas y verificadas con Stockfish. Sus niveles se ajustan por separado.</p><p>Las etiquetas usan los identificadores públicos de Lichess. Ya podés abrir una posición allí para analizarla; vincular el historial de entrenamiento de tu cuenta de Lichess es un paso aparte.</p><a href="https://database.lichess.org/#puzzles" target="_blank" rel="noopener noreferrer">Banco público de problemas de Lichess ↗</a></details>}
  </section>;
}

function EjercicioDeHoy({ ejercicio, avance, practica, alCambiar, alIntentar, alSiguiente, ultimo, nivel=1400 }: { ejercicio: EjercicioGuiado; avance: RazonamientoGuiado; practica?: import("@/lib/entrenamientoPersonal").PracticaError; alCambiar: (r: RazonamientoGuiado) => void; alIntentar: (acierto: boolean, ayudado: boolean, origen:OrigenIntentoTactico) => void; alSiguiente: () => void; ultimo: boolean; nivel?:number }) {
  const sonido=useSonidoPiezas();
  const [r, setR] = useState(avance), [seleccion, setSeleccion] = useState<Square | null>(null), [ocupado, setOcupado] = useState(false), [error, setError] = useState(""), [promocion, setPromocion] = useState<{ from: string; to: string } | null>(null);
  const referencia = useRef<AnalisisPosicion | null>(null), motor = useRef<MotorEntrenamiento | null>(null), activo = useRef(true), ocupadoRef = useRef(false), estado = useRef(r);
  useEffect(() => { activo.current = true; return () => { activo.current = false; motor.current?.destruir(); }; }, []);
  function cambiar(parche: Partial<RazonamientoGuiado>) { const siguiente = { ...estado.current, ...parche }; estado.current = siguiente; setR(siguiente); alCambiar(siguiente); }
  const inicial = new Chess(ejercicio.fen), color = inicial.turn(), partida = new Chess(ejercicio.fen);
  for (const m of r.movimientos) partida.move(m);
  const original=partida;
  const preparado = r.etapa !== "preparar";
  const conAyuda = () => estado.current.ayudado || estado.current.revelado || ayudaEnDia(practica);
  async function evaluar(fen: string): Promise<AnalisisPosicion> { if (!motor.current) motor.current = new MotorEntrenamiento(); return motor.current.evaluarPosicion(fen, new Chess(fen).turn(), 1400); }
  async function base(): Promise<AnalisisPosicion> { if (!referencia.current) referencia.current = ejercicio.actividad==="evaluacion"&&ejercicio.referencia?ejercicio.referencia:await evaluar(ejercicio.fen); return referencia.current; }
  function informar(acierto: boolean, mensaje: string, extra: Partial<RazonamientoGuiado> = {}) {
    const ayudado = conAyuda(); alIntentar(acierto, ayudado,"jugada"); cambiar({ mensaje, ayudado: ayudado || !acierto, ...extra });
  }
  async function operacion(fn: () => Promise<void>) {
    if (ocupadoRef.current) return;
    ocupadoRef.current = true; setOcupado(true); setError("");
    try { await fn(); } catch (e) { if (activo.current && (e as Error).name !== "AbortError") { motor.current?.destruir(); motor.current = null; referencia.current = null; setError("No pudimos comprobar la posición. Reintentá: esto no cuenta como error."); } }
    finally { ocupadoRef.current = false; if (activo.current) setOcupado(false); }
  }
  function comenzarResolucion() {
    if (ejercicio.actividad === "tactica") {
      if (!r.temas.length) { setError("Elegí al menos un tema antes de mover."); return; }
      // Classify after calculating: metadata describes the whole line and is not exhaustive.
      // A naming disagreement must not register a failed chess move or reveal the solution early.
      setError("");
      cambiar({ etapa: "resolver", mensaje: "Hipótesis guardada. Comprobala calculando la continuación; al terminar revisamos cada etiqueta." });
    }
  }
  async function mover(from: string, to: string, promotion?: PieceSymbol) {
    if (!preparado || r.resuelto || r.revelado || ocupadoRef.current) return;
    const entrada = from + to + (promotion ?? ""), m = interpretarJugada(partida.fen(), entrada);
    if (!m) return;
    sonido.preparar();
    setSeleccion(null); setPromocion(null);
    await operacion(async () => {
      if(ejercicio.fuente==="lichess"){
        const paso=pasoTactico(ejercicio,r.movimientos,m.uci);
        if(paso.acierto)sonido.golpear(!!new Chess(partida.fen()).move(m.uci).captured);
        if(!paso.acierto)informar(false,"Esa jugada no sostiene la variante. Mirá la respuesta del rival y probá otra vez.");
        else if(paso.terminada)informar(true,conAyuda()?"Completaste la variante. Volvé a repasarla sin ayuda otro día.":"¡Variante completa! Guardamos tu resultado y ajustamos los próximos problemas.",{movimientos:paso.movimientos,resuelto:true,etapa:"terminada"});
        else cambiar({movimientos:paso.movimientos,mensaje:"El rival respondió. Continuá la variante: todavía falta tu siguiente jugada."});
        return;
      }
      let acierto = ejercicio.solucion.includes(m.uci);
      if (!acierto) { const antes = await base(), despues = await evaluar(m.fen); acierto = perdida(antes, despues, color) <= 60; }
      if (!activo.current) return;
      if(acierto)sonido.golpear(!!new Chess(partida.fen()).move(m.uci).captured);
      if (acierto) informar(true, conAyuda() ? "Bien. Mañana volvé a reconocer la idea sin ayuda." : "¡Bien encontrada! Guardamos el repaso para otro día.", { movimientos: [m.san], resuelto: true, etapa: "terminada" });
      else informar(false, "Esa jugada deja pasar una opción mejor. Revisá el motivo y probá otra vez.");
    });
  }
  function elegir(from: string, to: string) {
    if (ejercicio.actividad !== "tactica" || !preparado || r.resuelto || r.revelado || ocupadoRef.current) return false;
    const posibles = original.moves({ square: from as Square, verbose: true }).filter(m => m.to === to);
    if (!posibles.length) return false;
    if (posibles.some(m => m.promotion)) setPromocion({ from, to }); else void mover(from, to);
    return false;
  }
  async function comprobarCandidatas() {
    const candidatas = validarCandidatas(ejercicio.fen, r.candidata1, r.candidata2, r.respuesta1, r.respuesta2);
    if (candidatas.error || !candidatas.primera || !candidatas.segunda || !candidatas.respuesta1 || !candidatas.respuesta2) { setError(candidatas.error ?? "Revisá las jugadas."); return; }
    if (r.conclusion.trim().length < 10) { setError("Explicá brevemente cuál elegís y qué buscás conseguir."); return; }
    if(r.eleccion!=="1"&&r.eleccion!=="2"){setError("Elegí con cuál de las dos candidatas te quedás.");return;}
    await operacion(async () => {
      const a = await base(), evaluacion1 = await evaluar(candidatas.primera.fen), evaluacion2 = await evaluar(candidatas.segunda.fen);
      const defensa1 = await evaluar(candidatas.respuesta1.fen), defensa2 = await evaluar(candidatas.respuesta2.fen);
      if (!activo.current) return;
      const comparacion=puntuarCandidatas(a,[evaluacion1,evaluacion2],[defensa1,defensa2],color,r.eleccion as "1"|"2",nivel);
      if(comparacion.error||comparacion.acierto===undefined){setError(comparacion.error??"No se pudo comparar. Reintentá.");return;}
      const acierto=comparacion.acierto,defensas=comparacion.perdidasDefensa!;
      const texto = `Comparación: ${sanPractica(candidatas.primera.san)} → ${varianteLegible(candidatas.primera.fen, evaluacion1.variantePrincipal) || "sin variante"}; ${sanPractica(candidatas.segunda.san)} → ${varianteLegible(candidatas.segunda.fen, evaluacion2.variantePrincipal) || "sin variante"}. `;
      informar(acierto, texto + (acierto ? "Elegiste una buena continuación y calculaste respuestas resistentes. Podés descartar tu otra candidata después de compararla. Tu explicación queda guardada para revisar con el profe." : defensas.some(n => n > Math.max(80,comparacion.margen!*1.5)) ? "Buscá una respuesta más resistente del rival: no calcules solo la defensa que te conviene." : "La candidata que elegiste cede demasiado frente a otra opción. Compará las amenazas, revisá tu elección y volvé a intentarlo."), acierto ? { resuelto: true, etapa: "terminada" } : {});
    });
  }
  async function comprobarEvaluacion() {
    if (!r.valoracion.trim()) { setError("Escribí tu estimación en peones antes de comparar."); return; }
    if(ejercicio.fuente==="partida"&&r.conclusion.trim().length<15){setError("Anotá qué factores explican tu valoración: actividad, material, rey o estructura.");return;}
    await operacion(async () => {
      const analisis = await base(); if (!activo.current) return;
      const resultado = puntuarEvaluacion(r.valoracion, r.colorVentaja, analisis, ejercicio.fuente==="partida"?toleranciaNivel(nivel,"evaluacion"):ejercicio.tolerancia);
      if (resultado.error || resultado.real === undefined || resultado.acertado === undefined) { setError(resultado.error ?? "Revisá el número."); return; }
      const referenciaTexto = `${resultado.real >= 0 ? "+" : ""}${resultado.real.toFixed(2)}`;
      informar(resultado.acertado, `La referencia es ${referenciaTexto} peones desde el lado de blancas. Tu estimación: ${resultado.estimada.toFixed(2)}. ` + (resultado.acertado ? "Tu valoración está dentro del margen del ejercicio. Tu explicación queda guardada para revisarla." : "Compará material, seguridad de los reyes, actividad y estructura. La referencia ya quedó visible: el próximo repaso independiente será mañana."), { resuelto: true, etapa: "terminada" });
    });
  }
  function ayuda(revelar: boolean) {
    if (ocupadoRef.current || r.resuelto) return;
    alIntentar(false, true,revelar?"solucion":"pista"); cambiar({ ayudado: true, revelado: revelar, mensaje: ejercicio.pista, etapa: revelar ? "terminada" : r.etapa });
  }
  const estilos: Record<string, CSSProperties> = {};
  if (seleccion) { estilos[seleccion] = { backgroundColor: "#e4be7180" }; for (const m of original.moves({ square: seleccion, verbose: true })) estilos[m.to] = { backgroundImage: "radial-gradient(circle, #173f3b88 0 15%, transparent 17%)" }; }
  return <div className={styles.ejercicio}>
    <div className={styles.tableroColumna}><label className={styles.guardado}><input type="checkbox" checked={sonido.activo} onChange={e=>sonido.setActivo(e.target.checked)}/> Sonido de piezas</label><div className={styles.tableroTitulo}><strong>{ejercicio.titulo}{ejercicio.rating?` · ${ejercicio.fuente==="partida"?"≈ ":""}${ejercicio.rating}`:""}</strong><span>{color === "w" ? "Juegan blancas" : "Juegan negras"}</span></div><div className={`${styles.tablero} play-board`}><Chessboard options={{ id: `guiado-${ejercicio.id}`, position: partida.fen(), boardOrientation: color === "w" ? "white" : "black", allowDragging: ejercicio.actividad === "tactica" && preparado && !r.resuelto && !r.revelado && !ocupado, allowAutoScroll: false, animationDurationInMs: 200, lightSquareStyle: { backgroundColor: "#f0e6ce" }, darkSquareStyle: { backgroundColor: "#638480" }, squareStyles: estilos,
      canDragPiece: ({ square }) => preparado && !r.resuelto && !r.revelado && !ocupado && !promocion && ejercicio.actividad === "tactica" && original.get(square as Square)?.color === color,
      onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? elegir(sourceSquare, targetSquare) : false,
      onSquareClick: ({ square }) => { if (!preparado || r.resuelto || r.revelado || ocupadoRef.current || ejercicio.actividad !== "tactica") return; const pieza = original.get(square as Square); if (seleccion && original.moves({ square: seleccion, verbose: true }).some(m => m.to === square)) elegir(seleccion, square); else setSeleccion(pieza?.color === color ? square as Square : null); },
      squareRenderer: ({ square, children }) => { const pieza = partida.get(square as Square); return <button type="button" className="play-square" aria-label={`${square}${pieza ? `, ${piezas[pieza.type]} ${pieza.color === "w" ? "blanco" : "negro"}` : ", vacía"}`} disabled={!preparado || r.resuelto || r.revelado || ocupado || ejercicio.actividad !== "tactica"}>{children}</button>; },
    }}/></div>{promocion && <div className={styles.acciones} role="group" aria-label="Elegir promoción">{(["q", "r", "b", "n"] as PieceSymbol[]).map(p => <button type="button" key={p} className="button-secondary" onClick={() => { const m = promocion; void mover(m.from, m.to, p); }}>{piezas[p]}</button>)}</div>}<span className={styles.guardado}>{ejercicio.fuente==="lichess"?"Problema de Lichess · calculá todas tus jugadas. ":""}Tus respuestas y el punto donde quedaste se guardan con el entrenamiento.</span></div>
    <div className={styles.trabajo}>
      <div className={styles.pasos}><span className={styles.eyebrow}>{ejercicio.actividad === "tactica" ? r.resuelto || r.revelado ? "03 · REVISÁ" : preparado ? "02 · RESOLVÉ" : "01 · RECONOCÉ" : ejercicio.actividad === "candidatas" ? "PENSÁ ANTES DE MOVER" : "PONÉ TU VALORACIÓN"}</span><h3>{ejercicio.actividad === "tactica" ? r.resuelto || r.revelado ? "Compará tu idea con la solución." : preparado ? "Ahora encontrá la jugada." : "¿Qué idea táctica ves?" : ejercicio.actividad === "candidatas" ? "Dos candidatas. Una decisión." : "¿Quién está mejor?"}</h3></div>
      {ejercicio.actividad === "tactica" && !preparado && <SelectorTemasTacticos id={ejercicio.id} elegidos={r.temas} consulta={r.consultaTema} alCambiar={(temas,consultaTema)=>cambiar({temas,consultaTema})} alContinuar={comenzarResolucion}/>}
      {ejercicio.actividad === "tactica" && preparado && !r.resuelto && !r.revelado && <p className={styles.hipotesis}>Tu hipótesis: {r.temas.map(t=>obtenerTema(t)?.nombre).filter(Boolean).join(" · ")}</p>}
      {ejercicio.actividad === "candidatas" && !r.resuelto && !r.revelado && <div className={styles.candidatas}><details className={styles.observar}><summary>Tres preguntas para mirar la posición</summary><label>¿Dónde hay una debilidad?<textarea maxLength={400} value={r.debilidad} onChange={e => cambiar({ debilidad: e.target.value })}/></label><label>¿Cuál es tu peor pieza?<input maxLength={200} value={r.peorPieza} onChange={e => cambiar({ peorPieza: e.target.value })}/></label><label>¿Qué quiere hacer el rival?<textarea maxLength={400} value={r.ideaRival} onChange={e => cambiar({ ideaRival: e.target.value })}/></label></details><p>Usá notación española (Cf3, e4) o casillas (g1f3). Las respuestas se escriben desde la posición que deja cada candidata.</p><div className={styles.ramas}><label>Primera candidata<input disabled={ocupado} maxLength={20} value={r.candidata1} onChange={e => cambiar({ candidata1: e.target.value })} placeholder="Por ejemplo: e4"/></label><label>Respuesta del rival<input disabled={ocupado} maxLength={20} value={r.respuesta1} onChange={e => cambiar({ respuesta1: e.target.value })} placeholder="Después de la primera"/></label><label>Segunda candidata<input disabled={ocupado} maxLength={20} value={r.candidata2} onChange={e => cambiar({ candidata2: e.target.value })} placeholder="Una jugada diferente"/></label><label>Respuesta del rival<input disabled={ocupado} maxLength={20} value={r.respuesta2} onChange={e => cambiar({ respuesta2: e.target.value })} placeholder="Después de la segunda"/></label></div><label>Tu elección final<select disabled={ocupado} value={r.eleccion??""} onChange={e=>cambiar({eleccion:e.target.value as "1"|"2"|""})}><option value="">Elegí tu candidata</option><option value="1">Primera candidata</option><option value="2">Segunda candidata</option></select></label><label>¿Cuál elegís y por qué?<textarea disabled={ocupado} maxLength={800} value={r.conclusion} onChange={e => cambiar({ conclusion: e.target.value })} placeholder="Prefiero… porque…"/></label><button type="button" className="button-primary" disabled={ocupado} onClick={() => void comprobarCandidatas()}>Comparar mis candidatas</button><small>Calculá ambas y elegí la mejor. La otra puede ser inferior si la descartás después de calcular. Margen de la elección: {(toleranciaNivel(nivel,"candidatas")/100).toLocaleString("es-UY")} peones. La explicación se guarda para revisar con el profe; no se califica automáticamente.</small></div>}
      {ejercicio.actividad === "evaluacion" && !r.resuelto && !r.revelado && <div className={styles.valoracion}><label>Ventaja para<select value={r.colorVentaja} onChange={e => cambiar({ colorVentaja: e.target.value as "w" | "b" | "=" })}><option value="=">Equilibrio</option><option value="w">Blancas</option><option value="b">Negras</option></select></label><label>¿Cuántos peones de ventaja?<input type="text" inputMode="decimal" maxLength={6} value={r.valoracion} onChange={e => cambiar({ valoracion: e.target.value })} placeholder="0, 0.5, 1, 2…"/></label><p>0 es equilibrio. 1 significa una ventaja equivalente a un peón; no es solo contar el material.</p><small>Comparamos con un análisis de Stockfish y aceptamos un margen de ±{(ejercicio.fuente==="partida"?toleranciaNivel(nivel,"evaluacion"):ejercicio.tolerancia)?.toLocaleString("es-UY")} peones. La referencia puede variar un poco según la profundidad.</small><label>¿Qué explica tu valoración?<textarea disabled={ocupado} maxLength={800} value={r.conclusion} onChange={e=>cambiar({conclusion:e.target.value})} placeholder="Actividad, seguridad del rey, material, estructura…"/></label><button type="button" className="button-primary" disabled={ocupado} onClick={() => void comprobarEvaluacion()}>Comparar mi evaluación</button></div>}
      <div className={styles.feedback} role="status">{ocupado ? "Comprobando con Stockfish…" : error || r.mensaje || (preparado && ejercicio.actividad === "tactica" ? "Podés tocar origen y destino o arrastrar la pieza." : "")}</div>
      {!r.resuelto && !r.revelado && <div className={styles.acciones}><button type="button" className="button-secondary" disabled={ocupado || r.ayudado} onClick={() => ayuda(false)}>Una pista</button><button type="button" className="text-link" disabled={ocupado} onClick={() => ayuda(true)}>Ver la idea</button></div>}
      {(r.resuelto || r.revelado) && <div className={styles.idea}><strong>Para llevarte a la próxima partida</strong><p>{ejercicio.explicacion}</p>{ejercicio.actividad === "tactica" && <RevisionTemasTacticos elegidos={r.temas} esperados={ejercicio.temas}/>} {ejercicio.actividad === "tactica" && <p>Variante: {varianteLegible(ejercicio.fen,ejercicio.solucion,20)}</p>}{ejercicio.origen&&<a className="text-link" href={ejercicio.origen} target="_blank" rel="noopener noreferrer">Ver la partida de origen ↗</a>}{ejercicio.referencia&&<p>Referencia: {varianteLegible(ejercicio.fen,ejercicio.referencia.variantePrincipal,6)}</p>}<label>Tu idea en una frase<textarea value={r.conclusion} maxLength={800} onChange={e => cambiar({ conclusion: e.target.value })} placeholder="La próxima vez voy a mirar…"/></label><button type="button" className="button-primary" onClick={alSiguiente}>{ultimo ? "Terminar sesión" : "Siguiente posición"}</button><a className="text-link" href={`https://lichess.org/analysis/${ejercicio.fen.replace(/ /g, "_")}`} target="_blank" rel="noopener noreferrer">Abrir esta posición en Lichess ↗</a></div>}
      {practica?.proxima && <p className={styles.repaso}>Próximo repaso: {new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short" }).format(new Date(practica.proxima + "T12:00:00Z"))}{practica.ayudado ? " · Hoy fue práctica con ayuda o reintento." : " · Sin ayuda."}</p>}
    </div>
  </div>;
}
