"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icono } from "./Icono";
import { useSonidoPiezas } from "@/lib/useSonidoPiezas";
import { arrancarReloj, comprobarTiempo, configuracionValida, crearReloj, formatearTiempo, guardarEstadoReloj, nombreRitmo, pausarReloj, pulsarReloj, recuperarReloj, RITMOS_RELOJ, tiemposReloj, type ConfiguracionReloj, type EstadoReloj, type LadoReloj } from "@/lib/relojAjedrez";
import s from "./RelojAjedrez.module.css";

const CLAVE = "atlantida-reloj-ajedrez-v1";
const COLORES = ["Blancas", "Negras"] as const;
function guardar(reloj: EstadoReloj) { try { localStorage.setItem(CLAVE, guardarEstadoReloj(reloj)); } catch { /* El reloj también funciona sin almacenamiento. */ } }

export function RelojAjedrez() {
  const [reloj, setReloj] = useState(() => crearReloj());
  const actual = useRef(reloj), escenario = useRef<HTMLDivElement>(null);
  const [ahora, setAhora] = useState(0), [cargado, setCargado] = useState(false);
  const [mesa, setMesa] = useState(false), [enfrentados, setEnfrentados] = useState(true), [invertidos, setInvertidos] = useState(false);
  const [mantenerPantalla, setMantenerPantalla] = useState(true), [pantallaActiva, setPantallaActiva] = useState(false);
  const [pendiente, setPendiente] = useState<ConfiguracionReloj | null>(null), [aviso, setAviso] = useState("");
  const [minutos, setMinutos] = useState("5"), [segundos, setSegundos] = useState("0"), [incremento, setIncremento] = useState("3");
  const sonido = useSonidoPiezas(), estadoAnterior = useRef(reloj.estado);
  const publicar = useCallback((siguiente: EstadoReloj) => {
    actual.current = siguiente; setReloj(siguiente); setAhora(Date.now()); guardar(siguiente);
  }, []);

  useEffect(() => {
    let cancelado = false;
    void Promise.resolve().then(() => {
      if (cancelado) return;
      let recuperado: EstadoReloj | null = null;
      try { recuperado = recuperarReloj(localStorage.getItem(CLAVE), Date.now()); } catch {}
      if (recuperado) {
        publicar(recuperado);
        setMinutos(String(Math.floor(recuperado.configuracion.segundos / 60)));
        setSegundos(String(recuperado.configuracion.segundos % 60));
        setIncremento(String(recuperado.configuracion.incremento));
        if (recuperado.estado === "pausado") setAviso("Recuperamos tu partida en pausa. Revisá los tiempos y tocá Continuar.");
      }
      setCargado(true);
    });
    const intervalo = setInterval(() => {
      const fecha = Date.now(), siguiente = comprobarTiempo(actual.current, fecha);
      if (siguiente !== actual.current) publicar(siguiente);
      else if (siguiente.estado === "corriendo") setAhora(fecha);
    }, 100);
    const respaldo = setInterval(() => guardar(actual.current), 1000);
    const conservar = () => guardar(actual.current);
    window.addEventListener("pagehide", conservar); document.addEventListener("visibilitychange", conservar);
    return () => { cancelado = true; clearInterval(intervalo); clearInterval(respaldo); conservar(); window.removeEventListener("pagehide", conservar); document.removeEventListener("visibilitychange", conservar); };
  }, [publicar]);

  useEffect(() => {
    if (reloj.estado === "terminado" && estadoAnterior.current === "corriendo") { sonido.golpear(true); navigator.vibrate?.([120, 80, 120]); }
    estadoAnterior.current = reloj.estado;
  }, [reloj.estado, sonido]);

  useEffect(() => {
    if (!mesa) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    escenario.current?.focus({ preventScroll: true });
    return () => { document.body.style.overflow = anterior; };
  }, [mesa]);

  useEffect(() => {
    if (reloj.estado !== "corriendo" || !mantenerPantalla || !("wakeLock" in navigator)) return;
    let vigente = true, solicitando = false, bloqueo: WakeLockSentinel | null = null;
    async function solicitar() {
      if (!vigente || solicitando || document.hidden || (bloqueo && !bloqueo.released)) return;
      solicitando = true;
      try {
        const nuevo = await navigator.wakeLock.request("screen");
        if (!vigente) { await nuevo.release(); return; }
        bloqueo = nuevo; setPantallaActiva(true);
        nuevo.addEventListener("release", () => { if (vigente) setPantallaActiva(false); });
      } catch { if (vigente) setPantallaActiva(false); }
      finally { solicitando = false; }
    }
    void solicitar(); document.addEventListener("visibilitychange", solicitar);
    return () => { vigente = false; document.removeEventListener("visibilitychange", solicitar); setPantallaActiva(false); void bloqueo?.release().catch(() => {}); };
  }, [reloj.estado, mantenerPantalla]);

  function accionar(lado: LadoReloj) {
    const anterior = actual.current, siguiente = pulsarReloj(anterior, lado, Date.now());
    if (siguiente === anterior) return;
    publicar(siguiente); setAviso("");
    if (siguiente.estado === "corriendo") { sonido.golpear(); navigator.vibrate?.(15); }
  }
  function alternar() {
    const r = actual.current, fecha = Date.now();
    if (r.estado === "terminado" || !cargado || pendiente) return;
    if (r.estado === "corriendo") publicar(pausarReloj(r, fecha));
    else { sonido.preparar(); publicar(arrancarReloj(r, fecha)); setAviso(""); setMesa(true); }
  }

  useEffect(() => {
    function teclado(e: KeyboardEvent) {
      if (e.key === "Escape" && actual.current.estado === "corriendo") { e.preventDefault(); publicar(pausarReloj(actual.current, Date.now())); return; }
      if (mesa && e.key === "Tab") {
        const botones = Array.from(escenario.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []).filter(b => b.getClientRects().length > 0);
        const indice = botones.indexOf(document.activeElement as HTMLButtonElement);
        if (botones.length && (e.shiftKey ? indice <= 0 : indice < 0 || indice === botones.length - 1)) { e.preventDefault(); botones[e.shiftKey ? botones.length - 1 : 0].focus(); }
      }
      if (e.code !== "Space" || e.repeat || !cargado || pendiente || (e.target as HTMLElement)?.closest("button,input,select,textarea,a,dialog")) return;
      e.preventDefault();
      const r = actual.current;
      if (r.estado === "corriendo") accionar(r.turno);
    }
    document.addEventListener("keydown", teclado);
    return () => document.removeEventListener("keydown", teclado);
  });

  function aplicarConfiguracion(c: ConfiguracionReloj, fecha: number) {
    if (!configuracionValida(c)) { setAviso("Elegí un tiempo de 1 segundo a 180 minutos y un incremento de 0 a 60 segundos."); return; }
    setMinutos(String(Math.floor(c.segundos / 60))); setSegundos(String(c.segundos % 60)); setIncremento(String(c.incremento));
    if (actual.current.estado !== "listo" && actual.current.estado !== "terminado") { publicar(pausarReloj(actual.current, fecha)); setPendiente(c); }
    else { publicar(crearReloj(c)); setAviso(""); }
  }
  function reiniciar() {
    if (actual.current.estado === "listo") return;
    publicar(pausarReloj(actual.current, Date.now())); setPendiente(actual.current.configuracion);
  }
  function salir() {
    publicar(pausarReloj(actual.current, Date.now())); setMesa(false);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }
  function ampliar() {
    setMesa(true);
    const solicitud = escenario.current?.requestFullscreen?.();
    if (solicitud) void solicitud.catch(() => { /* El modo mesa sigue disponible sin pantalla completa nativa. */ });
  }
  const tiempos = tiemposReloj(reloj, ahora), deArriba: LadoReloj = invertidos ? 0 : 1, deAbajo: LadoReloj = invertidos ? 1 : 0;
  const mensaje = pendiente ? "Partida en pausa. Confirmá si querés reiniciar los dos relojes." : reloj.estado === "terminado" ? `Se agotó el tiempo de ${COLORES[reloj.caido!].toLowerCase()}.` : reloj.estado === "corriendo" ? `Juegan ${COLORES[reloj.turno].toLowerCase()}.` : reloj.estado === "pausado" ? "Reloj en pausa." : "Listo para jugar. Empiezan las blancas.";

  function panel(lado: LadoReloj, arriba: boolean) {
    const activo = reloj.estado === "corriendo" && reloj.turno === lado, caido = reloj.caido === lado;
    return <button type="button" className={`${s.panel} ${lado === 0 ? s.blancas : s.negras}`} disabled={!activo || !!pendiente} data-activo={activo} data-caido={caido} data-poco={tiempos[lado] <= 10000 && activo} aria-label={`Finalizar turno de ${COLORES[lado]} y activar ${COLORES[lado === 0 ? 1 : 0]}`} onPointerDown={e => { if (!e.isPrimary || e.button !== 0) return; e.preventDefault(); accionar(lado); }} onClick={e => { if (e.detail === 0) accionar(lado); }}>
      <span className={`${s.cara} ${arriba && enfrentados ? s.invertida : ""}`}>
        <span className={s.identidad}><span aria-hidden="true">{lado === 0 ? "♔" : "♚"}</span>{COLORES[lado]}<span className={s.turno}>{caido ? "Tiempo agotado" : activo ? "Tu turno" : reloj.estado === "pausado" ? "Pausa" : "En espera"}</span></span>
        <span className={s.tiempo} role="timer" aria-live="off" aria-label={`Tiempo de ${COLORES[lado]}: ${formatearTiempo(tiempos[lado])}`}>{formatearTiempo(tiempos[lado])}</span>
        <span className={s.pie}>{caido ? "Reloj detenido" : activo ? "Tocá acá al terminar tu jugada" : `${reloj.jugadas[lado]} ${reloj.jugadas[lado] === 1 ? "jugada" : "jugadas"}`}<span>+{reloj.configuracion.incremento} s</span></span>
      </span>
    </button>;
  }

  return <div className={s.raiz}>
    <div ref={escenario} tabIndex={-1} className={`${s.escenario} ${mesa ? s.mesa : ""}`} role={mesa ? "dialog" : "group"} aria-modal={mesa || undefined} aria-label="Reloj de ajedrez para dos jugadores">
      {panel(deArriba, true)}
      <div className={s.controles}>
        {pendiente ? <div className={s.confirmar} role="group" aria-label="Confirmar nuevo reloj"><p>¿Empezar de cero con {nombreRitmo(pendiente)}?</p><span>Se reinician los dos tiempos y las jugadas.</span><div><button type="button" onClick={() => setPendiente(null)}>Cancelar</button><button type="button" className={s.principal} onClick={() => { publicar(crearReloj(pendiente)); setPendiente(null); setAviso(""); }}>Sí, reiniciar</button></div></div> : <>
          <span className={s.ritmo}>{nombreRitmo(reloj.configuracion)}<small>MIN + SEG / JUGADA</small></span>
          <button type="button" className={s.principal} disabled={!cargado || reloj.estado === "terminado"} onClick={alternar}>{reloj.estado === "listo" ? "Empezar · blancas" : reloj.estado === "corriendo" ? "Ⅱ Pausar" : reloj.estado === "pausado" ? "▶ Continuar" : "Tiempo agotado"}</button>
          <button type="button" onClick={reiniciar} disabled={reloj.estado === "listo"}><Icono nombre="reiniciar" className="h-4 w-4"/><span>Nuevo reloj</span></button>
          {mesa ? <button type="button" onClick={salir}><Icono nombre="menu" className="h-4 w-4"/><span>Salir / ajustes</span></button> : <button type="button" onClick={ampliar}><Icono nombre="reloj" className="h-4 w-4"/><span>Pantalla completa</span></button>}
        </>}
        <span className={s.sr} role="status" aria-live="polite">{mensaje}</span>
      </div>
      {panel(deAbajo, false)}
    </div>
    <div className={s.extras} inert={mesa}>
      <p className={s.estado} role="status">{aviso || mensaje}</p>
      <section className={s.ajustes} aria-labelledby="ajustes-reloj">
        <div><p className="eyebrow text-amber-200">A tu ritmo</p><h2 id="ajustes-reloj">Prepará la partida.</h2><p>Cada jugador toca su reloj después de mover. El incremento se suma al terminar cada jugada.</p></div>
        <div className={s.ritmos} role="group" aria-label="Elegir ritmo">{RITMOS_RELOJ.map(c => <button type="button" key={`${c.segundos}+${c.incremento}`} aria-pressed={reloj.configuracion.segundos === c.segundos && reloj.configuracion.incremento === c.incremento} onClick={() => aplicarConfiguracion(c, Date.now())}>{nombreRitmo(c)}{c.segundos === 300 && c.incremento === 3 && <small>El del torneo online</small>}</button>)}</div>
        <form className={s.personalizado} onSubmit={e => { e.preventDefault(); const m = Number(minutos), seg = Number(segundos), inc = Number(incremento); if (!minutos.trim() || !segundos.trim() || !incremento.trim() || !Number.isInteger(m) || !Number.isInteger(seg) || seg < 0 || seg > 59 || m < 0 || m > 180) { setAviso("Revisá los minutos, los segundos y el incremento."); return; } aplicarConfiguracion({segundos:m * 60 + seg,incremento:inc}, Date.now()); }}>
          <label>Minutos<input type="number" min="0" max="180" step="1" required inputMode="numeric" value={minutos} onChange={e => setMinutos(e.target.value)}/></label>
          <label>Segundos<input type="number" min="0" max="59" step="1" required inputMode="numeric" value={segundos} onChange={e => setSegundos(e.target.value)}/></label>
          <label>Incremento · s<input type="number" min="0" max="60" step="1" required inputMode="numeric" value={incremento} onChange={e => setIncremento(e.target.value)}/></label>
          <button type="submit" className="button-secondary">Aplicar tiempo</button>
        </form>
        <div className={s.opciones}>
          <label><input type="checkbox" checked={enfrentados} onChange={e => setEnfrentados(e.target.checked)}/>Relojes enfrentados</label>
          <label><input type="checkbox" checked={sonido.activo} onChange={e => sonido.setActivo(e.target.checked)}/>Sonido al cambiar turno</label>
          <label><input type="checkbox" checked={mantenerPantalla} onChange={e => setMantenerPantalla(e.target.checked)}/>Mantener pantalla encendida, si el navegador lo permite</label>
          <button type="button" disabled={reloj.estado === "corriendo"} onClick={() => setInvertidos(v => !v)}>⇅ Cambiar lados</button>
        </div>
        {pantallaActiva && <p className={s.ayuda}>Pantalla activa durante la partida.</p>}
      </section>
      <div className={s.consejos}><p><strong>Un teléfono entre los dos.</strong> Colocalo al lado del tablero y tocá Empezar. El reloj de arriba está girado para quien se sienta enfrente.</p><p><strong>También con teclado.</strong> Espacio cambia el turno; Escape pausa. Podés usar Tab y Enter para recorrer los controles.</p><p>El tiempo sigue al cambiar de pestaña. Si recargás la página, se recupera en pausa con el tiempo transcurrido descontado. Se guarda en este dispositivo, sin iniciar sesión.</p></div>
    </div>
  </div>;
}
