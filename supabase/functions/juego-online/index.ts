import {createClient} from 'npm:@supabase/supabase-js@2.112.3';
import {crearEstadoOnline,unirEstadoOnline,colorOnline,aplicarAccionOnline,type PartidaOnline,type RitmoOnline,type AccionOnline} from '../_shared/partidaOnline.ts';
const origenes=new Set(['https://atlantida-ajedrez.vercel.app','http://localhost:3000']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origin&&origenes.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const respuesta=(datos:unknown,status=200)=>new Response(JSON.stringify(datos),{status,headers});
 if(origin&&!origenes.has(origin))return respuesta({error:'Origen no permitido.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
 if(req.method!=='POST')return respuesta({error:'Método no permitido.'},405);
 try{
  if(!req.headers.get('content-type')?.includes('application/json'))return respuesta({error:'Formato no válido.'},415);
  const texto=await req.text();if(texto.length>2048)return respuesta({error:'Solicitud demasiado larga.'},413);
  const b=JSON.parse(texto);if(!b||typeof b!=='object'||!uuid.test(b.id??''))return respuesta({error:'Revisá el enlace de la mesa.'},400);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
  const options={auth:{persistSession:false,autoRefreshToken:false}};
  const auth=createClient(url,anon,options);
  const {data:{user},error:authError}=await auth.auth.getUser(req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??'');
  if(authError||!user||user.is_anonymous)return respuesta({error:'Iniciá sesión para jugar online.'},401);
  const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options);
  const {data:limite,error:el}=await db.rpc('limitar_acceso_usuario',{p_clave:'online:'+user.id,p_max:180,p_segundos:60});
  if(el)return respuesta({error:'No se pudo comprobar el acceso. Probá de nuevo.'},503);
  if(!limite)return respuesta({error:'Esperá unos segundos antes de volver a intentar.'},429);
  const ahora=Date.now();
  // Names are only display text. Authorization ALWAYS uses the verified Auth id.
  const nombre=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name.trim().replace(/[\u0000-\u001f\u007f\[\]"\\]/g,'').slice(0,70)||'Jugador del club':'Jugador del club';
  let {data:fila,error:lectura}=await db.from('online_partidas').select('*').eq('id',b.id).maybeSingle();
  if(lectura)return respuesta({error:'La sala online no está disponible. Volvé a intentar.'},503);
  if(b.accion==='crear'){
   if(fila){if(fila.creador_id!==user.id)return respuesta({error:'Esta mesa no está disponible.'},409);return respuesta({partida:fila,ahora});}
   if(!['10+3','5+3','3+2'].includes(b.ritmo))return respuesta({error:'Elegí 10+3, 5+3 o 3+2.'},400);
   if(b.porElo!==undefined&&typeof b.porElo!=='boolean')return respuesta({error:'Elegí amistosa o por Elo.'},400);
   const {data:puede}=await db.rpc('limitar_acceso_usuario',{p_clave:'online-crear:'+user.id,p_max:15,p_segundos:3600});
   if(!puede)return respuesta({error:'Llegaste al límite de mesas por hora. Volvé más tarde.'},429);
   const {data:vencida}=await db.from('online_partidas').select('*').eq('creador_id',user.id).eq('estado->>fase','espera').lt('expira',new Date(ahora).toISOString()).maybeSingle();
   if(vencida)await db.from('online_partidas').update({estado:{...vencida.estado,fase:'cancelada',motivo:'Invitación vencida'},actualizada:new Date(ahora).toISOString()}).eq('id',vencida.id).eq('version',vencida.version);
   const color=b.color==='w'||b.color==='b'?b.color:crypto.getRandomValues(new Uint8Array(1))[0]%2?'w':'b';
   const {data,error}=await db.from('online_partidas').insert({id:b.id,creador_id:user.id,estado:crearEstadoOnline(b.ritmo as RitmoOnline,color,nombre,b.porElo===true)}).select().single();
   if(error)return respuesta({error:error.code==='23505'?'Ya tenés una invitación abierta. Entrá a tu mesa o cancelala.':'No se pudo crear la mesa.'},409);
   return respuesta({partida:data,ahora});
  }
  if(!fila)return respuesta({error:'Esta mesa no existe o ya no está disponible.'},404);
  const p=fila as PartidaOnline,color=colorOnline(p,user.id),esParticipante=color!==null;
  // Tournament members may ask the server to settle an expired clock. They
  // cannot choose a result or inspect anyone else's position or move history.
  if(b.accion==='arbitrar'){
   if(!p.torneo_id)return respuesta({error:'Esta mesa no pertenece a un torneo.'},403);
   const [{data:t},{data:j}]=await Promise.all([
    db.from('online_torneos').select('organizador_id').eq('id',p.torneo_id).maybeSingle(),
    db.from('online_torneo_jugadores').select('usuario_id').eq('torneo_id',p.torneo_id).eq('usuario_id',user.id).maybeSingle(),
   ]);
   if(!t||(t.organizador_id!==user.id&&!j))return respuesta({error:'Solo los participantes y el organizador pueden actualizar esta ronda.'},403);
   if(p.estado.fase==='activa'){
    const estado=aplicarAccionOnline(p.estado,'w',{tipo:'tiempo'},ahora);
    if(estado!==p.estado){
     const {data,error}=await db.from('online_partidas').update({estado,version:p.version+1,actualizada:new Date(ahora).toISOString()}).eq('id',p.id).eq('version',p.version).select('id').maybeSingle();
     if(error)return respuesta({error:'No se pudo actualizar el reloj.'},503);
     if(!data)return respuesta({error:'La mesa cambió. Actualizá la ronda.'},409);
     return respuesta({id:p.id,fase:estado.fase,resultado:estado.resultado,ahora});
    }
   }
   return respuesta({id:p.id,fase:p.estado.fase,resultado:p.estado.resultado,ahora});
  }
  if(b.accion==='unirse'){
   if(esParticipante)return respuesta({partida:p,ahora});
   if(p.estado.fase!=='espera'||Date.parse(p.expira)<=ahora)return respuesta({error:'La invitación ya venció o alguien ocupó la mesa.'},409);
   if(p.estado.porElo&&b.aceptaElo!==true)return respuesta({error:'Esta mesa es por Elo. Confirmá la modalidad antes de entrar.'},400);
   const estado=unirEstadoOnline(p.estado,nombre,ahora);
   const {data,error}=await db.from('online_partidas').update({rival_id:user.id,estado,version:p.version+1,actualizada:new Date(ahora).toISOString()}).eq('id',p.id).eq('version',p.version).is('rival_id',null).select().maybeSingle();
   if(error)return respuesta({error:'No se pudo entrar a la mesa.'},503);
   if(!data)return respuesta({error:'Otra persona se sentó primero. Elegí otra mesa.'},409);
   return respuesta({partida:data,ahora});
  }
  if(!esParticipante)return respuesta({error:'Esta partida pertenece a sus dos jugadores.'},403);
  if(b.accion!=='ver'&&b.accion!=='jugar')return respuesta({error:'Acción no válida.'},400);
  if(b.accion==='jugar'&&(!uuid.test(b.peticion??'')||!Number.isSafeInteger(b.version)))return respuesta({error:'Solicitud no válida.'},400);
  if(b.accion==='jugar'&&p.ultima_accion===b.peticion)return respuesta({partida:p,ahora});
  if(b.accion==='jugar'&&p.version!==b.version)return respuesta({error:'La partida cambió. Ya actualizamos el tablero.',partida:p,ahora},409);
  const accion=b.accion==='ver'?{tipo:'tiempo'}:b.jugada;
  if(!accion||!['mover','rendirse','ofrecer','aceptar','rechazar','tiempo','cancelar'].includes(accion.tipo))return respuesta({error:'Acción no válida.'},400);
  let estado;
  try{estado=b.accion==='ver'&&p.estado.fase!=='activa'?p.estado:aplicarAccionOnline(p.estado,color!,accion as AccionOnline,ahora);}catch(e){return respuesta({error:e instanceof Error?e.message:'Acción no válida.'},400);}
  if(estado===p.estado)return respuesta({partida:p,ahora});
  const {data,error}=await db.from('online_partidas').update({estado,version:p.version+1,ultima_accion:b.accion==='jugar'?b.peticion:p.ultima_accion,actualizada:new Date(ahora).toISOString()}).eq('id',p.id).eq('version',p.version).select().maybeSingle();
  if(error)return respuesta({error:'No pudimos confirmar la jugada. El tablero conserva la última posición confirmada.'},503);
  if(!data){const {data:actual}=await db.from('online_partidas').select('*').eq('id',p.id).single();return respuesta({error:'La partida cambió. Revisá el tablero actualizado.',partida:actual,ahora},409);}
  return respuesta({partida:data,ahora});
 }catch{return respuesta({error:'No se pudo conectar con la sala. Volvé a intentar.'},503);}
});
