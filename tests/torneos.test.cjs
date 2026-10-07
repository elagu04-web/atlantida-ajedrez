const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
let clientePrueba;
require.extensions['.ts'] = (module, archivo) => {
  if (path.basename(archivo) === 'supabase.ts') { module.exports = { supabase: clientePrueba }; return; }
  module._compile(ts.transpileModule(fs.readFileSync(archivo, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, archivo);
};
const reglas = require('../lib/tournaments.ts');
const { calcularEloYHistorialEnVivo } = require('../lib/elo.ts');
const { calcularTablaGeneral } = require('../lib/tablaGeneral.ts');
const { posicionesElo, rendimientoPeriodo, resumenClub, normalizarBusqueda, resumirPartidas, formaReciente } = require('../lib/rendimiento.ts');
const { convertirPuzzle, validarDesafio, fechaMontevideo, aplicarUci } = require('../lib/desafios.ts');
const { Chess } = require('chess.js');
function torneo(jugadoresIds, formato='round-robin', rondas=reglas.generarRoundRobin(jugadoresIds)) {
  return {id:'t',nombre:'Prueba',formato,jugadoresIds,rondas,desempates:[],estado:'en_curso',creadoEn:'2026-01-01T12:00:00Z',rondasObjetivo:null,inscriptosIds:[],asistieronIds:[],pagaronIds:[]};
}
test('Ranking global conserva puestos al buscar y comparte empates de Elo',()=>{
  const puestos=posicionesElo([{id:'a',eloAtlantida:1800},{id:'b',eloAtlantida:1700},{id:'c',eloAtlantida:1700},{id:'d',eloAtlantida:1600}]);
  assert.equal(puestos.get('c'),2);assert.equal(puestos.get('d'),4);
  assert.equal(normalizarBusqueda('Víctor'),normalizarBusqueda('victor'));
});
test('Rendimiento del período utiliza Elo anterior y resultados reales, sin falsas muestras',()=>{
  const p=(fecha,resultado,eloDespues,color='blancas')=>({fecha,resultado,eloDespues,color,rival:'Rival',torneo:'Prueba'});
  const j={id:'a',nombre:'Ana',apodo:null,partidas:[p('2026-02-02','empate',1630,'negras'),p('2026-01-10','victoria',1620),p('2026-02-01','victoria',1635)],eloAtlantida:1630};
  const s=rendimientoPeriodo(j,'2026-02',1600);
  assert.equal(s.eloInicial,1620);assert.equal(s.eloFinal,1630);assert.equal(s.variacion,10);
  assert.equal(s.partidas,2);assert.equal(s.rendimiento,75);assert.equal(s.blancas.rendimiento,100);assert.equal(s.negras.rendimiento,50);
  assert.equal(rendimientoPeriodo(j,'2026-01',1600).variacion,20);
  assert.equal(resumirPartidas([]).rendimiento,null);
  assert.equal(formaReciente(j,1)[0].fecha,'2026-02-02');
});
test('Byes mantienen puntos oficiales pero no elevan PJ ni rendimiento mensual',()=>{
  const t=torneo(['a','b','c'],'suizo',[{numero:1,emparejamientos:[{numero:1,blancasId:'a',negrasId:'b',resultado:'1/2-1/2'},{numero:2,blancasId:'c',negrasId:null,resultado:'1-0'}]}]);
  const filas=calcularTablaGeneral([t]).filas;
  assert.equal(filas.find(f=>f.jugadorId==='c').total,1);assert.equal(filas.find(f=>f.jugadorId==='c').partidasJugadas,0);
  assert.equal(filas.find(f=>f.jugadorId==='a').rendimiento,50);
  assert.deepEqual(resumenClub([t]),{partidas:1,tablas:1,blancas:0,negras:0,jugadores:2,torneos:1});
});
test('Tabla general conserva columnas y puntos en orden cronológico',()=>{
  const primero={...torneo(['a','b']),id:'primero',creadoEn:'2026-01-01'};
  const segundo={...torneo(['a','b']),id:'segundo',creadoEn:'2026-02-01'};
  primero.rondas[0].emparejamientos[0].resultado='1-0';segundo.rondas[0].emparejamientos[0].resultado='1/2-1/2';
  const tabla=calcularTablaGeneral([segundo,primero]);assert.deepEqual(tabla.columnas.map(c=>c.id),['primero','segundo']);
  assert.deepEqual(tabla.filas.find(f=>f.jugadorId===primero.rondas[0].emparejamientos[0].blancasId).puntosPorTorneo,[1,.5]);
});
test('Desafío de reserva tiene rating comprobado y una secuencia legal completa',()=>{
  const puzzle=require('../data/desafio-reserva.json');validarDesafio(puzzle);
  const chess=new Chess(puzzle.fen);const color=chess.turn();for(const uci of puzzle.solution)aplicarUci(chess,uci);
  assert.notEqual(chess.turn(),color);assert.ok(puzzle.rating>=1700&&puzzle.rating<=1900);
  assert.throws(()=>validarDesafio({...puzzle,rating:2400}));
  assert.throws(()=>validarDesafio({...puzzle,solution:['a1a8']}));
});
test('Importación Lichess presenta la posición después del movimiento del rival',()=>{
  const api={game:{pgn:'e4 e5'},puzzle:{id:'test1',rating:1800,initialPly:1,solution:['g1f3','b8c6','f1b5'],themes:[]}};
  const puzzle=convertirPuzzle(api,'2026-10-07');assert.equal(new Chess(puzzle.fen).history().length,0);
  assert.equal(new Chess(puzzle.fen).get('e5').type,'p');assert.equal(new Chess(puzzle.fen).turn(),'w');
  assert.throws(()=>convertirPuzzle({...api,puzzle:{...api.puzzle,initialPly:2}},'2026-10-07'));
  assert.throws(()=>convertirPuzzle({...api,puzzle:{...api.puzzle,rating:2300}},'2026-10-07'));
});
test('La fecha diaria cambia a medianoche en Uruguay, no a medianoche UTC',()=>{
  assert.equal(fechaMontevideo(new Date('2026-10-08T02:59:00Z')),'2026-10-07');
  assert.equal(fechaMontevideo(new Date('2026-10-08T03:00:00Z')),'2026-10-08');
});
for (const n of [3,4,5,6,7,8]) for (const vuelta of [false,true]) test(`Calendario de ${n} jugadores, ${vuelta?'ida y vuelta':'ida'}`, () => {
  const ids=Array.from({length:n},(_,i)=>String(i));const rondas=reglas.generarRoundRobin(ids,vuelta);
  const parejas = new Map();
  for (const r of rondas) {
    const presentes=r.emparejamientos.flatMap(e=>e.negrasId?[e.blancasId,e.negrasId]:[e.blancasId]);
    assert.equal(new Set(presentes).size,n);
    for(const e of r.emparejamientos) if(e.negrasId) {
      const clave=[e.blancasId,e.negrasId].sort().join(':');
      const prev=parejas.get(clave)||[];prev.push(e.blancasId);parejas.set(clave,prev);
    }
  }
  assert.equal(parejas.size,n*(n-1)/2);
  for(const blancas of parejas.values()){assert.equal(blancas.length,vuelta?2:1);if(vuelta)assert.equal(new Set(blancas).size,2);}
});
test('Round robin impar no concede puntos ni partidas por descansos futuros o antiguos',()=>{
  const t=torneo(['a','b','c','d','e']);
  assert.ok([...reglas.calcularStandings(t).values()].every(s=>s.puntos===0&&s.partidasJugadas===0));
  assert.equal(reglas.rondaActualDelTorneo(t).numero,1);
  const emp=t.rondas[0].emparejamientos.find(e=>e.negrasId);emp.resultado='1-0';
  assert.equal(reglas.calcularStandings(t).get(emp.blancasId).puntos,1);
  assert.equal([...reglas.calcularStandings(t).values()].reduce((a,s)=>a+s.partidasJugadas,0),2);
});
test('Los byes suizos mantienen su punto',()=>{
  const r=reglas.generarRondaUnoDutch(['a','b','c'],new Map([['a',1700],['b',1600],['c',1500]]));
  const t=torneo(['a','b','c'],'suizo',[r]);const s=reglas.calcularStandings(t).get('c');
  assert.equal(s.puntos,1);assert.equal(s.receivedBye,true);
});
test('Descansos futuros no inflan el progresivo ni anticipan la carrera del torneo',()=>{
  const t=torneo(['a','b','c','d','e']);
  assert.deepEqual(reglas.puntosAcumuladosPorRonda(t),[]);
  const partida=t.rondas[0].emparejamientos.find(e=>e.negrasId);partida.resultado='1-0';
  const parcial={...t,rondas:[t.rondas[0]]};
  assert.deepEqual(reglas.calcularDesempates(t),reglas.calcularDesempates(parcial));
  assert.deepEqual(reglas.puntosAcumuladosPorRonda(t).map(r=>r.numero),[1]);
});
test('La pantalla avanza con los resultados, no con el total del calendario',()=>{
  const t=torneo(['a','b','c','d']);assert.equal(reglas.rondaActualDelTorneo(t).numero,1);
  t.rondas[0].emparejamientos[0].resultado='1-0';assert.equal(reglas.rondaActualDelTorneo(t).numero,1);
  t.rondas[0].emparejamientos.forEach(e=>e.resultado='1-0');assert.equal(reglas.rondaActualDelTorneo(t).numero,2);
  t.rondas[1].emparejamientos.forEach(e=>e.resultado='1/2-1/2');assert.equal(reglas.rondaActualDelTorneo(t).numero,3);
  t.rondas.forEach(r=>r.emparejamientos.forEach(e=>e.resultado='1-0'));assert.equal(reglas.rondaActualDelTorneo(t).numero,3);
});
test('Resultados adelantados, corregidos y navegación final',()=>{
  const t=torneo(['a','b','c','d','e','f']);t.rondas[2].emparejamientos[0].resultado='0-1';
  assert.equal(reglas.rondaActualDelTorneo(t).numero,3);
  t.rondas[2].emparejamientos[0].resultado=null;assert.equal(reglas.rondaActualDelTorneo(t).numero,1);
  t.estado='finalizado';assert.equal(reglas.rondaActualDelTorneo(t).numero,t.rondas.length);
});
test('Match usa la siguiente partida pendiente y suizo su última ronda generada',()=>{
  const t=torneo(['a','b'],'match',reglas.generarMatch(['a','b'],4));t.rondas[0].emparejamientos[0].resultado='1-0';
  assert.equal(reglas.rondaActualDelTorneo(t).numero,2);t.formato='suizo';assert.equal(reglas.rondaActualDelTorneo(t).numero,4);
});
test('Los empates completos comparten posición; el criterio elegido sí desempata',()=>{
  const t=torneo(['a','b','c']);t.rondas.forEach(r=>r.emparejamientos.forEach(e=>e.resultado=e.negrasId?'1/2-1/2':'1-0'));
  assert.deepEqual(reglas.standingsConDesempates(t).map(s=>[s.puntos,s.posicion]),[[1,1],[1,1],[1,1]]);
  const directo=torneo(['a','b','c'],'suizo',[{numero:1,emparejamientos:[{numero:1,blancasId:'a',negrasId:'b',resultado:'1-0'},{numero:2,blancasId:'b',negrasId:'c',resultado:'1-0'}]}]);
  directo.desempates=['Enfrentamiento directo'];const tabla=reglas.standingsConDesempates(directo);
  assert.equal(tabla[0].jugadorId,'a');assert.deepEqual(tabla.map(s=>s.posicion),[1,2,3]);
});
test('Corregir colores conserva ganador, puntos y Elo',()=>{
  const t=torneo(['a','b'],'match',reglas.generarMatch(['a','b'],1));t.rondas[0].emparejamientos[0].resultado='1-0';
  const jugadores=["a","b"].map(id=>({id,nombre:id,eloAtlantida:1500,partidas:[]}));
  const eloAntes=calcularEloYHistorialEnVivo(jugadores,[t]).map(j=>j.eloAtlantida);
  const antes=reglas.calcularStandings(t);t.rondas[0].emparejamientos[0]=reglas.corregirColorEmparejamiento(t.rondas[0].emparejamientos[0]);
  const despues=reglas.calcularStandings(t);for(const id of ['a','b'])assert.equal(antes.get(id).puntos,despues.get(id).puntos);
  assert.deepEqual(calcularEloYHistorialEnVivo(jugadores,[t]).map(j=>j.eloAtlantida),eloAntes);
});
test('La tradición de final entre empatados se conserva',()=>{
  const t=torneo(['a','b'],'match',reglas.generarMatch(['a','b'],2));t.estado='finalizado';t.rondas.forEach(r=>r.emparejamientos[0].resultado='1/2-1/2');
  assert.equal(reglas.determinarCampeon(t).tipo,'necesita_final');t.finalDesempate={jugadorIds:['a','b'],ganadorId:'b'};
  assert.deepEqual(reglas.determinarCampeon(t),{tipo:'campeon',jugadorId:'b'});
});
test('La tabla mensual comparte posición por puntos y rendimiento iguales',()=>{
  const t=torneo(['a','b','c','d'],'suizo',[{numero:1,emparejamientos:[
    {numero:1,blancasId:'a',negrasId:'b',resultado:'1-0'},
    {numero:2,blancasId:'c',negrasId:'d',resultado:'1-0'}]}]);
  assert.deepEqual(calcularTablaGeneral([t]).filas.map(f=>f.posicion),[1,1,3,3]);
});
test('Renombrar desde el Elo base no modifica el Elo calculado',()=>{
  const jugadores=['a','b'].map(id=>({id,nombre:id,apodo:null,fideId:null,fotoUrl:null,eloAtlantida:1500,partidas:[]}));
  const t=torneo(['a','b'],'match',reglas.generarMatch(['a','b'],1));t.rondas[0].emparejamientos[0].resultado='1-0';
  const antes=calcularEloYHistorialEnVivo(jugadores,[t]);jugadores[0].nombre='Nombre corregido';const despues=calcularEloYHistorialEnVivo(jugadores,[t]);
  assert.deepEqual(antes.map(j=>j.eloAtlantida),despues.map(j=>j.eloAtlantida));assert.equal(despues.find(j=>j.id==='a').eloAtlantida,1510);
});
test('El Elo se ordena por inicio real, independientemente del orden de carga',()=>{
  const jugadores=['a','b'].map(id=>({id,nombre:id,apodo:null,fideId:null,fotoUrl:null,eloAtlantida:1500,partidas:[]}));
  const primero=torneo(['a','b'],'match',reglas.generarMatch(['a','b'],1));primero.id='primero';primero.iniciadoEn='2026-01-01T12:00:00Z';primero.rondas[0].emparejamientos[0].resultado='1-0';
  const segundo=structuredClone(primero);segundo.id='segundo';segundo.iniciadoEn='2026-02-01T12:00:00Z';segundo.rondas[0].emparejamientos[0].resultado='0-1';
  assert.deepEqual(calcularEloYHistorialEnVivo(jugadores,[primero,segundo]),calcularEloYHistorialEnVivo(jugadores,[segundo,primero]));
});
let filaDB={id:'t',rondas:[{numero:1,resultado:null}],inscriptos_ids:[],estado:'en_curso'};
let fallo=false;
clientePrueba={from(){return {update(cambios){const filtros=[];return {eq(c,v){filtros.push([c,v]);return this},is(c,v){filtros.push([c,v]);return this},select(){return this},async single(){if(fallo)return {data:null,error:{code:'NETWORK'}};const coincide=filtros.every(([c,v])=>(typeof filaDB[c]==='object'?JSON.stringify(filaDB[c]):filaDB[c])===v);if(!coincide)return {data:null,error:{code:'PGRST116'}};filaDB={...filaDB,...cambios};return {data:structuredClone(filaDB),error:null};}}}}}};
const {actualizarFila}=require('../lib/escrituras.ts');
test('Dos pantallas no pueden sobrescribir inscripciones con una copia anterior',async()=>{
  const anterior=structuredClone(filaDB);await actualizarFila('torneos','t',{inscriptos_ids:['a']},anterior);
  await assert.rejects(actualizarFila('torneos','t',{inscriptos_ids:['b']},anterior),/no se sobrescribió/);
  assert.deepEqual(filaDB.inscriptos_ids,['a']);
});
test('Una caída de conexión no guarda ni simula un resultado',async()=>{
  const antes=structuredClone(filaDB);fallo=true;await assert.rejects(actualizarFila('torneos','t',{estado:'finalizado'},antes),/No se pudo guardar/);fallo=false;
  assert.deepEqual(filaDB,antes);
});
test('Cambios de campos independientes no se pisan',async()=>{
  const antes=structuredClone(filaDB);await actualizarFila('torneos','t',{estado:'finalizado'},antes);await actualizarFila('torneos','t',{rondas:[{numero:1,resultado:'1-0'}]},antes);
  assert.equal(filaDB.estado,'finalizado');assert.equal(filaDB.rondas[0].resultado,'1-0');
});
