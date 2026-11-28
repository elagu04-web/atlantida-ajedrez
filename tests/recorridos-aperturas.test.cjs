const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {Chess}=require('chess.js'),catalogo=require('../data/aperturas-catalogo.json');
const {coleccionarAperturas,cartaDePosicion}=require('../lib/albumAperturas.ts');
const {crearArbolAperturas,posicionDeRuta,progresoRama}=require('../lib/arbolAperturas.ts');
const {nuevasEdicionesPartida,miticasDeRamas}=require('../lib/recompensasAperturas.ts');
const arbol=crearArbolAperturas();
const partida=(id,fecha,color,resultado,movimientos)=>({id,fecha,color,resultado,movimientos,rival:'Rival'});
const uci=pgn=>{const c=new Chess();c.loadPgn(pgn);return c.history({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));};

test('Todo el catálogo navega por jugadas legales hasta su posición exacta, sin colisiones ni truncar variantes',()=>{
 assert.equal(arbol.rutasPorCarta.size,catalogo.length);
 for(const entrada of catalogo){const carta=cartaDePosicion(entrada),ruta=arbol.rutasPorCarta.get(carta.id),n=arbol.nodos.get(ruta);assert.equal(posicionDeRuta(ruta).fen().split(' ').slice(0,4).join(' '),entrada.fen);assert.equal(n.carta.id,carta.id);assert.ok(n.profundidad<=40);}
 assert.equal(progresoRama(arbol.nodos.get(''),new Set()).conseguidas,0);
 assert.equal(progresoRama(arbol.nodos.get(''),new Set(arbol.rutasPorCarta.keys())).conseguidas,catalogo.length);
});
test('La carta del rival es común; jugarla permite rara y ganarla foil, sin degradar ni repetir premios',()=>{
 const mov=uci('1. e4 c5 2. Nf3 d6'),ps=[partida('a','2026-11-01','w','1-0',mov),partida('b','2026-11-02','b','1-0',mov),partida('c','2026-11-03','b','0-1',mov),partida('d','2026-11-04','b','0-1',mov),partida('e','2026-11-05','w','1-0',mov)];
 const cartas=coleccionarAperturas(ps),base=cartas.find(c=>c.original==='Sicilian Defense');
 assert.equal(base.rareza,'rara');assert.equal(base.acabado,'foil');
 const ed=id=>nuevasEdicionesPartida(cartas,id).find(c=>c.id===base.id);
 assert.deepEqual([ed('a').rareza,ed('a').acabado],['comun','normal']);
 assert.deepEqual([ed('b').rareza,ed('b').acabado],['rara','normal']);
 assert.deepEqual([ed('c').rareza,ed('c').acabado],['rara','foil']);
 assert.equal(ed('d'),undefined);assert.equal(ed('e'),undefined);
 assert.equal(ed('a').partidas.length,1);assert.equal(ed('a').partidas[0].id,'a');
});
test('La mítica exige una rama entera y victoria propia; conocer una hoja o ganar con la apertura rival no alcanza',()=>{
 const rama=[...arbol.nodos.values()].find(n=>n.carta&&n.profundidad>=4&&n.descendientes.length===3);
 assert.ok(rama);const base=rama.carta;
 const partidas=rama.descendientes.map((id,i)=>partida('p'+i,`2026-11-0${i+1}`,base.lado,'1/2-1/2',arbol.rutasPorCarta.get(id).split(' ')));
 const premio=ps=>miticasDeRamas(coleccionarAperturas(ps),arbol).find(c=>c.id==='mitica:'+base.id);
 assert.equal(premio(partidas),undefined);
 const victoria={...partidas.at(-1),id:'victoria',fecha:'2026-11-08',resultado:base.lado==='w'?'1-0':'0-1'};
 assert.equal(premio([{...victoria,movimientos:rama.ruta.split(' ')}]),undefined);
 const opuesto=base.lado==='w'?'b':'w';
 assert.equal(premio([...partidas,{...victoria,color:opuesto,resultado:opuesto==='w'?'1-0':'0-1'}]),undefined);
 const completa=premio([...partidas,victoria]);assert.equal(completa.rareza,'mitica');assert.equal(completa.ramaCompleta.cartas,3);assert.equal(completa.ramaCompleta.partidaId,'victoria');
 const antes={...victoria,fecha:'2026-10-01',movimientos:rama.ruta.split(' ')};
 assert.ok(partidas.some(p=>p.id===premio([antes,...partidas]).ramaCompleta.partidaId));
});
test('Una formación propia se mejora también al jugarla con el otro color',()=>{
 const negras=uci('1. a3 b6 2. h3 Bb7 3. d4 g6 4. e4 Bg7 5. Nf3 d6 6. Bd3 e6 7. O-O Nd7 8. Re1 Ne7');
 const blancas=uci('1. b3 a6 2. Bb2 h6 3. g3 b6 4. Bg2 g6 5. d3 d6 6. e3 e6 7. Nd2 a5 8. Ne2 h5');
 const cartas=coleccionarAperturas([partida('primera','2026-11-01','b','1/2-1/2',negras),partida('segunda','2026-11-02','w','1-0',blancas)]);
 const c=nuevasEdicionesPartida(cartas,'segunda').find(c=>c.id==='formacion:Hippopotamus Defense');assert.ok(c);assert.equal(c.acabado,'foil');assert.equal(c.rareza,'rara');
});
