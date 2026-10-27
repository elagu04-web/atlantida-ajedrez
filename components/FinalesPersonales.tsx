"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import { MotorEntrenamiento } from "@/lib/motorEntrenamiento";
import { compararDecisionFinal, finalesDePartidas, finalDePosicion, PLANES_FINALES, posicionFinal, resultadoFinal, type EstadoFinalPersonal, type FinalDePartida, type PlanFinal } from "@/lib/finalesPersonales";
import { registrarPractica, type SesionEntrenamiento } from "@/lib/entrenamientoPersonal";
import { fechaMontevideo } from "@/lib/desafios";
import { sanPractica } from "@/lib/partidaPractica";
import { moverUci, uciApertura } from "@/lib/entrenamientoAperturas";
import {useSonidoPiezas} from '@/lib/useSonidoPiezas';
import { TableroApertura } from "./TableroApertura";
import styles from "./FinalesPersonales.module.css";

export function FinalesPersonales({ sesiones, posicionInicial, alGuardar, alCargar, alRevisar }: {
  sesiones: SesionEntrenamiento[]; alGuardar: (sesion: SesionEntrenamiento) => void;
  posicionInicial?: {sesion:string;indice:number} | null;
  alCargar: () => void; alRevisar: (s: SesionEntrenamiento) => void;
}) {
  const finales = useMemo(() => {
    const lista = finalesDePartidas(sesiones), s = sesiones.find(s => s.id === posicionInicial?.sesion);
    const solicitada = s && posicionInicial ? finalDePosicion(s,posicionInicial.indice) : null;
    return solicitada && !lista.some(e=>e.id===solicitada.id) ? [solicitada,...lista] : lista;
  }, [sesiones,posicionInicial]);
  const [seleccion, setSeleccion] = useState<string | null>(posicionInicial?`${posicionInicial.sesion}:${posicionInicial.indice}`:null);
  const [filtro, setFiltro] = useState("todos");
  const dia = fechaMontevideo(new Date());
  const visibles = finales.filter(e => filtro === "todos" || (filtro === "errores" ? e.errorDetectado :
    !e.sesion.finales?.[String(e.indice)]?.practica?.proxima || e.sesion.finales[String(e.indice)].practica!.proxima! <= dia));
  const elegida = visibles.find(e => e.id === seleccion) ?? visibles[0];
  const tableroRef = useRef<HTMLDivElement>(null);
  function elegir(id: string) {
    setSeleccion(id);
    requestAnimationFrame(() => tableroRef.current?.scrollIntoView({ block: "start", behavior: "instant" }));
  }
  return <section className={`panel ${styles.taller}`} aria-label="Finales de mis partidas">
    <p className="eyebrow">APRENDÉ DE LO QUE JUGASTE</p><h2>Mis finales</h2>
    <p>Volvé a una posición de tu partida. Evaluá, elegí un plan y jugala contra Stockfish. Buscamos finales por las piezas que quedan, no por el número de jugada.</p>
    <div className={styles.cabecera}><label>Posiciones para practicar<select value={filtro} onChange={e => setFiltro(e.target.value)}><option value="todos">Todos mis finales</option><option value="errores">Con decisiones para mejorar</option><option value="repasos">Por practicar o repasar</option></select></label><button type="button" className="button-secondary" onClick={alCargar}>Traer más partidas</button></div>
    {!finales.length ? <div className={styles.vacio}><h3>{sesiones.length ? "Todavía no encontramos finales en tus partidas revisadas." : "Empezá con una partida tuya."}</h3><p>Podés cargar un PGN, buscar tus partidas públicas de Lichess o Chess.com, o elegir una contra los bots del club. Cuando termine el análisis, sus finales aparecerán acá.</p><button type="button" className="button-primary" onClick={alCargar}>Cargar o elegir partidas</button></div> : !visibles.length ? <p role="status">No hay posiciones para este filtro. Podés ver todos tus finales o traer otra partida.</p> : <div className={styles.layout}>
      <aside className={styles.lista} aria-label="Posiciones de mis finales">{visibles.map(e => {
        const p = e.sesion.finales?.[String(e.indice)];
        return <button type="button" key={e.id} aria-pressed={e.id === elegida?.id} onClick={() => elegir(e.id)}><strong>{e.familia}</strong><span>{e.sesion.titulo}</span><small>Jugada {e.sesion.resultado.jugadas[e.indice].numero} · {e.sesion.color === "w" ? "Blancas" : "Negras"}</small><small>{e.errorDetectado ? "El análisis detectó una decisión para mejorar" : "Practicar la técnica"}</small>{p && <small>{p.ruta.length ? "Recorrido guardado" : "Preparado para jugar"}{p.practica?.proxima ? ` · Repaso: ${p.practica.proxima}` : ""}</small>}</button>;
      })}</aside>
      {elegida && <div ref={tableroRef} className={styles.posicion}>
        <PracticarFinal key={elegida.id} entrada={elegida} estado={elegida.sesion.finales?.[String(elegida.indice)]} alGuardar={estado => {
          const s = sesiones.find(s => s.id === elegida.sesion.id) ?? elegida.sesion;
          alGuardar({ ...s, actualizada: estado.actualizada, finales: { ...s.finales, [String(elegida.indice)]: estado } });
        }}/>
        <details className={styles.origen}><summary>Volver a lo que pasó en mi partida</summary><p>{elegida.sesion.titulo} · Jugada {elegida.sesion.resultado.jugadas[elegida.indice].numero}: jugaste {sanPractica(elegida.sesion.resultado.jugadas[elegida.indice].san)}.</p><p>El análisis original es orientativo. Durante la práctica se vuelve a comprobar cada decisión y se aceptan alternativas.</p><button type="button" className="text-link" onClick={() => alRevisar(elegida.sesion)}>Ver el análisis de esta partida</button></details>
      </div>}
    </div>}
  </section>;
}

