import {createClient} from '@supabase/supabase-js';
import {motorEntrenamientoServidor} from '@/lib/server/motorEntrenamientoServidor';
import {procesarAnalisisServidor,type TrabajoAnalisis} from '@/lib/server/procesarAnalisisServidor';
export const runtime='nodejs';
export const maxDuration=60;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let comprobacion:Promise<void>|null=null;
export async function GET(){try{comprobacion??=(async()=>{const motor=motorEntrenamientoServidor();try{await motor.listo;}finally{motor.destruir();}})().catch(e=>{comprobacion=null;throw e;});await comprobacion;return Response.json({servicio:'analisis-stockfish',version:1,motor:'listo'},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({servicio:'analisis-stockfish',motor:'no_disponible'},{status:503,headers:{'Cache-Control':'no-store'}});}}
export async function POST(request:Request){
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return new Response(null,{status:415});
 const texto=await request.text();if(texto.length>1024)return new Response(null,{status:413});
 let datos;try{datos=JSON.parse(texto);}catch{return new Response(null,{status:400});}
 if(typeof datos?.id!=='string'||typeof datos?.token!=='string'||!uuid.test(datos.id)||!uuid.test(datos.token))return new Response(null,{status:400});
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const parametros={p_id:datos.id,p_token:datos.token};
 const reclamar=await db.rpc('tomar_entrenamiento_analisis',parametros);
 if(reclamar.error)return new Response(null,{status:503});
 if(!reclamar.data)return new Response(null,{status:404});
 try{
  const estado=await procesarAnalisisServidor(reclamar.data as TrabajoAnalisis,{
   guardar:async(evaluaciones,liberar,sesion,revision)=>{const {data,error}=await db.rpc('avance_entrenamiento_analisis',{...parametros,p_evaluaciones:evaluaciones,p_liberar:liberar,p_sesion:sesion??null,p_revision:revision??0});if(error)throw error;return data;},
   documento:async()=>{const {data,error}=await db.rpc('documento_entrenamiento_analisis',parametros);if(error)throw error;return data;},
  },motorEntrenamientoServidor);
  return Response.json({estado},{headers:{'Cache-Control':'no-store'}});
 }catch{
  await db.rpc('fallo_entrenamiento_analisis',parametros);
  return new Response(null,{status:503});
 }
}
