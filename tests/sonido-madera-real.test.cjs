const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const settle=()=>new Promise(r=>setImmediate(r));
function entorno({fallar=false,demorar=false}={}){
 const estado={solicitudes:[],fuentes:[],gains:[],contexts:0,fallar,pendientes:[]},exports={};
 class Audio {
  constructor(){estado.contexts++;this.state='suspended';}
  createGain(){const n={gain:{value:0},connect(){},disconnect(){}};estado.gains.push(n);return n;}
  resume(){this.state='running';return Promise.resolve();}
  close(){this.state='closed';return Promise.resolve();}
  decodeAudioData(data){return Promise.resolve({sample:new Uint8Array(data)[0]});}
  createBufferSource(){const n={buffer:null,connect(){},disconnect(){},start(){estado.fuentes.push(this)},stop(){this.parado=true;this.onended?.()}};return n;}
 }
 const fetch=async url=>{estado.solicitudes.push(url);if(estado.fallar)throw Error('offline');if(demorar)await new Promise(r=>estado.pendientes.push(r));return {ok:true,arrayBuffer:async()=>new Uint8Array([+url.match(/pieza-(\d)/)[1]]).buffer};};
 const code=ts.transpileModule(fs.readFileSync(require.resolve('../public/clases-recursos/madera.js'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,AudioContext:Audio,fetch,Date,Promise,Set});
 return {estado,sonido:new exports.SonidoMadera()};
}
test('El primer golpe carga tres grabaciones y después rota muestras reales sin peticiones por movimiento',async()=>{
 const {estado,sonido}=entorno();sonido.golpe();await settle();assert.equal(estado.contexts,1);assert.equal(estado.solicitudes.length,3);assert.equal(estado.fuentes.length,1);
 sonido.golpe();sonido.golpe(true);sonido.golpe();assert.deepEqual(estado.fuentes.map(f=>f.buffer.sample),[1,2,3,1]);assert.equal(estado.solicitudes.length,3);assert.equal(estado.gains.at(-2).gain.value,1.08);
});
test('Silenciar evita iniciar audio y detiene las muestras que estén sonando',async()=>{
 const {estado,sonido}=entorno();sonido.configurar(false,.8);sonido.golpe();assert.equal(estado.contexts,0);assert.equal(estado.solicitudes.length,0);
 sonido.configurar(true,.8);sonido.golpe();await settle();sonido.configurar(false,.8);assert.ok(estado.fuentes[0].parado);const n=estado.fuentes.length;sonido.golpe();assert.equal(estado.fuentes.length,n);
});
test('Cerrar durante una descarga evita que el golpe pendiente se reproduzca después',async()=>{
 const {estado,sonido}=entorno({demorar:true});sonido.golpe();sonido.cerrar();estado.pendientes.forEach(r=>r());await settle();assert.equal(estado.fuentes.length,0);
});
test('Una descarga fallida no rompe la partida y permite reintentar',async()=>{
 const {estado,sonido}=entorno({fallar:true});sonido.golpe();await settle();assert.equal(estado.fuentes.length,0);estado.fallar=false;sonido.golpe();await settle();assert.equal(estado.fuentes.length,1);
});
test('Las muestras son WAV PCM16 mono de 480 ms, distintas y con pico sin recorte',()=>{
 const hashes=new Set();for(const n of [1,2,3]){const b=fs.readFileSync(require.resolve(`../public/audio/madera-real/pieza-${n}.wav`));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt32LE(24),44100);assert.equal(b.readUInt16LE(34),16);assert.equal(b.readUInt32LE(40)/88200,.48);let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));assert.ok(peak>25000&&peak<30000);hashes.add(require('crypto').createHash('sha256').update(b).digest('hex'));}assert.equal(hashes.size,3);
});
