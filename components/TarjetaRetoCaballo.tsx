"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { MarcaCaballo } from "@/lib/caballoClub";
import { PiezaAjedrez } from "./PiezaAjedrez";
import { CompartirInvitacion } from "./CompartirInvitacion";

type Tabla = { filas: MarcaCaballo[]; error: boolean };
type Resumen = { cuenta: string; records: Tabla; semana: Tabla };

function tabla(datos: unknown, error: unknown): Tabla {
  if (error || !Array.isArray(datos) || !datos.every(f => f && typeof f.jugador_id === "string" && typeof f.nombre === "string" && Number.isInteger(f.casillas) && f.casillas >= 1 && f.casillas <= 64 && Number.isInteger(f.puesto) && f.puesto > 0 && (f.es_mio === null || typeof f.es_mio === "boolean"))) return { filas: [], error: true };
  return { filas: datos.map(f => ({ ...f, es_mio: f.es_mio === true })), error: false };
}

export function TarjetaRetoCaballo() {
  const { session, cargando: cargandoCuenta } = useAuth();
  const cuenta = session?.user.id ?? "anon";
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [vista, setVista] = useState<"records" | "semana">("records");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (cargandoCuenta) return;
    let cancelado = false, pendiente = false;
    const abort = new AbortController();
    async function cargar() {
      if (cancelado || pendiente) return;
      pendiente = true;
      const peticion = (nombre: string) => supabase.rpc(nombre).abortSignal(AbortSignal.any([abort.signal, AbortSignal.timeout(10000)]));
      try {
        const [records, semana] = await Promise.allSettled([peticion("tabla_reto_caballo_records"), peticion("tabla_reto_caballo")]);
        if (cancelado) return;
        const leer = (r: typeof records) => r.status === "fulfilled" ? tabla(r.value.data, r.value.error) : tabla(null, true);
        setResumen({ cuenta, records: leer(records), semana: leer(semana) });
      } finally { pendiente = false; }
    }
    void cargar();
    const visible = () => { if (document.visibilityState === "visible") void cargar(); };
    const actualizar = () => void cargar();
    const intervalo = setInterval(visible, 60000);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("caballo-guardado", actualizar);
    window.addEventListener("online", actualizar);
    return () => { cancelado = true; abort.abort(); clearInterval(intervalo); document.removeEventListener("visibilitychange", visible); window.removeEventListener("caballo-guardado", actualizar); window.removeEventListener("online", actualizar); };
  }, [cuenta, cargandoCuenta, revision]);
  const actual = !cargandoCuenta && resumen?.cuenta === cuenta ? resumen[vista] : null;
  const propia = actual?.filas.find(f => f.es_mio);
  return <section className="knight-home panel" aria-labelledby="titulo-reto-portada">
    <Link href="/jugar/caballo" className="knight-home-heading"><div className="knight-invite-art" aria-hidden="true"><PiezaAjedrez tipo="n" color="w"/><span>64</span></div><div><p className="eyebrow">El reto del club</p><h2 id="titulo-reto-portada">¿Hasta dónde llega tu caballo?</h2><p>Un recorrido sin repetir casillas. Probá tu ruta y dejá una marca para los demás.</p></div></Link>
    <div className="knight-home-ranking"><div className="knight-home-ranking-heading"><div className="segmented-control" role="group" aria-label="Marcas del caballo en la portada"><button type="button" aria-pressed={vista === "records"} onClick={() => setVista("records")}>Récords</button><button type="button" aria-pressed={vista === "semana"} onClick={() => setVista("semana")}>Esta semana</button></div><Link href="/jugar/caballo#clasificacion-caballo" className="text-link">Ver tabla ↗</Link></div>
      {!actual ? <p role="status" className="knight-home-notice">Cargando las marcas del club…</p> : actual.error ? <div className="knight-home-notice" role="status">No pudimos cargar las marcas. <button type="button" className="text-link" onClick={() => setRevision(n => n + 1)}>Reintentar</button></div> : actual.filas.length ? <><ol aria-label={vista === "records" ? "Mejores récords del caballo" : "Mejores marcas de esta semana"}>{actual.filas.slice(0, 3).map(f => <li key={f.jugador_id} className={f.es_mio ? "is-mine" : undefined}><span className="knight-home-position">{f.puesto === 1 ? "♛" : String(f.puesto).padStart(2, "0")}</span><Link href={`/jugadores/${f.jugador_id}`}>{f.nombre}{f.es_mio && <small>Vos</small>}</Link><strong>{f.casillas}<small>/64</small></strong></li>)}</ol>{propia && <p className="knight-home-own">{vista === "records" ? "Tu récord" : "Tu marca de esta semana"}: <strong>{propia.casillas}/64</strong> · Puesto {propia.puesto}</p>}</> : <p className="knight-home-notice">{vista === "semana" ? "La primera marca de esta semana puede ser tuya. Los récords anteriores siguen guardados." : "Dejá la primera marca y desafiá al club."}</p>}
      <p className="knight-home-caption">{vista === "records" ? "Las mejores marcas de todas las semanas. No se reinician." : "Una misma salida para todos. Cada lunes empieza otra tabla."}</p>
    </div>
    <div className="knight-home-actions"><Link href="/jugar/caballo" className="button-primary">{propia ? "Superar mi marca" : "Probar el reto"} →</Link><CompartirInvitacion titulo="Desafío del caballo · Atlántida" texto="¿Hasta dónde llegás con el caballo? Visitá las 64 casillas sin repetir y sumate a las marcas de Atlántida Ajedrez." ruta="/jugar/caballo" etiqueta="Desafiar a alguien"/></div>
  </section>;
}
