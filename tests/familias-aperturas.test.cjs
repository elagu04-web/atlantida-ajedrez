const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const catalogo=require('../data/aperturas-catalogo.json'),{Chess}=require('chess.js');
const {familiasAperturas,ramasDeFamilia,claveFamiliaApertura}=require('../lib/familiasAperturas.ts');
const {coleccionarAperturas,cartaDePosicion}=require('../lib/albumAperturas.ts');
const {arbolAperturas}=require('../lib/arbolAperturas.ts');
const uci=pgn=>{const c=new Chess();c.loadPgn(pgn);return c.history({verbose:true}).map(m=>m.from+m.to+(m.promotion??''));};

test('Las familias cubren cada posición una sola vez y no revelan una colección al cambiar de jugador',()=>{
 const vacias=familiasAperturas([]),ids=vacias.flatMap(f=>f.posiciones.map(c=>c.id));
 assert.equal(ids.length,catalogo.length);assert.equal(new Set(ids).size,catalogo.length);assert.ok(vacias.every(f=>!f.obtenidas.length&&!f.miticas.length));
 const partidas=[{id:'guardada',fecha:'2026-11-27',color:'w',rival:'B',resultado:'1-0',movimientos:uci('1. e4 c5 2. Nf3 d6'),amistosa:true}];
 const cartas=coleccionarAperturas(partidas),familias=familiasAperturas(cartas);
 assert.equal(familias.reduce((n,f)=>n+f.obtenidas.length,0),cartas.length);
 assert.ok(familias.find(f=>f.id==='Sicilian Defense').obtenidas.length>0);
 assert.ok(familias.find(f=>f.id==='Sicilian Defense').obtenidas.every(c=>c.partidas[0].amistosa));
 assert.ok(familiasAperturas([]).every(f=>!f.obtenidas.length));
});
test('Londres reúne sus órdenes de jugadas y formaciones; el Hipopótamo del club no se confunde con Nh6',()=>{
 const londres=catalogo.filter(a=>/London System/.test(a.nombre));assert.ok(londres.every(a=>claveFamiliaApertura(cartaDePosicion(a))==='London System'));
 const cartas=coleccionarAperturas([{id:'london',fecha:'2026-11-27',color:'w',rival:'B',resultado:'1-0',movimientos:uci('1. d4 a6 2. Nf3 h6 3. Bf4 b6 4. e3 g6')}]);
 const familia=familiasAperturas(cartas).find(f=>f.id==='London System');
 assert.ok(familia.obtenidas.some(c=>c.id==='formacion:London System'));
 const formacion=familia.obtenidas.find(c=>c.id==='formacion:London System'),tablero=new Chess();tablero.loadPgn(formacion.pgn);
 assert.ok(!formacion.pgn.includes('[Event'));assert.equal(tablero.fen(),formacion.fen);
 assert.equal(familia.posiciones.filter(c=>c.id==='formacion:London System').length,1);
 assert.equal(claveFamiliaApertura({original:'Hippopotamus Defense',eco:null}),'club:Hippopotamus Defense');
 assert.equal(claveFamiliaApertura({original:'Hippopotamus Defense',eco:'B00'}),'Hippopotamus Defense');
});
test('Los mapas conectan variantes por sus jugadas y sólo anuncian míticas que existen en el motor de premios',()=>{
 const arbol=arbolAperturas();
 for(const f of familiasAperturas([])){
  const encontrados=[];
  function recorrer(ramas,padre){for(const r of ramas){encontrados.push(r.carta.id);if(padre){const ruta=arbol.rutasPorCarta.get(r.carta.id),previa=arbol.rutasPorCarta.get(padre);assert.ok(ruta.startsWith(previa+' '));}recorrer(r.hijos,r.carta.id);}}
  recorrer(ramasDeFamilia(f),null);
  assert.deepEqual([...encontrados].sort(),f.posiciones.map(c=>c.id).sort());
  const posible=f.posiciones.some(c=>arbol.nodos.get(arbol.rutasPorCarta.get(c.id)).descendientes.length>=3);
  assert.equal(f.tieneMitica,posible);
 }
});
