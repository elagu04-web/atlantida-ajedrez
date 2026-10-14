const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const{Chess}=require('chess.js');
const{BANCO_ENTRENAMIENTO,iniciarNivel,progresoGuiadoInicial,prepararSesionGuiada,registrarResultadoGuiado,nivelEntrenamiento,puntuarCandidatas,puntuarEvaluacion,toleranciaNivel,combinarProgresoGuiado,leerProgresoGuiado}=require('../lib/entrenamientoGuiado.ts');
const fecha=new Date('2026-10-14T15:00:00Z');const a=cp=>({evaluacionCentipawns:cp,mateEn:null,mejorJugada:'e2e4',variantePrincipal:['e2e4'],profundidad:20});
test('Las 147 decisiones reales son legales, tienen referencia numérica y variantes verificables',()=>{
 const banco=BANCO_ENTRENAMIENTO.filter(e=>e.fuente==='partida');assert.equal(banco.filter(e=>e.actividad==='candidatas').length,45);assert.equal(banco.filter(e=>e.actividad==='evaluacion').length,102);
 for(const e of banco){const c=new Chess(e.fen);assert.ok(c.moveNumber()>=10&&!c.isGameOver()&&!c.isCheck());assert.ok(e.referencia.profundidad>=18);assert.equal(e.referencia.mateEn,null);assert.ok(Number.isFinite(e.referencia.evaluacionCentipawns));for(const u of e.referencia.variantePrincipal)c.move({from:u.slice(0,2),to:u.slice(2,4),promotion:u[4]});}
});
test('Candidatas corrige la elección final y permite descartar una alternativa inferior',()=>{
 assert.equal(puntuarCandidatas(a(100),[a(90),a(-180)],[a(90),a(-180)],'w','1',2000).acierto,true);
 assert.equal(puntuarCandidatas(a(100),[a(90),a(-180)],[a(90),a(-180)],'w','2',2000).acierto,false);
 assert.equal(puntuarCandidatas(a(-100),[a(-90),a(180)],[a(-90),a(180)],'b','1',2000).acierto,true);
 assert.equal(puntuarCandidatas(a(100),[a(90),a(-180)],[a(300),a(-180)],'w','1',2000).acierto,false);
 assert.ok(puntuarCandidatas(a(null),[a(90),a(-180)],[a(90),a(-180)],'w','1',2000).error);
});
test('La exigencia numérica se adapta al nivel y respeta el lado de la ventaja',()=>{
 assert.ok(toleranciaNivel(2000,'evaluacion')<toleranciaNivel(1200,'evaluacion'));
 assert.equal(puntuarEvaluacion('2','b',a(-200),toleranciaNivel(2000,'evaluacion')).acertado,true);
 assert.equal(puntuarEvaluacion('2','w',a(-200),toleranciaNivel(2000,'evaluacion')).acertado,false);
});
test('Cada modalidad parte del Elo propio, conserva el progreso y cambia de nivel por separado',()=>{
 let p=iniciarNivel(progresoGuiadoInicial(),2000,'jugador',fecha);
 for(const modo of ['candidatas','evaluacion']){const s=prepararSesionGuiada({...p,actividad:modo,sesionEnCurso:null},fecha);assert.ok(s.sesionEnCurso.items.every(id=>{const e=BANCO_ENTRENAMIENTO.find(e=>e.id===id);return e.fuente==='partida'&&e.actividad===modo&&Math.abs(e.rating-2000)<=100;}));}
 const e=BANCO_ENTRENAMIENTO.find(e=>e.actividad==='evaluacion'&&e.rating===2000);p=registrarResultadoGuiado(p,e.id,true,false,fecha);
 assert.ok(nivelEntrenamiento(p,'evaluacion')>2000);assert.equal(nivelEntrenamiento(p,'candidatas'),2000);assert.equal(nivelEntrenamiento(p,'tactica'),2000);
 const restaurado=combinarProgresoGuiado(leerProgresoGuiado(JSON.stringify(p)),progresoGuiadoInicial());assert.equal(nivelEntrenamiento(restaurado,'evaluacion'),nivelEntrenamiento(p,'evaluacion'));
});
test('Una sesión antigua básica se reemplaza al empezar sin borrar notas o aciertos',()=>{
 let p={...progresoGuiadoInicial(),actividad:'evaluacion'};p=prepararSesionGuiada(p,fecha);p=registrarResultadoGuiado(p,'e-01',true,false,fecha);p.ejercicios['e-01'].nota='Mi evaluación';p.ejercicios['e-01'].notaActualizada=fecha.toISOString();p=iniciarNivel(p,1900,'j',fecha);p=prepararSesionGuiada(p,fecha);
 assert.ok(p.sesionEnCurso.items.every(id=>id.startsWith('ev-real-')));assert.equal(p.ejercicios['e-01'].nota,'Mi evaluación');assert.equal(p.ejercicios['e-01'].practica.aciertos,1);
});
