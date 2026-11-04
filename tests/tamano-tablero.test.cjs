const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const codigo=ts.transpileModule(fs.readFileSync(require.resolve('../lib/tamanoTablero.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const m={exports:{}};new Function('exports','module',codigo)(m.exports,m);const {dimensionesTablero,leerTamanoTablero}=m.exports;
test('Auto conserva el tablero completo en portátiles bajos y al aumentar el zoom',()=>{
 for(const [ancho,alto,cabecera] of [[650,768,150],[420,540,130],[320,640,100]]){const d=dimensionesTablero(ancho,alto,cabecera,220,{modo:'auto'});assert.ok(d.lado<=ancho);assert.ok(d.lado+cabecera+220<=alto);}
});
test('Tamaño manual se limita al ancho real sin perder la preferencia original',()=>{const p={modo:'manual',lado:700};assert.equal(dimensionesTablero(300,650,100,220,p).lado,300);assert.equal(dimensionesTablero(800,900,100,220,p).lado,700);assert.deepEqual(p,{modo:'manual',lado:700});});
test('Preferencias inválidas y espacios estrechos nunca generan tamaños negativos o desbordes',()=>{for(const p of [null,'{"modo":"manual","lado":"700"}','corrupto'])assert.deepEqual(leerTamanoTablero(p),{modo:'auto'});assert.equal(leerTamanoTablero('{"modo":"manual","lado":9000}').lado,1000);assert.equal(dimensionesTablero(90,300,100,220,{modo:'auto'}).lado,90);});
