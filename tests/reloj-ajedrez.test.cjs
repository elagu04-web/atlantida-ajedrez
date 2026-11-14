const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {crearReloj,arrancarReloj,pulsarReloj,pausarReloj,comprobarTiempo,tiemposReloj,formatearTiempo,guardarEstadoReloj,recuperarReloj}=require('../lib/relojAjedrez.ts');
test('empiezan las blancas y sólo se descuenta su tiempo',()=>{
 const r=arrancarReloj(crearReloj({segundos:300,incremento:3}),1000);
 assert.equal(r.turno,0);assert.deepEqual(tiemposReloj(r,6500),[294500,300000]);
});
test('el incremento se aplica una sola vez al completar cada turno',()=>{
 const r=arrancarReloj(crearReloj({segundos:300,incremento:3}),1000);
 const n=pulsarReloj(r,0,6000);assert.deepEqual(n.tiempos,[298000,300000]);assert.deepEqual(n.jugadas,[1,0]);
 assert.equal(pulsarReloj(n,0,6001),n);
 const b=pulsarReloj(n,1,8000);assert.deepEqual(b.tiempos,[298000,301000]);assert.deepEqual(b.jugadas,[1,1]);
});
test('tocar al jugador inactivo no cambia de turno ni regala incremento',()=>{
 const r=arrancarReloj(crearReloj(),1000);assert.equal(pulsarReloj(r,1,2000),r);
});
test('pausar y reanudar no cobran la pausa ni añaden incremento',()=>{
 const r=pausarReloj(arrancarReloj(crearReloj(),1000),3500);
 assert.deepEqual(r.tiempos,[297500,300000]);assert.equal(r.estado,'pausado');
 assert.deepEqual(tiemposReloj(r,100000),r.tiempos);
 const n=arrancarReloj(r,100000);assert.deepEqual(tiemposReloj(n,101000),[296500,300000]);
 assert.equal(pulsarReloj(r,0,100000),r);
});
test('al llegar a cero se detienen ambos; pulsar tarde no revive el reloj',()=>{
 const r=arrancarReloj(crearReloj({segundos:1,incremento:60}),1000);
 for(const ahora of [2000,5000]){const n=pulsarReloj(r,0,ahora);assert.equal(n.estado,'terminado');assert.equal(n.caido,0);assert.deepEqual(n.tiempos,[0,1000]);assert.deepEqual(n.jugadas,[0,0]);}
 assert.equal(comprobarTiempo(r,2000).estado,'terminado');
});
test('los intervalos demorados o una pestaña oculta no retrasan la caída',()=>{
 const r=arrancarReloj(crearReloj({segundos:10,incremento:0}),1000);
 assert.deepEqual(tiemposReloj(r,9900),[1100,10000]);assert.equal(comprobarTiempo(r,21000).estado,'terminado');
 assert.deepEqual(tiemposReloj(r,500),[10000,10000]);
});
test('recupera lo guardado en pausa y conserva turnos e incremento',()=>{
 const r=pulsarReloj(arrancarReloj(crearReloj(),1000),0,6000);
 const n=recuperarReloj(guardarEstadoReloj(r),7500);assert.equal(n.estado,'pausado');assert.equal(n.turno,1);assert.deepEqual(n.tiempos,[298000,298500]);assert.deepEqual(n.jugadas,[1,0]);
 const vencido=recuperarReloj(guardarEstadoReloj(r),999999);assert.equal(vencido.estado,'terminado');assert.equal(vencido.caido,1);
});
test('rechaza datos guardados dañados y configuraciones inválidas',()=>{
 for(const valor of [null,'{','{}','null',JSON.stringify({version:1,reloj:{}})])assert.equal(recuperarReloj(valor,1000),null);
 for(const configuracion of [{segundos:0,incremento:0},{segundos:10,incremento:-1},{segundos:10801,incremento:3},{segundos:5,incremento:NaN}])assert.throws(()=>crearReloj(configuracion),RangeError);
 const r=arrancarReloj(crearReloj(),1000);r.tiempos[0]=-1;assert.equal(recuperarReloj(guardarEstadoReloj(r),2000),null);
});
test('muestra minutos, horas y décimas sin números negativos',()=>{
 for(const [ms,texto] of [[300000,'5:00'],[60001,'1:01'],[10000,'0:10'],[9900,'0:09.9'],[1,'0:00.1'],[0,'0:00'],[-1,'0:00'],[3600000,'1:00:00']])assert.equal(formatearTiempo(ms),texto);
});
