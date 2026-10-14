"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import { Chessboard } from "react-chessboard";
import { MotorEntrenamiento } from "@/lib/motorEntrenamiento";
import type { AnalisisPosicion } from "@/lib/stockfish";
import { sanPractica } from "@/lib/partidaPractica";
import { ayudaEnDia, resumenEntrenamiento, type SesionEntrenamiento } from "@/lib/entrenamientoPersonal";
import { BANCO_ENTRENAMIENTO, TEMAS_TACTICOS, ejercicioGuiado, interpretarJugada, prepararSesionGuiada, puntuarEvaluacion, razonamientoInicial, recomendacionGuiada, registrarResultadoGuiado, sugerirTemas, validarCandidatas, type ActividadGuiada, type EjercicioGuiado, type ProgresoGuiado, type RazonamientoGuiado, type RutaGuiada } from "@/lib/entrenamientoGuiado";
import styles from "./EntrenarHoy.module.css";

const ACTIVIDADES: { id: ActividadGuiada; titulo: string; descripcion: string; numero: string }[] = [
  { id: "tactica", titulo: "Reconocer la idea", descripcion: "Elegí el tema táctico antes de tocar las piezas. Empezamos bien fácil.", numero: "01" },
  { id: "candidatas", titulo: "Comparar candidatas", descripcion: "Escribí dos jugadas, una respuesta a cada una y elegí tu plan.", numero: "02" },
  { id: "evaluacion", titulo: "Evaluar la posición", descripcion: "¿Quién está mejor y por cuánto? Compará tu valoración en peones.", numero: "03" },
];
const piezas: Record<string, string> = { p: "peón", n: "caballo", b: "alfil", r: "torre", q: "dama", k: "rey" };
const valorMotor = (a: AnalisisPosicion) => a.mateEn !== null ? Math.sign(a.mateEn) * (100000 - Math.abs(a.mateEn) * 100) : a.evaluacionCentipawns ?? 0;
const perdida = (a: AnalisisPosicion, b: AnalisisPosicion, color: "w" | "b") => color === "w" ? valorMotor(a) - valorMotor(b) : valorMotor(b) - valorMotor(a);
function varianteLegible(fen: string, jugadas: string[] | null) {
  const c = new Chess(fen), textos: string[] = [];
  for (const uci of (jugadas ?? []).slice(0, 4)) { const m = interpretarJugada(c.fen(), uci); if (!m) break; c.load(m.fen); textos.push(sanPractica(m.san)); }
  return textos.join(" · ");
}
export function EntrenarHoy({ sesiones, progreso, alGuardarProgreso, alRevisarPartida, alPracticarPersonal }: { sesiones: SesionEntrenamiento[]; progreso: ProgresoGuiado; alGuardarProgreso: (p: ProgresoGuiado) => void; alRevisarPartida: () => void; alPracticarPersonal: (s: SesionEntrenamiento, indice: number) => void }) {
  const [abierto, setAbierto] = useState(false), [aviso, setAviso] = useState("");
  const recomendacion = recomendacionGuiada(progreso), resumen = resumenEntrenamiento(sesiones), sesion = progreso.sesionEnCurso;
  const ejercicio = sesion ? ejercicioGuiado(sesion.items[sesion.indice]) : undefined;
  const sesionRef = useRef<HTMLDivElement>(null);
  const sesionId = sesion?.id, indiceSesion = sesion?.indice, terminada = sesion?.terminada;
  useEffect(() => {
    if (!abierto || terminada) return;
    const frame = requestAnimationFrame(() => sesionRef.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));
    return () => cancelAnimationFrame(frame);
  }, [abierto, sesionId, indiceSesion, terminada]);
  const progresoRef = useRef(progreso);
  useEffect(() => { progresoRef.current = progreso; }, [progreso]);
  function guardar(p: ProgresoGuiado) { progresoRef.current = p; alGuardarProgreso(p); }
  function comenzar() {
    const p = prepararSesionGuiada(progresoRef.current); guardar(p);
    setAbierto(!!p.sesionEnCurso); setAviso(p.sesionEnCurso ? "" : "Hoy no tenés repasos pendientes en este modo. Probá otro tipo de entrenamiento o revisá una partida propia.");
  }
  function elegirModo(actividad: ActividadGuiada) {
    guardar({ ...progresoRef.current, actividad, actividadActualizada: new Date().toISOString() }); setAviso("");
  }
  function cambiarRuta(ruta: RutaGuiada) {
    const actividad = ruta === "base" ? "tactica" : ruta === "club" ? "candidatas" : "evaluacion", ahora = new Date().toISOString();
    guardar({ ...progresoRef.current, ruta, rutaActualizada: ahora, actividad, actividadActualizada: ahora });
  }
  function actualizar(id: string, r: RazonamientoGuiado) {
    const p = progresoRef.current, e = p.ejercicios[id] ?? {};
    guardar({ ...p, ejercicios: { ...p.ejercicios, [id]: { ...e, razonamiento: r, razonamientoActualizada: new Date().toISOString() } } });
  }
  function intentar(id: string, acierto: boolean, ayudado: boolean) { guardar(registrarResultadoGuiado(progresoRef.current, id, acierto, ayudado)); }
  function siguiente() {
    const p = progresoRef.current, s = p.sesionEnCurso; if (!s) return;
    const ultimo = s.indice === s.items.length - 1, ahora = new Date().toISOString();
    guardar({ ...p, sesionActualizada: ahora, sesionEnCurso: { ...s, indice: ultimo ? s.indice : s.indice + 1, terminada: ultimo, actualizada: ahora } });
  }
  const retenidos = Object.values(progreso.ejercicios).filter(e => (e.practica?.etapa ?? 0) >= 2).length;
  const probados = Object.values(progreso.ejercicios).filter(e => !!e.practica).length;
  return <section className={styles.hoy} aria-labelledby="entrenar-hoy-titulo">
    <div className={styles.cabecera}><div><span className={styles.eyebrow}>UNA IDEA A LA VEZ</span><h2 id="entrenar-hoy-titulo">Entrená hoy, seguí mañana.</h2><p>Una sesión corta, con tus repasos primero. Podés dejarla a mitad y continuar desde tu cuenta.</p></div><div className={styles.progreso}><strong>{retenidos}</strong><span>posiciones con repaso independiente</span><small>{probados} de {BANCO_ENTRENAMIENTO.length} practicadas</small></div></div>
    <div className={styles.recomendacion}><strong>Para tu próxima sesión</strong><p>{recomendacion.razon}{resumen.foco ? ` En tus partidas aparece más: ${resumen.foco.toLowerCase()}.` : ""}</p><button type="button" className="text-link" onClick={() => elegirModo(recomendacion.actividad)}>Elegir {ACTIVIDADES.find(a => a.id === recomendacion.actividad)?.titulo.toLowerCase()}</button></div>
    <div className={styles.modos} role="group" aria-label="Elegir tipo de entrenamiento">{ACTIVIDADES.map(a => <button type="button" key={a.id} aria-pressed={progreso.actividad === a.id} className={`${styles.modo} ${progreso.actividad === a.id ? styles.modoActivo : ""}`} onClick={() => elegirModo(a.id)}><span>{a.numero}</span><strong>{a.titulo}</strong><small>{a.descripcion}</small></button>)}</div>
    <div className={styles.empezar}><label className={styles.ruta}>Tu foco<select value={progreso.ruta} onChange={e => cambiarRuta(e.target.value as RutaGuiada)}><option value="base">Base · ver amenazas</option><option value="club">Club · pensar antes de mover</option><option value="competencia">Competencia · valorar y comparar</option></select></label><button type="button" className="button-primary" onClick={comenzar}>{sesion && !sesion.terminada ? "Continuar mi sesión" : sesion?.terminada ? "Ver mi sesión de hoy" : "Entrenar hoy"}</button><span>Hasta 5 repasos y 2 posiciones nuevas. Sin reloj.</span></div>
    {sesion && !sesion.terminada && ejercicio?.actividad !== progreso.actividad && <p className={styles.mensaje}>Tenés una sesión empezada de {ACTIVIDADES.find(a => a.id === ejercicio?.actividad)?.titulo.toLowerCase()}. Continuála primero para conservar el recorrido.</p>}
    <p className={styles.mensaje} role="status">{aviso}</p>
    {abierto && sesion && (sesion.terminada ? <div className={styles.fin}><span className={styles.eyebrow}>SESIÓN TERMINADA</span><h3>Una idea más para tus partidas.</h3><p>Las posiciones con ayuda o error vuelven mañana. Las resueltas sin ayuda se repasan en 1, 3, 7, 14 y 30 días, según su etapa.</p><p>Podés seguir con otro tipo de entrenamiento o analizar una decisión de tus partidas.</p><div className={styles.acciones}><button type="button" className="button-primary" onClick={alRevisarPartida}>Revisar una partida</button><button type="button" className="button-secondary" onClick={() => { guardar({ ...progresoRef.current, sesionEnCurso: null, sesionActualizada: new Date().toISOString() }); setAbierto(false); }}>Elegir otro entrenamiento</button></div></div> : ejercicio && <div ref={sesionRef} style={{scrollMarginTop: "10px"}} className={styles.sesion}><div className={styles.sesionCabecera}><div><span>{ACTIVIDADES.find(a => a.id === ejercicio.actividad)?.titulo}</span><strong>{sesion.indice + 1} / {sesion.items.length}</strong></div><button type="button" className="text-link" onClick={() => setAbierto(false)}>Seguir después</button></div><EjercicioDeHoy key={ejercicio.id + sesion.id} ejercicio={ejercicio} avance={progreso.ejercicios[ejercicio.id]?.razonamiento ?? razonamientoInicial()} practica={progreso.ejercicios[ejercicio.id]?.practica} alCambiar={r => actualizar(ejercicio.id, r)} alIntentar={(a, h) => intentar(ejercicio.id, a, h)} alSiguiente={siguiente} ultimo={sesion.indice === sesion.items.length - 1}/></div>)}
    {resumen.pendientes.length > 0 && <div className={styles.propias}><h3>Volver a tus decisiones</h3><p>{resumen.pendientes.length} posiciones de tus partidas están listas para revisar.</p><div>{resumen.pendientes.slice(0, 3).map(e => <button type="button" key={`${e.sesion.id}-${e.id}`} className="button-secondary" onClick={() => alPracticarPersonal(e.sesion, resumen.ejercicios.filter(x => x.sesion.id === e.sesion.id).findIndex(x => x.id === e.id))}>{e.tema} · {e.jugada.numero}{e.jugada.color === "w" ? "." : "…"}</button>)}</div></div>}
    <details className={styles.metodo}><summary>Cómo entrenamos</summary><p>Tomamos de Aagaard una rutina para observar la posición: debilidades, peor pieza e idea del rival. Después comparamos candidatas y calculamos una respuesta antes de mover. Este recorrido y sus posiciones fueron preparados para el club.</p><p>La repetición espaciada vuelve a traer una posición cuando toca recordarla. Un error, una pista o un reintento no suma como acierto independiente ese día. Practicar antes del próximo repaso tampoco acelera el calendario.</p><p>Las etiquetas usan los identificadores públicos de Lichess. Ya podés abrir una posición allí para analizarla; vincular el historial de entrenamiento de tu cuenta de Lichess es un paso aparte.</p><a href="https://database.lichess.org/#puzzles" target="_blank" rel="noopener noreferrer">Banco público de problemas de Lichess ↗</a></details>
  </section>;
}

