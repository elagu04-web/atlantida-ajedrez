const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {Chess}=require('chess.js');
const {LECCIONES_INICIALES,fenResuelto,leerDesdeCero}=require('../lib/aprenderDesdeCero.ts');
const {progresoGuiadoInicial,leerProgresoGuiado,combinarProgresoGuiado}=require('../lib/entrenamientoGuiado.ts');
const {EntrenamientoCuenta}=require('../lib/entrenamientoCuenta.ts');
test('Todas las posiciones y movimientos del curso son legales, incluido el enroque y el mate',()=>{
 const ids=new Set();for(const l of LECCIONES_INICIALES){assert.ok(!ids.has(l.id));ids.add(l.id);const antes=new Chess(l.fen);assert.ok(l.correcta>=0&&l.correcta<l.opciones.length);if(l.origen)assert.ok(antes.moves({verbose:true}).some(m=>m.from===l.origen&&m.to===l.destino),l.id);const despues=new Chess(fenResuelto(l));if(l.id==='mate')assert.ok(despues.isCheckmate());if(l.id==='jaque'){assert.ok(antes.isCheck());assert.ok(!despues.isCheck());}if(l.id==='enroque')assert.equal(despues.get('f1').type,'r');}
});
test('Validación y combinación conservan lo completado en ambos dispositivos, junto al entrenamiento previo',()=>{
 const a=progresoGuiadoInicial(),b=progresoGuiadoInicial();a.desdeCero={torre:{tablero:true,pregunta:false,fecha:'2026-10-27T12:00:00Z'}};b.desdeCero={torre:{tablero:false,pregunta:true,fecha:'2026-10-27T13:00:00Z'}};b.ejercicios={'t-01':{nota:'No olvidar los jaques',notaActualizada:'2026-10-27T13:00:00Z'}};
 const unido=leerProgresoGuiado(JSON.stringify(combinarProgresoGuiado(a,b)));assert.equal(unido.desdeCero.torre.tablero,true);assert.equal(unido.desdeCero.torre.pregunta,true);assert.equal(unido.ejercicios['t-01'].nota,b.ejercicios['t-01'].nota);assert.deepEqual(leerDesdeCero({inventado:{tablero:true,pregunta:true,fecha:'ayer'}}),{});
});
test('La sincronización existente lleva el curso a otro dispositivo sin crear documentos ajenos',async()=>{
 let documento=null;const transporte={listar:async()=>documento?[documento]:[],guardar:async(clave,datos,revision)=>{assert.equal(clave,'guiado:v1');documento={clave,datos:structuredClone(datos),revision:revision+1};return {conflicto:false,datos:documento.datos,revision:documento.revision};}};
 const almacen=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
 const a=new EntrenamientoCuenta('alumna',almacen(),transporte),b=new EntrenamientoCuenta('alumna',almacen(),transporte);
 try{const p=progresoGuiadoInicial();p.desdeCero={tablero:{tablero:true,pregunta:true,fecha:'2026-10-27T13:00:00Z'}};a.guardarGuiado(p);await a.sincronizar();await b.sincronizar();assert.equal(b.leer().guiado.desdeCero.tablero.pregunta,true);assert.equal(b.leer().estado,'guardado');}finally{a.detener();b.detener();}
});
