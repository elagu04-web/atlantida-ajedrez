const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript');
const Module=require('node:module');
const archivo=require.resolve('../lib/identidadJugador.ts');
const modulo=new Module(archivo,module);
modulo._compile(ts.transpileModule(fs.readFileSync(archivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,archivo);
const {identidadJugador,claveIntentoDesafio}=modulo.exports;
const jugadores=[{id:'ana',email:'ana@example.test',nombre:'Ana',apodo:'Nana'},{id:'bruno',email:'bruno@example.test',nombre:'Bruno',apodo:null},{id:'libre',email:null,nombre:'Ana',apodo:'Nana'}];

test('La cuenta selecciona el jugador vinculado, aunque los nombres se repitan',()=>{
  assert.equal(identidadJugador(jugadores,'ana@example.test').jugador.id,'ana');
  assert.equal(identidadJugador(jugadores,'bruno@example.test').jugador.id,'bruno');
});
test('Una cuenta sin vínculo o una sesión anónima nunca toma un jugador ajeno',()=>{
  for(const cuenta of [null,undefined,'','otra@example.test'])assert.deepEqual(identidadJugador(jugadores,cuenta),{jugador:undefined,ambigua:false});
});
test('Correos con mayúsculas o espacios conservan la misma identidad',()=>{
  assert.equal(identidadJugador(jugadores,' ANA@EXAMPLE.TEST ').jugador.id,'ana');
});
test('Vínculos duplicados bloquean la elección arbitraria de la primera persona',()=>{
  assert.deepEqual(identidadJugador([...jugadores,{...jugadores[0],id:'otra-ana'}],'ana@example.test'),{jugador:undefined,ambigua:true});
});
test('Cambiar de cuenta, entrar o salir reinicia el intento; renovar la sesión no lo cambia',()=>{
  const clave=claveIntentoDesafio('ana','2026-10-08','AjCOu');
  assert.equal(clave,claveIntentoDesafio('ana','2026-10-08','AjCOu'));
  for(const cuenta of [undefined,'bruno'])assert.notEqual(clave,claveIntentoDesafio(cuenta,'2026-10-08','AjCOu'));
  assert.notEqual(clave,claveIntentoDesafio('ana','2026-10-09','AjCOu'));
});
