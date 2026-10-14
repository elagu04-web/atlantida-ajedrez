const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {EntrenamientoCuenta,clavesEntrenamiento,combinarSesionCuenta}=require('../lib/entrenamientoCuenta.ts');
const {progresoGuiadoInicial,prepararSesionGuiada,razonamientoInicial}=require('../lib/entrenamientoGuiado.ts');
const {crearSesionEntrenamiento,PGN_EJEMPLO,registrarPractica}=require('../lib/entrenamientoPersonal.ts');
const {analizarPartida}=require('../lib/analisisPartidas.ts');
function almacen(){const datos=new Map();return {getItem:k=>datos.get(k)??null,setItem:(k,v)=>datos.set(k,v),datos};}
function nube(){const datos=new Map();let online=true,conflictos=0;
 return {datos,setOnline:x=>online=x,get conflictos(){return conflictos;},transporte:{listar:async conocidos=>{if(!online)throw Error('Offline');return [...datos.values()].filter(d=>conocidos.get(d.clave)?.revision!==d.revision).map(d=>structuredClone(d));},guardar:async(clave,p,revision)=>{if(!online)throw Error('Offline');const anterior=datos.get(clave);if(revision!==(anterior?.revision??0)){conflictos++;return {conflicto:true,revision:anterior?.revision??0,datos:structuredClone(anterior?.datos??null)};}const d={clave,revision:revision+1,datos:structuredClone(p)};datos.set(clave,d);return {conflicto:false,revision:d.revision,datos:structuredClone(p)};}}};
}
const reloj='2026-10-14T14:00:00.000Z';
function nota(id,texto,fecha=reloj){const p=progresoGuiadoInicial();p.ejercicios[id]={nota:texto,notaActualizada:fecha};return p;}
async function sesion(){let i=0;const resultado=await analizarPartida(PGN_EJEMPLO,{evaluarPosicion:async()=>{const indice=i++;return {evaluacionCentipawns:indice<3?[0,-100,-110][indice]:null,mateEn:indice>=3?-1:null,mejorJugada:'e2e4',variantePrincipal:['e2e4']};}},()=>{},()=>{},650);return crearSesionEntrenamiento([],PGN_EJEMPLO,'w',resultado,'legado',new Date(reloj));}

