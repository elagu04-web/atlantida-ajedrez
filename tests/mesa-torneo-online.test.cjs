const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {miMesaDeTorneo}=require('../lib/mesaTorneoOnline.ts');
const datos=()=>({torneo:{id:'copa',nombre:'Copa del club',estado:'en_curso',ronda_actual:2,ritmo:'5+3'},jugadores:[{usuario_id:'juan',nombre:'Juan Diego'},{usuario_id:'fernando',nombre:'Fernando'},{usuario_id:'bruno',nombre:'Bruno'}],cruces:[{ronda:1,mesa:1,blancasId:'juan',negrasId:'bruno',partidaId:'anterior',fase:'terminada'},{ronda:2,mesa:1,blancasId:'fernando',negrasId:'juan',partidaId:null,fase:'coordinar'}]});
test('El acceso usa solo la ronda actual, el rival y el ritmo del torneo; no una invitación anterior',()=>{
 const d=datos(),antes=JSON.stringify(d),m=miMesaDeTorneo(d,'juan');assert.equal(m.ritmo,'5+3');assert.equal(m.rival,'Fernando');assert.equal(m.color,'b');assert.equal(m.ronda,2);assert.equal(m.href,'/torneos/online/copa#mi-mesa');assert.equal(JSON.stringify(d),antes);
});
test('Con mesa asignada entra directamente al tablero; conserva el visor al terminar',()=>{
 const d=datos();d.cruces[1].partidaId='mesa-valida';d.cruces[1].fase='activa';assert.equal(miMesaDeTorneo(d,'fernando').href,'/jugar/online?mesa=mesa-valida');assert.equal(miMesaDeTorneo(d,'fernando').color,'w');
 d.cruces[1].fase='terminada';assert.equal(miMesaDeTorneo(d,'juan').terminada,true);
});
test('No ofrece cruces de otra cuenta, otro estado, otra ronda o un usuario no inscripto',()=>{
 for(const usuario of ['bruno','ajeno'])assert.equal(miMesaDeTorneo(datos(),usuario),null);
 for(const estado of ['abierto','cancelado','finalizado']){const d=datos();d.torneo.estado=estado;assert.equal(miMesaDeTorneo(d,'juan'),null);}
 const d=datos();d.jugadores=d.jugadores.filter(j=>j.usuario_id!=='juan');assert.equal(miMesaDeTorneo(d,'juan'),null);
});
test('Un descanso lleva al torneo y no inventa un rival ni cambia el ritmo',()=>{
 const d=datos();d.cruces[1].negrasId=null;const m=miMesaDeTorneo(d,'fernando');assert.equal(m.rival,null);assert.equal(m.ritmo,'5+3');assert.equal(m.partidaId,null);
});
