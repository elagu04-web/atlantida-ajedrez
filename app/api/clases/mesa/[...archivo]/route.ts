import {NextRequest} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {COOKIE_CLASES,VERSION_MESA,CABECERAS_CLASES,archivoMesa} from '@/lib/clasesPrivadas';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const tipos:Record<string,string>={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',txt:'text/plain; charset=utf-8',svg:'image/svg+xml',gz:'application/gzip'};
export async function GET(request:NextRequest,{params}:{params:Promise<{archivo:string[]}>}){
 const token=request.cookies.get(COOKIE_CLASES)?.value;
 if(!token)return new Response('Iniciá sesión y abrí Mis clases.',{status:401,headers:CABECERAS_CLASES});
 const ruta=archivoMesa((await params).archivo);
 if(!ruta)return new Response('Archivo no encontrado.',{status:404,headers:CABECERAS_CLASES});
 const cliente=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false}});
 // Every asset is authorized again by Storage RLS. No service-role credential.
 const recurso=cliente.storage.from('clases-mesa'),nombre=VERSION_MESA+'/'+ruta;
 if(ruta==='vendor/voz/vosk.js'||ruta.endsWith('.gz')){
  const {data,error}=await recurso.createSignedUrl(nombre,60);
  return error||!data?new Response('Acceso no disponible.',{status:403,headers:CABECERAS_CLASES}):new Response(null,{status:307,headers:{...CABECERAS_CLASES,Location:data.signedUrl}});
 }
 const {data,error}=await recurso.download(nombre);
 if(error||!data)return new Response('No se pudo abrir el recurso. Volvé a Mis clases.',{status:403,headers:CABECERAS_CLASES});
 return new Response(await data.arrayBuffer(),{headers:{...CABECERAS_CLASES,'Content-Type':tipos[ruta.split('.').at(-1)!]??'application/octet-stream','Content-Security-Policy':"frame-ancestors 'self'; object-src 'none'; base-uri 'self'"}});
}
