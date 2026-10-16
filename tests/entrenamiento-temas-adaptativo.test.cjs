const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const G=require('../lib/entrenamientoGuiado.ts');
const{combinarPerfilTema,elegirNuevosTematicos}=require('../lib/entrenamientoTemas.ts');
const{EntrenamientoCuenta}=require('../lib/entrenamientoCuenta.ts');
const dia=new Date('2026-10-16T15:00:00Z'),manana=new Date('2026-10-17T15:00:00Z');
function hipotesis(p,id,temas,fecha=dia){return {...p,ejercicios:{...p.ejercicios,[id]:{...p.ejercicios[id],razonamiento:{...G.razonamientoInicial(),etapa:'resolver',temas},razonamientoActualizada:fecha.toISOString()}}};}
function intento(p,id,temas,acierto=true,ayuda=false,origen='jugada',fecha=dia){return G.registrarResultadoGuiado(hipotesis(p,id,temas,fecha),id,acierto,ayuda,fecha,origen);}

test('Detecta una hipótesis para revisar sin convertirla en error de cálculo ni bajar el Elo',()=>{
 let p=G.iniciarNivel(G.progresoGuiadoInicial(),1400,'j',dia);
 const e=G.BANCO_ENTRENAMIENTO.find(e=>e.fuente==='lichess'&&e.temas.includes('pin')&&!e.temas.includes('fork'));
 p=intento(p,e.id,['fork']);const r=G.resumenTemasGuiado(p),t=r.temas.find(t=>t.tema.id==='pin');
 assert.equal(t.etiquetasRevisar,1);assert.equal(t.erroresCalculo,0);assert.equal(t.sinAyuda,1);assert.ok(r.focos.some(t=>t.tema.id==='pin'));assert.ok(!r.temas.some(t=>t.tema.id==='fork'));
 assert.equal(p.ejercicios[e.id].primerResultado.acierto,true);assert.ok(G.nivelEntrenamiento(p)>1400);
});
test('Una idea general válida y omitir motivos secundarios no crean falsas debilidades',()=>{
 let p=intento(G.progresoGuiadoInicial(),'t-02',['mate']);let r=G.resumenTemasGuiado(p);assert.equal(r.focos.length,0);assert.ok(r.temas.every(t=>!t.etiquetasRevisar));
 p=intento(G.progresoGuiadoInicial(),'li-01LlS',['clearance']);r=G.resumenTemasGuiado(p);assert.equal(r.focos.length,0);
});
test('Registra cálculo, pistas y solución por separado, sin adivinar el reconocimiento después de una pista',()=>{
 const a=intento(G.progresoGuiadoInicial(),'t-04',['fork'],false,false),b=intento(G.progresoGuiadoInicial(),'t-04',['pin'],false,true,'pista'),c=intento(G.progresoGuiadoInicial(),'t-04',['pin'],false,true,'solucion');
 assert.equal(a.ejercicios['t-04'].perfilTema.errorCalculo,true);assert.equal(a.ejercicios['t-04'].perfilTema.ayuda,false);
 assert.equal(b.ejercicios['t-04'].perfilTema.errorCalculo,false);assert.equal(b.ejercicios['t-04'].perfilTema.ayuda,true);
 assert.equal(c.ejercicios['t-04'].perfilTema.revelado,true);assert.equal(G.resumenTemasGuiado(c).temas[0].etiquetasRevisar,0);
});
test('Repetir el mismo día no infla muestras ni borra un error; un repaso independiente posterior muestra mejora',()=>{
 let p=intento(G.progresoGuiadoInicial(),'t-04',['fork'],false,false);
 for(let i=0;i<4;i++)p=intento(p,'t-04',['fork'],true,true);
 let t=G.resumenTemasGuiado(p).temas[0];assert.equal(t.posiciones,1);assert.equal(t.erroresCalculo,1);
 p=intento(p,'t-04',['fork'],true,false,'jugada',manana);t=G.resumenTemasGuiado(p).temas[0];assert.equal(t.posiciones,1);assert.equal(t.erroresCalculo,0);assert.equal(t.sinAyuda,1);
 const m=G.combinarProgresoGuiado(p,intento(G.progresoGuiadoInicial(),'t-04',['fork'],false,false));assert.equal(m.ejercicios['t-04'].perfilTema.errorCalculo,false);
});
test('El perfil se guarda, sobrevive al reinicio del razonamiento y al merge entre dispositivos',()=>{
 let p=intento(G.progresoGuiadoInicial(),'t-04',['pin']);p={...p,ejercicios:{...p.ejercicios,'t-04':{...p.ejercicios['t-04'],razonamiento:G.razonamientoInicial()}}};
 const copia=G.leerProgresoGuiado(JSON.stringify(p));assert.equal(G.resumenTemasGuiado(copia).temas[0].etiquetasRevisar,1);
 const otro=intento(G.progresoGuiadoInicial(),'t-01',['hangingPiece'],false,false),m=G.combinarProgresoGuiado(copia,otro);
 assert.deepEqual(m,G.combinarProgresoGuiado(otro,copia));assert.equal(G.resumenTemasGuiado(m).posiciones,2);assert.deepEqual(G.combinarProgresoGuiado(m,m),m);
});
test('Merge de observaciones es asociativo e idempotente y conserva la hipótesis con su propio reloj',()=>{
 const base={dia:'2026-10-16',actualizada:dia.toISOString(),temas:['fork'],temasActualizados:dia.toISOString(),errorCalculo:false,ayuda:false,completado:true,revelado:false};
 const a={...base,actualizada:'2026-10-16T16:00:00.000Z',temas:[],temasActualizados:'2026-10-16T16:00:00.000Z',errorCalculo:true},b={...base,actualizada:'2026-10-16T15:30:00.000Z',temas:['pin'],temasActualizados:'2026-10-16T15:30:00.000Z'};
 assert.deepEqual(combinarPerfilTema(combinarPerfilTema(a,b),base),combinarPerfilTema(a,combinarPerfilTema(b,base)));
 assert.deepEqual(combinarPerfilTema(a,b),combinarPerfilTema(b,a));assert.deepEqual(combinarPerfilTema(base,base),base);
});
test('El plan elige un refuerzo y otro tema cercano al nivel, no solo ejercicios de un mismo motivo',()=>{
 const resumen=G.resumenTemasGuiado(intento(G.progresoGuiadoInicial(),'t-04',['fork'],false,false));
 const e={...G.ejercicioGuiado('t-04'),rating:1500};
 const candidatos=[{...e,id:'normal',rating:1495,temas:['pin']},{...e,id:'refuerzo',rating:1550,temas:['fork']},{...e,id:'lejano',rating:2100,temas:['fork']}];
 const elegidos=elegirNuevosTematicos(candidatos,resumen,1500,0);assert.deepEqual(elegidos.map(e=>e.id),['refuerzo','normal']);
 assert.deepEqual(elegirNuevosTematicos([candidatos[0],candidatos[2]],resumen,1500,0).map(e=>e.id),['normal','lejano']);
});
test('La sesión real conserva repasos primero y no repite el fallo antes de la fecha programada',()=>{
 let p=G.iniciarNivel(G.progresoGuiadoInicial(),1500,'j',dia);const e=G.BANCO_ENTRENAMIENTO.find(e=>e.fuente==='lichess'&&e.rating>=1450&&e.rating<=1550&&e.temas.includes('fork'));
 p=intento(p,e.id,['fork'],false,false);let nueva=G.prepararSesionGuiada(p,dia);assert.ok(!nueva.sesionEnCurso.items.includes(e.id));
 assert.ok(nueva.sesionEnCurso.items.some(id=>G.ejercicioGuiado(id).temas.includes('fork')));
 nueva=G.prepararSesionGuiada({...p,sesionEnCurso:null},manana);assert.equal(nueva.sesionEnCurso.items[0],e.id);assert.ok(nueva.ejercicios[e.id].perfilTema.errorCalculo);
 assert.strictEqual(G.prepararSesionGuiada(nueva,manana),nueva);
});
test('Cuenta reciente: datos antiguos se aprovechan sin inventar errores y el perfil corrupto no borra notas',()=>{
 const p=G.progresoGuiadoInicial();p.ejercicios['t-04']={practica:{aciertos:0,fallos:1,ayudado:true,ultimoDia:'2026-10-16',proxima:'2026-10-17'},actualizada:dia.toISOString(),nota:'Conservar',notaActualizada:dia.toISOString()};
 const migrado=G.leerProgresoGuiado(JSON.stringify(p));assert.equal(migrado.ejercicios['t-04'].perfilTema.errorCalculo,false);assert.equal(G.resumenTemasGuiado(migrado).temas[0].conAyuda,1);
 p.ejercicios['t-04'].perfilTema={dia:'mal',temas:['inexistente']};const valido=G.leerProgresoGuiado(JSON.stringify(p));assert.equal(valido.ejercicios['t-04'].nota,'Conservar');assert.equal(valido.ejercicios['t-04'].perfilTema,undefined);
});
test('Tres posiciones recientes bien resueltas sacan un motivo del foco; el resumen no excede 12 muestras',()=>{
 const ejercicios=G.BANCO_ENTRENAMIENTO.filter(e=>e.fuente==='lichess'&&e.temas.includes('fork')).slice(0,16);let p=G.progresoGuiadoInicial();
 for(const [i,e] of ejercicios.entries()){const fecha=new Date(dia.getTime()+i*60000);p=intento(p,e.id,['fork'],i>=13,false,'jugada',fecha);}
 const t=G.resumenTemasGuiado(p).temas.find(t=>t.tema.id==='fork');assert.equal(t.posiciones,12);assert.equal(t.mejorando,true);assert.equal(t.prioridad,0);
});
test('El documento privado sincroniza el foco entre dispositivos, admite trabajo offline y separa al invitado',async()=>{
 const documentos=new Map();let online=true;const transporte={listar:async()=>{if(!online)throw Error('offline');return [...documentos.values()].map(d=>structuredClone(d));},guardar:async(clave,datos,revision)=>{if(!online)throw Error('offline');const previo=documentos.get(clave);if(revision!==(previo?.revision??0))return{conflicto:true,revision:previo?.revision??0,datos:structuredClone(previo?.datos)};const d={clave,datos:structuredClone(datos),revision:revision+1};documentos.set(clave,d);return{...d,conflicto:false};}};
 const almacen=()=>{const d=new Map();return {getItem:k=>d.get(k)??null,setItem:(k,v)=>d.set(k,v)};};
 const a=new EntrenamientoCuenta('socio',almacen(),transporte),b=new EntrenamientoCuenta('socio',almacen(),transporte),guest=new EntrenamientoCuenta('invitado',almacen(),null);
 try{a.guardarGuiado(intento(G.progresoGuiadoInicial(),'t-04',['fork'],false,false));await a.sincronizar();await b.sincronizar();assert.equal(G.resumenTemasGuiado(b.leer().guiado).focos[0].tema.id,'fork');
 online=false;b.guardarGuiado(intento(b.leer().guiado,'t-01',['hangingPiece'],false,false));await b.sincronizar();assert.equal(b.leer().estado,'pendiente');online=true;await b.sincronizar();await a.sincronizar();assert.equal(G.resumenTemasGuiado(a.leer().guiado).posiciones,2);
 assert.equal(G.resumenTemasGuiado(guest.leer().guiado).posiciones,0);
 }finally{a.detener();b.detener();guest.detener();}
});

