const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {Chess}=require('chess.js');
const {crearEstadoOnline,unirEstadoOnline,aplicarAccionOnline}=require('../lib/partidaOnline.ts');
const {recorridoOnline}=require('../lib/recorridoOnline.ts');

function partida(){return unirEstadoOnline(crearEstadoOnline('10+3','w','Blancas'),'Negras',1000);}
test('El visor vuelve al inicio y a las posiciones exactas de capturas y enroque, sin tocar la partida',()=>{
 let e=partida();
 for(const uci of ['e2e4','c7c5','d2d4','c5d4','c2c3','d4c3','b1c3','g8f6','g1f3','d7d6','f1c4','e7e6','e1g1'])e=aplicarAccionOnline(e,e.turno,{tipo:'mover',uci},e.desde+1000);
 e=aplicarAccionOnline(e,'b',{tipo:'rendirse'},e.desde+1000);
 Object.freeze(e.movimientos);Object.freeze(e);
 const antes=JSON.stringify(e),r=recorridoOnline(e);
 assert.equal(r.posiciones.length,e.movimientos.length+1);
 assert.equal(r.posiciones[0],new Chess().fen());
 assert.equal(new Chess(r.posiciones[3]).get('d4').color,'w');
 assert.equal(new Chess(r.posiciones[4]).get('d4').color,'b');
 assert.equal(new Chess(r.posiciones[7]).get('c3').type,'n');
 assert.equal(new Chess(r.posiciones.at(-1)).get('g1').type,'k');
 assert.equal(new Chess(r.posiciones.at(-1)).get('f1').type,'r');
 assert.equal(r.posiciones.at(-1),e.fen);assert.equal(r.jugadas[6].texto,'4. Cxc3');
 assert.equal(r.jugadas.at(-1).texto,'7. O-O');assert.equal(r.resultado,'1-0');assert.equal(r.pgn,e.pgn);
 assert.equal(JSON.stringify(e),antes);
});
test('Una partida terminada antes de mover tiene un tablero inicial válido',()=>{
 const e=aplicarAccionOnline(partida(),'w',{tipo:'rendirse'},2000),r=recorridoOnline(e);
 assert.deepEqual(r.posiciones,[new Chess().fen()]);assert.deepEqual(r.jugadas,[]);
 assert.equal(r.resultado,'0-1');assert.equal(r.blancas,'Blancas');assert.equal(r.negras,'Negras');
});
test('Admite las 1000 medias jugadas del servidor, sin el límite de un archivo de estudio',()=>{
 const e={...partida(),movimientos:Array.from({length:250},()=>['g1f3','g8f6','f3g1','f6g8']).flat()};
 const r=recorridoOnline(e);assert.equal(r.jugadas.length,1000);assert.equal(r.posiciones.length,1001);
 assert.equal(new Chess(r.posiciones.at(-1)).get('g1').type,'n');
});
test('No inventa posiciones cuando un historial guardado contiene una jugada inválida',()=>{
 assert.throws(()=>recorridoOnline({...partida(),movimientos:['e2e4','e7e9']}));
});
