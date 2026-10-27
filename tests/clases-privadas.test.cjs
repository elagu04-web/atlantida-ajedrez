const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),Module=require('node:module'),path=require('node:path');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const original=Module._load;let descarga=0;
function clientePrueba(_url,_key,op){
 const autorizado=op?.global?.headers.Authorization==='Bearer profe';
 return {
  auth:{getUser:async token=>({data:{user:token==='profe'?{id:'f2c0ea67-e4e3-454e-81ee-f3175df90b3d'}:token==='otro'?{id:'otro'}:null},error:token==='vencido'?new Error('expired'):null})},
  storage:{from:bucket=>{
   assert.equal(bucket,'clases-mesa');
   return {
    download:async()=>{descarga++;return autorizado?{data:new Blob(['mesa privada']),error:null}:{data:null,error:new Error('denied')};},
    createSignedUrl:async(nombre,ttl)=>{assert.equal(ttl,60);return autorizado?{data:{signedUrl:'https://storage.example/firmado'},error:null}:{data:null,error:new Error('denied')};}
   };
  }}
 };
}
Module._load=function(n,p,i){
 if(n==='@supabase/supabase-js')return {createClient:clientePrueba};
 if(n.startsWith('@/'))return original.call(this,path.join(__dirname,'..',n.slice(2)),p,i);
 return original.call(this,n,p,i);
};
const {NextRequest}=require('next/server'),{archivoMesa,COOKIE_CLASES,RUTA_MESA}=require('../lib/clasesPrivadas.ts'),Acceso=require('../app/api/clases/acceso/route.ts'),Mesa=require('../app/api/clases/mesa/[...archivo]/route.ts');
const origin='https://atlantida-ajedrez.vercel.app',peticion=(url,options={})=>new NextRequest(origin+url,options);
test('Rutas limitadas a archivos de la app: sin traversal, rutas absolutas ni parámetros',()=>{assert.equal(archivoMesa(['vendor','voz','es-0.42.tar.gz']),'vendor/voz/es-0.42.tar.gz');for(const partes of [[],['..','index.html'],['/index.html'],['index.html?token=uno'],['foo\\bar.js'],['archivo.exe']])assert.equal(archivoMesa(partes),null);});
test('El acceso exige origen propio y usuario verificado; no basta tener sesión de socio',async()=>{
 for(const [headers,status] of [[{},403],[{origin},401],[{origin,Authorization:'Bearer otro'},403],[{origin,Authorization:'Bearer vencido'},401],[{origin:'https://otro.example',Authorization:'Bearer profe'},403]])assert.equal((await Acceso.POST(peticion('/api/clases/acceso',{method:'POST',headers}))).status,status);
 const r=await Acceso.POST(peticion('/api/clases/acceso',{method:'POST',headers:{origin,Authorization:'Bearer profe'}}));assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');for(const marca of ['HttpOnly','Secure','SameSite=strict','Path='+RUTA_MESA,'Max-Age=90'])assert.ok(cookie.includes(marca),marca);assert.equal(await r.text(),'{"ok":true}');
});
test('Los archivos requieren cookie; Storage vuelve a autorizar cada descarga con RLS',async()=>{
 descarga=0;const args={params:Promise.resolve({archivo:['index.html']})};assert.equal((await Mesa.GET(peticion('/api/clases/mesa/index.html'),args)).status,401);assert.equal(descarga,0);
 const otros=await Mesa.GET(peticion('/api/clases/mesa/index.html',{headers:{cookie:COOKIE_CLASES+'=otro'}}),args);assert.equal(otros.status,403);
 const r=await Mesa.GET(peticion('/api/clases/mesa/index.html',{headers:{cookie:COOKIE_CLASES+'=profe'}}),args);assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'private, no-store, max-age=0');assert.ok(r.headers.get('x-robots-tag').includes('noindex'));assert.ok(r.headers.get('content-type').includes('text/html'));assert.equal(await r.text(),'mesa privada');
});
test('El modelo de voz grande se sirve con firma temporal, sin exponer el JWT',async()=>{
 const r=await Mesa.GET(peticion('/api/clases/mesa/vendor/voz/es-0.42.tar.gz',{headers:{cookie:COOKIE_CLASES+'=profe'}}),{params:Promise.resolve({archivo:['vendor','voz','es-0.42.tar.gz']})});assert.equal(r.status,307);assert.equal(r.headers.get('location'),'https://storage.example/firmado');assert.ok(!r.headers.get('location').includes('profe'));
});
test('Cerrar acceso elimina la cookie de la misma ruta y rechaza solicitudes de otros orígenes',async()=>{
 const r=await Acceso.DELETE(peticion('/api/clases/acceso',{method:'DELETE',headers:{origin}}));assert.equal(r.status,200);assert.ok(r.headers.get('set-cookie').includes('Max-Age=0'));assert.ok(r.headers.get('set-cookie').includes('Path='+RUTA_MESA));assert.equal((await Acceso.DELETE(peticion('/api/clases/acceso',{method:'DELETE',headers:{origin:'https://otro.example'}}))).status,403);
});
