/* Actual chess-piece recordings by simone_ds, CC0. /audio/madera-real/CREDITOS.txt */
const ARCHIVOS=[1,2,3].map(n=>`/audio/madera-real/pieza-${n}.wav`);
let grabaciones;
function cargar(){
 if(!grabaciones)grabaciones=Promise.all(ARCHIVOS.map(async url=>{
  const r=await fetch(url);if(!r.ok)throw new Error('Audio no disponible');return r.arrayBuffer();
 })).catch(error=>{grabaciones=null;throw error;});
 return grabaciones;
}
export class SonidoMadera {
 constructor(){
  this.contexto=null;this.salida=null;this.buffers=null;this.cargando=null;
  this.habilitado=true;this.volumen=.85;this.indice=0;this.fuentes=new Set();
 }
 configurar(habilitado,volumen){
  this.habilitado=!!habilitado;this.volumen=Number.isFinite(volumen)?Math.max(0,Math.min(1,volumen)):.85;
  if(this.salida)this.salida.gain.value=this.habilitado?this.volumen:0;
  if(!this.habilitado)for(const fuente of this.fuentes){try{fuente.stop();}catch{}}
 }
 activar(){
  if(!this.habilitado)return;
  try{
   if(!this.contexto){
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
    const ctx=new Audio({latencyHint:'interactive'});this.contexto=ctx;
    this.salida=ctx.createGain();this.salida.gain.value=this.volumen;this.salida.connect(ctx.destination);
   }
   if(!this.buffers&&!this.cargando){
    const ctx=this.contexto;
    this.cargando=cargar().then(datos=>Promise.all(datos.map(d=>ctx.decodeAudioData(d.slice(0)))))
     .then(buffers=>{if(this.contexto===ctx)this.buffers=buffers;})
     .catch(()=>{if(this.contexto===ctx){this.cargando=null;}});
   }
   if(this.contexto.state==='suspended')void this.contexto.resume().catch(()=>{});
  }catch{/* Audio is optional; a failed device never interrupts a game. */}
 }
 golpe(captura=false){
  if(!this.habilitado)return;this.activar();const ctx=this.contexto;
  if(!ctx||ctx.state==='closed')return;
  if(!this.buffers||ctx.state==='suspended'){
   const solicitado=Date.now(),preparacion=this.cargando||Promise.resolve();
   void Promise.all([preparacion,ctx.state==='suspended'?ctx.resume():Promise.resolve()]).then(()=>{
    if(this.contexto===ctx&&this.buffers&&ctx.state==='running'&&Date.now()-solicitado<450)this.golpe(captura);
   }).catch(()=>{});return;
  }
  if(ctx.state!=='running')return;
  try{
   const source=ctx.createBufferSource(),gain=ctx.createGain();
   source.buffer=this.buffers[this.indice++%this.buffers.length];
   // Original speed and pitch; no oscillators or artificial noise.
   gain.gain.value=captura?1.08:1;source.connect(gain);gain.connect(this.salida);
   this.fuentes.add(source);source.onended=()=>{source.disconnect();gain.disconnect();this.fuentes.delete(source);};
   source.start();
  }catch{}
 }
 cerrar(){
  const ctx=this.contexto;this.contexto=null;this.salida=null;this.buffers=null;this.cargando=null;
  for(const fuente of this.fuentes){try{fuente.stop();}catch{}}this.fuentes.clear();
  if(ctx)void ctx.close().catch(()=>{});
 }
}
