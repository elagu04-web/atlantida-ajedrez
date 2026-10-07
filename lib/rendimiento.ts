import type { JugadorEnVivo } from "./elo";
import type { Partida, Jugador } from "./players";
import { nombreVisible } from "./players";
import type { Torneo } from "./tournaments";

export function normalizarBusqueda(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").trim();
}

export function resumirPartidas(partidas: Partida[]) {
  const victorias = partidas.filter(p => p.resultado === "victoria").length;
  const empates = partidas.filter(p => p.resultado === "empate").length;
  const derrotas = partidas.filter(p => p.resultado === "derrota").length;
  const puntos = victorias + empates / 2;
  return { partidas: partidas.length, victorias, empates, derrotas, puntos,
    rendimiento: partidas.length ? puntos / partidas.length * 100 : null };
}

/** Posiciones del ranking completo: buscar o cambiar el orden no las renumera. */
export function posicionesElo(jugadores: Pick<JugadorEnVivo, "id" | "eloAtlantida">[]) {
  const ordenados = [...jugadores].sort((a,b) => b.eloAtlantida-a.eloAtlantida || a.id.localeCompare(b.id));
  const posiciones = new Map<string, number>();
  let posicion = 0;
  ordenados.forEach((j,i) => {
    if (i === 0 || j.eloAtlantida !== ordenados[i-1].eloAtlantida) posicion = i+1;
    posiciones.set(j.id, posicion);
  });
  return posiciones;
}

export function formaReciente(jugador: Pick<JugadorEnVivo, "partidas">, cantidad=5) {
  return jugador.partidas.map((p,i) => ({p,i})).sort((a,b) => a.p.fecha.localeCompare(b.p.fecha) || a.i-b.i).slice(-cantidad).map(({p})=>p);
}

/** La referencia previa evita atribuir a la primera partida un cambio de Elo cero. */
export function rendimientoPeriodo(jugador: JugadorEnVivo, periodo: string, eloBase: number) {
  const historial = jugador.partidas.map((p,i)=>({p,i})).sort((a,b)=>a.p.fecha.localeCompare(b.p.fecha) || a.i-b.i).map(({p})=>p);
  const partidas = historial.filter(p=>p.fecha.startsWith(periodo));
  const previas = historial.filter(p=>p.fecha.slice(0,periodo.length)<periodo && p.eloDespues !== undefined);
  const inicial = previas.at(-1)?.eloDespues ?? eloBase;
  const final = partidas.filter(p=>p.eloDespues !== undefined).at(-1)?.eloDespues ?? inicial;
  const blancas = resumirPartidas(partidas.filter(p=>p.color==="blancas"));
  const negras = resumirPartidas(partidas.filter(p=>p.color==="negras"));
  return { jugadorId: jugador.id, nombre: nombreVisible(jugador), ...resumirPartidas(partidas),
    eloInicial: inicial, eloFinal: final, variacion: final-inicial, blancas, negras };
}

export function resumenClub(torneos: Torneo[]) {
  const jugadores = new Set<string>();
  let partidas = 0, tablas = 0, blancas = 0, negras = 0;
  for (const t of torneos) for (const r of t.rondas) for (const e of r.emparejamientos) {
    if (!e.negrasId || !e.resultado) continue;
    partidas++; jugadores.add(e.blancasId); jugadores.add(e.negrasId);
    if (e.resultado === "1/2-1/2") tablas++;
    else if (e.resultado === "1-0") blancas++;
    else negras++;
  }
  return {partidas,tablas,blancas,negras,jugadores:jugadores.size,torneos:torneos.filter(t=>t.rondas.some(r=>r.emparejamientos.some(e=>e.negrasId&&e.resultado))).length};
}

export function filasRendimiento(jugadores: JugadorEnVivo[], bases: Jugador[], periodo: string) {
  const porId = new Map(bases.map(j=>[j.id,j.eloAtlantida]));
  return jugadores.map(j=>rendimientoPeriodo(j,periodo,porId.get(j.id) ?? j.eloAtlantida)).filter(f=>f.partidas>0);
}
