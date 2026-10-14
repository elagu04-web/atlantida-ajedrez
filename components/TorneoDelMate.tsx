"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Jugador } from "@/lib/players";
import type { Torneo } from "@/lib/tournaments";
import { calcularTorneoMate, PARTICIPANTES_MATE, type PasoCinturonMate } from "@/lib/torneoMate";
import styles from "./TorneoDelMate.module.css";

function Cinturon() {
  return <svg viewBox="0 0 200 100" fill="none" aria-hidden="true" className={styles.belt}>
    <path d="M9 34h41v32H9zM150 34h41v32h-41z" fill="#26374a" stroke="#dfbd79" strokeWidth="2" />
    <rect x="22" y="42" width="17" height="16" rx="3" stroke="#dfbd79" /><rect x="161" y="42" width="17" height="16" rx="3" stroke="#dfbd79" />
    <path d="m51 28 23-16h52l23 16v44l-23 16H74L51 72V28Z" fill="#c7a05a" stroke="#f4d497" strokeWidth="3" />
    <path d="m61 33 17-12h44l17 12v34l-17 12H78L61 67V33Z" fill="#152234" stroke="#f4d497" />
    <path d="m100 28 3.4 6.8 7.5 1.1-5.4 5.3 1.3 7.5-6.8-3.6-6.8 3.6 1.3-7.5-5.4-5.3 7.5-1.1L100 28Z" fill="#f4d497" />
    <text x="100" y="65" textAnchor="middle" fill="#f4d497" fontSize="15" fontWeight="700" letterSpacing="2">MATE</text>
  </svg>;
}

