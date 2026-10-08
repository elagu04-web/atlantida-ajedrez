const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
let respuesta=null,llamadas=[];
const cliente={rpc(funcion,parametros){llamadas.push({funcion,parametros});return {async abortSignal(){return respuesta}}}};
require.extensions['.ts']=(m,f)=>{if(path.basename(f)==='supabase.ts'){m.exports={supabase:cliente};return}m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f)};
const {normalizarNombreJugador,registrarMiJugador}=require('../lib/registroJugador.ts');
const perfil=()=>({id:'nuevo',nombre:'David Morales',apodo:null,email:'david@example.test',elo_inicial:1500,fide_id:null,foto_url:null,descripcion:null});
function preparar(data=perfil(),error=null){respuesta={data,error};llamadas=[];}

test('Alta envía sólo el nombre normalizado; el usuario no elige correo, identidad ni Elo',async()=>{
 preparar();const resultado=await registrarMiJugador('  David   Morales  ','david@example.test');
 assert.equal(resultado.id,'nuevo');assert.deepEqual(llamadas,[{funcion:'crear_mi_jugador',parametros:{p_nombre:'David Morales'}}]);
});
test('Rechaza nombres vacíos, demasiado largos o controles antes de consultar la base',async()=>{
 for(const nombre of ['',' ','D','David\nMorales','x'.repeat(81)]){preparar();await assert.rejects(()=>registrarMiJugador(nombre,'david@example.test'),/nombre y apellido/);assert.equal(llamadas.length,0)}
 assert.equal(normalizarNombreJugador('  José  María '),'José María');
});
test('Sin cuenta no crea un jugador',async()=>{
 preparar();await assert.rejects(()=>registrarMiJugador('David Morales',''),/Iniciá sesión/);assert.equal(llamadas.length,0);
});
test('Alta no activada, permisos o fallo de red no confirman un perfil inexistente',async()=>{
 for(const code of ['PGRST202','42501','NETWORK']){preparar(null,{code});await assert.rejects(()=>registrarMiJugador('David Morales','david@example.test'),code==='PGRST202'?/no está habilitado/:/No se confirmó/)}
});
test('No incorpora respuestas de otra cuenta, sin identidad o con Elo inválido',async()=>{
 for(const fila of [null,{...perfil(),email:'otra@example.test'},{...perfil(),id:''},{...perfil(),nombre:''},{...perfil(),elo_inicial:NaN}]){preparar(fila);await assert.rejects(()=>registrarMiJugador('David Morales','david@example.test'),/no confirmó/)}
 preparar({...perfil(),email:' DAVID@EXAMPLE.TEST '});assert.equal((await registrarMiJugador('David Morales','david@example.test')).id,'nuevo');
});
test('El mensaje del servidor permite resolver un vínculo ambiguo',async()=>{
 preparar(null,{code:'P0001',message:'Tu cuenta tiene varios jugadores vinculados. Avisale al club.'});
 await assert.rejects(()=>registrarMiJugador('David Morales','david@example.test'),/varios jugadores/);
});
