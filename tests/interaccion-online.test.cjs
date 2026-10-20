const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {Chess}=require('chess.js');
const {destinoTablero}=require('../lib/interaccionTablero.ts');
const {vistaJugadaOnline}=require('../lib/vistaJugadaOnline.ts');
const {crearEstadoOnline,unirEstadoOnline,aplicarAccionOnline}=require('../lib/partidaOnline.ts');

test('Enroque: rey a destino o a torre, corto y largo, con ambos colores',()=>{
 for(const color of ['w','b']){
  const c=new Chess(`r3k2r/8/8/8/8/8/8/R3K2R ${color} KQkq - 0 1`),r=color==='w'?'1':'8';
  for(const [target,dest] of [['h','g'],['a','c'],['g','g'],['c','c']]){
   assert.equal(destinoTablero(c,'e'+r,target+r),dest+r);
   const jugada=new Chess(c.fen());jugada.move({from:'e'+r,to:destinoTablero(c,'e'+r,target+r)});
   assert.equal(jugada.get(dest+r).type,'k');
   assert.equal(jugada.get((dest==='g'?'f':'d')+r).type,'r');
  }
 }
});
test('El gesto hacia una torre no permite enrocar en jaque, atravesando ataque, sin derechos o con piezas en medio',()=>{
 for(const fen of ['r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1','4k3/8/8/8/8/8/4r3/4K2R w K - 0 1','4k3/8/8/8/8/8/5r2/4K2R w K - 0 1',new Chess().fen()]){
  assert.equal(destinoTablero(new Chess(fen),'e1','h1'),null);
 }
 const c=new Chess();assert.equal(destinoTablero(c,'e2','e4'),'e4');assert.equal(destinoTablero(c,'e2','e5'),null);assert.equal(destinoTablero(c,'e1','bad'),null);
});
test('La jugada aparece inmediatamente sin cambiar el estado confirmado ni los relojes',()=>{
 const p={id:'mesa',version:3,estado:unirEstadoOnline(crearEstadoOnline('10+3','w','Uno'),'Dos',1000)},antes=JSON.stringify(p);
 const c=vistaJugadaOnline(p,{id:'mesa',version:3,uci:'e2e4'});
 assert.equal(c.get('e4').type,'p');assert.equal(c.get('e2'),undefined);assert.equal(JSON.stringify(p),antes);
 assert.equal(vistaJugadaOnline(p,null),null);assert.equal(vistaJugadaOnline(p,{id:'mesa',version:3,uci:'e2e5'}),null);
});
test('La confirmación del servidor, un rechazo o el vencimiento prevalecen sobre la vista previa',()=>{
 const p={id:'mesa',version:3,estado:unirEstadoOnline(crearEstadoOnline('10+3','w','Uno'),'Dos',1000)},v={id:'mesa',version:3,uci:'e2e4'};
 const confirmada={...p,version:4,estado:aplicarAccionOnline(p.estado,'w',{tipo:'mover',uci:'e2e4'},2000)};
 assert.equal(vistaJugadaOnline(confirmada,v),null);
 assert.equal(vistaJugadaOnline(p,{...v,id:'otra'}),null);
 const vencida={...p,estado:aplicarAccionOnline(p.estado,'w',{tipo:'mover',uci:'e2e4'},999999)};
 assert.equal(vistaJugadaOnline(vencida,v),null);assert.equal(vencida.estado.movimientos.length,0);
 assert.equal(vistaJugadaOnline(p,null),null);assert.equal(new Chess(p.estado.fen).get('e2').type,'p');
});
