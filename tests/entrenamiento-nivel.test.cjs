const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const{Chess}=require('chess.js');
const{BANCO_ENTRENAMIENTO,progresoGuiadoInicial,iniciarNivel,nivelTactico,prepararSesionGuiada,registrarResultadoGuiado,leerProgresoGuiado,combinarProgresoGuiado,pasoTactico,ejercicioGuiado}=require('../lib/entrenamientoGuiado.ts');
const ahora=new Date('2026-10-14T15:00:00Z');
test('608 problemas reales cubren todas las franjas y exigen una variante legal completa',()=>{
 const reales=BANCO_ENTRENAMIENTO.filter(e=>e.fuente==='lichess');assert.equal(reales.length,608);
 for(let n=800;n<2700;n+=100)assert.equal(reales.filter(e=>e.rating>=n&&e.rating<n+100).length,32);
 for(const e of reales){const c=new Chess(e.fen);assert.ok(!c.isGameOver());let movs=[];while(movs.length<e.solucion.length){const paso=pasoTactico(e,movs,e.solucion[movs.length]);assert.equal(paso.acierto,true,e.id);assert.ok(paso.movimientos.length>movs.length);movs=paso.movimientos;if(paso.terminada)break;}
  const p=prepararSesionGuiada(iniciarNivel(progresoGuiadoInicial(),e.rating,'usuario',ahora),ahora);p.ejercicios[e.id]={razonamiento:{...require('../lib/entrenamientoGuiado.ts').razonamientoInicial(),movimientos:movs},razonamientoActualizada:ahora.toISOString()};assert.equal(leerProgresoGuiado(JSON.stringify(p)).ejercicios[e.id].razonamiento.movimientos.length,movs.length);
 }
});
test('Elo del club determina el inicio sin borrar notas ni obligar a continuar la demostración',()=>{
 let p=prepararSesionGuiada(progresoGuiadoInicial(),ahora);p.ejercicios['t-01'].nota='Mi nota';p.ejercicios['t-01'].notaActualizada=ahora.toISOString();
 p=iniciarNivel(p,2020,'jugador-1',ahora);assert.equal(nivelTactico(p),2020);assert.equal(p.ejercicios['t-01'].nota,'Mi nota');assert.equal(p.sesionEnCurso,null);
 p=prepararSesionGuiada(p,ahora);assert.ok(p.sesionEnCurso.items.every(id=>ejercicioGuiado(id).fuente==='lichess'&&Math.abs(ejercicioGuiado(id).rating-2020)<50));
 assert.equal(iniciarNivel(p,1500,'jugador-1',new Date('2026-11-01T15:00:00Z')).nivelInicial.elo,2020);
});
test('Primer resultado adapta la dificultad; pistas, reintentos y repasos no aumentan el nivel',()=>{
 let p=iniciarNivel(progresoGuiadoInicial(),1800,'j',ahora);const e=BANCO_ENTRENAMIENTO.find(e=>e.rating>=1790&&e.rating<=1810);
 const bien=registrarResultadoGuiado(p,e.id,true,false,ahora),mal=registrarResultadoGuiado(p,e.id,false,false,ahora);
 assert.ok(nivelTactico(bien)>1800);assert.ok(nivelTactico(mal)<1800);
 const reintento=registrarResultadoGuiado(mal,e.id,true,false,new Date('2026-10-15T15:00:00Z'));assert.equal(nivelTactico(reintento),nivelTactico(mal));
 const ayuda=registrarResultadoGuiado(p,e.id,false,true,ahora);assert.ok(nivelTactico(ayuda)<1800);assert.equal(nivelTactico(registrarResultadoGuiado(ayuda,e.id,true,true,ahora)),nivelTactico(ayuda));
});
test('Cuenta nueva y dos dispositivos conservan origen y cada primer resultado una sola vez',()=>{
 let a=iniciarNivel(progresoGuiadoInicial(),2000,'j',ahora);const id=prepararSesionGuiada(a,ahora).sesionEnCurso.items[0];a=registrarResultadoGuiado(a,id,false,false,ahora);
 let b=iniciarNivel(progresoGuiadoInicial(),1800,'j',new Date('2026-10-15T15:00:00Z'));b=registrarResultadoGuiado(b,id,true,false,new Date('2026-10-15T15:00:00Z'));
 const m=combinarProgresoGuiado(a,b);assert.equal(m.nivelInicial.elo,2000);assert.equal(m.ejercicios[id].primerResultado.acierto,false);assert.deepEqual(m,combinarProgresoGuiado(b,a));assert.deepEqual(m,combinarProgresoGuiado(m,progresoGuiadoInicial()));assert.equal(nivelTactico(leerProgresoGuiado(JSON.stringify(m))),nivelTactico(m));
});
test('Una respuesta intermedia correcta todavía no termina un problema de varios pasos',()=>{
 const e=BANCO_ENTRENAMIENTO.find(e=>e.fuente==='lichess'&&e.solucion.length>=3);const s=pasoTactico(e,[],e.solucion[0]);assert.equal(s.terminada,false);assert.equal(s.movimientos.length,2);assert.equal(s.acierto,true);
});
