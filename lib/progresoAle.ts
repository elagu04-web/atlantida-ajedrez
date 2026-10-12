import type { PartidaPractica } from "./partidaPractica";

export const ELO_INICIAL_ALE = 1400;
export const ELO_MINIMO_ALE = 1320;
export const PASO_ALE = 50;
export const ELO_MAXIMO_ALE = 3000;
export type ResultadoAle="victoria"|"derrota"|"tablas";
export type ProgresoAle = { version: 1; partidas: string[];resultados?:Record<string,ResultadoAle> };
export const claveProgresoAle = (cuenta: string) => `atlantida-ale-progreso-v1:${cuenta}`;
export const clavePartidaAle = (cuenta: string) => `atlantida-ale-partida-v1:${cuenta}`;
export function leerProgresoAle(texto: string | null): ProgresoAle {
  try {
    const v = JSON.parse(texto ?? "null");
    if (v?.version !== 1 || !Array.isArray(v.partidas) || !v.partidas.every((id: unknown) => typeof id === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(id))) return { version: 1, partidas: [] };
    const ids=[...new Set<string>(v.partidas)],resultados:Record<string,ResultadoAle>={};
    for(const id of ids)if(["victoria","derrota","tablas"].includes(v.resultados?.[id]))resultados[id]=v.resultados[id];
    return { version: 1, partidas: ids,...Object.keys(resultados).length?{resultados}:{} };
  } catch { return { version: 1, partidas: [] }; }
}
export function eloDeAle(progreso: ProgresoAle) {
  return recorridoAle(progreso).at(-1)!.elo;
}
export function mezclarProgresoAle(...recorridos:ProgresoAle[]):ProgresoAle {
  const resultados=Object.assign({},...recorridos.map(p=>p.resultados??{}));
  return {version:1,partidas:[...new Set(recorridos.flatMap(p=>p.partidas))],...Object.keys(resultados).length?{resultados}:{}};
}
export function validarProgresoAleServidor(valor:unknown):ProgresoAle {
  const texto=JSON.stringify(valor),progreso=leerProgresoAle(texto);
  const v=valor as Partial<ProgresoAle>&{elo?:number}|null;
  if(!v||v.version!==1||!Array.isArray(v.partidas)||progreso.partidas.length!==v.partidas.length||v.elo!==eloDeAle(progreso))throw new Error("No se pudo comprobar el recorrido de tu cuenta.");
  return progreso;
}
export function puntosMontanaAle(progreso:ProgresoAle){
  return recorridoAle(progreso);
}
export function pasoAjusteAle(progreso:ProgresoAle){const n=Object.keys(progreso.resultados??{}).length;return n<10?50:n<30?25:10;}
function recorridoAle(progreso:ProgresoAle){
  let elo=ELO_INICIAL_ALE,medidas=0;const puntos=[{partida:0,elo}];
  for(const [i,id] of progreso.partidas.entries()){
    const resultado=progreso.resultados?.[id],paso=medidas<10?50:medidas<30?25:10;
    // Los identificadores de la versión anterior conservan su nivel ya ganado.
    elo=Math.max(ELO_MINIMO_ALE,Math.min(ELO_MAXIMO_ALE,elo+(resultado?resultado==="victoria"?paso:resultado==="derrota"?-paso:0:PASO_ALE)));
    if(resultado)medidas++;puntos.push({partida:i+1,elo});
  }return puntos;
}
export function eventosAle(progreso:ProgresoAle){return progreso.partidas.map(id=>({id,resultado:progreso.resultados?.[id]??null}));}
export function sumarPartidaAle(progreso: ProgresoAle, partida: PartidaPractica): ProgresoAle {
  // Abandonar la pantalla o rendirse sin jugar no es completar una partida.
  if (partida.perfil !== "ale" || !partida.progresoAle || !partida.terminada || partida.jugadas.length < 4 || progreso.partidas.includes(partida.progresoAle.id)) return progreso;
  const r=partida.estado().resultado,resultado:ResultadoAle=r==="1/2-1/2"?"tablas":r===(partida.color==="w"?"1-0":"0-1")?"victoria":"derrota";
  return { version: 1, partidas: [...progreso.partidas, partida.progresoAle.id],resultados:{...progreso.resultados,[partida.progresoAle.id]:resultado} };
}
