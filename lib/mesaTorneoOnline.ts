import type {DatosTorneoOnline} from './torneosOnline';
export function miMesaDeTorneo(datos:DatosTorneoOnline,usuario:string){
 const t=datos.torneo;
 if(t.estado!=='en_curso'||!datos.jugadores.some(j=>j.usuario_id===usuario))return null;
 const c=datos.cruces.find(c=>c.ronda===t.ronda_actual&&(c.blancasId===usuario||c.negrasId===usuario));
 if(!c)return null;
 const rivalId=c.blancasId===usuario?c.negrasId:c.blancasId;
 return {torneoId:t.id,nombre:t.nombre,ritmo:t.ritmo,ronda:c.ronda,color:c.blancasId===usuario?'w' as const:'b' as const,rival:rivalId?datos.jugadores.find(j=>j.usuario_id===rivalId)?.nombre??'Tu rival':null,terminada:c.fase==='terminada',partidaId:c.partidaId,
  href:c.partidaId?'/jugar/online?mesa='+c.partidaId:'/torneos/online/'+t.id+'#mi-mesa'};
}
export type MiMesaDeTorneo=NonNullable<ReturnType<typeof miMesaDeTorneo>>;
