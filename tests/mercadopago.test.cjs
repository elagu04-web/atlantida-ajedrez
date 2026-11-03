const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),{createHmac}=require('node:crypto');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {firmaValida,crearHandlerPago,crearServicioPago,centavosPago,checkoutSeguro}=require('../supabase/functions/_shared/mercadopago.ts');
const id='00000000-0000-0000-0000-000000000001',uid='10000000-0000-0000-0000-000000000001';
const orden={id,usuario_id:uid,jugador_id:'j',plan:'club',importe:40000,produccion:true,proveedor_id:'SubABC',estado:'pending',correo_pagador:'pagador@example.invalid'};
const sub={id:'SubABC',external_reference:id,collector_id:123,auto_recurring:{currency_id:'UYU',transaction_amount:400,frequency:1,frequency_type:'months'},status:'authorized',last_modified:'2026-11-03T13:00:00Z',init_point:'https://www.mercadopago.com.uy/subscriptions/checkout?preapproval_id=SubABC'};
const factura={id:15,preapproval_id:'SubABC',external_reference:id,currency_id:'UYU',transaction_amount:400,debit_date:'2026-11-03T01:00:00Z',payment:{id:25,status:'approved'}};
const pago={id:25,collector_id:123,currency_id:'UYU',live_mode:true,transaction_amount:400,status:'approved',date_last_updated:'2026-11-03T13:00:00Z'};
function entorno(parches={}){const llamadas=[],http=[];const d={config:{token:'falso',firma:'secreto-prueba',receptor:'123',habilitado:true,produccion:true,webhook:'https://example.invalid/webhook'},usuario:async()=>({id:uid,anonimo:false}),limite:async()=>true,rpc:async(a,u,b)=>{llamadas.push({a,u,b});if(a==='buscar')return {...orden};if(a==='preparar')return {nueva:true,suscripcion:{...orden,proveedor_id:null}};if(a==='listar')return [];return {ok:true};},fetch:async(url,opts)=>{http.push({url,opts});const ruta=new URL(url).pathname;const data=ruta==='/users/me'?{id:123,site_id:'MLU'}:ruta==='/preapproval'?sub:ruta.startsWith('/preapproval/')?sub:ruta==='/authorized_payments/search'?{results:[factura]}:ruta.startsWith('/authorized_payments/')?factura:pago;return Response.json(data);},...parches};return {d,llamadas,http};}
function firmada(tipo='subscription_authorized_payment',dataId='15',secreto='secreto-prueba') {const ts='1793710000',requestId='req-ABC';const hash=createHmac('sha256',secreto).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest('hex');return new Request(`https://example.invalid/webhook?data.id=${dataId}`,{method:'POST',headers:{'x-request-id':requestId,'x-signature':`ts=${ts},v1=${hash}`},body:JSON.stringify({type:tipo,data:{id:dataId}})});}
test('HMAC preserva mayúsculas; rechaza firma ajena, IDs duplicados y header corrupto',async()=>{
 assert.equal(await firmaValida(firmada('subscription_preapproval','SubABC'),'secreto-prueba'),true);
 assert.equal(await firmaValida(firmada(),'ajeno'),false);
 const r=firmada();assert.equal(await firmaValida(new Request(r.url+'&data.id=otro',r),'secreto-prueba'),false);
 const malo=firmada();malo.headers.set('x-request-id','req;id:otro');assert.equal(await firmaValida(malo,'secreto-prueba'),false);
});
test('Centavos exactos y URL del checkout limitada a MP Uruguay',()=>{
 assert.equal(centavosPago('400.00'),40000);for(const x of ['400.001','1e4',-1,NaN,null])assert.throws(()=>centavosPago(x));
 assert.ok(checkoutSeguro(sub.init_point,'SubABC'));for(const u of ['https://www.mercadopago.com.uy.evil.invalid/subscriptions/checkout?preapproval_id=SubABC','javascript:alert(1)',sub.init_point.replace('https:','http:'),sub.init_point.replace('SubABC','otro')])assert.equal(checkoutSeguro(u,'SubABC'),null);
});
test('Solo un pago real aprobado y coincidente llega al registro; usa día de Uruguay de la factura',async()=>{
 const {d,llamadas}=entorno();await crearServicioPago(d,new AbortController().signal).notificacion('subscription_authorized_payment','15');
 const c=llamadas.find(x=>x.a==='cobro');assert.equal(c.b.importe,40000);assert.equal(c.b.desde,'2026-11-02');assert.equal(c.b.estado,'approved');
});
test('Monto, moneda, receptor, modo y referencia ajenos nunca activan una cuota',async()=>{
 for(const cambio of [{collector_id:999},{currency_id:'ARS'},{transaction_amount:550},{live_mode:false},{external_reference:'otra'}]){
  const {d,llamadas}=entorno(),base=d.fetch;d.fetch=async(u,o)=>String(u).includes('/v1/payments/')?Response.json({...pago,...cambio}):base(u,o);
  await assert.rejects(()=>crearServicioPago(d,new AbortController().signal).notificacion('subscription_authorized_payment','15'));assert.equal(llamadas.some(x=>x.a==='cobro'),false);
 }
});
test('Autorizar una suscripción no concede beneficios; rechaza mensajes sin firma antes de tocar servidor',async()=>{
 const {d,llamadas,http}=entorno();await crearServicioPago(d,new AbortController().signal).notificacion('subscription_preapproval','SubABC');assert.equal(llamadas.some(x=>x.a==='cobro'),false);
 llamadas.length=0;http.length=0;const r=await crearHandlerPago(d,true)(new Request('https://example.invalid/?data.id=15',{method:'POST',body:'{}'}));assert.equal(r.status,401);assert.equal(llamadas.length,0);assert.equal(http.length,0);
});
test('Consulta y cancelación validan propiedad; retorno del navegador no confirma pagos',async()=>{
 const {d,llamadas}=entorno({rpc:async(a,u)=>{llamadas.push({a,u});return a==='listar'?[]:null;}});
 const h=crearHandlerPago(d);for(const accion of ['cancelar','sincronizar']){const r=await h(new Request('https://example.invalid',{method:'POST',headers:{Authorization:'Bearer token'},body:JSON.stringify({accion,id,confirmar:true,status:'approved'})}));assert.equal(r.status,404);}
 assert.ok(llamadas.every(x=>x.u===uid));
});
test('Creación incierta nunca repite el POST; no se toma el precio del cliente',async()=>{
 const {d,http}=entorno();await crearServicioPago(d,new AbortController().signal).crear(uid,{acepta:true,id,plan:'club',importe:1,correo:'x@example.invalid'});const post=http.find(x=>x.opts.method==='POST');assert.equal(JSON.parse(post.opts.body).auto_recurring.transaction_amount,400);
 const e=entorno(),base=e.d.rpc;e.d.rpc=async(a,u,b)=>a==='preparar'?{nueva:false,suscripcion:{...orden,proveedor_id:null}}:base(a,u,b);
 await assert.rejects(()=>crearServicioPago(e.d,new AbortController().signal).crear(uid,{acepta:true,id,plan:'club',correo:'x@example.invalid'}));assert.equal(e.http.some(x=>x.opts.method==='POST'),false);
});
test('Cancelación solo detiene renovaciones y conserva los períodos; el botón público queda apagado sin configuración',async()=>{
 const {d,llamadas,http}=entorno(),base=d.fetch;d.fetch=async(u,o)=>o.method==='PUT'?Response.json({...sub,status:'canceled'}):base(u,o);
 await crearServicioPago(d,new AbortController().signal).cancelar(orden);assert.equal(JSON.parse(http.find(x=>x.opts.method==='GET'&&x.url.includes('/preapproval/')).opts.body??'{}').status,undefined);
 assert.equal(llamadas.some(x=>x.a==='cobro'),false);assert.equal(llamadas.at(-1).b.estado,'cancelled');
 d.config.token='';const r=await crearHandlerPago(d)(new Request('https://example.invalid',{method:'POST',body:JSON.stringify({accion:'disponibilidad'})}));assert.equal((await r.json()).disponible,false);
});
test('Un aviso firmado con cuerpo que cambia data.id se rechaza sin procesarlo',async()=>{
 const {d,llamadas}=entorno(),r=firmada();const x=new Request(r.url,{method:'POST',headers:r.headers,body:JSON.stringify({type:'payment',data:{id:'otro'}})});assert.equal((await crearHandlerPago(d,true)(x)).status,400);assert.equal(llamadas.length,0);
});
