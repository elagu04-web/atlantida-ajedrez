import {createClient} from 'npm:@supabase/supabase-js@2.112.3';
import {ErrorPago,crearHandlerPago} from './mercadopago.ts';
export function pagosRuntime(webhook=false){
 const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
 const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 return crearHandlerPago({
  config:{token:Deno.env.get('MP_ACCESS_TOKEN')??'',firma:Deno.env.get('MP_WEBHOOK_SECRET')??'',receptor:Deno.env.get('MP_COLLECTOR_ID')??'',habilitado:Deno.env.get('MP_COBROS_HABILITADOS')==='true',produccion:Deno.env.get('MP_PRODUCCION')==='true',webhook:`${url}/functions/v1/mercadopago-webhook`},
  fetch,
  async usuario(token){const cliente=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await cliente.auth.getUser(token);return error||!data.user?null:{id:data.user.id,anonimo:data.user.is_anonymous===true};},
  async limite(usuario){const {data,error}=await db.rpc('limitar_acceso_usuario',{p_clave:'pagos:'+usuario,p_max:30,p_segundos:60});return !error&&data===true;},
  async rpc(accion,usuario,datos){const {data,error}=await db.rpc('pagos_mercadopago',{p_accion:accion,p_usuario:usuario,p_datos:datos});if(error){if(error.code==='P0001')throw new ErrorPago(error.message,409);throw new Error('No se pudo guardar el cobro.');}return data;},
 },webhook);
}
