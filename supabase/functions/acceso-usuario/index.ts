import {createClient} from 'npm:@supabase/supabase-js@2.112.3';
const origenes=new Set(['https://atlantida-ajedrez.vercel.app','http://localhost:3000']);
const invalido='Usuario o contraseña incorrectos.';
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get('origin');
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origin&&origenes.has(origin))headers['Access-Control-Allow-Origin']=origin;
 const respuesta=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!origenes.has(origin))return respuesta({error:'Origen no permitido.'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'}});
 if(req.method!=='POST')return respuesta({error:'Método no permitido.'},405);
 if(!req.headers.get('content-type')?.includes('application/json'))return respuesta({error:'Formato no válido.'},415);
 try{
  // Bound the input before parsing. Never log request bodies, passwords or sessions.
  const text=await req.text();if(text.length>4096)return respuesta({error:'Solicitud demasiado larga.'},413);
  const b=JSON.parse(text);if(!b||typeof b!=='object')return respuesta({error:'Solicitud no válida.'},400);
  const accion=b.accion;
  if(!['entrar','crear','configurar','info'].includes(accion))return respuesta({error:'Solicitud no válida.'},400);
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const options={auth:{persistSession:false,autoRefreshToken:false}};
  const admin=createClient(url,secret,options),auth=createClient(url,anon,options);
  let id:string|null=null;
  if(accion==='configurar'||accion==='info'){
   const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??'';
   const {data,error}=await auth.auth.getUser(token);
   if(error||!data.user||data.user.is_anonymous)return respuesta({error:'Iniciá sesión de nuevo.'},401);
   id=data.user.id;
   if(accion==='info'){
    const {data:usuario,error:e}=await admin.rpc('nombre_acceso_usuario',{p_id:id});
    return e?respuesta({error:'No se pudo consultar tu acceso.'},503):respuesta({usuario});
   }
  }
  const usuario=typeof b.usuario==='string'?b.usuario.trim().toLowerCase():'';
  const password=b.password;
  if(!/^[a-z0-9][a-z0-9_]{2,23}$/.test(usuario))return respuesta({error:'Usá entre 3 y 24 letras sin tildes, números o guion bajo.'},400);
  if(typeof password!=='string'||password.length>128||password.length<(accion==='entrar'?1:10))return respuesta({error:accion==='entrar'?invalido:'Usá una contraseña de 10 a 128 caracteres.'},400);
  // Counters live in Postgres, so limits survive cold starts and concurrent requests.
  // HMAC keys keep names and network addresses out of the counters table.
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  async function limitar(tipo:string,valor:string,max:number,segundos:number){
   const firma=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(valor));
   const hash=Array.from(new Uint8Array(firma),n=>n.toString(16).padStart(2,'0')).join('');
   const {data,error}=await admin.rpc('limitar_acceso_usuario',{p_clave:tipo+':'+hash,p_max:max,p_segundos:segundos});
   if(error)throw new Error('Límite no disponible');return data===true;
  }
  const red=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'sin-red';
  const limites=await Promise.all([limitar('usuario',usuario,12,300),limitar('red',red,60,300),...(accion==='crear'?[limitar('altas-red',red,5,3600),limitar('altas-global','club',60,3600)]:[])]);
  if(limites.some(ok=>!ok))return respuesta({error:'Demasiados intentos. Esperá unos minutos y volvé a probar.'},429);
  if(accion==='entrar'){
   const {data:email,error}=await admin.rpc('resolver_acceso_usuario',{p_usuario:usuario});
   if(error)throw new Error('Acceso no disponible');
   // Also perform a normal Auth attempt for unknown names (same generic response).
   const {data,error:e}=await auth.auth.signInWithPassword({email:email||'inexistente@cuentas.atlantida.invalid',password});
   if(e||!email||!data.session)return respuesta({error:invalido},401);
   return respuesta({session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token}});
  }
  if(accion==='configurar'){
   const {data:existente,error}=await admin.rpc('nombre_acceso_usuario',{p_id:id});
   if(error)throw new Error('Acceso no disponible');
   if(existente&&existente!==usuario)return respuesta({error:'Tu usuario es '+existente+'. Podés cambiar su contraseña.'},409);
   const {data:ocupado}=await admin.rpc('resolver_acceso_usuario',{p_usuario:usuario});
   if(ocupado&&!existente)return respuesta({error:'Ese usuario ya está ocupado. Elegí otro.'},409);
   // Use the caller's Auth endpoint, preserving Supabase's password and session policies.
   const cambio=await fetch(url+'/auth/v1/user',{method:'PUT',headers:{apikey:anon,Authorization:req.headers.get('authorization')!,'Content-Type':'application/json'},body:JSON.stringify({password})});
   if(!cambio.ok)return respuesta({error:'No se pudo cambiar la contraseña. Entrá de nuevo con Google y usá una contraseña distinta, de al menos 10 caracteres.'},400);
   const {error:e}=await admin.rpc('asignar_acceso_usuario',{p_id:id,p_usuario:usuario});
   if(e)return respuesta({error:'No se pudo reservar ese usuario. Elegí otro; tu cuenta conserva su acceso anterior.'},409);
   return respuesta({usuario});
  }
  const nombre=typeof b.nombre==='string'?b.nombre.trim().replace(/\s+/g,' '):'';
  if(nombre.length<2||nombre.length>80||/[\x00-\x1f\x7f]/.test(nombre))return respuesta({error:'Escribí tu nombre y apellido (entre 2 y 80 caracteres).'},400);
  const {data:ocupado,error}=await admin.rpc('resolver_acceso_usuario',{p_usuario:usuario});
  if(error)throw new Error('Acceso no disponible');
  if(ocupado)return respuesta({error:'Ese usuario ya está ocupado. Elegí otro.'},409);
  const email=crypto.randomUUID()+'@cuentas.atlantida.invalid';
  const {data:alta,error:e}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:nombre}});
  if(e||!alta.user)return respuesta({error:'No se pudo crear tu cuenta. Probá con una contraseña más segura.'},400);
  const {error:asignacion}=await admin.rpc('asignar_acceso_usuario',{p_id:alta.user.id,p_usuario:usuario});
  if(asignacion){await admin.auth.admin.deleteUser(alta.user.id);return respuesta({error:'Ese usuario ya está ocupado. Elegí otro.'},409);}
  const {data:sesion,error:entrada}=await auth.auth.signInWithPassword({email,password});
  if(entrada||!sesion.session)return respuesta({error:'Tu cuenta quedó creada. Volvé a entrar con tu usuario y contraseña.'},503);
  return respuesta({session:{access_token:sesion.session.access_token,refresh_token:sesion.session.refresh_token}});
 }catch{return respuesta({error:'No se pudo conectar. Volvé a intentar en unos minutos.'},503);}
});
