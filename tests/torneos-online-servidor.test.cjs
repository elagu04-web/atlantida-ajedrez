const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const logica=require('../lib/partidaOnline.ts');
function servidor({miembro=true,organizador=false,participante=false,expirada=true,cambio=false,torneo=true,sinSesion=false}={}){
 const usuario='11111111-1111-4111-8111-111111111111',id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',ahora=Date.now(),actualizaciones=[];
 const fila={id,creador_id:participante?usuario:'22222222-2222-4222-8222-222222222222',rival_id:'33333333-3333-4333-8333-333333333333',torneo_id:torneo?'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':null,version:3,estado:logica.unirEstadoOnline(logica.crearEstadoOnline('3+2','w','Uno'),'Dos',expirada?ahora-200000:ahora)};
 function from(tabla){let modificacion=null;const q={select(){return q;},eq(){return q;},update(data){modificacion=data;return q;},async maybeSingle(){
  if(tabla==='online_torneos')return {data:{organizador_id:organizador?usuario:'44444444-4444-4444-8444-444444444444'}};
  if(tabla==='online_torneo_jugadores')return {data:miembro?{usuario_id:usuario}:null};
  if(modificacion){actualizaciones.push(modificacion);return {data:cambio?null:{id}};}
  return {data:fila};
 }};return q;}
 const cliente={auth:{getUser:async()=>({data:{user:sinSesion?null:{id:usuario}},error:null})},rpc:async()=>({data:true,error:null}),from};
 let handler;const Deno={env:{get:()=>''},serve:f=>handler=f};
 const codigo=ts.transpileModule(fs.readFileSync('supabase/functions/juego-online/index.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','exports','Deno',codigo)(n=>n.startsWith('npm:')?{createClient:()=>cliente}:logica,{},Deno);
 return {actualizaciones,async pedir(extra={}){const r=await handler(new Request('https://example.invalid',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test'},body:JSON.stringify({accion:'arbitrar',id,...extra})}));return {status:r.status,body:await r.json()};}};
}
test('El arbitraje usa el reloj del servidor y solo devuelve resultado, sin PGN ni posición de terceros',async()=>{
 const s=servidor();const r=await s.pedir({resultado:'1-0',ahora:0});assert.equal(r.status,200);assert.equal(r.body.resultado,'0-1');assert.equal(r.body.fase,'terminada');assert.equal('partida' in r.body,false);assert.equal('fen' in r.body,false);assert.equal('pgn' in r.body,false);assert.equal(s.actualizaciones.length,1);assert.equal(s.actualizaciones[0].version,4);
 const vivo=servidor({expirada:false});assert.equal((await vivo.pedir({ahora:99999999999999})).body.fase,'activa');assert.equal(vivo.actualizaciones.length,0);
});
test('Solo miembros u organizador pueden arbitrar; no se pisa una jugada concurrente',async()=>{
 for(const opts of [{miembro:false},{torneo:false},{sinSesion:true}]){const s=servidor(opts);assert.ok((await s.pedir()).status>=400);assert.equal(s.actualizaciones.length,0);}
 assert.equal((await servidor({miembro:false,organizador:true}).pedir()).status,200);
 assert.equal((await servidor({cambio:true}).pedir()).status,409);
});
