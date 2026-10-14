const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, f);
const { PARTICIPANTES_MATE, calcularTorneoMate } = require('../lib/torneoMate.ts');
const [A, B, C, D] = PARTICIPANTES_MATE.map(j => j.id);
const jugadores = [...PARTICIPANTES_MATE, { id: 'otro', nombre: 'Otro jugador' }];
function p(blancasId, negrasId, resultado = '1-0', numero = 1) { return { numero, blancasId, negrasId, resultado }; }
function t(id, rondas, iniciadoEn = '2026-06-01T15:00:00Z', extra = {}) {
  return { id, nombre: id, estado: 'finalizado', iniciadoEn, creadoEn: '2020-01-01T00:00:00Z', jugadoresIds: jugadores.map(j => j.id), rondas: rondas.map((e, i) => ({ numero: i + 1, emparejamientos: e })), ...extra };
}
const calcular = (torneos, alcance) => calcularTorneoMate(torneos, jugadores, alcance);

test('La clasificación paralela alterna duelos entre cuatro y todos sus rivales sin cambiar el cinturón', () => {
  const torneos = [t('interno', [[p(A, B), p(C, 'otro', '1-0', 2)], [p(D, A, '1/2-1/2')]])];
  const directos = calcular(torneos), todos = calcular(torneos, 'todos');
  assert.equal(directos.partidasIncluidas, 2); assert.equal(todos.partidasIncluidas, 3);
  assert.equal(directos.filas.find(f => f.jugadorId === C).partidas, 0);
  assert.equal(todos.filas.find(f => f.jugadorId === C).puntos, 1);
  assert.deepEqual(directos.cinturon, todos.cinturon);
});
test('Una tabla no estrena cinturón: la primera victoria sí; duelos ajenos y tablas lo conservan', () => {
  const resultado = calcular([t('primero', [[p(A, B, '1/2-1/2')], [p(C, D)], [p(B, A)], [p(C, A, '1/2-1/2')], [p(D, C)]])]);
  assert.equal(resultado.cinturon.campeonId, D);
  assert.deepEqual(resultado.cinturon.conquistas.map(e => [e.anteriorId, e.campeonId]), [[null, C], [C, D]]);
  assert.equal(resultado.cinturon.pasos.filter(e => e.tipo === 'defensa').length, 1);
});
test('Un miembro sólo roba el cinturón venciendo a su dueño: una victoria sobre otro no basta', () => {
  const resultado = calcular([t('regla', [[p(A, B)], [p(C, D)], [p(A, C)], [p(B, A)]])]);
  assert.equal(resultado.cinturon.campeonId, B);
  assert.deepEqual(resultado.cinturon.conquistas.map(e => e.campeonId), [A, B]);
});
test('El orden usa inicio real y ronda, nunca creación ni el orden de los registros', () => {
  const viejo = t('viejo', [[p(A, B)]], '2026-06-01T15:00:00Z', { creadoEn: '2026-10-01T15:00:00Z' });
  const nuevo = t('nuevo', [[p(B, A)]], '2026-06-02T15:00:00Z', { creadoEn: '2020-01-01T15:00:00Z' });
  assert.equal(calcular([nuevo, viejo]).cinturon.campeonId, B);
  const rondas = t('rondas', [[p(A, B)], [p(B, A)]]); rondas.rondas.reverse();
  assert.equal(calcular([rondas]).cinturon.campeonId, B);
});
test('Dos primeros duelos decisivos en la misma ronda no se desempatan por número de mesa', () => {
  const inicio = t('dos', [[p(A, B, '1-0', 1), p(C, D, '1-0', 2)]]);
  const res = calcular([inicio]); assert.equal(res.cinturon.campeonId, null); assert.equal(res.cinturon.pendiente, true);
  inicio.rondas[0].emparejamientos.reverse();
  const invertido = calcular([inicio]).cinturon;
  assert.equal(invertido.campeonId, res.cinturon.campeonId);
  assert.equal(invertido.pendiente, res.cinturon.pendiente);
  assert.deepEqual(invertido.conquistas, res.cinturon.conquistas);
  inicio.rondas.push({ numero: 2, emparejamientos: [p(A, C)] });
  const despues = calcular([inicio]); assert.equal(despues.cinturon.campeonId, A);
  assert.equal(despues.cinturon.pasos.at(-1).tipo, 'recuperado'); assert.equal(despues.cinturon.conquistas.length, 0);
});
test('El tramo histórico con Juan Diego jugando dos veces en una ronda permanece incierto hasta la confluencia', () => {
  const antes = t('agosto2025', [[p(A, D)]], '2025-08-15T12:00:00Z');
  const mayo = t('mayo12', [[p(D, B, '0-1'), p(D, A, '1-0', 2)], [p(B, A, '0-1')]], '2026-05-12T12:00:00Z');
  const junio2 = t('junio2', [[p(D, B)], [p(A, B, '0-1')], [p(D, A, '0-1')]], '2026-06-02T12:00:00Z');
  const tramo = calcular([antes, mayo, junio2]);
  assert.equal(tramo.cinturon.pendiente, true); assert.equal(tramo.cinturon.campeonId, null);
  assert.deepEqual(tramo.cinturon.conquistas.map(e => e.campeonId), [A]);
  const despues = calcular([antes, mayo, junio2, t('junio9', [[p(B, A)]], '2026-06-09T12:00:00Z')]);
  assert.equal(despues.cinturon.pendiente, false); assert.equal(despues.cinturon.campeonId, B);
  assert.equal(despues.cinturon.pasos.at(-1).tipo, 'recuperado');
  assert.equal(despues.duelos.length, 8); // Las partidas se conservan en la tabla aunque falte su orden.
});
test('No se adjudican byes, resultados pendientes, IDs de invitados desconocidos ni torneos armados', () => {
  const juegos = [p(A, null), p(A, B, null, 2), p(A, A, '1-0', 3), p(A, 'invitado', '1-0', 4), p(A, B, 'adjudicado', 5), p(A, B, '1-0', 6)];
  const resultado = calcular([t('valido', [juegos]), t('no-iniciado', [[p(B, A)]], '2026-06-02T15:00:00Z', { estado: 'armado' })]);
  assert.equal(resultado.duelos.length, 1); assert.equal(resultado.cinturon.campeonId, A);
  assert.equal(resultado.filas.find(f => f.jugadorId === A).puntos, 1);
});
test('Un resultado contra un jugador ausente de la nómina del torneo no se cuenta', () => {
  assert.equal(calcular([t('nomina', [[p(A, B)]], '2026-06-01T15:00:00Z', { jugadoresIds: [A] })]).duelos.length, 0);
});
test('Un duelo sin inicio tiene puntos pero no se coloca en la cronología usando created_at', () => {
  const resultado = calcular([t('sin-fecha', [[p(A, B)]], null)]);
  assert.equal(resultado.filas.find(f => f.jugadorId === A).puntos, 1);
  assert.equal(resultado.cinturon.campeonId, null); assert.equal(resultado.cinturon.pendiente, true);
  assert.equal(resultado.cinturon.sinFecha.length, 1); assert.equal(resultado.cinturon.conquistas.length, 0);
});
test('Los horarios de inicio distintos no resuelven el orden entre dos torneos del mismo día', () => {
  const resultado = calcular([t('temprano', [[p(A, B)]], '2026-06-01T15:00:00Z'), t('tarde', [[p(C, D)]], '2026-06-01T19:00:00Z')]);
  assert.equal(resultado.cinturon.pendiente, true); assert.equal(resultado.cinturon.conquistas.length, 0);
});
test('Los duelos de torneos del mismo día respetan rondas internas al probar intercalaciones', () => {
  const resultado = calcular([t('torneo1', [[p(A, B)], [p(B, A)]], '2026-06-01T15:00:00Z'), t('torneo2', [[p(C, D, '1/2-1/2')]], '2026-06-01T19:00:00Z')]);
  assert.equal(resultado.cinturon.campeonId, B); assert.equal(resultado.cinturon.pendiente, false);
});
test('Dos torneos del mismo día con sólo tablas dejan el cinturón vacante sin crear un campeón', () => {
  const resultado = calcular([t('tablas1', [[p(A, B, '1/2-1/2')]], '2026-06-01T15:00:00Z'), t('tablas2', [[p(C, D, '1/2-1/2')]], '2026-06-01T19:00:00Z')]);
  assert.equal(resultado.cinturon.campeonId, null); assert.equal(resultado.cinturon.pendiente, false);
  assert.deepEqual(resultado.cinturon.pasos, []);
});
test('El ganador del torneo o una final sin partidas registradas no se usa como resultado de un duelo', () => {
  const resultado = calcular([t('final', [[p(A, B, '1/2-1/2')]], '2026-06-01T15:00:00Z', { finalDesempate: { jugadorIds: [A, B], ganadorId: B } })]);
  assert.equal(resultado.duelos.length, 1); assert.equal(resultado.cinturon.campeonId, null);
});
test('La posición compartida usa puntos; los ceros sin jugar no muestran un rendimiento inventado', () => {
  const resultado = calcular([t('tablas', [[p(A, B, '1/2-1/2')]])]);
  assert.deepEqual(resultado.filas.filter(f => f.puntos === .5).map(f => f.posicion), [1, 1]);
  assert.equal(resultado.filas.find(f => f.jugadorId === C).rendimiento, null);
  assert.equal(resultado.cruces.find(f => f.aId === A && f.bId === B).tablas, 1);
});
test('Recalcular no modifica las rondas: corregir un resultado actualiza tabla y cinturón', () => {
  const torneo = t('editable', [[p(A, B)]]), original = structuredClone(torneo);
  calcular([torneo]); assert.deepEqual(torneo, original);
  torneo.rondas[0].emparejamientos[0].resultado = '0-1';
  const actualizado = calcular([torneo]); assert.equal(actualizado.cinturon.campeonId, B);
  assert.equal(actualizado.filas.find(f => f.jugadorId === B).puntos, 1);
});