function EjercicioDeHoy({ ejercicio, avance, practica, alCambiar, alIntentar, alSiguiente, ultimo }: { ejercicio: EjercicioGuiado; avance: RazonamientoGuiado; practica?: import("@/lib/entrenamientoPersonal").PracticaError; alCambiar: (r: RazonamientoGuiado) => void; alIntentar: (acierto: boolean, ayudado: boolean) => void; alSiguiente: () => void; ultimo: boolean }) {
  const [r, setR] = useState(avance), [seleccion, setSeleccion] = useState<Square | null>(null), [ocupado, setOcupado] = useState(false), [error, setError] = useState(""), [promocion, setPromocion] = useState<{ from: string; to: string } | null>(null), [temasAbiertos, setTemasAbiertos] = useState(false), [temaActivo, setTemaActivo] = useState(0);
  const referencia = useRef<AnalisisPosicion | null>(null), motor = useRef<MotorEntrenamiento | null>(null), activo = useRef(true), ocupadoRef = useRef(false), estado = useRef(r);
  useEffect(() => { activo.current = true; return () => { activo.current = false; motor.current?.destruir(); }; }, []);
  function cambiar(parche: Partial<RazonamientoGuiado>) { const siguiente = { ...estado.current, ...parche }; estado.current = siguiente; setR(siguiente); alCambiar(siguiente); }
  const original = new Chess(ejercicio.fen), color = original.turn(), partida = new Chess(ejercicio.fen);
  for (const m of r.movimientos) partida.move(m);
  const preparado = r.etapa !== "preparar", sugerencias = sugerirTemas(r.consultaTema).filter(t => !r.temas.includes(t.id));
  const conAyuda = () => estado.current.ayudado || estado.current.revelado || ayudaEnDia(practica);
  async function evaluar(fen: string): Promise<AnalisisPosicion> { if (!motor.current) motor.current = new MotorEntrenamiento(); return motor.current.evaluarPosicion(fen, new Chess(fen).turn(), 1400); }
  async function base(): Promise<AnalisisPosicion> { if (!referencia.current) referencia.current = await evaluar(ejercicio.fen); return referencia.current; }
  function informar(acierto: boolean, mensaje: string, extra: Partial<RazonamientoGuiado> = {}) {
    const ayudado = conAyuda(); alIntentar(acierto, ayudado); cambiar({ mensaje, ayudado: ayudado || !acierto, ...extra });
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
      const correcto = ejercicio.temas.some(t => r.temas.includes(t));
      if (!correcto) { informar(false, "Ese tema no explica la idea principal de la posición. Mirá de nuevo las amenazas y probá otra etiqueta."); return; }
      cambiar({ etapa: "resolver", mensaje: "Tema elegido. Ahora buscá la jugada que aprovecha esa idea." });
    }
  }
  async function mover(from: string, to: string, promotion?: PieceSymbol) {
    if (!preparado || r.resuelto || r.revelado || ocupadoRef.current) return;
    const entrada = from + to + (promotion ?? ""), m = interpretarJugada(ejercicio.fen, entrada);
    if (!m) return;
    setSeleccion(null); setPromocion(null);
    await operacion(async () => {
      let acierto = ejercicio.solucion.includes(m.uci);
      if (!acierto) { const antes = await base(), despues = await evaluar(m.fen); acierto = perdida(antes, despues, color) <= 60; }
      if (!activo.current) return;
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
    await operacion(async () => {
      const a = await base(), evaluacion1 = await evaluar(candidatas.primera.fen), evaluacion2 = await evaluar(candidatas.segunda.fen);
      const defensa1 = await evaluar(candidatas.respuesta1.fen), defensa2 = await evaluar(candidatas.respuesta2.fen);
      if (!activo.current) return;
      const razonables = [perdida(a, evaluacion1, color), perdida(a, evaluacion2, color)];
      const defensas = [perdida(evaluacion1, defensa1, color === "w" ? "b" : "w"), perdida(evaluacion2, defensa2, color === "w" ? "b" : "w")];
      const acierto = razonables.some(n => n <= 100) && razonables.every(n => n <= 250) && defensas.every(n => n <= 150);
      const texto = `Comparación: ${sanPractica(candidatas.primera.san)} → ${varianteLegible(candidatas.primera.fen, evaluacion1.variantePrincipal) || "sin variante"}; ${sanPractica(candidatas.segunda.san)} → ${varianteLegible(candidatas.segunda.fen, evaluacion2.variantePrincipal) || "sin variante"}. `;
      informar(acierto, texto + (acierto ? "Incluiste una candidata razonable y defensas resistentes. Tu explicación queda guardada para revisarla con el profe; el motor comprueba jugadas, no el texto." : defensas.some(n => n > 150) ? "Buscá una respuesta más resistente del rival: no calcules solo la defensa que te conviene." : "Tus dos candidatas pierden bastante frente a otra opción. Mirá jaques, capturas y amenazas y volvé a comparar."), acierto ? { resuelto: true, etapa: "terminada" } : {});
    });
  }
  async function comprobarEvaluacion() {
    if (!r.valoracion.trim()) { setError("Escribí tu estimación en peones antes de comparar."); return; }
    await operacion(async () => {
      const analisis = await base(); if (!activo.current) return;
      const resultado = puntuarEvaluacion(r.valoracion, r.colorVentaja, analisis, ejercicio.tolerancia);
      if (resultado.error || resultado.real === undefined || resultado.acertado === undefined) { setError(resultado.error ?? "Revisá el número."); return; }
      const referenciaTexto = `${resultado.real >= 0 ? "+" : ""}${resultado.real.toFixed(2)}`;
      informar(resultado.acertado, `Stockfish estima ${referenciaTexto} peones desde el lado de blancas (profundidad ${analisis.profundidad}). ` + (resultado.acertado ? "Tu valoración está dentro del margen del ejercicio." : "Compará material, seguridad de los reyes, actividad y estructura. La referencia ya quedó visible: el próximo repaso independiente será mañana."), { resuelto: true, etapa: "terminada" });
    });
  }
  function ayuda(revelar: boolean) {
    if (ocupadoRef.current || r.resuelto) return;
    alIntentar(false, true); cambiar({ ayudado: true, revelado: revelar, mensaje: ejercicio.pista, etapa: revelar ? "terminada" : r.etapa });
  }
  const estilos: Record<string, CSSProperties> = {};
  if (seleccion) { estilos[seleccion] = { backgroundColor: "#e4be7180" }; for (const m of original.moves({ square: seleccion, verbose: true })) estilos[m.to] = { backgroundImage: "radial-gradient(circle, #173f3b88 0 15%, transparent 17%)" }; }
  return <div className={styles.ejercicio}>
    <div className={styles.tableroColumna}><div className={styles.tableroTitulo}><strong>{ejercicio.titulo}</strong><span>{color === "w" ? "Juegan blancas" : "Juegan negras"}</span></div><div className={`${styles.tablero} play-board`}><Chessboard options={{ id: `guiado-${ejercicio.id}`, position: partida.fen(), boardOrientation: color === "w" ? "white" : "black", allowDragging: ejercicio.actividad === "tactica" && preparado && !r.resuelto && !r.revelado && !ocupado, allowAutoScroll: false, animationDurationInMs: 200, lightSquareStyle: { backgroundColor: "#f0e6ce" }, darkSquareStyle: { backgroundColor: "#638480" }, squareStyles: estilos,
      canDragPiece: ({ square }) => preparado && !r.resuelto && !r.revelado && !ocupado && !promocion && ejercicio.actividad === "tactica" && original.get(square as Square)?.color === color,
      onPieceDrop: ({ sourceSquare, targetSquare }) => targetSquare ? elegir(sourceSquare, targetSquare) : false,
      onSquareClick: ({ square }) => { if (!preparado || r.resuelto || r.revelado || ocupadoRef.current || ejercicio.actividad !== "tactica") return; const pieza = original.get(square as Square); if (seleccion && original.moves({ square: seleccion, verbose: true }).some(m => m.to === square)) elegir(seleccion, square); else setSeleccion(pieza?.color === color ? square as Square : null); },
      squareRenderer: ({ square, children }) => { const pieza = partida.get(square as Square); return <button type="button" className="play-square" aria-label={`${square}${pieza ? `, ${piezas[pieza.type]} ${pieza.color === "w" ? "blanco" : "negro"}` : ", vacía"}`} disabled={!preparado || r.resuelto || r.revelado || ocupado || ejercicio.actividad !== "tactica"}>{children}</button>; },
    }}/></div>{promocion && <div className={styles.acciones} role="group" aria-label="Elegir promoción">{(["q", "r", "b", "n"] as PieceSymbol[]).map(p => <button type="button" key={p} className="button-secondary" onClick={() => { const m = promocion; void mover(m.from, m.to, p); }}>{piezas[p]}</button>)}</div>}<span className={styles.guardado}>Tus respuestas y el punto donde quedaste se guardan con el entrenamiento.</span></div>
    <div className={styles.trabajo}>
      <div className={styles.pasos}><span className={styles.eyebrow}>{ejercicio.actividad === "tactica" ? preparado ? "02 · RESOLVÉ" : "01 · RECONOCÉ" : ejercicio.actividad === "candidatas" ? "PENSÁ ANTES DE MOVER" : "PONÉ TU VALORACIÓN"}</span><h3>{ejercicio.actividad === "tactica" ? preparado ? "Ahora encontrá la jugada." : "¿Qué idea táctica ves?" : ejercicio.actividad === "candidatas" ? "Dos candidatas. Una decisión." : "¿Quién está mejor?"}</h3></div>
      {ejercicio.actividad === "tactica" && !preparado && <div className={styles.temas}><label htmlFor={`tema-${ejercicio.id}`}>Escribí y elegí una etiqueta</label><div className={styles.chips}>{r.temas.map(id => <button type="button" key={id} onClick={() => cambiar({ temas: r.temas.filter(t => t !== id) })}>{TEMAS_TACTICOS.find(t => t.id === id)?.nombre} <span aria-label="Quitar">×</span></button>)}</div><input id={`tema-${ejercicio.id}`} role="combobox" aria-autocomplete="list" aria-expanded={temasAbiertos} aria-controls={`opciones-${ejercicio.id}`} aria-activedescendant={temasAbiertos && sugerencias[temaActivo] ? `tema-opcion-${sugerencias[temaActivo].id}` : undefined} autoComplete="off" value={r.consultaTema} placeholder="Mate, ataque doble, pieza indefensa…" onFocus={() => setTemasAbiertos(true)} onBlur={() => setTemasAbiertos(false)} onChange={e => { cambiar({ consultaTema: e.target.value }); setTemaActivo(0); setTemasAbiertos(true); }} onKeyDown={e => { if (e.key === "Escape") setTemasAbiertos(false); if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setTemasAbiertos(true); setTemaActivo(i => Math.max(0, Math.min(sugerencias.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)))); } if (e.key === "Enter" && temasAbiertos && sugerencias[temaActivo]) { e.preventDefault(); if (r.temas.length < 3) cambiar({ temas: [...r.temas, sugerencias[temaActivo].id], consultaTema: "" }); setTemasAbiertos(false); } }}/>{temasAbiertos && <div className={styles.opciones} role="listbox" id={`opciones-${ejercicio.id}`}>{sugerencias.length ? sugerencias.map((t, i) => <button type="button" role="option" id={`tema-opcion-${t.id}`} aria-selected={i === temaActivo} key={t.id} onMouseDown={e => e.preventDefault()} onClick={() => { if (r.temas.length < 3) cambiar({ temas: [...r.temas, t.id], consultaTema: "" }); setTemasAbiertos(false); }}>{t.nombre}</button>) : <span>No encontramos esa etiqueta. Probá otra palabra.</span>}</div>}<small>Podés elegir hasta 3 temas. El tablero se habilita después.</small><button type="button" className="button-primary" onClick={comenzarResolucion}>Elegir tema y resolver</button></div>}
      {ejercicio.actividad === "candidatas" && !r.resuelto && !r.revelado && <div className={styles.candidatas}><details className={styles.observar}><summary>Tres preguntas para mirar la posición</summary><label>¿Dónde hay una debilidad?<textarea maxLength={400} value={r.debilidad} onChange={e => cambiar({ debilidad: e.target.value })}/></label><label>¿Cuál es tu peor pieza?<input maxLength={200} value={r.peorPieza} onChange={e => cambiar({ peorPieza: e.target.value })}/></label><label>¿Qué quiere hacer el rival?<textarea maxLength={400} value={r.ideaRival} onChange={e => cambiar({ ideaRival: e.target.value })}/></label></details><p>Usá notación española (Cf3, e4) o casillas (g1f3). Las respuestas se escriben desde la posición que deja cada candidata.</p><div className={styles.ramas}><label>Primera candidata<input maxLength={20} value={r.candidata1} onChange={e => cambiar({ candidata1: e.target.value })} placeholder="Por ejemplo: e4"/></label><label>Respuesta del rival<input maxLength={20} value={r.respuesta1} onChange={e => cambiar({ respuesta1: e.target.value })} placeholder="Después de la primera"/></label><label>Segunda candidata<input maxLength={20} value={r.candidata2} onChange={e => cambiar({ candidata2: e.target.value })} placeholder="Una jugada diferente"/></label><label>Respuesta del rival<input maxLength={20} value={r.respuesta2} onChange={e => cambiar({ respuesta2: e.target.value })} placeholder="Después de la segunda"/></label></div><label>¿Cuál elegís y por qué?<textarea maxLength={800} value={r.conclusion} onChange={e => cambiar({ conclusion: e.target.value })} placeholder="Prefiero… porque…"/></label><button type="button" className="button-primary" disabled={ocupado} onClick={() => void comprobarCandidatas()}>Comparar mis candidatas</button><small>Se acepta una candidata razonable; no hace falta adivinar exactamente las dos favoritas del motor. Margen: 1 peón para la candidata y 1,5 para la defensa rival.</small></div>}
      {ejercicio.actividad === "evaluacion" && !r.resuelto && !r.revelado && <div className={styles.valoracion}><label>Ventaja para<select value={r.colorVentaja} onChange={e => cambiar({ colorVentaja: e.target.value as "w" | "b" | "=" })}><option value="=">Equilibrio</option><option value="w">Blancas</option><option value="b">Negras</option></select></label><label>¿Cuántos peones de ventaja?<input type="text" inputMode="decimal" maxLength={6} value={r.valoracion} onChange={e => cambiar({ valoracion: e.target.value })} placeholder="0, 0.5, 1, 2…"/></label><p>0 es equilibrio. 1 significa una ventaja equivalente a un peón; no es solo contar el material.</p><small>Comparamos con un análisis de Stockfish y aceptamos un margen de ±{ejercicio.tolerancia?.toLocaleString("es-UY")} peones. La referencia puede variar un poco según la profundidad.</small><button type="button" className="button-primary" disabled={ocupado} onClick={() => void comprobarEvaluacion()}>Comparar mi evaluación</button></div>}
      <div className={styles.feedback} role="status">{ocupado ? "Comprobando con Stockfish…" : error || r.mensaje || (preparado && ejercicio.actividad === "tactica" ? "Podés tocar origen y destino o arrastrar la pieza." : "")}</div>
      {!r.resuelto && !r.revelado && <div className={styles.acciones}><button type="button" className="button-secondary" disabled={ocupado || r.ayudado} onClick={() => ayuda(false)}>Una pista</button><button type="button" className="text-link" disabled={ocupado} onClick={() => ayuda(true)}>Ver la idea</button></div>}
      {(r.resuelto || r.revelado) && <div className={styles.idea}><strong>Para llevarte a la próxima partida</strong><p>{ejercicio.explicacion}</p>{ejercicio.actividad === "tactica" && r.revelado && <p>{ejercicio.solucion.map(s => sanPractica(interpretarJugada(ejercicio.fen, s)?.san ?? s)).join(" · ")}</p>}<label>Tu idea en una frase<textarea value={r.conclusion} maxLength={800} onChange={e => cambiar({ conclusion: e.target.value })} placeholder="La próxima vez voy a mirar…"/></label><button type="button" className="button-primary" onClick={alSiguiente}>{ultimo ? "Terminar sesión" : "Siguiente posición"}</button><a className="text-link" href={`https://lichess.org/analysis/${ejercicio.fen.replace(/ /g, "_")}`} target="_blank" rel="noopener noreferrer">Abrir esta posición en Lichess ↗</a></div>}
      {practica?.proxima && <p className={styles.repaso}>Próximo repaso: {new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short" }).format(new Date(practica.proxima + "T12:00:00Z"))}{practica.ayudado ? " · Hoy fue práctica con ayuda o reintento." : " · Sin ayuda."}</p>}
    </div>
  </div>;
}
