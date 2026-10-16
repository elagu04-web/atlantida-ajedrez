import {supabase} from './supabase';
export async function accesoUsuario(accion:'entrar'|'crear'|'configurar'|'info',datos:Record<string,string>={}) {
 const {data:{session}}=await supabase.auth.getSession();
 const respuesta=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/functions/v1/acceso-usuario',{
  method:'POST',headers:{'Content-Type':'application/json',apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,Authorization:'Bearer '+(session?.access_token??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)},
  body:JSON.stringify({accion,...datos}),signal:AbortSignal.timeout(30000),
 });
 const cuerpo=await respuesta.json();
 if(!respuesta.ok)throw new Error(typeof cuerpo.error==='string'?cuerpo.error:'No se pudo conectar. Volvé a intentar.');
 return cuerpo as {usuario?:string|null;session?:{access_token:string;refresh_token:string}};
}
export function nombreCuentaVisible(user:{email?:string;user_metadata?:Record<string,unknown>},usuario:string|null) {
 if(usuario)return usuario;
 const nombre=user.user_metadata?.full_name;
 if(typeof nombre==='string'&&nombre.trim())return nombre.trim().slice(0,80);
 return user.email?.endsWith('@cuentas.atlantida.invalid')?'Mi cuenta':user.email??'Mi cuenta';
}
