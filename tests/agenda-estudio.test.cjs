const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, f);
const { proximoEstudio, calendarioEstudio } = require('../lib/agendaClub.ts');
const { leerRecorridoPgn, ESTUDIO_HIPOPOTAMO } = require('../lib/recorridoPgn.ts');
const { Chess } = require('chess.js');

test('El encuentro es el jueves a las 18:30 en Uruguay y pasa al siguiente después de esa hora', () => {
  assert.equal(proximoEstudio(new Date('2026-10-12T23:00:00Z')).toISOString(), '2026-10-15T21:30:00.000Z');
  assert.equal(proximoEstudio(new Date('2026-10-15T21:29:59Z')).toISOString(), '2026-10-15T21:30:00.000Z');
  assert.equal(proximoEstudio(new Date('2026-10-15T21:30:00Z')).toISOString(), '2026-10-22T21:30:00.000Z');
});
test('El cambio de día en UTC y el cambio de año no adelantan ni pierden la reunión', () => {
  assert.equal(proximoEstudio(new Date('2026-10-16T01:00:00Z')).toISOString(), '2026-10-22T21:30:00.000Z');
  assert.equal(proximoEstudio(new Date('2026-12-31T22:00:00Z')).toISOString(), '2027-01-07T21:30:00.000Z');
});
test('El calendario es semanal, tiene identificador estable y líneas UTF-8 válidas para importar', () => {
  const primero = calendarioEstudio(new Date('2026-10-12T12:00:00Z'));
  const segundo = calendarioEstudio(new Date('2026-10-19T12:00:00Z'));
  assert.match(primero, /DTSTART:20261015T213000Z\r\n/);
  assert.match(primero, /RRULE:FREQ=WEEKLY;BYDAY=TH/);
  assert.equal(primero.match(/UID:[^\r]+/)[0], segundo.match(/UID:[^\r]+/)[0]);
  assert.ok(primero.endsWith('END:VCALENDAR\r\n'));
  for (const linea of primero.split('\r\n')) assert.ok(Buffer.byteLength(linea, 'utf8') <= 75);
  const texto = primero.replace(/\r\n /g, '');
  assert.match(texto, /18:30 \(hora de Uruguay\)/);
});
test('El recorrido conserva enroque, capturas y la posición previa exacta a cada jugada', () => {
  const r = leerRecorridoPgn('1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. O-O Nxe4 *');
  assert.equal(r.posiciones.length, r.jugadas.length + 1);
  const enroque = new Chess(r.posiciones[7]);
  assert.equal(enroque.get('g1').type, 'k'); assert.equal(enroque.get('f1').type, 'r');
  assert.equal(new Chess(r.posiciones[8]).get('e4').color, 'b');
  assert.equal(r.jugadas[2].texto, '2. Cf3');
  assert.equal(ESTUDIO_HIPOPOTAMO.jugadas.length, 16);
});
test('Un PGN iniciado desde FEN con turno negro mantiene el número y la orientación de la secuencia', () => {
  const r = leerRecorridoPgn('[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1"]\n\n1... c5 2. Nf3 *');
  assert.equal(r.posiciones[0].split(' ')[1], 'b');
  assert.equal(r.jugadas[0].texto, '1… c5');
  assert.equal(new Chess(r.posiciones[2]).get('f3').type, 'n');
});
test('PGN vacío, sin jugadas, ilegal o demasiado grande no reemplaza el tablero', () => {
  for (const pgn of ['', '[White "Jugador"]\n\n*', '1. e4 e5 2. Ke4 *', ' '.repeat(200001)]) assert.throws(() => leerRecorridoPgn(pgn));
});
