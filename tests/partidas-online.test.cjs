const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {Chess}=require('chess.js');
const o=require('../lib/partidaOnline.ts');
const inicio=Date.parse('2026-10-19T18:00:00Z');
function juego(ritmo='10+3'){return o.unirEstadoOnline(o.crearEstadoOnline(ritmo,'w','Blancas de prueba'),'Negras de prueba',inicio);}
function mover(e,color,uci,ms=1000){return o.aplicarAccionOnline(e,color,{tipo:'mover',uci},(e.desde??inicio)+ms);}
test('Los tres ritmos conservan el incremento acordado y el reloj empieza al entrar el rival',()=>{
 for(const ritmo of ['10+3','5+3','3+2']){const e=o.crearEstadoOnline(ritmo,'w','Uno'),r=o.RITMOS_ONLINE[ritmo];assert.equal(e.desde,null);assert.equal(o.relojesOnline(e,inicio).w,r.minutos*60000);const activa=o.unirEstadoOnline(e,'Dos',inicio);const jugada=mover(activa,'w','e2e4',2000);assert.equal(jugada.blancasMs,r.minutos*60000-2000+r.incremento*1000);assert.equal(jugada.negrasMs,r.minutos*60000);assert.equal(jugada.turno,'b');}
 assert.throws(()=>o.crearEstadoOnline('1+0','w','Uno'));
});
test('No acepta jugadas ilegales ni mover por el rival; incluye promoción obligatoria',()=>{
 const e=juego();assert.throws(()=>mover(e,'b','e7e5'));assert.throws(()=>mover(e,'w','e2e5'));assert.throws(()=>mover(e,'w','e2e4anything'));assert.equal(e.movimientos.length,0);
});
test('Una sesión recuperada reconstruye todas las jugadas y el derecho al enroque',()=>{
 let e=juego();for(const u of ['e2e4','e7e5','g1f3','b8c6','f1c4','f8c5','e1g1'])e=mover(e,e.turno,u);
 const guardada=JSON.parse(JSON.stringify(e)),c=o.tableroOnline(guardada);assert.equal(c.fen(),e.fen);assert.equal(c.get('g1').type,'k');assert.equal(c.get('f1').type,'r');assert.equal(c.history().length,7);
});
test('No congela ni reinicia el reloj al ofrecer o rechazar tablas',()=>{
 const e=juego();const oferta=o.aplicarAccionOnline(e,'w',{tipo:'ofrecer'},inicio+1000);assert.equal(oferta.desde,inicio);assert.equal(o.relojesOnline(oferta,inicio+10000).w,590000);
 assert.throws(()=>o.aplicarAccionOnline(oferta,'w',{tipo:'aceptar'},inicio+2000));
 const rechazo=o.aplicarAccionOnline(oferta,'b',{tipo:'rechazar'},inicio+2000);assert.equal(rechazo.desde,inicio);assert.equal(rechazo.oferta,null);
 const termina=o.aplicarAccionOnline(oferta,'b',{tipo:'aceptar'},inicio+3500);assert.equal(termina.resultado,'1/2-1/2');assert.equal(termina.blancasMs,596500);assert.match(termina.pgn,/\[Result "1\/2-1\/2"\]/);
});
test('El reloj vence en el servidor aunque se cierre la página; no concede incremento a una jugada fuera de tiempo',()=>{
 const e=juego('3+2'),fin=o.aplicarAccionOnline(e,'w',{tipo:'mover',uci:'e2e4'},inicio+180001);assert.equal(fin.fase,'terminada');assert.equal(fin.resultado,'0-1');assert.equal(fin.movimientos.length,0);assert.equal(fin.blancasMs,0);assert.equal(o.relojesOnline(fin,inicio+900000).b,180000);
});
test('Reconoce mate y guarda PGN legal con identidades, ritmo y resultado',()=>{
 let e=juego('5+3');for(const u of ['f2f3','e7e5','g2g4','d8h4'])e=mover(e,e.turno,u);
 assert.equal(e.fase,'terminada');assert.equal(e.motivo,'Jaque mate');assert.equal(e.resultado,'0-1');const c=new Chess();c.loadPgn(e.pgn);assert.equal(c.history().length,4);assert.equal(c.getHeaders().TimeControl,'300+3');assert.equal(c.getHeaders().White,'Blancas de prueba');assert.throws(()=>mover(e,'w','a2a3'));
});
test('Repetición, abandono y cancelación conservan resultados coherentes',()=>{
 let e=juego();for(let i=0;i<2;i++)for(const u of ['g1f3','g8f6','f3g1','f6g8'])e=mover(e,e.turno,u);assert.equal(e.resultado,'1/2-1/2');assert.equal(e.motivo,'Triple repetición');
 assert.equal(o.aplicarAccionOnline(juego(),'b',{tipo:'rendirse'},inicio+1000).resultado,'1-0');
 const espera=o.crearEstadoOnline('3+2','b','Creador');assert.equal(o.aplicarAccionOnline(espera,'b',{tipo:'cancelar'},inicio).fase,'cancelada');assert.throws(()=>o.aplicarAccionOnline(espera,'w',{tipo:'cancelar'},inicio));
});
test('Solo los dos ids del servidor definen los colores; nunca el nombre visible',()=>{
 const p={creador_id:'uno',rival_id:'dos',estado:o.crearEstadoOnline('10+3','b','Mismo nombre')};assert.equal(o.colorOnline(p,'uno'),'b');assert.equal(o.colorOnline(p,'dos'),'w');assert.equal(o.colorOnline(p,'tres'),null);
});
test('No otorga victoria por tiempo al rey solo o menor contra rey solo',()=>{
 for(const fen of ['8/8/8/8/8/4k3/8/K7 w - - 0 1','8/8/8/8/8/4k3/8/KB6 w - - 0 1','8/8/8/8/8/4k3/8/KN6 w - - 0 1'])assert.equal(o.materialParaMate(new Chess(fen),'w'),false);
 assert.equal(o.materialParaMate(new Chess(),'b'),true);
});
