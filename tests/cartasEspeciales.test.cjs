const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {cartasEspeciales}=require('../lib/cartasEspeciales.ts');
const ahora=new Date('2026-11-02T15:00:00Z');
const jugadores=[{id:'ana',eloAtlantida:1900,jugadas:20},{id:'bea',eloAtlantida:1800,jugadas:12},{id:'nueva',eloAtlantida:2200,jugadas:0}];
function torneo(id,iniciadoEn,opciones={}){return {id,nombre:id,formato:'suizo',desempates:[],jugadoresIds:['ana','bea'],estado:'finalizado',creadoEn:'2026-10-01T10:00:00Z',iniciadoEn,rondasObjetivo:1,inscriptosIds:[],asistieronIds:[],pagaronIds:[],rondas:[{numero:1,emparejamientos:[{numero:1,blancasId:'bea',negrasId:'ana',resultado:'1-0'}]}],...opciones};}
test('Dorado para el líder con partidas y el último campeón del martes de Uruguay',()=>{
 const ts=[torneo('anterior','2026-10-20T22:00:00Z'),torneo('martes-noche','2026-10-28T01:30:00Z'),torneo('jueves','2026-10-29T22:00:00Z')];
 const antes=JSON.stringify(ts);const m=cartasEspeciales(jugadores,ts,ahora);
 assert.deepEqual(m.get('ana'),['N.º 1 del ranking']);assert.deepEqual(m.get('bea'),['Campeón de los martes']);assert.equal(m.has('nueva'),false);assert.equal(JSON.stringify(ts),antes);
});
test('El dorado de campeón cambia sólo con un nuevo ganador confirmado',()=>{
 const anterior=torneo('ganado','2026-10-20T22:00:00Z');
 const nuevo=torneo('nuevo','2026-10-27T22:00:00Z');nuevo.rondas[0].emparejamientos[0].resultado='1/2-1/2';
 assert.deepEqual(cartasEspeciales(jugadores,[anterior,nuevo],ahora).get('bea'),['Campeón de los martes']);
 nuevo.finalDesempate={jugadorIds:['ana','bea'],ganadorId:'ana'};
 const m=cartasEspeciales(jugadores,[anterior,nuevo],ahora);assert.deepEqual(m.get('ana'),['N.º 1 del ranking','Campeón de los martes']);assert.equal(m.has('bea'),false);
});
test('No se confunden duelos, torneos incompletos, otro día ni fechas futuras',()=>{
 for(const t of [torneo('duelo','2026-10-27T22:00:00Z',{formato:'match'}),torneo('en-curso','2026-10-27T22:00:00Z',{estado:'en_curso'}),torneo('vacio','2026-10-27T22:00:00Z',{rondas:[]}),torneo('miercoles','2026-10-28T04:00:00Z'),torneo('futuro','2026-11-03T22:00:00Z')])assert.equal(cartasEspeciales(jugadores,[t],ahora).has('bea'),false);
});
test('Los empates de Elo y los cambios de líder siguen el ranking completo',()=>{
 const empatados=jugadores.map(j=>j.id==='bea'?{...j,eloAtlantida:1900}:j);
 assert.deepEqual([...cartasEspeciales(empatados,[],ahora).keys()].sort(),['ana','bea']);
 assert.deepEqual([...cartasEspeciales(jugadores.map(j=>j.id==='bea'?{...j,eloAtlantida:2000}:j),[],ahora).keys()],['bea']);
});