function PracticarFinal({ entrada, estado, alGuardar }: { entrada: FinalDePartida; estado?: EstadoFinalPersonal; alGuardar: (e: EstadoFinalPersonal) => void }) {
  const sonido=useSonidoPiezas();
  const [valoracion, setValoracion] = useState<EstadoFinalPersonal["valoracion"]>(estado?.valoracion ?? "ganar");
  const [plan, setPlan] = useState<PlanFinal>(estado?.plan ?? "activar"), [nota, setNota] = useState(estado?.nota ?? "");
  const [ocupado, setOcupado] = useState(false), [mensaje, setMensaje] = useState("Pensá tu evaluación y tu plan antes de mover."), [error, setError] = useState("");
  const [avance, setAvance] = useState<string[] | null>(null);
  const motor = useRef<MotorEntrenamiento | null>(null), generacion = useRef(0), bloqueo = useRef(false);
  const inicioRef = useRef<HTMLDivElement>(null);
  const color = entrada.sesion.color;
  const c = posicionFinal({ fen: entrada.fen, ruta: avance ?? estado?.ruta ?? [] });
  const resultado = resultadoFinal(c, color), limite = (estado?.ruta.length ?? 0) >= 398;
  const decisiones = c.history({ verbose: true }).filter(m => m.color === color).length;
  useEffect(() => () => { generacion.current++; motor.current?.destruir(); }, []);
  function guardar(e: EstadoFinalPersonal) { alGuardar({ ...e, actualizada: new Date().toISOString() }); }
  function empezar() {
    generacion.current++; motor.current?.destruir(); motor.current = null; bloqueo.current = false;
    setAvance(null); setOcupado(false); setError("");
    guardar({ fen: entrada.fen, ruta: [], errores: 0, ayudas: 0, valoracion: estado?.valoracion ?? valoracion, plan: estado?.plan ?? plan, nota: estado?.nota ?? nota.trim(), actualizada: "", practica: estado?.practica });
    setMensaje("Tu turno. Aplicá tu plan; el rival responde automáticamente.");
    requestAnimationFrame(() => inicioRef.current?.scrollIntoView({ block: "start", behavior: "instant" }));
  }
  async function mover(from: string, to: string, promotion?: string) {
    if (!estado || bloqueo.current || resultado || limite || c.turn() !== color) return false;
    const antesChess = posicionFinal(estado), nueva = posicionFinal(estado);
    let u: string;
    try { u = uciApertura(nueva.move({ from, to, promotion })); } catch { return false; }
    sonido.golpear(!!nueva.history({verbose:true}).at(-1)?.captured);
    const turno = ++generacion.current;
    bloqueo.current = true; setOcupado(true); setError(""); setAvance([...estado.ruta, u]);
    try {
      motor.current ??= new MotorEntrenamiento();
      const antes = await motor.current.evaluarPosicion(antesChess.fen(), antesChess.turn(), 1600);
      const despues = await motor.current.evaluarPosicion(nueva.fen(), nueva.turn(), 1600);
      if (turno !== generacion.current) return false;
      const juicio = compararDecisionFinal(antes, despues, color, u);
      const ruta = [...estado.ruta, u]; let respuesta = "";
      if (!nueva.isGameOver()) {
        if (!despues.mejorJugada) throw new Error("No se recibió una respuesta.");
        const m = moverUci(nueva, despues.mejorJugada); ruta.push(uciApertura(m)); respuesta = sanPractica(m.san);sonido.golpear(!!m.captured);
      }
      const errores = estado.errores + Number(!juicio.acierto), final = resultadoFinal(nueva, color);
      let practica = estado.practica;
      if (!juicio.acierto) practica = registrarPractica(practica, false, false);
      if (final) practica = registrarPractica(practica, (final === "victoria" || (final === "tablas" && estado.valoracion !== "ganar")) && errores === 0 && estado.ayudas === 0, estado.ayudas > 0 || errores > 0);
      guardar({ ...estado, ruta, errores, practica });
      setMensaje(final ? `Terminó en ${final}. Revisá cómo cambió tu plan durante el final.` : juicio.acierto ? `Tu alternativa conserva la evaluación. Stockfish respondió ${respuesta}.` : `Hay una decisión para revisar: el motor estima una caída de ${(juicio.perdida / 100).toLocaleString("es-UY", { maximumFractionDigits: 1 })} peones. Stockfish respondió ${respuesta}. Podés continuar o volver al comienzo.`);
    } catch (e) {
      if (turno === generacion.current && (e as Error).name !== "AbortError") {
        motor.current?.destruir(); motor.current = null;
        setError("El motor no pudo completar la respuesta. Conservamos la posición anterior; reintentá tu jugada. Esta falla no cuenta como error.");
      }
    } finally { if (turno === generacion.current) { setAvance(null); setOcupado(false); bloqueo.current = false; } }
    return false;
  }
  async function pista() {
    if (!estado || bloqueo.current || resultado || limite) return;
    const turno = ++generacion.current; bloqueo.current = true; setOcupado(true); setError("");
    try {
      motor.current ??= new MotorEntrenamiento(); const a = await motor.current.evaluarPosicion(c.fen(), c.turn(), 1600);
      if (turno !== generacion.current) return;
      if (!a.mejorJugada) throw new Error("Sin pista");
      const m = moverUci(new Chess(c.fen()), a.mejorJugada);
      guardar({ ...estado, ayudas: estado.ayudas + 1, practica: registrarPractica(estado.practica, false, true) });
      setMensaje(`Compará tu plan con ${sanPractica(m.san)}. Preguntate qué mejora y qué contrajuego evita.`);
    } catch { if (turno === generacion.current) { motor.current?.destruir(); motor.current = null; setError("No pudimos calcular la pista. Podés seguir jugando; no registramos una ayuda."); } }
    finally { if (turno === generacion.current) { bloqueo.current = false; setOcupado(false); } }
  }
  function descargar() {
    const partida = posicionFinal(estado ?? { fen: entrada.fen, ruta: [] });
    partida.setHeader("Event", "Práctica de final");
    partida.setHeader("White", color === "w" ? "Jugador" : "Stockfish");
    partida.setHeader("Black", color === "b" ? "Jugador" : "Stockfish");
    const url = URL.createObjectURL(new Blob([partida.pgn()], { type: "application/x-chess-pgn" }));
    const a = document.createElement("a"); a.href = url; a.download = "mi-practica-de-final.pgn"; a.click(); URL.revokeObjectURL(url);
  }
  return <div ref={inicioRef} className={styles.posicion}>
    <div className={styles.titulo}><h3>{entrada.familia}</h3><span>{color === "w" ? "Jugás con blancas" : "Jugás con negras"} · {decisiones} {decisiones === 1 ? "decisión" : "decisiones"}</span></div>
    {!estado ? <div className={styles.preparar}>
      <label>¿Qué resultado creés que podés buscar?<select value={valoracion} onChange={e => setValoracion(e.target.value as typeof valoracion)}><option value="ganar">Ganar</option><option value="tablas">Conservar las tablas</option><option value="resistir">Resistir una posición inferior</option></select></label>
      <label>¿Cuál es tu plan?<select value={plan} onChange={e => setPlan(e.target.value as PlanFinal)}>{Object.entries(PLANES_FINALES).map(([k, texto]) => <option key={k} value={k}>{texto}</option>)}</select></label>
      <label>Mi idea en una frase<textarea maxLength={800} value={nota} onChange={e => setNota(e.target.value)} placeholder="Qué quiero mejorar y qué quiere hacer el rival…"/></label>
    </div> : <div className={styles.plan}><strong>Tu plan: {PLANES_FINALES[estado.plan]}</strong><span>Buscás {({ ganar: "ganar", tablas: "conservar las tablas", resistir: "resistir" })[estado.valoracion]}.</span>{estado.nota && <p>{estado.nota}</p>}</div>}
    <label className="text-xs text-zinc-400"><input type="checkbox" checked={sonido.activo} onChange={e=>sonido.setActivo(e.target.checked)}/> Sonido de piezas</label><TableroApertura chess={c} color={color} habilitado={!!estado && !ocupado && !resultado && !limite} mover={(f, t, p) => { void mover(f, t, p); return false; }}/>
    <p className={styles.feedback} role="status">{ocupado ? "Stockfish está comprobando la decisión y preparando su respuesta…" : resultado ? `Final terminado: ${resultado}. ${estado?.errores ?? 0} decisiones para revisar · ${estado?.ayudas ?? 0} ayudas.` : limite ? "Llegaste al límite de este recorrido. Podés exportarlo o empezar otro intento; no lo marcamos como final resuelto." : estado && mensaje === "Pensá tu evaluación y tu plan antes de mover." ? "Recorrido recuperado. Tu turno: continuá con el plan que guardaste." : mensaje}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div className={styles.acciones}>{!estado ? <button type="button" className="button-primary" onClick={empezar}>Empezar este final</button> : <><button type="button" className="button-secondary" disabled={ocupado || !!resultado || limite} onClick={() => void pista()}>Pedir una pista</button><button type="button" className="text-link" disabled={ocupado} onClick={empezar}>Nuevo intento desde mi partida</button><button type="button" className="text-link" disabled={ocupado} onClick={descargar}>Descargar práctica PGN</button></>}</div>
    {estado?.practica?.proxima && <p className={styles.aclaracion}>Próximo repaso: {estado.practica.proxima}. Repetir hoy no adelanta el repaso.</p>}
    <p className={styles.aclaracion}>La valoración y el plan son tu hipótesis; se guardan para revisar. Stockfish comprueba cada jugada con una tolerancia de 0,75 peones. Sus evaluaciones son orientativas: esta práctica no usa todavía bases de finales para certificar victorias o tablas. Tu recorrido se guarda después de cada respuesta completa.</p>
  </div>;
}
