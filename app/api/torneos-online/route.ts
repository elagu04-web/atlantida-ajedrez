import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {siguienteRondaOnline,type DatosTorneoOnline} from '@/lib/torneosOnline';
export const dynamic='force-dynamic';
export const maxDuration=60;
const headers={'Cache-Control':'private, no-store'};
export async function POST(request:NextRequest){
 const responder=(dato:unknown,status=200)=>NextResponse.json(dato,{status,headers});
 if(request.headers.get('origin')!==request.nextUrl.origin)return responder({error:'Origen no permitido.'},403);
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
 if(!token||token.length>3800)return responder({error:'Iniciá sesión para entrar al torneo.'},401);
 try{
  if(!request.headers.get('content-type')?.includes('application/json'))return responder({error:'Formato no válido.'},415);
  const texto=await request.text();if(texto.length>4096)return responder({error:'Solicitud demasiado larga.'},413);
  const b=JSON.parse(texto);
  if(!b||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id??'')||!['publicar','actualizar'].includes(b.accion))return responder({error:'Solicitud no válida.'},400);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:'Bearer '+token}}});
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError||!user||user.is_anonymous)return responder({error:'Tu sesión venció. Volvé a entrar.'},401);
  const {data,error}=await db.rpc('obtener_torneo_online',{p_id:b.id});
  if(error)return responder({error:error.message},400);
  const datos=data as DatosTorneoOnline,organizador=datos.torneo.organizador_id===user.id;
  if(b.accion==='publicar'){
   if(!organizador)return responder({error:'Solo el organizador puede publicar rondas.'},403);
   if(!Number.isSafeInteger(b.version)||datos.torneo.version!==b.version)return responder({error:'Cambió la inscripción o la ronda. Actualizá antes de publicar.'},409);
   const cruces=siguienteRondaOnline(datos);
   const {error:e}=await db.rpc('publicar_ronda_online',{p_id:b.id,p_version:b.version,p_cruces:cruces});
   if(e)return responder({error:e.message},409);
  }else if(organizador||datos.jugadores.some(j=>j.usuario_id===user.id)){
   const vencidas=datos.cruces.filter(c=>c.partidaId&&c.fase==='activa'&&c.vence!==null&&Number(c.vence)<=Date.now());
   // Bound work per request. A stale clock is adjudicated by the existing
   // authoritative game server, never by the timestamp sent by a browser.
   const cola=[...vencidas];let fallo=false;
   await Promise.all(Array.from({length:Math.min(4,cola.length)},async()=>{
    while(cola.length){const c=cola.shift()!;
     try{const r=await fetch(url+'/functions/v1/juego-online',{method:'POST',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+token},body:JSON.stringify({accion:'arbitrar',id:c.partidaId}),signal:AbortSignal.timeout(12000)});if(!r.ok&&r.status!==409)fallo=true;}catch{fallo=true;}
    }
   }));
   if(fallo)return responder({error:'Algún reloj sigue pendiente de confirmación. Volvé a actualizar en unos segundos.'},503);
  }
  const nuevo=await db.rpc('obtener_torneo_online',{p_id:b.id});
  return nuevo.error?responder({error:nuevo.error.message},400):responder({datos:nuevo.data});
 }catch(e){return responder({error:e instanceof Error&&e.message.startsWith('No se encontró')?e.message:'No pudimos actualizar el torneo. Volvé a intentar.'},400);}
}
