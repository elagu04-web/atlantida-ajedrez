const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {BANCO_ENTRENAMIENTO,progresoGuiadoInicial,iniciarNivel,prepararSesionGuiada,registrarResultadoGuiado,ejercicioGuiado,razonamientoInicial,combinarProgresoGuiado,leerProgresoGuiado,nivelEntrenamiento}=require('../lib/entrenamientoGuiado.ts');
const inicio=new Date('2026-10-15T15:00:00Z'),fin=new Date('2026-10-15T15:10:00Z'),despues=new Date('2026-10-15T15:11:00Z');
function completada(){
 let p=prepararSesionGuiada(iniciarNivel(progresoGuiadoInicial(),1700,'j',inicio),inicio);
 for(const id of p.sesionEnCurso.items){p=registrarResultadoGuiado(p,id,true,false,fin);p.ejercicios[id]={...p.ejercicios[id],nota:'Conservar mi explicación',notaActualizada:fin.toISOString(),razonamiento:{...razonamientoInicial(),etapa:'terminada',resuelto:true,conclusion:'Mi idea de la posición'},razonamientoActualizada:fin.toISOString()};}
 return {...p,sesionActualizada:fin.toISOString(),sesionEnCurso:{...p.sesionEnCurso,indice:p.sesionEnCurso.items.length-1,terminada:true,actualizada:fin.toISOString()}};
}
test('Al terminar una sesión se puede seguir ese mismo día con posiciones distintas y sin borrar el avance',()=>{
 const p=completada(),s=prepararSesionGuiada(p,despues);
 assert.equal(s.sesionEnCurso.terminada,false);assert.notEqual(s.sesionEnCurso.id,p.sesionEnCurso.id);
 assert.ok(s.sesionEnCurso.items.every(id=>!p.sesionEnCurso.items.includes(id)));
 for(const id of p.sesionEnCurso.items)assert.deepEqual(s.ejercicios[id],p.ejercicios[id]);
 assert.equal(nivelEntrenamiento(s),nivelEntrenamiento(p));
 assert.deepEqual(leerProgresoGuiado(JSON.stringify(s)).sesionEnCurso,s.sesionEnCurso);
});
test('La sesión terminada no bloquea candidatas ni evaluación del mismo día',()=>{
 const p=completada();for(const actividad of ['candidatas','evaluacion']){
  const s=prepararSesionGuiada({...p,actividad},despues);
  assert.equal(s.sesionEnCurso.terminada,false);
  assert.ok(s.sesionEnCurso.items.every(id=>ejercicioGuiado(id).actividad===actividad));
 }
});
test('Continuar una sesión empezada conserva sus respuestas, orden y cursor incluso otro día',()=>{
 const p=prepararSesionGuiada(iniciarNivel(progresoGuiadoInicial(),1700,'j',inicio),inicio);p.sesionEnCurso.indice=1;
 p.ejercicios[p.sesionEnCurso.items[1]].razonamiento.consultaTema='ataque doble';
 assert.strictEqual(prepararSesionGuiada(p,despues),p);
 assert.strictEqual(prepararSesionGuiada(p,new Date('2026-10-16T15:00:00Z')),p);
});
test('Si se agota un modo, no repite posiciones cuyo repaso es mañana ni altera sus intervalos',()=>{
 let p=completada();for(const e of BANCO_ENTRENAMIENTO.filter(e=>e.actividad==='tactica'&&e.fuente))p=registrarResultadoGuiado(p,e.id,true,false,fin);
 const s=prepararSesionGuiada(p,despues);assert.equal(s.sesionEnCurso,null);assert.deepEqual(s.ejercicios,p.ejercicios);
 const otro=prepararSesionGuiada({...s,actividad:'candidatas'},despues);assert.ok(otro.sesionEnCurso.items.length>0);
});
test('Una copia antigua de la cuenta no resucita la sesión terminada después de empezar otra',()=>{
 const p=completada(),s=prepararSesionGuiada(p,despues),m=combinarProgresoGuiado(p,s);
 assert.equal(m.sesionEnCurso.terminada,false);assert.equal(m.sesionEnCurso.id,s.sesionEnCurso.id);
 for(const id of p.sesionEnCurso.items)assert.deepEqual(m.ejercicios[id],p.ejercicios[id]);
 assert.deepEqual(combinarProgresoGuiado(p,s),combinarProgresoGuiado(s,p));
});
