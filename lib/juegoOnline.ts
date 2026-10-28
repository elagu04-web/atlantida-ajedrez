import {supabase} from './supabase';
import type {PartidaOnline} from './partidaOnline';
export type RespuestaOnline={partida:PartidaOnline;ahora:number;error?:string};
export class ErrorOnline extends Error{constructor(mensaje:string,public respuesta?:RespuestaOnline,public status=0){super(mensaje);}}
export async function pedirOnline(accion:'crear'|'unirse'|'ver'|'jugar',datos:Record<string,unknown>):Promise<RespuestaOnline>{
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw new ErrorOnline('Iniciá sesión para jugar online.');
 const r=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/functions/v1/juego-online',{
  method:'POST',headers:{'Content-Type':'application/json',apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,Authorization:'Bearer '+session.access_token},
  body:JSON.stringify({accion,...datos}),signal:AbortSignal.timeout(20000),
 });
 const cuerpo=await r.json();
 if(!r.ok)throw new ErrorOnline(cuerpo.error||'No pudimos conectar.',cuerpo.partida?cuerpo:undefined,r.status);
 return cuerpo;
}
export async function listarOnline(usuario:string){
 // Split the lobby from personal history so a busy club never hides your game.
 const [propias,abiertas]=await Promise.all([
  supabase.from('online_partidas').select('*').or(`creador_id.eq.${usuario},rival_id.eq.${usuario}`).order('actualizada',{ascending:false}).limit(30),
  supabase.from('online_partidas').select('*').eq('estado->>fase','espera').gt('expira',new Date().toISOString()).order('creada',{ascending:false}).limit(30),
 ]);
 if(propias.error||abiertas.error)throw Error('No pudimos cargar las mesas. Volvé a intentar.');
 return [...new Map([...(propias.data??[]),...(abiertas.data??[])].map(p=>[p.id,p as PartidaOnline])).values()];
}
export type PerfilEloClub={elo:number|null;partidas:number;victorias:number;tablas:number;derrotas:number;vinculado:boolean;jugadorId?:string};
export async function leerMiEloClub():Promise<PerfilEloClub>{
 const {data,error}=await supabase.rpc('mi_elo_club');
 if(error)throw Error('No pudimos consultar tu Elo Atlántida. Volvé a intentar.');
 return data;
}
export function descargarOnline(p:PartidaOnline){
 const url=URL.createObjectURL(new Blob([p.estado.pgn],{type:'application/x-chess-pgn;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=`atlantida-online-${p.id.slice(0,8)}.pgn`;a.click();URL.revokeObjectURL(url);
}
