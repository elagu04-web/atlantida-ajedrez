const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const{Chess}=require('chess.js');
const{BANCO_ENTRENAMIENTO,TEMAS_TACTICOS,progresoGuiadoInicial,leerProgresoGuiado,combinarProgresoGuiado,prepararSesionGuiada,registrarResultadoGuiado,razonamientoInicial,interpretarJugada,validarCandidatas,puntuarEvaluacion,sugerirTemas}=require('../lib/entrenamientoGuiado.ts');
const{registrarPractica,normalizarPractica,ayudaEnDia}=require('../lib/entrenamientoPersonal.ts');
const dia1=new Date('2026-10-14T15:00:00Z'),dia2=new Date('2026-10-15T15:00:00Z');
test('Banco original:12FENlegales,6tácticosverificables ysoluciones noilegales',()=>{
 assert.equal(BANCO_ENTRENAMIENTO.length,12);assert.equal(new Set(BANCO_ENTRENAMIENTO.map(e=>e.id)).size,12);
 assert.deepEqual(['tactica','candidatas','evaluacion'].map(a=>BANCO_ENTRENAMIENTO.filter(e=>e.actividad===a).length),[6,3,3]);
 for(const e of BANCO_ENTRENAMIENTO){const c=new Chess(e.fen);assert.ok(!c.isGameOver());assert.ok(!c.isCheck());for(const m of e.solucion){const legal=interpretarJugada(c.fen(),m);assert.ok(legal,e.id);c.load(legal.fen);}if(e.temas.includes('mateIn1'))assert.ok(c.isCheckmate(),e.id);for(const t of e.temas)assert.ok(TEMAS_TACTICOS.some(x=>x.id===t));}
 const primer=new Chess(BANCO_ENTRENAMIENTO[0].fen);const sol=interpretarJugada(primer.fen(),'d1d5');assert.equal(sol.san,'Rxd5');
});
test('Autocompletebusca españolconacentosy aliascompatiblesLichess',()=>{assert.ok(sugerirTemas('coronacion').some(x=>x.id==='promotion'));assert.ok(sugerirTemas('doble').some(x=>x.id==='fork'));assert.ok(sugerirTemas('clavá').some(x=>x.id==='pin'));assert.ok(sugerirTemas('pieza colgada').some(x=>x.id==='hangingPiece'));assert.ok(sugerirTemas('').length<=8);assert.equal(sugerirTemas('zzzz').length,0);});
test('CandidatasenSANespañol/UCIy respuestas legalessinduplicados',()=>{
 const f=new Chess().fen();assert.equal(interpretarJugada(f,'Cf3').uci,'g1f3');assert.equal(interpretarJugada(f,'g1f3').san,'Nf3');assert.equal(interpretarJugada(f,'1. e4').uci,'e2e4');
 assert.ok(validarCandidatas(f,'Cf3','g1f3','e5','e5').error);assert.ok(validarCandidatas(f,'e4','d4','e9','d5').error);assert.ok(validarCandidatas(f,'e5','d4','e5','d5').error);
 const x=validarCandidatas(f,'e4','d4','e5','d5');assert.equal(x.primera.san,'e4');assert.equal(x.respuesta2.san,'d5');
 const promo=BANCO_ENTRENAMIENTO.find(e=>e.id==='t-05');assert.equal(interpretarJugada(promo.fen,'a8=D').uci,'a7a8q');
});
test('Evaluaciónusa referenciaStockfishnormalizada; signo y margen explicito',()=>{
 const a={evaluacionCentipawns:-125,mateEn:null,profundidad:18};assert.equal(puntuarEvaluacion('1,5','b',a,.75).acertado,true);assert.equal(puntuarEvaluacion('1.5','w',a,.75).acertado,false);assert.equal(puntuarEvaluacion('2.1','b',a,.75).acertado,false);
 assert.ok(puntuarEvaluacion('','w',a).error);assert.ok(puntuarEvaluacion('-1','b',a).error);assert.ok(puntuarEvaluacion('1','=','a').error);assert.ok(puntuarEvaluacion('0','=',{...a,mateEn:3,evaluacionCentipawns:null}).error);
});
test('Sesiónlimitada priorizarepasos, comienzafácil y noreseteaunasesión empezada',()=>{
 let p=prepararSesionGuiada(progresoGuiadoInicial(),dia1);assert.deepEqual(p.sesionEnCurso.items,['t-01','t-02']);assert.strictEqual(prepararSesionGuiada(p,dia2),p);
 const x={...p,sesionEnCurso:null,ejercicios:{}};for(let i=0;i<6;i++)x.ejercicios['t-0'+(i+1)]={practica:registrarPractica(undefined,true,false,new Date('2026-10-12T15:00:00Z')),actualizada:'2026-10-12T15:00:00.000Z'};
 const s=prepararSesionGuiada(x,dia1);assert.equal(s.sesionEnCurso.items.length,5);
 const cerrado={...p,sesionEnCurso:{...p.sesionEnCurso,terminada:true}};assert.strictEqual(prepararSesionGuiada(cerrado,dia1),cerrado);
});
test('Error/pistaquedapegadoaldía inclusoJSON/reload yfallonoaceleralosintervalos',()=>{
 let p=registrarResultadoGuiado(progresoGuiadoInicial(),'t-01',false,false,dia1);p=leerProgresoGuiado(JSON.stringify(p));p=registrarResultadoGuiado(p,'t-01',true,false,dia1);assert.equal(p.ejercicios['t-01'].practica.aciertos,0);assert.equal(p.ejercicios['t-01'].practica.proxima,'2026-10-15');
 p=registrarResultadoGuiado(p,'t-01',true,false,dia2);assert.equal(p.ejercicios['t-01'].practica.etapa,1);assert.equal(p.ejercicios['t-01'].practica.proxima,'2026-10-16');
 const legacy={aciertos:5,fallos:1,ayudado:true,ultimoDia:'2026-10-14',proxima:'2026-10-15'};assert.equal(normalizarPractica(legacy).etapa,0);assert.equal(ayudaEnDia(legacy,dia1),true);assert.equal(registrarPractica(legacy,true,false,dia2).etapa,1);
});
test('Mergepreservacampos diferentes, ejercicios offline ynoresetea ruta conotrodispositivo',()=>{
 const a=progresoGuiadoInicial(),b=progresoGuiadoInicial();a.ruta='club';a.rutaActualizada=dia1.toISOString();a.ejercicios['t-01']={practica:registrarPractica(undefined,true,false,dia1),actualizada:dia1.toISOString()};
 b.ejercicios['t-01']={nota:'Veo piezas indefensas',notaActualizada:dia2.toISOString()};b.ejercicios['c-01']={razonamiento:{...razonamientoInicial(),candidata1:'e4',respuesta1:'e5'},razonamientoActualizada:dia2.toISOString()};
 const m=combinarProgresoGuiado(a,b);assert.equal(m.ruta,'club');assert.ok(m.ejercicios['t-01'].practica);assert.equal(m.ejercicios['t-01'].nota,b.ejercicios['t-01'].nota);assert.equal(m.ejercicios['c-01'].razonamiento.candidata1,'e4');assert.deepEqual(combinarProgresoGuiado(a,b),combinarProgresoGuiado(b,a));assert.deepEqual(combinarProgresoGuiado(m,m),m);
});
test('Merge conservaayudamismodia ehistóricos máximossinduplicarintentos',()=>{
 const a=registrarResultadoGuiado(progresoGuiadoInicial(),'t-01',false,false,dia1),b=registrarResultadoGuiado(progresoGuiadoInicial(),'t-01',true,false,new Date('2026-10-14T16:00:00Z'));a.ejercicios['t-01'].practica.aciertos=8;
 const m=combinarProgresoGuiado(a,b).ejercicios['t-01'].practica;assert.equal(m.aciertos,8);assert.equal(m.fallos,1);assert.equal(m.etapa,0);assert.equal(m.ayudado,true);assert.equal(m.proxima,'2026-10-15');
});
test('Parserrechazasesionesyrazonamientoscorruptossin romperelprogreso válido',()=>{
 const p=prepararSesionGuiada(progresoGuiadoInicial(),dia1);p.ejercicios['t-01'].razonamiento.candidata1='e4';assert.equal(leerProgresoGuiado(JSON.stringify(p)).sesionEnCurso.indice,0);
 const malo=structuredClone(p);malo.ejercicios['t-01'].razonamiento.movimientos=['e9e0'];malo.sesionEnCurso.items=['inventado'];const valido=leerProgresoGuiado(JSON.stringify(malo));assert.equal(valido.sesionEnCurso,null);assert.equal(valido.ejercicios['t-01'].razonamiento,undefined);assert.deepEqual(leerProgresoGuiado('broken'),progresoGuiadoInicial());
 const inyeccion=JSON.parse('{"version":1,"ejercicios":{"__proto__":{"nota":"x"}}}');assert.equal(Object.keys(leerProgresoGuiado(JSON.stringify(inyeccion)).ejercicios).length,0);
});
