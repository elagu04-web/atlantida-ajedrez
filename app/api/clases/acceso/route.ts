import {NextRequest,NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {COOKIE_CLASES,RUTA_MESA,PROFE_ID,CABECERAS_CLASES} from '@/lib/clasesPrivadas';
export const dynamic='force-dynamic';
function origenValido(r:NextRequest){return r.headers.get('origin')===r.nextUrl.origin;}
export async function POST(request:NextRequest){
 if(!origenValido(request))return NextResponse.json({error:'Origen no permitido'},{status:403,headers:CABECERAS_CLASES});
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/)?.[1];
 if(!token||token.length>3800)return NextResponse.json({error:'Iniciá sesión para abrir tus clases.'},{status:401,headers:CABECERAS_CLASES});
 const cliente=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await cliente.auth.getUser(token);
 if(error||!data.user)return NextResponse.json({error:'Tu sesión venció. Volvé a entrar.'},{status:401,headers:CABECERAS_CLASES});
 if(data.user.id!==PROFE_ID)return NextResponse.json({error:'Esta mesa es privada.'},{status:403,headers:CABECERAS_CLASES});
 const respuesta=NextResponse.json({ok:true},{headers:CABECERAS_CLASES});
 respuesta.cookies.set(COOKIE_CLASES,token,{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'strict',path:RUTA_MESA,maxAge:90});
 return respuesta;
}
export async function DELETE(request:NextRequest){
 if(!origenValido(request))return NextResponse.json({error:'Origen no permitido'},{status:403,headers:CABECERAS_CLASES});
 const respuesta=NextResponse.json({ok:true},{headers:CABECERAS_CLASES});
 respuesta.cookies.set(COOKIE_CLASES,'',{httpOnly:true,secure:request.nextUrl.protocol==='https:',sameSite:'strict',path:RUTA_MESA,maxAge:0});
 return respuesta;
}