export function TorneoDelMate({ torneos, jugadores, cargando, error }: {
  torneos: Torneo[]; jugadores: Jugador[]; cargando: boolean; error: boolean;
}) {
  const [vista, setVista] = useState<"general" | "cinturon">("general");
  const [alcance, setAlcance] = useState<"entre-ellos" | "todos">("entre-ellos");
  const dato = useMemo(() => calcularTorneoMate(torneos, jugadores, alcance), [torneos, jugadores, alcance]);
  const nombre = (id: string | null) => jugadores.find(j => j.id === id)?.nombre ?? PARTICIPANTES_MATE.find(j => j.id === id)?.nombre ?? "Sin campeón";
  const corto = (id: string | null) => nombre(id).split(" ").slice(0, id === PARTICIPANTES_MATE[3].id ? 2 : 1).join(" ");
  const cinturon = dato.cinturon;
  const ultimo = [...cinturon.pasos].reverse().find(p => p.campeonId === cinturon.campeonId);
  function tituloPaso(p: PasoCinturonMate) {
    if (p.tipo === "ambiguo") return "El orden de estos duelos falta por confirmar";
    if (p.tipo === "recuperado") return `${corto(p.campeonId)} tiene el cinturón`;
    if (p.tipo === "defensa") return `${corto(p.campeonId)} lo defiende`;
    return p.anteriorId ? `${corto(p.campeonId)} se lo roba a ${corto(p.anteriorId)}` : `${corto(p.campeonId)} gana el primer cinturón`;
  }

  return <section className={styles.section} aria-labelledby="titulo-torneo-mate" id="torneo-del-mate">
    <div className={styles.heading}>
      <div><p className={styles.eyebrow}>Cuatro habituales. Una rivalidad.</p><h2 id="titulo-torneo-mate">Torneo del Mate</h2><p>Fernando, Camilo, Jorge y Juan Diego. Sus puntos y el cinturón que se disputan.</p></div>
      <div className={styles.switch} role="group" aria-label="Vista del Torneo del Mate">
        <button aria-pressed={vista === "general"} onClick={() => setVista("general")}>Tabla general</button>
        <button aria-pressed={vista === "cinturon"} onClick={() => setVista("cinturon")}>El cinturón</button>
      </div>
    </div>
    {cargando ? <p className={styles.empty} role="status">Cargando los resultados del Mate…</p> : error ? <p className={styles.empty} role="status">No pudimos comprobar todos los resultados. Volvé a intentarlo cuando se recupere la conexión.</p> : vista === "general" ? <>
      <div className={styles.toolbar}>
        <div className={styles.switch} role="group" aria-label="Partidas que cuentan en la tabla del Mate">
          <button aria-pressed={alcance === "entre-ellos"} onClick={() => setAlcance("entre-ellos")}>Entre ellos</button>
          <button aria-pressed={alcance === "todos"} onClick={() => setAlcance("todos")}>Todos sus rivales</button>
        </div>
        <span>{dato.partidasIncluidas} partidas · {dato.torneos} torneos</span>
      </div>
      <p className={styles.explanation}>{alcance === "entre-ellos" ? "Sólo cuentan sus duelos entre sí." : "Cuenta lo que jugó cada uno contra cualquier rival del club."} Todo el historial cargado: victoria = 1 punto, tablas = ½. Los descansos no suman.</p>
      <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Tabla general del Torneo del Mate">
        <table className={styles.table}><thead><tr><th scope="col">#</th><th scope="col">Jugador</th><th scope="col"><abbr title="Partidas jugadas">PJ</abbr></th><th scope="col"><abbr title="Victorias">V</abbr></th><th scope="col"><abbr title="Tablas">T</abbr></th><th scope="col"><abbr title="Derrotas">D</abbr></th><th scope="col">Puntos</th><th scope="col">Rendimiento</th></tr></thead>
          <tbody>{dato.filas.map(f => <tr key={f.jugadorId}>
            <td>{f.partidas ? f.posicion : "—"}</td><th scope="row"><Link href={`/jugadores/${f.jugadorId}`}>{f.nombre}</Link>{f.jugadorId === cinturon.campeonId && <button onClick={() => setVista("cinturon")} className={styles.championTag} aria-label={`Ver el cinturón de ${f.nombre}`}>Tiene el cinturón ↗</button>}</th>
            <td>{f.partidas}</td><td className={styles.wins}>{f.victorias}</td><td>{f.tablas}</td><td>{f.derrotas}</td><td className={styles.points}>{f.puntos}</td><td>{f.rendimiento === null ? "—" : `${f.rendimiento.toFixed(1)}%`}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <details className={styles.details}><summary>Cómo vienen los mano a mano</summary><div className={styles.crosses}>{dato.cruces.map(c => <div key={`${c.aId}:${c.bId}`}><p>{corto(c.aId)} <span>vs.</span> {corto(c.bId)}</p><strong>{c.aVictorias} <span>–</span> {c.bVictorias}</strong><small>{c.tablas} tablas · {c.partidas} partidas</small></div>)}</div><p className={styles.explanation}>El marcador muestra victorias de cada lado; las tablas van aparte.</p></details>
      {!dato.partidasIncluidas && <p className={styles.empty}>Todavía no hay resultados cargados para esta tabla.</p>}
    </> : <>
      <div className={styles.champion}>
        <Cinturon /><div><p className={styles.eyebrow}>{cinturon.pendiente ? "Cinturón por confirmar" : cinturon.campeonId ? "El campeón del Mate" : "El cinturón está vacante"}</p>
          <h3>{cinturon.pendiente ? "Falta ordenar algunos duelos" : cinturon.campeonId ? <Link href={`/jugadores/${cinturon.campeonId}`}>{nombre(cinturon.campeonId)}</Link> : "¿Quién lo gana primero?"}</h3>
          <p>{cinturon.pendiente ? "Los resultados están en la tabla. Para adjudicar el cinturón necesitamos saber en qué orden se jugaron." : ultimo ? <>Último resultado por el cinturón: {ultimo.torneoId ? <Link href={`/torneos/${ultimo.torneoId}`}>{ultimo.torneo}</Link> : ultimo.torneo}{ultimo.ronda ? ` · ronda ${ultimo.ronda}` : ""}.</> : "La primera victoria entre estos cuatro estrena el cinturón."}</p>
        </div>
      </div>
      <div className={styles.rules}><p><strong>Se gana frente al campeón.</strong> Si pierde contra otro de los cuatro, el cinturón cambia de manos. Si gana o empata, lo conserva.</p><p>Los duelos sin el campeón no lo ponen en juego. El cinturón usa todos sus enfrentamientos registrados, sin importar el filtro de la tabla.</p></div>
      <h3 className={styles.historyTitle}>El recorrido del cinturón <span>{dato.duelos.length} duelos registrados</span></h3>
      {cinturon.pasos.length ? <ol className={styles.timeline}>{[...cinturon.pasos].reverse().map(p => <li key={p.id} className={p.tipo === "ambiguo" ? styles.uncertain : ""}>
        <span className={styles.timelineDot} aria-hidden="true" /><div><p className={styles.eventLabel}>{p.tipo === "ambiguo" ? "Tramo por confirmar" : p.tipo === "recuperado" ? "Campeón confirmado" : p.tipo === "defensa" ? "Defensa" : p.anteriorId ? "Cambio de manos" : "Primer campeón"}</p><h4>{tituloPaso(p)}</h4>
          <p className={styles.eventSource}>{p.torneoId ? <Link href={`/torneos/${p.torneoId}`}>{p.torneo}</Link> : p.torneo}{p.ronda ? ` · ronda ${p.ronda}` : ""}</p>
          {p.tipo === "ambiguo" && <p className={styles.warning}>No quedó asentado cuál se jugó primero. El dueño del cinturón durante este tramo queda por confirmar.</p>}
          {p.tipo === "recuperado" && <p className={styles.warning}>Desde acá, los resultados vuelven a dejar un único campeón, cualquiera haya sido el orden anterior.</p>}
          <div className={styles.results}>{p.partidas.map(partida => <span key={partida.id}>{corto(partida.blancasId)} <b>{partida.resultado === "1/2-1/2" ? "½–½" : partida.resultado.replace("-", "–")}</b> {corto(partida.negrasId)}</span>)}</div>
        </div>
      </li>)}</ol> : <p className={styles.empty}>El recorrido empieza con la primera victoria registrada entre ellos.</p>}
      {!!cinturon.sinFecha.length && <p className={styles.warning}>{cinturon.sinFecha.length} duelos no tienen fecha de inicio del torneo. Sus puntos se conservan; el cinturón queda por confirmar.</p>}
      <details className={styles.details}><summary>Ver todos los duelos</summary><ul className={styles.allGames}>{[...dato.duelos].sort((a,b) => (b.fecha ?? "").localeCompare(a.fecha ?? "") || b.ronda - a.ronda).map(p => <li key={p.id}><p>{corto(p.blancasId)} <strong>{p.resultado === "1/2-1/2" ? "½–½" : p.resultado.replace("-", "–")}</strong> {corto(p.negrasId)}</p><Link href={`/torneos/${p.torneoId}`}>{p.torneo} · ronda {p.ronda}</Link></li>)}</ul></details>
      <p className={styles.explanation}>El historial sigue el inicio registrado de cada torneo y sus rondas. Una mesa no determina cuál partida terminó primero. Los torneos históricos pueden tener resultados incompletos.</p>
    </>}
  </section>;
}
