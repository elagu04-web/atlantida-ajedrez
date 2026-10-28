import {generarRoundRobin,generarRondaUnoDutch,generarRondaSuiza,standingsConDesempates,type Torneo} from './tournaments';
import type {RitmoOnline} from './partidaOnline';

export type TorneoOnline={id:string;organizador_id:string;nombre:string;formato:'suizo'|'round-robin';ritmo:RitmoOnline;por_elo:boolean;estado:'abierto'|'en_curso'|'finalizado'|'cancelado';max_rondas:number;dias_ronda:number;ronda_actual:number;version:number;limite_ronda:string|null;creada:string;inscriptos?:number;anotado?:boolean};
export type InscriptoOnline={usuario_id:string;nombre:string;elo:number};
export type CoordinacionOnline={propuesta:string|null;propuesta_por:string|null;aceptada:boolean;listo_w:string|null;listo_b:string|null;mensajes:{usuario:string;nombre:string;texto:string;fecha:string}[]};
export type CruceOnline={ronda:number;mesa:number;blancasId:string;negrasId:string|null;partidaId:string|null;resultado:'1-0'|'0-1'|'1/2-1/2'|'0-0'|null;manual:boolean;fase:string;vence:number|null;coordinacion:CoordinacionOnline|null};
export type DatosTorneoOnline={torneo:TorneoOnline;jugadores:InscriptoOnline[];cruces:CruceOnline[]};

/** Only published rounds contribute points, including the current Swiss bye. */
export function torneoParaTabla({torneo:t,jugadores,cruces}:DatosTorneoOnline):Torneo{
 return {id:t.id,nombre:t.nombre,formato:t.formato,desempates:t.formato==='suizo'?['Buchholz','Sonneborn-Berger']:['Enfrentamiento directo','Sonneborn-Berger'],jugadoresIds:jugadores.map(j=>j.usuario_id),
  estado:t.estado==='abierto'?'armado':t.estado==='finalizado'?'finalizado':'en_curso',rondasObjetivo:t.max_rondas,creadoEn:t.creada,inscriptosIds:[],asistieronIds:[],pagaronIds:[],
  rondas:Array.from({length:t.ronda_actual},(_,i)=>({numero:i+1,emparejamientos:cruces.filter(c=>c.ronda===i+1).map(c=>({numero:c.mesa,blancasId:c.blancasId,negrasId:c.negrasId,resultado:!c.negrasId?(t.formato==='suizo'?'1-0':null):c.resultado==='0-0'?null:c.resultado}))}))};
}
export function tablaTorneoOnline(datos:DatosTorneoOnline){
 return standingsConDesempates(torneoParaTabla(datos)).map(fila=>({...fila,partidasJugadas:datos.cruces.filter(c=>c.partidaId&&c.fase==='terminada'&&(c.blancasId===fila.jugadorId||c.negrasId===fila.jugadorId)).length}));
}
export function siguienteRondaOnline(datos:DatosTorneoOnline){
 const t=torneoParaTabla(datos),n=t.rondas.length+1,elos=new Map(datos.jugadores.map(j=>[j.usuario_id,j.elo]));
 const ronda=t.formato==='round-robin'?generarRoundRobin(t.jugadoresIds).find(r=>r.numero===n):n===1?generarRondaUnoDutch(t.jugadoresIds,elos):generarRondaSuiza(t,n,elos);
 if(!ronda)throw Error('No quedan rondas por publicar.');
 const ids=ronda.emparejamientos.flatMap(c=>c.negrasId?[c.blancasId,c.negrasId]:[c.blancasId]);
 if(ids.length!==t.jugadoresIds.length||new Set(ids).size!==ids.length||ronda.emparejamientos.filter(c=>!c.negrasId).length>1)throw Error('No se encontró un emparejamiento completo sin repetir rivales. Revisá las rondas pendientes.');
 return ronda.emparejamientos.map(c=>({blancasId:c.blancasId,negrasId:c.negrasId}));
}
export const etiquetaEstadoOnline:Record<TorneoOnline['estado'],string>={abierto:'Inscripción abierta',en_curso:'En juego',finalizado:'Finalizado',cancelado:'Cancelado'};
