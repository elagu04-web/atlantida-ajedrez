const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {TEMAS_TACTICOS,GRUPOS_TACTICOS,sugerirTemas,revisarTemas}=require('../lib/temasTacticos.ts');
const {BANCO_ENTRENAMIENTO,razonamientoInicial,progresoGuiadoInicial,leerProgresoGuiado,combinarProgresoGuiado}=require('../lib/entrenamientoGuiado.ts');

test('Catálogo completo y navegable: cada concepto tiene una definición y familia, sin fases disfrazadas de motivos',()=>{
 assert.equal(TEMAS_TACTICOS.length,55);assert.equal(new Set(TEMAS_TACTICOS.map(t=>t.id)).size,55);
 for(const t of TEMAS_TACTICOS){assert.ok(t.definicion.length>50,t.id);assert.ok(GRUPOS_TACTICOS.some(g=>g.id===t.grupo));}
 const navegados=GRUPOS_TACTICOS.flatMap(g=>sugerirTemas('',{grupo:g.id,limite:60}));assert.equal(new Set(navegados.map(t=>t.id)).size,55);
 for(const id of ['opening','middlegame','crushing','short'])assert.ok(!TEMAS_TACTICOS.some(t=>t.id===id));
});
test('Busca sinónimos, varias palabras, acentos y errores pequeños sin confundir enfilada con rayos X',()=>{
 for(const [texto,id] of [['defensa','defensiveMove'],['rayos x','xRayAttack'],['enfilada','skewer'],['sobrecarga','overload'],['desviación','deflection'],['ataque a la descubierta','discoveredAttack'],['eliminacion del defensor','capturingDefender'],['intermeda','intermezzo'],['horquilla','fork'],['mate del pasillo','backRankMate']])assert.equal(sugerirTemas(texto)[0]?.id,id,texto);
 assert.ok(!sugerirTemas('rayos x').some(t=>t.id==='skewer'));assert.equal(sugerirTemas('nadaquever').length,0);
 assert.ok(!sugerirTemas('mate',{excluir:['mate'],limite:60}).some(t=>t.id==='mate'));
 assert.ok(sugerirTemas('',{grupo:'peones',limite:60}).every(t=>t.grupo==='peones'));
});
test('No aprueba toda una selección porque una etiqueta coincida',()=>{
 const r=revisarTemas(['fork','pin','skewer'],['fork']);assert.deepEqual(r.map(t=>t.estado),['confirmada','sinConfirmar','sinConfirmar']);
 assert.equal(revisarTemas(['fork','fork'],['fork']).length,1);assert.equal(revisarTemas(['inexistente'],['fork']).length,0);
});
test('Reconoce un concepto general sin inventar motivos específicos ni convertir parentescos en equivalencias',()=>{
 assert.equal(revisarTemas(['mate'],['backRankMate'])[0].estado,'general');
 assert.equal(revisarTemas(['backRankMate'],['mate'])[0].estado,'sinConfirmar');
 assert.equal(revisarTemas(['discoveredAttack'],['discoveredCheck'])[0].estado,'general');
 assert.equal(revisarTemas(['discoveredCheck'],['discoveredAttack'])[0].estado,'sinConfirmar');
 assert.equal(revisarTemas(['promotion'],['underPromotion'])[0].estado,'general');
 assert.equal(revisarTemas(['overload'],['deflection'])[0].estado,'relacionada');
 assert.equal(revisarTemas(['skewer'],['xRayAttack'])[0].estado,'sinConfirmar');
});
test('Recupera motivos originales omitidos y conserva anotaciones válidas para cada problema real',()=>{
 for(const [id,temas] of [['li-00xxi',['advancedPawn','quietMove']],['li-01LlS',['clearance','kingsideAttack']],['li-024nn',['xRayAttack']],['li-00iWt',['mateIn4']]]){
  const e=BANCO_ENTRENAMIENTO.find(e=>e.id===id);for(const tema of temas)assert.ok(e.temas.includes(tema),id+': '+tema);
 }
 for(const e of BANCO_ENTRENAMIENTO.filter(e=>e.fuente==='lichess')){assert.ok(e.temas.length>0);for(const id of e.temas)assert.ok(TEMAS_TACTICOS.some(t=>t.id===id),id);assert.match(e.origen,/^https:\/\/lichess\.org\/[A-Za-z0-9]{8}/);}
});
test('Las hipótesis nuevas y antiguas sobreviven al guardado y al merge sin convertirse en resultados de jugadas',()=>{
 const p=progresoGuiadoInicial(),id='li-00xxi',fecha='2026-10-16T15:00:00.000Z';
 p.ejercicios[id]={razonamiento:{...razonamientoInicial(),temas:['quietMove','advancedPawn','overload'],etapa:'resolver'},razonamientoActualizada:fecha};
 const recargado=leerProgresoGuiado(JSON.stringify(p));assert.deepEqual(recargado.ejercicios[id].razonamiento.temas,['quietMove','advancedPawn','overload']);
 assert.equal(recargado.ejercicios[id].practica,undefined);assert.equal(recargado.ejercicios[id].primerResultado,undefined);
 const unido=combinarProgresoGuiado(recargado,progresoGuiadoInicial());assert.deepEqual(unido.ejercicios[id],recargado.ejercicios[id]);
 p.ejercicios[id].razonamiento.temas=['hangingPiece'];assert.deepEqual(leerProgresoGuiado(JSON.stringify(p)).ejercicios[id].razonamiento.temas,['hangingPiece']);
});