test('Gráfica: cinco familias, posiciones sin duplicar y denominadores distintos para calcular y reconocer',()=>{
 let p=intento(G.progresoGuiadoInicial(),'t-02',['mate']);let r=G.resumenTemasGuiado(p);
 assert.equal(r.familias.length,5);let mates=r.familias.find(f=>f.id==='mates');assert.equal(mates.posiciones,1);assert.equal(mates.reconocimientos,1);assert.equal(mates.hipotesisConfirmadas,1);assert.equal(mates.sinAyuda,1);
 p=intento(p,'t-04',[],false,true,'pista');r=G.resumenTemasGuiado(p);const motivos=r.familias.find(f=>f.id==='motivos');assert.equal(motivos.posiciones,1);assert.equal(motivos.reconocimientos,0);assert.equal(motivos.sinAyuda,0);
 assert.equal(r.familias.find(f=>f.id==='peones').posiciones,0);
});
test('Gráfica: una clasificación a revisar no se presenta como fallo de cálculo',()=>{
 const r=G.resumenTemasGuiado(intento(G.progresoGuiadoInicial(),'t-04',['pin'])),f=r.familias.find(f=>f.id==='motivos');
 assert.equal(f.sinAyuda,1);assert.equal(f.hipotesisConfirmadas,0);assert.equal(f.reconocimientos,1);assert.equal(f.erroresCalculo,0);
});
test('Dos observaciones sin hipótesis también se combinan de manera conmutativa',()=>{
 const base={dia:'2026-10-16',actualizada:dia.toISOString(),temas:[],temasActualizados:dia.toISOString(),errorCalculo:false,ayuda:true,completado:false,revelado:false},otra={...base,actualizada:manana.toISOString(),temasActualizados:manana.toISOString()};
 assert.deepEqual(combinarPerfilTema(base,otra),combinarPerfilTema(otra,base));
});

