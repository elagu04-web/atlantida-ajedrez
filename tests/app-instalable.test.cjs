const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const manifest=require('../app/manifest.ts').default;

test('La app tiene identidad estable, alcance propio, íconos instalables y accesos directos locales',()=>{
 const m=manifest();assert.equal(m.id,'/');assert.equal(m.scope,'/');assert.equal(m.start_url,'/');assert.equal(m.display,'standalone');
 for(const size of [192,512])assert(m.icons.some(i=>i.sizes===`${size}x${size}`&&i.purpose==='any'));
 assert(m.icons.some(i=>i.purpose==='maskable'));
 for(const icon of m.icons){const p=fs.readFileSync(require('node:path').join(__dirname,'../public',icon.src));assert.equal(p.readUInt32BE(16)+'x'+p.readUInt32BE(20),icon.sizes);}
 for(const s of m.shortcuts)assert(s.url.startsWith('/')&&!s.url.startsWith('//'));
});
function worker({offline=false,missing=false}={}){
 const events={},deleted=[],added=[],opens=[],network=[];
 const cache={addAll:async paths=>added.push(...paths),match:async path=>missing?undefined:new Response(path==='/offline.html'?'SIN CONEXIÓN':'ICONO')};
 const self={location:{origin:'https://club.test'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../public/sw.js'),'utf8'),{self,URL,Response,caches:{open:async name=>{opens.push(name);return cache;},keys:async()=>['atlantida-offline-v0','atlantida-offline-v1','otra-app'],delete:async name=>deleted.push(name)},fetch:async req=>{network.push(req.url);if(offline)throw Error('offline');return new Response('RED ACTUAL');}});
 const ejecutar=async name=>{let p;events[name]({waitUntil:value=>p=value});await p;};
 const pedir=async(req)=>{let p;events.fetch({request:req,respondWith:value=>p=value});return p?await p:null;};
 return {ejecutar,pedir,deleted,added,opens,network};
}
test('Solo precarga la pantalla sin conexión y su ícono; solo limpia cachés propios antiguos',async()=>{
 const w=worker();await w.ejecutar('install');assert.deepEqual(w.added,['/offline.html','/app-icons/icon-192.png']);await w.ejecutar('activate');assert.deepEqual(w.deleted,['atlantida-offline-v0']);
});
test('Las páginas siempre se recuperan de la red, sin almacenar partidas, cuentas o PGNs',async()=>{
 const w=worker();const r=await w.pedir({method:'GET',mode:'navigate',url:'https://club.test/jugar/online?mesa=privada'});assert.equal(await r.text(),'RED ACTUAL');assert.equal(w.opens.length,0);
 for(const req of [{method:'GET',mode:'cors',url:'https://club.test/entrenamiento?_rsc=1'},{method:'POST',mode:'cors',url:'https://club.test/api/entrenamiento/procesar'},{method:'GET',mode:'navigate',url:'https://otro.test/'},{method:'GET',mode:'cors',url:'https://club.test/partida.pgn'},{method:'GET',mode:'cors',url:'https://club.test/api/desafio-diario'}])assert.equal(await w.pedir(req),null);
});
test('Sin internet muestra una pantalla pública sin datos de la cuenta y conserva disponible el ícono',async()=>{
 const w=worker({offline:true});assert.equal(await(await w.pedir({method:'GET',mode:'navigate',url:'https://club.test/entrenamiento'})).text(),'SIN CONEXIÓN');
 assert.equal(await(await w.pedir({method:'GET',mode:'cors',url:'https://club.test/app-icons/icon-192.png'})).text(),'ICONO');
 const vacio=worker({offline:true,missing:true});assert.equal((await vacio.pedir({method:'GET',mode:'navigate',url:'https://club.test/'})).status,503);
});
