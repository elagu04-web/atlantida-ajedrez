import type {SupabaseClient} from "@supabase/supabase-js";
// Fijar el token de la cuenta solicitada evita mezclar partidas si cambia la sesión
// mientras una sincronización tiene varias peticiones pendientes.
export async function rpcDeCuenta(cliente:SupabaseClient,cuenta:string,nombre:string,parametros:Record<string,unknown>,signal:AbortSignal){
  const {data,error}=await cliente.auth.getSession();
  if(error)throw error;
  if(!data.session||data.session.user.id!==cuenta)throw new DOMException("La cuenta cambió","AbortError");
  return cliente.rpc(nombre,parametros).setHeader("Authorization",`Bearer ${data.session.access_token}`).abortSignal(signal);
}
