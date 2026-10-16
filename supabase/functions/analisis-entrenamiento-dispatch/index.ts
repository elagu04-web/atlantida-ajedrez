import {createClient} from 'npm:@supabase/supabase-js@2.112.3';
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response(null,{status:405});
 // The gateway verifies the project JWT. Only this relay's built-in service
 // identity can claim a job; neither its PGN nor its capability is returned.
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:trabajo,error}=await db.rpc('reclamar_entrenamiento_analisis');
 if(error)return new Response(null,{status:503});
 if(!trabajo)return Response.json({estado:'sin_pendientes'});
 try{
  const r=await fetch('https://atlantida-ajedrez.vercel.app/api/entrenamiento/procesar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(trabajo),signal:AbortSignal.timeout(55000),redirect:'error'});
  if(!r.ok)throw new Error('Reintentar');
  return Response.json({estado:'procesado'});
 }catch{
  await db.rpc('fallo_entrenamiento_analisis',{p_id:trabajo.id,p_token:trabajo.token});
  return Response.json({estado:'reintento_programado'});
 }
});
