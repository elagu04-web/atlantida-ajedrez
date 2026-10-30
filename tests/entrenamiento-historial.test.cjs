const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const G=require('../lib/entrenamientoGuiado.ts'),H=require('../lib/historialEntrenamiento.ts'),{EntrenamientoCuenta}=require('../lib/entrenamientoCuenta.ts');
const fecha=new Date('2026-10-30T18:00:00Z');
function registrar(p,id,ok,ayuda=false,origen='jugada',f=fecha,temas=['fork']){
 p={...p,ejercicios:{...p.ejercicios,[id]:{...p.ejercicios[id],razonamiento:{...G.razonamientoInicial(),temas},razonamientoActualizada:f.toISOString()}}};
 return G.registrarResultadoGuiado(p,id,ok,ayuda,f,origen);
}
test('Historial conserva fallos después del acierto y los agrupa por posición/día, sin penalizar el reconocimiento correcto',()=>{
 let p=registrar(G.progresoGuiadoInicial(),'t-04',false);p=registrar(p,'t-04',true);
 let r=H.analizarHistorial(p,G.BANCO_ENTRENAMIENTO);assert.equal(r.intentos,2);assert.equal(r.muestras,1);assert.equal(r.temas[0].errores,1);assert.equal(r.temas[0].limpias,0);assert.equal(r.temas[0].reconocimiento,100);
 p=registrar(p,'t-04',true,false,'jugada',new Date('2026-10-31T18:00:00Z'));
 r=H.analizarHistorial(G.leerProgresoGuiado(JSON.stringify(p)),G.BANCO_ENTRENAMIENTO);assert.equal(r.temas[0].posiciones,1);assert.equal(r.temas[0].muestras,2);assert.equal(r.temas[0].errores,1);assert.equal(r.temas[0].porcentaje,50);assert.equal(r.dias,2);
});
test('Pista y solución no inventan errores de jugada ni aciertos de reconocimiento; etiquetas erróneas no inventan fallos de cálculo',()=>{
 let p=registrar(G.progresoGuiadoInicial(),'t-04',false,true,'pista');p=registrar(p,'t-04',true,true);
 let t=H.analizarHistorial(p,G.BANCO_ENTRENAMIENTO).temas[0];assert.equal(t.ayudas,1);assert.equal(t.errores,0);assert.equal(t.reconocimiento,null);assert.equal(t.limpias,0);
 p=registrar(G.progresoGuiadoInicial(),'t-04',true,false,'jugada',fecha,['pin']);t=H.analizarHistorial(p,G.BANCO_ENTRENAMIENTO).temas[0];assert.equal(t.reconocimiento,0);assert.equal(t.errores,0);assert.equal(t.limpias,1);
});
test('Candidatas y evaluación conservan niveles propios; no atribuyen automáticamente motivos tácticos a esas respuestas',()=>{
 let p=G.iniciarNivel(G.progresoGuiadoInicial(),1800,'j',fecha);
 for(const actividad of ['candidatas','evaluacion']){const e=G.BANCO_ENTRENAMIENTO.find(e=>e.actividad===actividad&&e.rating);p=registrar(p,e.id,false);}
 const r=H.analizarHistorial(p,G.BANCO_ENTRENAMIENTO);assert.equal(r.temas.length,0);assert.equal(r.habilidades[0].muestras,0);assert.equal(r.habilidades[1].errores,1);assert.equal(r.habilidades[2].errores,1);
 for(const x of p.historial){assert.equal(x.nivelAntes,1800);assert.ok(x.nivelDespues<1800);}
});
test('Dos dispositivos offline conservan ambas observaciones, se sincronizan sin duplicarse y no pasan a otra cuenta',async()=>{
 const docs=new Map(),local=()=>{const d=new Map();return {getItem:k=>d.get(k)??null,setItem:(k,v)=>d.set(k,v)};};
 const transporte={listar:async()=>[...docs.values()].map(d=>structuredClone(d)),guardar:async(clave,datos,revision)=>{const d=docs.get(clave);if((d?.revision??0)!==revision)return {conflicto:true,...d};const n={clave,datos:structuredClone(datos),revision:revision+1};docs.set(clave,n);return {conflicto:false,...n};}};
 const a=new EntrenamientoCuenta('A',local(),transporte),b=new EntrenamientoCuenta('A',local(),transporte),otro=new EntrenamientoCuenta('B',local(),null);
 try{a.guardarGuiado(registrar(a.leer().guiado,'t-04',false));b.guardarGuiado(registrar(b.leer().guiado,'t-04',true));await a.sincronizar();await b.sincronizar();await a.sincronizar();const p=a.leer().guiado;assert.equal(p.historial.length,2);assert.equal(H.analizarHistorial(p,G.BANCO_ENTRENAMIENTO).temas[0].errores,1);assert.deepEqual(G.combinarProgresoGuiado(p,p),p);assert.deepEqual(G.combinarProgresoGuiado(a.leer().guiado,b.leer().guiado),G.combinarProgresoGuiado(b.leer().guiado,a.leer().guiado));assert.equal(otro.leer().guiado.historial,undefined);}finally{a.detener();b.detener();otro.detener();}
});
test('El legado no inventa eventos; entradas inválidas no borran el progreso y el registro queda acotado bajo el límite de la nube',()=>{
 const viejo=G.progresoGuiadoInicial();viejo.ejercicios['t-04']={nota:'Seguir calculando',notaActualizada:fecha.toISOString()};assert.equal(H.analizarHistorial(viejo,G.BANCO_ENTRENAMIENTO).intentos,0);
 const x=registrar(viejo,'t-04',true).historial[0],eventos=Array.from({length:1300},(_,i)=>({...x,id:`intento-${i}`,fecha:new Date(fecha.getTime()+i*1000).toISOString()}));
 const p=G.leerProgresoGuiado(JSON.stringify({...viejo,historial:[...eventos,{...x,nivelAntes:NaN},{...x,id:'mal',ejercicio:'no-existe'},{...x,id:'raro',temas:['inventado']}]}));assert.equal(p.historial.length,H.LIMITE_HISTORIAL);assert.equal(p.historial[0].id,'intento-1299');assert.equal(p.ejercicios['t-04'].nota,'Seguir calculando');assert.ok(Buffer.byteLength(JSON.stringify(p))<600000);
});
test('Mejora requiere repasos independientes y no solo repetir el mismo día; la dificultad usa solo resoluciones limpias',()=>{
 const e=G.BANCO_ENTRENAMIENTO.find(e=>e.actividad==='tactica'&&e.rating&&e.temas.includes('fork'));let p=G.progresoGuiadoInicial();
 for(let i=0;i<9;i++)p=registrar(p,e.id,i>=6,false,'jugada',new Date(fecha.getTime()+i*86400000));
 const t=H.analizarHistorial(p,G.BANCO_ENTRENAMIENTO).temas.find(t=>t.id==='fork');assert.equal(t.tendencia,50);assert.equal(t.dificultadResuelta,e.rating);assert.equal(t.posiciones,1);assert.equal(t.muestras,9);
});
