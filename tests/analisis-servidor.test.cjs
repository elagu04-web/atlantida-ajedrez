const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {procesarAnalisisServidor}=require('../lib/server/procesarAnalisisServidor.ts');const{motorEntrenamientoServidor}=require('../lib/server/motorEntrenamientoServidor.ts');const{Chess}=require('chess.js');
const ev={evaluacionCentipawns:15,mateEn:null,mejorJugada:'e2e4',variantePrincipal:['e2e4'],profundidad:10};
test('Un trabajo continúa en otra ejecución desde el último punto de guardado',async()=>{
 const trabajo={id:'j',pgn:'1. e4 e5 2. Nf3 Nc6 *',color:'w',total:5,sesion_id:'sesion',evaluaciones:[]};let reloj=0,calculadas=0,datos=null;const avances=[];
 const transporte={guardar:async(e,liberar,s)=>{avances.push({evaluaciones:structuredClone(e),liberar});if(s)datos=s;return{vigente:true,conflicto:false};},documento:async()=>({datos:null,revision:0})};
 const motor=()=>({evaluarPosicion:async()=>{calculadas++;reloj+=10;return ev;},destruir:()=>{}});
 assert.equal(await procesarAnalisisServidor(trabajo,transporte,motor,15,()=>reloj),'pendiente');assert.equal(calculadas,2);assert.equal(avances.at(-1).liberar,true);
 trabajo.evaluaciones=avances.at(-1).evaluaciones;reloj=0;assert.equal(await procesarAnalisisServidor(trabajo,transporte,motor,100,()=>reloj),'terminado');assert.equal(calculadas,5);assert.equal(datos.resultado.jugadas.length,4);
});
test('Una cancelación durante un guardado no termina publicando una sesión',async()=>{
 const trabajo={id:'j',pgn:'1. e4 e5 *',color:'b',total:3,sesion_id:'sesion',evaluaciones:[ev,ev,ev]};let motorCreado=false;
 assert.equal(await procesarAnalisisServidor(trabajo,{documento:async()=>null,guardar:async()=>({vigente:false})},()=>{motorCreado=true;throw Error('No debe cargar motor');}),'cancelado');assert.equal(motorCreado,false);
});
test('El motor real del servidor responde legalmente en blancas y negras y se cierra',async()=>{
 const motor=motorEntrenamientoServidor();try{const c=new Chess();const a=await motor.evaluarPosicion(c.fen(),'w',120);assert.ok(a.mejorJugada);c.move({from:a.mejorJugada.slice(0,2),to:a.mejorJugada.slice(2,4),promotion:a.mejorJugada[4]});const b=await motor.evaluarPosicion(c.fen(),'b',120);assert.ok(b.profundidad>0);assert.doesNotThrow(()=>c.move({from:b.mejorJugada.slice(0,2),to:b.mejorJugada.slice(2,4),promotion:b.mejorJugada[4]}));}finally{motor.destruir();}
});
test('La finalización vuelve a unir notas si otro dispositivo edita durante el guardado',async()=>{
 const trabajo={id:'j',pgn:'1. e4 e5 *',color:'w',total:3,sesion_id:'sesion',evaluaciones:[ev,ev,ev]};let datos=null,revision=0,intentos=0;
 const transporte={documento:async()=>({datos,revision}),guardar:async(e,liberar,s)=>{if(s&&intentos++===0){datos={...s,notas:{'0':'Idea escrita desde el celular'},notasActualizadas:{'0':new Date().toISOString()}};revision=1;return{vigente:true,conflicto:true};}datos=s;revision++;return{vigente:true,conflicto:false};}};
 assert.equal(await procesarAnalisisServidor(trabajo,transporte,()=>{throw Error('Ya está evaluado');}),'terminado');assert.equal(datos.notas['0'],'Idea escrita desde el celular');assert.equal(datos.resultado.jugadas.length,2);assert.equal(intentos,2);
});

