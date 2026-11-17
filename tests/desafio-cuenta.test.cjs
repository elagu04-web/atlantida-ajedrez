const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
function cargar(archivo,dependencias={}){
 const fuente=ts.transpileModule(fs.readFileSync(require.resolve(archivo),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const m={exports:{}};new Function('require','module','exports',fuente)(n=>n in dependencias?dependencias[n]:require(n),m,m.exports);return m.exports;
}
function api(usuario){
 const consultas=[];
 const {GET}=cargar('../app/api/desafio-diario/route.ts',{
  'next/cache':{unstable_cache:fn=>fn},
  '@/lib/desafios':{fechaMontevideo:()=> '2026-11-17',convertirPuzzle:(d,fecha)=>({...d,fecha})},
  '@/data/desafio-reserva.json':{id:'reser'},
  '@supabase/supabase-js':{createClient:(_url,_key,opciones)=>{
   consultas.push(['cliente',opciones.global.headers.Authorization]);return {auth:{getUser:async token=>{consultas.push(['usuario',token]);return {data:{user:usuario},error:usuario?null:{message:'Sesión inválida'}};}},rpc:nombre=>({abortSignal:async()=>{consultas.push(['rpc',nombre]);return {data:{fecha:'2026-11-17',datos:{id:'test1',fen:'posicion',solution:['g1f3']},objetivo:1800,racha_base:0},error:null};}})};
  }}
 });return {GET,consultas};
}
test('la API no entrega posición ni solución sin sesión',async()=>{
 const {GET,consultas}=api(null);const r=await GET(new Request('https://club.test/api/desafio-diario'));
 assert.equal(r.status,401);assert.deepEqual(consultas,[]);assert.doesNotMatch(JSON.stringify(await r.json()),/fen|solution/);assert.match(r.headers.get('Cache-Control'),/no-store/);
});
test('una sesión vencida o anónima tampoco obtiene el desafío',async()=>{
 for(const user of [null,{id:'anon',is_anonymous:true}]){const {GET,consultas}=api(user);const r=await GET(new Request('https://club.test/api/desafio-diario',{headers:{Authorization:'Bearer test-token'}}));assert.equal(r.status,401);assert.ok(!consultas.some(c=>c[0]==='rpc'));}
});
test('una sesión verificada consulta el problema con el token de su cuenta',async()=>{
 const {GET,consultas}=api({id:'socio',is_anonymous:false});const r=await GET(new Request('https://club.test/api/desafio-diario',{headers:{Authorization:'Bearer test-token'}}));
 assert.equal(r.status,200);assert.equal((await r.json()).registrable,true);assert.deepEqual(consultas,[['cliente','Bearer test-token'],['usuario','test-token'],['rpc','obtener_desafio_diario']]);assert.equal(r.headers.get('Vary'),'Authorization');
});
test('sin sesión no se monta el tablero, y en portada no se muestra el desafío',()=>{
 const componentes=cargar('../components/DesafioAjedrez.tsx',{
  'react-chessboard':{},'./MarcoTablero':{},'@/context/useMiJugador':{},'@/lib/players':{},'chess.js':{},'@/lib/useSonidoPiezas':{},'./Icono':{},'@/lib/desafios':{},'@/data/desafio-reserva.json':{},'./RevisionDesafio':{},'./GuardarRacha':{},'./LogroDesafio':{},'@/context/AuthContext':{useAuth:()=>({session:null,cargando:false})},'@/lib/identidadJugador':{},'./AuthWidget':{AuthWidget:()=>React.createElement('button',null,'Iniciar sesión')},'@/lib/supabase':{},'@/lib/intentoDesafio':{}
 });
 assert.equal(renderToStaticMarkup(React.createElement(componentes.DesafioAjedrez)), '');
 const html=renderToStaticMarkup(React.createElement(componentes.DesafioAjedrez,{ampliado:true}));assert.match(html,/Iniciá sesión/);assert.doesNotMatch(html,/play-board|Ver pista|Reiniciar/);
});
test('completar con error o pista nunca muestra el distintivo de logrado',()=>{
 const {LogroDesafio}=cargar('../components/LogroDesafio.tsx',{'./LogroDesafio.module.css':{}});
 const practica=renderToStaticMarkup(React.createElement(LogroDesafio,{guardado:false,practica:true}));assert.match(practica,/no cuenta como logrado/);assert.doesNotMatch(practica,/data-desafio-logrado|¡Lograste|COMPLETADO/);
 const logrado=renderToStaticMarkup(React.createElement(LogroDesafio,{guardado:true,practica:false}));assert.match(logrado,/data-desafio-logrado="true"/);assert.match(logrado,/guardado en tu cuenta/);
});
test('el fallo se conserva al recargar, separado por cuenta y día',()=>{
 const datos=new Map();const previoWindow=global.window,previoStorage=global.localStorage;global.window={};global.localStorage={getItem:k=>datos.get(k),setItem:(k,v)=>datos.set(k,v)};
 try{
  const a=cargar('../lib/intentoDesafio.ts');const clave=a.claveErrorDesafio('socio','2026-11-17','abc12');a.marcarErrorDesafio(clave);
  const b=cargar('../lib/intentoDesafio.ts');assert.equal(b.leerErrorDesafio(clave),true);assert.equal(b.leerErrorDesafio(b.claveErrorDesafio('otro','2026-11-17','abc12')),false);assert.equal(b.leerErrorDesafio(b.claveErrorDesafio('socio','2026-11-18','abc12')),false);
 }finally{global.window=previoWindow;global.localStorage=previoStorage;}
});