test('Un dispositivo nuevo descarga el avance sin sustituirlo por su estado vacío',async()=>{
 const n=nube(),a=new EntrenamientoCuenta('uno',almacen(),n.transporte),b=new EntrenamientoCuenta('uno',almacen(),n.transporte);
 try{a.guardarGuiado(nota('t-01','Mirar las piezas sin defensa'));await a.sincronizar();await b.sincronizar();assert.equal(b.leer().guiado.ejercicios['t-01'].nota,'Mirar las piezas sin defensa');assert.equal(b.leer().estado,'guardado');assert.equal(n.datos.get('guiado:v1').revision,1);}finally{a.detener();b.detener();}
});
test('La biblioteca antigua se migra automáticamente sin borrar notas, identidad ni repasos',async()=>{
 const n=nube(),local=almacen(),s=await sesion();s.notas={'2':'Revisar los jaques'};s.practicas={'2':registrarPractica(undefined,true,false,new Date(reloj))};local.setItem(clavesEntrenamiento('uno').biblioteca,JSON.stringify([s]));const a=new EntrenamientoCuenta('uno',local,n.transporte),b=new EntrenamientoCuenta('uno',almacen(),n.transporte);
 try{await a.sincronizar();await b.sincronizar();assert.equal(b.leer().sesiones[0].id,'legado');assert.equal(b.leer().sesiones[0].notas['2'],'Revisar los jaques');assert.equal(b.leer().sesiones[0].practicas['2'].aciertos,1);assert.ok(n.datos.has('sesion:legado'));}finally{a.detener();b.detener();}
});
test('Un fallo de conexión deja los cambios pendientes y permite enviarlos después',async()=>{
 const n=nube(),local=almacen(),a=new EntrenamientoCuenta('uno',local,n.transporte);
 try{n.setOnline(false);a.guardarGuiado(nota('t-01','No mover por impulso'));await a.sincronizar();assert.equal(a.leer().estado,'pendiente');assert.equal(n.datos.size,0);assert.match(local.getItem(clavesEntrenamiento('uno').guiado),/No mover por impulso/);n.setOnline(true);await a.sincronizar();assert.equal(a.leer().estado,'guardado');assert.equal(n.datos.get('guiado:v1').datos.ejercicios['t-01'].nota,'No mover por impulso');}finally{a.detener();}
});
test('Los cambios offline de dos dispositivos conservan posiciones distintas y diferentes campos',async()=>{
 const n=nube(),a=new EntrenamientoCuenta('uno',almacen(),n.transporte),b=new EntrenamientoCuenta('uno',almacen(),n.transporte);
 try{await a.sincronizar();await b.sincronizar();n.setOnline(false);a.guardarGuiado(nota('t-01','Nota A'));const p=nota('t-02','Nota B');p.ejercicios['t-01']={razonamiento:{...razonamientoInicial(),consultaTema:'captura'},razonamientoActualizada:'2026-10-14T14:01:00.000Z'};b.guardarGuiado(p);await a.sincronizar();await b.sincronizar();n.setOnline(true);await a.sincronizar();await b.sincronizar();await a.sincronizar();const unido=a.leer().guiado;assert.equal(unido.ejercicios['t-01'].nota,'Nota A');assert.equal(unido.ejercicios['t-01'].razonamiento.consultaTema,'captura');assert.equal(unido.ejercicios['t-02'].nota,'Nota B');}finally{a.detener();b.detener();}
});
test('Un conflicto real entre lectura y escritura recupera la revisión y no pisa la nota del otro dispositivo',async()=>{
 const n=nube();let interferir=true;const transporte={...n.transporte,guardar:async(k,d,r)=>{if(interferir){interferir=false;await n.transporte.guardar(k,nota('t-02','Escrita durante la petición'),0);}return n.transporte.guardar(k,d,r);}};
 const a=new EntrenamientoCuenta('uno',almacen(),transporte);try{a.guardarGuiado(nota('t-01','Mi nueva nota'));await a.sincronizar();assert.equal(n.conflictos,1);assert.equal(a.leer().estado,'guardado');assert.equal(n.datos.get('guiado:v1').datos.ejercicios['t-02'].nota,'Escrita durante la petición');assert.equal(n.datos.get('guiado:v1').datos.ejercicios['t-01'].nota,'Mi nueva nota');}finally{a.detener();}
});
test('Se retoma una sesión a mitad con su respuesta y cursor desde otro dispositivo',async()=>{
 const n=nube(),a=new EntrenamientoCuenta('uno',almacen(),n.transporte),b=new EntrenamientoCuenta('uno',almacen(),n.transporte);
 try{const p=prepararSesionGuiada(progresoGuiadoInicial(),new Date(reloj));p.sesionEnCurso.indice=1;p.ejercicios['t-02']={razonamiento:{...razonamientoInicial(),consultaTema:'mate'},razonamientoActualizada:reloj};a.guardarGuiado(p);await a.sincronizar();await b.sincronizar();assert.equal(b.leer().guiado.sesionEnCurso.indice,1);assert.equal(b.leer().guiado.ejercicios['t-02'].razonamiento.consultaTema,'mate');}finally{a.detener();b.detener();}
});
test('Invitado y cuentas mantienen claves diferentes y una respuesta tardía no cambia la cuenta nueva',async()=>{
 const local=almacen(),n=nube(),g=new EntrenamientoCuenta('invitado',local,null);g.guardarGuiado(nota('t-01','Invitado'));let liberar;const lento={...n.transporte,listar:()=>new Promise(resolve=>liberar=resolve)};const a=new EntrenamientoCuenta('A',local,lento);const tarea=a.sincronizar();a.detener();const b=new EntrenamientoCuenta('B',local,n.transporte);
 try{liberar([{clave:'guiado:v1',revision:1,datos:nota('t-02','De A')}]);await tarea;await b.sincronizar();assert.equal(b.leer().guiado.ejercicios['t-01'],undefined);assert.equal(b.leer().guiado.ejercicios['t-02'],undefined);assert.equal(local.getItem(clavesEntrenamiento('A').guiado),null);assert.match(local.getItem(clavesEntrenamiento('invitado').guiado),/Invitado/);}finally{g.detener();b.detener();}
});
test('Editar una nota y practicar otra posición une los campos; borrar una nota no la resucita',async()=>{
 const s=await sesion();s.notas={'2':'Vieja'};const a=structuredClone(s),b=structuredClone(s);a.notas['2']='';a.actualizada='2026-10-14T15:00:00.000Z';a.notasActualizadas={'2':a.actualizada};b.practicas['0']=registrarPractica(undefined,true,false,new Date('2026-10-14T16:00:00Z'));b.practicasActualizadas={'0':'2026-10-14T16:00:00.000Z'};b.actualizada='2026-10-14T16:00:00.000Z';b.notasActualizadas={'2':reloj};const m=combinarSesionCuenta(a,b);assert.equal(m.notas['2'],'');assert.equal(m.practicas['0'].aciertos,1);
});
