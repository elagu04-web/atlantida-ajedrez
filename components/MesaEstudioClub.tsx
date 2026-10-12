"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import Link from "next/link";
import { Chessboard } from "react-chessboard";
import { Icono } from "./Icono";
import { supabase } from "@/lib/supabase";
import { ESTUDIO_HIPOPOTAMO, leerRecorridoPgn, type RecorridoPgn } from "@/lib/recorridoPgn";

type Fuente = "estudio" | "club" | "propia";

export function MesaEstudioClub() {
  const [recorrido, setRecorrido] = useState<RecorridoPgn>(ESTUDIO_HIPOPOTAMO);
  const [fuente, setFuente] = useState<Fuente>("estudio");
  const [paso, setPaso] = useState(0);
  const [auto, setAuto] = useState(false);
  const [invertido, setInvertido] = useState(false);
  const [respuesta, setRespuesta] = useState<number | null>(null);
  const [error, setError] = useState("");
  const archivo = useRef<HTMLInputElement>(null);
  const tocado = useRef(false);
  const ultimo = recorrido.jugadas.length;
  const reproduciendo = auto && paso < ultimo;
  const jugada = paso ? recorrido.jugadas[paso - 1] : null;

  useEffect(() => {
    let cancelado = false;
    const abort = new AbortController();
    async function cargar() {
      try {
        const { data, error } = await supabase.from("transmision").select("pgn,resultado,blancas,negras").limit(1).abortSignal(abort.signal).maybeSingle();
        if (error || !data?.resultado || !data.pgn || cancelado || tocado.current) return;
        const registrada = leerRecorridoPgn(data.pgn);
        registrada.blancas = data.blancas || registrada.blancas;
        registrada.negras = data.negras || registrada.negras;
        registrada.resultado = data.resultado;
        setRecorrido(registrada); setFuente("club");
      } catch { /* El material de estudio sigue disponible si el canal no responde. */ }
    }
    void cargar();
    const limite = setTimeout(() => abort.abort(), 10000);
    return () => { cancelado = true; clearTimeout(limite); abort.abort(); };
  }, []);

  useEffect(() => {
    if (!reproduciendo) return;
    const timer = setTimeout(() => setPaso(p => Math.min(p + 1, ultimo)), 1100);
    return () => clearTimeout(timer);
  }, [reproduciendo, paso, ultimo]);

  function ir(destino: number) { tocado.current = true; setAuto(false); setPaso(Math.max(0, Math.min(destino, ultimo))); }
  async function abrirPgn(e: ChangeEvent<HTMLInputElement>) {
    const fichero = e.target.files?.[0]; e.target.value = "";
    if (!fichero) return;
    tocado.current = true;
    try {
      if (fichero.size > 200_000) throw new Error("Elegí un PGN de hasta 200 KB.");
      const partida = leerRecorridoPgn(await fichero.text());
      setAuto(false); setPaso(0); setRecorrido(partida); setFuente("propia"); setRespuesta(null); setError("");
    } catch { setError("No pudimos abrir ese archivo. Revisá que sea un PGN válido con jugadas y de hasta 200 KB."); }
  }
  function volverEstudio() {
    tocado.current = true; setAuto(false); setPaso(0); setRecorrido(ESTUDIO_HIPOPOTAMO); setFuente("estudio"); setRespuesta(null); setError("");
  }

  return <section id="mesa-estudio" className="club-study panel" aria-labelledby="titulo-estudio">
    <div className="club-study-board">
      <div className="club-study-players"><span>{fuente === "estudio" ? "El Hipopótamo, paso a paso" : `${recorrido.blancas} · ${recorrido.negras}`}</span>{fuente !== "estudio" && recorrido.resultado !== "*" && <strong>{recorrido.resultado}</strong>}</div>
      <div className="play-board"><Chessboard options={{ id: "mesa-estudio-club", position: recorrido.posiciones[paso], boardOrientation: invertido ? "black" : "white", allowDragging: false, allowAutoScroll: false, animationDurationInMs: 220, lightSquareStyle: { backgroundColor: "#f0e6ce" }, darkSquareStyle: { backgroundColor: "#638480" }, squareStyles: jugada ? { [jugada.origen]: { backgroundColor: "#e4be7155" }, [jugada.destino]: { backgroundColor: "#e4be7180" } } : {} }}/></div>
      <div className="club-study-controls" role="group" aria-label="Recorrer la partida">
        <button type="button" className="button-secondary" aria-label="Ir al comienzo" disabled={paso === 0} onClick={() => ir(0)}>↤</button>
        <button type="button" className="button-secondary" aria-label="Jugada anterior" disabled={paso === 0} onClick={() => ir(paso - 1)}>←</button>
        <button type="button" className="button-primary" onClick={() => { tocado.current = true; if (reproduciendo) setAuto(false); else { if (paso === ultimo) setPaso(0); setAuto(true); } }}>{reproduciendo ? "Pausar" : "Reproducir"}</button>
        <button type="button" className="button-secondary" aria-label="Jugada siguiente" disabled={paso === ultimo} onClick={() => ir(paso + 1)}>→</button>
        <button type="button" className="button-secondary" aria-label="Ir al final" disabled={paso === ultimo} onClick={() => ir(ultimo)}>↦</button>
      </div>
      <label className="club-study-progress"><span>{jugada?.texto || "Posición inicial"}<small>{paso}/{ultimo}</small></span><input type="range" min={0} max={ultimo} value={paso} onChange={e => ir(Number(e.target.value))} aria-label="Elegir jugada de la partida"/></label>
    </div>
    <div className="club-study-copy">
      <p className="eyebrow text-amber-200">La mesa de estudio</p>
      <h2 id="titulo-estudio">{fuente === "club" ? "Una partida nuestra. Mucho para mirar." : fuente === "propia" ? "Tu partida, jugada a jugada." : "¿Qué está preparando el Hipopótamo?"}</h2>
      <p>{fuente === "club" ? "Recorré la última partida completa registrada en la transmisión. Frená donde algo te llame la atención y traé esa posición al grupo del jueves." : fuente === "propia" ? "Recorré tu PGN, frená en el momento clave y elegí una posición para analizar el jueves. El archivo se abre en tu navegador." : "Las negras parecen encerradas, pero están armando su contraataque. Mirá cómo se acomoda cada pieza y elegí el plan que tiene más sentido."}</p>
      {fuente === "estudio" && <div className="club-study-question"><h3>Con el esquema armado, ¿qué buscan las negras?</h3><div role="group" aria-label="Elegir un plan para el Hipopótamo">{["Abrir el centro sin preparar las piezas", "Preparar una ruptura y aprovechar las debilidades del rival", "Esperar sin mejorar ninguna pieza"].map((texto, i) => <button type="button" key={texto} className="club-study-answer" data-seleccionada={respuesta === i} aria-pressed={respuesta === i} onClick={() => { tocado.current = true; setRespuesta(i); }}>{texto}</button>)}</div>{respuesta !== null && <p role="status" className={respuesta === 1 ? "text-emerald-300" : "text-amber-200"}>{respuesta === 1 ? "¡Ese es el plan! Coordiná las piezas, prepará la ruptura y mirá qué casillas dejó débiles el rival." : "Todavía falta preparar el contraataque. La paciencia sirve cuando mejorás las piezas y elegís qué ruptura te conviene."}</p>}<Link href="/noticias/defensa-hipopotamo-cinco-claves" className="text-link">Leer las claves del Hipopótamo<Icono nombre="flecha" className="h-4 w-4"/></Link></div>}
      <div className="club-study-actions"><button type="button" className="button-secondary" onClick={() => archivo.current?.click()}>Abrir mi PGN</button><button type="button" className="text-link" onClick={() => { tocado.current = true; setInvertido(v => !v); }}>Girar tablero ↻</button>{fuente !== "estudio" && <button type="button" className="text-link" onClick={volverEstudio}>Ver el Hipopótamo</button>}</div>
      <input ref={archivo} type="file" accept=".pgn,text/plain,application/x-chess-pgn" className="sr-only" tabIndex={-1} aria-label="Abrir archivo PGN" onChange={e => void abrirPgn(e)}/>
      {error && <p role="alert" className="mt-3 text-sm text-amber-200">{error}</p>}
      <details className="club-study-moves"><summary>Ver las jugadas</summary><div role="group" aria-label="Elegir una jugada">{recorrido.jugadas.map((j, i) => <button type="button" key={i} aria-pressed={paso === i + 1} onClick={() => ir(i + 1)}>{j.texto}</button>)}</div></details>
    </div>
  </section>;
}
