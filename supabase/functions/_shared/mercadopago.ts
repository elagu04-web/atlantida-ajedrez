// No SDK, card data or browser-provided payment status. Native fetch + WebCrypto.
export type Documento = Record<string, unknown>;
export interface Suscripcion {
 id:string; usuario_id:string; jugador_id:string; plan:'club'|'completo'; importe:number;
 produccion:boolean; proveedor_id:string|null; checkout:string|null; estado:string; correo_pagador:string;
}
export interface ConfigPago {token:string;firma:string;receptor:string;habilitado:boolean;produccion:boolean;webhook:string}
export interface DependenciasPago {
 config:ConfigPago;
 rpc:(accion:string,usuario:string|null,datos:Documento)=>Promise<unknown>;
 usuario:(token:string)=>Promise<{id:string;anonimo:boolean}|null>;
 limite:(usuario:string)=>Promise<boolean>;
 fetch:typeof fetch;
}
export class ErrorPago extends Error {constructor(message:string,public status=400){super(message);}}
export const PLANES_PAGO={club:{nombre:'Club',centavos:40000},completo:{nombre:'Club + entrenamiento',centavos:55000}} as const;
const sitio='https://atlantida-ajedrez.vercel.app';
const origenes=new Set([sitio,'http://localhost:3000','http://127.0.0.1:3000']);
const identificador=/^[A-Za-z0-9_-]{1,100}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function objeto(x:unknown):Documento{return x!==null&&typeof x==='object'&&!Array.isArray(x)?x as Documento:{};}
function texto(x:unknown){return typeof x==='string'?x:typeof x==='number'&&Number.isSafeInteger(x)?String(x):'';}
function recurso(x:unknown){const r=texto(x);if(!identificador.test(r))throw new ErrorPago('Recurso inválido.');return r;}
export function centavosPago(x:unknown):number{
 const s=String(x);if(!/^\d{1,8}(\.\d{1,2})?$/.test(s))throw new ErrorPago('Importe inválido.');
 const [a,b='']=s.split('.');return Number(a)*100+Number(b.padEnd(2,'0'));
}
function fecha(x:unknown){const s=texto(x);if(!s||!Number.isFinite(Date.parse(s)))throw new ErrorPago('Fecha de cobro inválida.');return s;}
function diaUruguay(x:unknown){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Montevideo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(fecha(x)));}
export function checkoutSeguro(x:unknown,proveedor:unknown):string|null{
 try{const u=new URL(texto(x));return u.protocol==='https:'&&u.hostname==='www.mercadopago.com.uy'&&!u.username&&!u.password&&!u.port&&u.pathname==='/subscriptions/checkout'&&u.searchParams.get('preapproval_id')===texto(proveedor)?u.href:null;}catch{return null;}
}
export async function firmaValida(req:Request,secreto:string):Promise<boolean>{
 if(!secreto)return false;
 const url=new URL(req.url),ids=url.searchParams.getAll('data.id'),id=ids[0]??'',requestId=req.headers.get('x-request-id')??'';
 if(ids.length!==1||!identificador.test(id)||!identificador.test(requestId))return false;
 const partes=(req.headers.get('x-signature')??'').split(',').map(p=>p.trim().split('='));
 const ts=partes.filter(p=>p[0]==='ts'),vs=partes.filter(p=>p[0]==='v1');
 if(ts.length!==1||!/^\d{1,16}$/.test(ts[0][1]??'')||!vs.length||vs.length>2)return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secreto),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 // Official SDK fix #439: preserve the exact case of data.id in the manifest.
 const manifest=new TextEncoder().encode(`id:${id};request-id:${requestId};ts:${ts[0][1]};`);
 for(const v of vs){if(!/^[0-9a-f]{64}$/i.test(v[1]??''))continue;const bytes=Uint8Array.from(v[1].match(/../g)!,h=>parseInt(h,16));if(await crypto.subtle.verify('HMAC',key,bytes,manifest))return true;}
 return false;
}
async function leer(req:Request):Promise<Documento>{
 const reader=req.body?.getReader();if(!reader)return {};let n=0;const bloques:Uint8Array[]=[];
 while(true){const r=await reader.read();if(r.done)break;n+=r.value.byteLength;if(n>4096){await reader.cancel();throw new ErrorPago('Solicitud demasiado grande.',413);}bloques.push(r.value);}
 const todo=new Uint8Array(n);let i=0;for(const b of bloques){todo.set(b,i);i+=b.length;}
 try{return objeto(JSON.parse(new TextDecoder().decode(todo)));}catch{throw new ErrorPago('Solicitud inválida.');}
}
export function crearServicioPago(d:DependenciasPago,signal:AbortSignal){
 const c=d.config;
 const lecturas=new Map<string,Documento>();
 async function mp(path:string,method='GET',body?:Documento):Promise<Documento>{
  if(method==='GET'&&lecturas.has(path))return lecturas.get(path)!;
  if(!c.token||!/^\d+$/.test(c.receptor))throw new ErrorPago('Los pagos online todavía no están habilitados.',503);
  const r=await d.fetch(`https://api.mercadopago.com${path}`,{method,headers:{Authorization:`Bearer ${c.token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal,redirect:'error'});
  if(!r.ok)throw new ErrorPago('Mercado Pago no pudo confirmar la operación. Actualizá el estado antes de volver a intentar.',502);
  const data=objeto(await r.json());if(method==='GET')lecturas.set(path,data);return data;
 }
 async function comercio(){const yo=await mp('/users/me');if(texto(yo.id)!==c.receptor||yo.site_id!=='MLU')throw new ErrorPago('La conexión de cobros necesita una revisión del club.',503);}
 function validarSub(s:Suscripcion,p:Documento){
  const a=objeto(p.auto_recurring);
  if(texto(p.external_reference)!==s.id||texto(p.collector_id)!==c.receptor||(s.proveedor_id&&texto(p.id)!==s.proveedor_id)||a.currency_id!=='UYU'||centavosPago(a.transaction_amount)!==s.importe||a.frequency!==1||a.frequency_type!=='months')throw new ErrorPago('La suscripción necesita revisión. No se activó ninguna cuota.',409);
 }
 async function guardarSub(s:Suscripcion,p:Documento){
  validarSub(s,p);const estado=p.status==='canceled'?'cancelled':texto(p.status);
  if(!['pending','authorized','paused','cancelled'].includes(estado))throw new ErrorPago('Estado de suscripción desconocido.',502);
  await d.rpc('vincular',s.usuario_id,{id:s.id,proveedor:recurso(p.id),estado,actualizada:fecha(p.last_modified??p.date_created),checkout:checkoutSeguro(p.init_point,p.id)});
  return {...s,proveedor_id:recurso(p.id),estado,checkout:checkoutSeguro(p.init_point,p.id)};
 }
 async function buscar(id:string,usuario:string|null=null):Promise<Suscripcion|null>{return await d.rpc('buscar',usuario,{id}) as Suscripcion|null;}
 async function buscarProveedor(id:string):Promise<Suscripcion|null>{return await d.rpc('buscar',null,{proveedor:id}) as Suscripcion|null;}
 async function recuperar(s:Suscripcion){
  if(s.proveedor_id)return guardarSub(s,await mp(`/preapproval/${recurso(s.proveedor_id)}`));
  // A timeout may have happened after MP accepted the request. Search, never POST again.
  const q=await mp(`/preapproval/search?payer_email=${encodeURIComponent(s.correo_pagador)}&limit=100`);
  const candidatos=Array.isArray(q.results)?q.results.map(objeto).filter(x=>texto(x.external_reference)===s.id):[];
  if(candidatos.length!==1)throw new ErrorPago('Estamos verificando la creación. No vuelvas a suscribirte: consultá al club si sigue pendiente.',409);
  return guardarSub(s,candidatos[0]);
 }
 async function factura(i:Documento){
  const proveedor=recurso(i.preapproval_id),s=await buscarProveedor(proveedor);if(!s)return;
  const p=await mp(`/preapproval/${proveedor}`);validarSub(s,p);
  if(texto(i.external_reference)!==s.id||i.currency_id!=='UYU'||centavosPago(i.transaction_amount)!==s.importe)throw new ErrorPago('La factura no coincide con el plan.',409);
  const pagoId=texto(objeto(i.payment).id);if(!pagoId)return;recurso(pagoId);
  const pago=await mp(`/v1/payments/${pagoId}`);
  if(texto(pago.id)!==pagoId||texto(pago.collector_id)!==c.receptor||pago.live_mode!==s.produccion||pago.currency_id!=='UYU'||centavosPago(pago.transaction_amount)!==s.importe||(pago.external_reference&&texto(pago.external_reference)!==s.id))throw new ErrorPago('El cobro no coincide con la suscripción.',409);
  await d.rpc('cobro',null,{id:s.id,pago:pagoId,factura:recurso(i.id),estado:texto(pago.status),importe:s.importe,devuelto:centavosPago(pago.transaction_amount_refunded??0),desde:diaUruguay(i.debit_date),actualizada:fecha(pago.date_last_updated)});
 }
 async function sincronizar(s:Suscripcion){
  const actual=await recuperar(s);if(!actual.proveedor_id)return;
  const facturas=await mp(`/authorized_payments/search?preapproval_id=${recurso(actual.proveedor_id)}&limit=20`);
  if(Array.isArray(facturas.results))for(const i of facturas.results)await factura(objeto(i));
 }
 return {comercio,buscar,recuperar,sincronizar,async crear(usuario:string,b:Documento){
  if(!c.habilitado||!c.produccion||!c.firma)throw new ErrorPago('Los pagos online todavía no están habilitados.',503);
  if(b.acepta!==true||!['club','completo'].includes(texto(b.plan))||!uuid.test(texto(b.id)))throw new ErrorPago('Confirmá el plan y la renovación mensual.');
  const correo=texto(b.correo).trim();if(correo.length>254||!/^\S+@\S+\.\S+$/.test(correo))throw new ErrorPago('Escribí el correo que usás en Mercado Pago.');
  await comercio();
  const r=objeto(await d.rpc('preparar',usuario,{id:b.id,plan:b.plan,correo,produccion:c.produccion}));let s=r.suscripcion as Suscripcion;
  if(r.nueva===true){
   const plan=PLANES_PAGO[s.plan];
   const p=await mp('/preapproval','POST',{reason:`Atlántida Ajedrez · ${plan.nombre}`,external_reference:s.id,payer_email:correo,auto_recurring:{frequency:1,frequency_type:'months',transaction_amount:s.importe/100,currency_id:'UYU'},back_url:`${sitio}/membresia?retorno=mercadopago`,notification_url:c.webhook,status:'pending'});
   s=await guardarSub(s,p);
  }else s=await recuperar(s);
  return {checkout:s.estado==='pending'?s.checkout:null,proveedor:s.proveedor_id,estado:s.estado};
 },async cancelar(s:Suscripcion){
  const actual=await recuperar(s);if(actual.estado==='cancelled')return;
  // MP's subscription-management documentation specifies 'canceled' (one l).
  const p=await mp(`/preapproval/${recurso(actual.proveedor_id)}`,'PUT',{status:'canceled'});
  const guardada=await guardarSub(actual,p);if(guardada.estado!=='cancelled')throw new ErrorPago('Mercado Pago todavía no confirmó la cancelación. Actualizá el estado.',502);
 },async notificacion(tipo:string,id:string){
  if(tipo==='subscription_preapproval'){
   const p=await mp(`/preapproval/${recurso(id)}`),s=await buscar(texto(p.external_reference));if(s)await guardarSub(s,p);
  }else if(tipo==='subscription_authorized_payment')await factura(await mp(`/authorized_payments/${recurso(id)}`));
  else if(tipo==='payment'){
   const q=await mp(`/authorized_payments/search?payment_id=${recurso(id)}&limit=20`);
   if(Array.isArray(q.results))for(const i of q.results){const doc=objeto(i);if(texto(objeto(doc.payment).id)===id)await factura(doc);}
  }
 }};
}
export function crearHandlerPago(d:DependenciasPago,webhook=false){return async(req:Request)=>{
 const origin=req.headers.get('origin')??'',cors:Record<string,string>={'Cache-Control':'no-store','Content-Type':'application/json','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS',Vary:'Origin'};
 if(origenes.has(origin))cors['Access-Control-Allow-Origin']=origin;
 const responder=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:cors});
 if(req.method==='OPTIONS'&&!webhook)return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return responder({error:'Método no permitido.'},405);
 const control=new AbortController(),timer=setTimeout(()=>control.abort(),18000);
 try{
  if(!webhook&&origin&&!origenes.has(origin))throw new ErrorPago('Origen no permitido.',403);
  if(webhook&&!(await firmaValida(req,d.config.firma)))throw new ErrorPago('Firma inválida.',401);
  const b=await leer(req),servicio=crearServicioPago(d,control.signal);
  if(webhook){
   const id=new URL(req.url).searchParams.get('data.id')!;
   if(b.data&&texto(objeto(b.data).id)!==id)throw new ErrorPago('La notificación no coincide.');
   if(!['payment','subscription_preapproval','subscription_authorized_payment'].includes(texto(b.type)))return responder({ok:true});
   await servicio.notificacion(texto(b.type),id);return responder({ok:true});
  }
  const configurado=!!(d.config.token&&d.config.firma&&/^\d+$/.test(d.config.receptor));
  const disponible=configurado&&d.config.habilitado&&d.config.produccion;
  if(b.accion==='disponibilidad')return responder({disponible});
  const token=(req.headers.get('authorization')??'').replace(/^Bearer /i,'');if(!token||token.length>4000)throw new ErrorPago('Iniciá sesión para continuar.',401);
  const u=await d.usuario(token);if(!u||u.anonimo)throw new ErrorPago('Iniciá sesión para continuar.',401);
  if(!await d.limite(u.id))throw new ErrorPago('Esperá un momento antes de volver a actualizar.',429);
  if(b.accion==='conexion'){
   if(u.id!=='f2c0ea67-e4e3-454e-81ee-f3175df90b3d')throw new ErrorPago('Solo el administrador.',403);
   if(configurado)await servicio.comercio();
   return responder({disponible,configurado,produccion:d.config.produccion,habilitado:d.config.habilitado});
  }
  if(b.accion==='resumen')return responder({disponible,suscripciones:await d.rpc('listar',u.id,{})});
  if(b.accion==='crear')return responder(await servicio.crear(u.id,b));
  if(!uuid.test(texto(b.id)))throw new ErrorPago('Elegí una suscripción.');
  const s=await servicio.buscar(texto(b.id),u.id);if(!s)throw new ErrorPago('No existe esa suscripción en tu cuenta.',404);
  if(b.accion==='sincronizar')await servicio.sincronizar(s);
  else if(b.accion==='cancelar'&&b.confirmar===true)await servicio.cancelar(s);
  else throw new ErrorPago('Acción no válida.');
  return responder({disponible,suscripciones:await d.rpc('listar',u.id,{})});
 }catch(e){return responder({error:e instanceof ErrorPago?e.message:'No se pudo confirmar la operación. Actualizá el estado; si sigue pendiente, consultá al club.'},e instanceof ErrorPago?e.status:503);}
 finally{clearTimeout(timer);}
};}
