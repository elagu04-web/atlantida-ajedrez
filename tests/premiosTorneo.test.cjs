const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {calcularPremiosTorneo: calcular, premioEnTorneo, premioAlInscribirse} = require('../lib/premiosTorneo.ts');
const ahora = new Date('2026-10-08T18:00:00Z');
function torneo(id, fecha, opciones={}) {
  return {id,nombre:id,formato:'suizo',desempates:[],jugadoresIds:['ana','bea'],estado:'finalizado',
    creadoEn:fecha,iniciadoEn:fecha,rondasObjetivo:null,inscriptosIds:[],asistieronIds:[],pagaronIds:[],
    rondas:[{numero:1,emparejamientos:[{numero:1,blancasId:'ana',negrasId:'bea',resultado:'1-0'}]}],
    ...opciones};
}
const ganado = () => torneo('ganado','2026-09-01T19:00:00Z');
const futuro = (id='proximo',fecha='2026-10-01T19:00:00Z',opciones={}) => torneo(id,fecha,{estado:'armado',iniciadoEn:null,jugadoresIds:[],rondas:[],...opciones});
const ver = torneos => calcular(torneos,ahora);
test('Sólo el campeón oficial de un torneo finalizado recibe un premio',()=>{
  const premios=ver([ganado()]);
  assert.equal(premios.length,1);assert.equal(premios[0].jugadorId,'ana');assert.equal(premios[0].estado,'disponible');
  for(const estado of ['armado','en_curso']) assert.equal(ver([{...ganado(),estado}]).length,0);
});
test('Un resultado faltante, un cierre vacío, sólo descansos o fecha futura no dan premios',()=>{
  const sinResultado=ganado();sinResultado.rondas[0].emparejamientos[0].resultado=null;
  for(const t of [sinResultado,{...ganado(),rondas:[]},{...ganado(),jugadoresIds:['ana']},
    torneo('futuro','2099-01-01T12:00:00Z'),
    {...ganado(),creadoEn:'invalido',iniciadoEn:null},
    {...ganado(),rondas:[{numero:1,emparejamientos:[{numero:1,blancasId:'ana',negrasId:null,resultado:'1-0'}]}]}])
    assert.equal(ver([t]).length,0);
});
test('El cierre oficial puede ser anterior al objetivo planificado si todas sus partidas terminaron',()=>{
  assert.equal(ver([{...ganado(),rondasObjetivo:7}]).length,1);
});
test('Un empate en puntos espera la final; no basta ganar por desempate de planilla',()=>{
  const t=ganado();t.rondas[0].emparejamientos[0].resultado='1/2-1/2';t.desempates=['Buchholz'];
  assert.equal(ver([t]).length,0);
  t.finalDesempate={jugadorIds:['ana','bea'],ganadorId:'bea'};
  assert.equal(ver([t])[0].jugadorId,'bea');
});
test('Un ganador inválido de la final no recibe un premio',()=>{
  const t=ganado();t.rondas[0].emparejamientos[0].resultado='1/2-1/2';
  t.finalDesempate={jugadorIds:['ana','bea'],ganadorId:'intruso'};
  assert.equal(ver([t]).length,0);
});
test('El premio se reserva una sola vez aunque haya dos inscripciones próximas',()=>{
  const p1=futuro('primero','2026-10-01T12:00:00Z',{inscriptosIds:['ana','ana']});
  const p2=futuro('segundo','2026-10-02T12:00:00Z',{inscriptosIds:['ana']});
  const premios=ver([p2,ganado(),p1]);
  assert.equal(premios[0].estado,'reservado');assert.equal(premios[0].destino.id,'primero');
  assert.equal(premioEnTorneo(premios,'segundo','ana'),undefined);
});
test('Un próximo preparado antes de la victoria puede recibir el premio',()=>{
  const p=futuro('preparado','2026-08-01T12:00:00Z',{inscriptosIds:['ana']});
  assert.equal(ver([p,ganado()])[0].destino.id,'preparado');
});
test('La baja anterior al comienzo devuelve el premio disponible',()=>{
  const p=futuro('proximo',undefined,{inscriptosIds:['ana']});
  assert.equal(ver([ganado(),p])[0].estado,'reservado');
  p.inscriptosIds=[];assert.equal(ver([ganado(),p])[0].estado,'disponible');
});
test('Una baja con jugador todavía agregado conserva la reserva hasta que el admin lo quite',()=>{
  const p=futuro('proximo',undefined,{jugadoresIds:['ana'],inscriptosIds:[]});
  assert.equal(ver([ganado(),p])[0].estado,'reservado');
  p.jugadoresIds=[];assert.equal(ver([ganado(),p])[0].estado,'disponible');
});
test('Si no entró a la lista final, anotarse y faltar no consume el premio',()=>{
  const p=torneo('noVino','2026-10-01T19:00:00Z',{estado:'en_curso',jugadoresIds:['bea','cami'],inscriptosIds:['ana']});
  assert.equal(ver([ganado(),p])[0].estado,'disponible');
});
test('Al comenzar, la participación consume el premio y nunca marca un pago',()=>{
  const p=torneo('juega','2026-10-01T19:00:00Z',{estado:'en_curso'});
  const antes=JSON.stringify([ganado(),p]);
  const premios=ver([ganado(),p]);
  assert.equal(premios[0].estado,'utilizado');assert.equal(premios[0].destino.id,'juega');
  assert.deepEqual(p.pagaronIds,[]);assert.equal(JSON.stringify([ganado(),p]),antes);
});
test('Un torneo anterior o simultáneo no consume una victoria posterior',()=>{
  for(const fecha of ['2026-08-01T19:00:00Z','2026-09-01T19:00:00Z']){
    const p=torneo('anterior',fecha,{estado:'en_curso'});
    assert.equal(ver([ganado(),p])[0].estado,'disponible');
  }
});
test('No participar en el siguiente torneo del club conserva el premio para el siguiente propio',()=>{
  const ajeno=torneo('ajeno','2026-09-15T19:00:00Z',{estado:'en_curso',jugadoresIds:['cami','dani']});
  const propio=futuro('propio','2026-10-01T19:00:00Z',{inscriptosIds:['ana']});
  assert.equal(ver([ganado(),ajeno,propio])[0].destino.id,'propio');
});
test('Dos victorias consecutivas gastan la primera y generan un nuevo premio',()=>{
  const segunda=torneo('segundoGanado','2026-10-01T19:00:00Z');
  const p=futuro('tercero','2026-10-02T19:00:00Z',{inscriptosIds:['ana']});
  const premios=ver([segunda,p,ganado()]);
  assert.equal(premios.length,2);assert.equal(premios[0].destino.id,'segundoGanado');assert.equal(premios[1].destino.id,'tercero');
});
test('Las correcciones de campeón recalculan el beneficio sin dejar un premio huérfano',()=>{
  const g=ganado(),p=futuro('proximo',undefined,{inscriptosIds:['ana','bea']});
  assert.equal(ver([g,p])[0].jugadorId,'ana');
  g.rondas[0].emparejamientos[0].resultado='0-1';
  const premios=ver([g,p]);assert.equal(premios.length,1);assert.equal(premios[0].jugadorId,'bea');
});
test('Al borrar el torneo ganador se retira su premio, al borrar destino queda disponible',()=>{
  const p=futuro('proximo',undefined,{inscriptosIds:['ana']});
  assert.equal(ver([p]).length,0);assert.equal(ver([ganado()])[0].estado,'disponible');
});
test('Vista previa no modifica inscripción y otro ID nunca hereda el premio',()=>{
  const g=ganado(),p=futuro();const datos=[g,p];const antes=JSON.stringify(datos);
  assert.equal(premioAlInscribirse(datos,p.id,'ana').origen.id,g.id);
  assert.equal(premioAlInscribirse(datos,p.id,'otroId'),undefined);
  assert.equal(JSON.stringify(datos),antes);assert.equal(ver(datos)[0].estado,'disponible');
});
test('Recargar los datos de inscripción persistidos recupera la misma reserva',()=>{
  const datos=[ganado(),futuro('proximo',undefined,{inscriptosIds:['ana']})];
  const recarga=JSON.parse(JSON.stringify(datos));
  assert.deepEqual(ver(recarga).map(p=>[p.jugadorId,p.origen.id,p.destino?.id,p.estado]),ver(datos).map(p=>[p.jugadorId,p.origen.id,p.destino?.id,p.estado]));
});
test('Cambiar nombre o alias no altera el premio ligado al ID de jugador',()=>{
  const t={...ganado(),nombre:'Nuevo nombre de torneo'};
  assert.equal(ver([t])[0].jugadorId,'ana');assert.equal(premioAlInscribirse([t,futuro()],'proximo','ana').jugadorId,'ana');
});
test('Duplicar una fila de torneo no duplica el beneficio',()=>{
  const t=ganado();assert.equal(ver([t,t]).length,1);
});