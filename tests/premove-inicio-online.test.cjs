const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {Chess}=require('chess.js'),o=require('../lib/partidaOnline.ts'),p=require('../lib/premovimientoOnline.ts');
const inicio=1000000;
function juego(ritmo='10+3'){return o.unirEstadoOnline(o.crearEstadoOnline(ritmo,'w','Uno'),'Dos',inicio);}
function mover(e,uci,ms=119999){return o.aplicarAccionOnline(e,e.turno,{tipo:'mover',uci},e.desde+ms);}
test('Dos jugadas por jugador sin descuento ni incremento; el reloj empieza exactamente tras 2... negras',()=>{
 for(const ritmo of Object.keys(o.RITMOS_ONLINE)){
  let e=juego(ritmo),base=o.RITMOS_ONLINE[ritmo].minutos*60000;
  for(const u of ['e2e4','c7c5','g1f3','d7d6']){
   assert.equal(o.margenInicioOnline(e,e.desde+119999),1);assert.deepEqual(o.relojesOnline(e,e.desde+119999),{w:base,b:base});
   e=mover(e,u);assert.equal(e.blancasMs,base);assert.equal(e.negrasMs,base);
  }
  assert.equal(o.margenInicioOnline(e,e.desde),null);assert.equal(o.relojesOnline(e,e.desde+4000).w,base-4000);
  e=mover(e,'d2d4',4000);assert.equal(e.blancasMs,base-4000+o.RITMOS_ONLINE[ritmo].incremento*1000);
 }
});
test('El margen vence a los 2 minutos, sin aceptar una jugada tardía, incluso luego de cerrar o recargar',()=>{
 for(let n=0;n<4;n++){
  let e=juego();for(const u of ['e2e4','e7e5','g1f3'].slice(0,n))e=mover(e,u,1000);
  e=JSON.parse(JSON.stringify(e));const fin=o.aplicarAccionOnline(e,e.turno,{tipo:'tiempo'},e.desde+120000);
  assert.equal(fin.fase,'terminada');assert.equal(fin.resultado,e.turno==='w'?'0-1':'1-0');assert.equal(fin.movimientos.length,n);assert.match(fin.motivo,/inicio/);assert.equal(fin.blancasMs,600000);assert.equal(fin.negrasMs,600000);
 }
 let e=juego();e=o.aplicarAccionOnline(e,'b',{tipo:'ofrecer'},inicio+110000);assert.equal(e.desde,inicio);
 assert.equal(o.aplicarAccionOnline(e,'w',{tipo:'mover',uci:'e2e4'},inicio+120000).movimientos.length,0);
});
test('Partidas anteriores sin la marca conservan su reloj y sus incrementos',()=>{
 const e=juego();delete e.inicioLibre;assert.equal(o.margenInicioOnline(e,inicio+1000),null);assert.equal(o.relojesOnline(e,inicio+1000).w,599000);
 assert.equal(mover(e,'e2e4',4000).blancasMs,599000);
});
test('Premove: solo piezas propias, geometría razonable y sin atravesar piezas propias',()=>{
 const c=new Chess();assert.ok(p.destinosPremovimiento(c,'b','g8').includes('f6'));assert.ok(p.destinosPremovimiento(c,'b','e7').includes('e5'));
 assert.deepEqual(p.destinosPremovimiento(c,'b','g1'),[]);assert.deepEqual(p.destinosPremovimiento(c,'b','bad'),[]);
 assert.equal(p.normalizarPremovimiento(c,'b','e7','e4'),null);assert.equal(p.normalizarPremovimiento(c,'b','a8','a5'),null);
});
test('Premove se confirma únicamente después de la jugada rival y no altera el tablero ni su historial',()=>{
 const c=new Chess(),pre={mesa:'a',ply:0,uci:'g8f6'},antes=c.fen();
 assert.equal(p.resolverPremovimiento(pre,'a',0,c,'b'),'esperar');c.move('e4');
 assert.equal(p.resolverPremovimiento(pre,'a',1,c,'b'),'ejecutar');assert.equal(c.get('g8').type,'n');assert.deepEqual(c.history(),['e4']);
 assert.equal(p.resolverPremovimiento(pre,'b',1,c,'b'),'cancelar');assert.equal(p.resolverPremovimiento(pre,'a',3,c,'b'),'cancelar');assert.equal(p.resolverPremovimiento(pre,'a',-1,c,'b'),'cancelar');assert.notEqual(c.fen(),antes);
});
test('Recapturas y al paso pueden prepararse en casillas vacías; se descartan si el rival no las habilita',()=>{
 const c=new Chess('4k3/8/8/3pP3/8/8/8/4K3 b - - 0 1'),pre={mesa:'a',ply:20,uci:'e5d6'};
 assert.equal(p.normalizarPremovimiento(c,'w','e5','d6'),'d6');c.move('Kd7');assert.equal(p.resolverPremovimiento(pre,'a',21,c,'w'),'cancelar');
 const ep=new Chess('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0 1');ep.move('d5');assert.equal(p.resolverPremovimiento(pre,'a',21,ep,'w'),'ejecutar');
});
test('La comprobación final descarta piezas capturadas y jugadas que dejan al rey en jaque',()=>{
 const c=new Chess('4k3/8/8/8/8/8/r7/R3K3 b Q - 0 1'),pre={mesa:'a',ply:0,uci:'a1a3'};c.move('Rxa1+');assert.equal(p.resolverPremovimiento(pre,'a',1,c,'w'),'cancelar');
 const jaque=new Chess('4k3/8/8/8/8/8/r7/4K1N1 b - - 0 1');jaque.move('Ra1+');assert.equal(p.resolverPremovimiento({...pre,uci:'g1f3'},'a',1,jaque,'w'),'cancelar');
});
test('Premove permite enroque con rey-torre y promoción elegida, pero exige legalidad al ejecutar',()=>{
 const c=new Chess('r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 1');assert.equal(p.normalizarPremovimiento(c,'w','e1','h1'),'g1');c.move('a8a7');
 assert.equal(p.resolverPremovimiento({mesa:'a',ply:0,uci:'e1g1'},'a',1,c,'w'),'ejecutar');
 const corona=new Chess('8/P3k3/8/8/8/8/8/4K3 b - - 0 1');corona.move('Kf7');
 for(const piece of ['q','r','b','n'])assert.equal(p.resolverPremovimiento({mesa:'a',ply:0,uci:'a7a8'+piece},'a',1,corona,'w'),'ejecutar');
 assert.equal(p.resolverPremovimiento({mesa:'a',ply:0,uci:'a7a8'},'a',1,corona,'w'),'cancelar');
});
