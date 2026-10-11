const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,file);
const {convertirPuzzle,validarDesafio,fechaMontevideo}=require('../lib/desafios.ts');
const {Chess}=require('chess.js');
const migration=fs.readFileSync(require.resolve('../supabase/migrations/20261011_desafios_progresivos.sql'),'utf8');
const banco=JSON.parse(migration.split('$banco$')[1]);
test('Todo el banco presenta posiciones legales y soluciones completas, incluso por encima de 1900',()=>{
  assert.equal(banco.length,2437);const ids=new Set();
  for(const p of banco){const d=convertirPuzzle(p,'2026-10-11');assert.equal(d.fen,p.game.fen);assert.ok(!ids.has(d.id));ids.add(d.id);assert.deepEqual(validarDesafio(d),d);}
  for(let objetivo=1800;objetivo<=2900;objetivo+=50)assert.ok(banco.filter(p=>Math.round(p.puzzle.rating/50)*50===objetivo).length>=100);
});
test('El formato nuevo y el antiguo conservan el mismo turno y la misma solución',()=>{
  const legacy={game:{pgn:'e4 e5'},puzzle:{id:'test1',rating:2350,initialPly:1,solution:['g1f3','b8c6','f1b5'],themes:[]}};
  const a=convertirPuzzle(legacy,'2026-10-11');const b=convertirPuzzle({...legacy,game:{fen:a.fen}},'2026-10-11');assert.deepEqual(a,b);assert.equal(new Chess(b.fen).turn(),'w');
  for(const rating of [NaN,Infinity,1800.5,1699,4001])assert.throws(()=>convertirPuzzle({...legacy,puzzle:{...legacy.puzzle,rating}},'2026-10-11'));
  assert.throws(()=>convertirPuzzle({...legacy,game:{fen:'invalid'}},'2026-10-11'));
  assert.throws(()=>convertirPuzzle({...legacy,puzzle:{...legacy.puzzle,solution:['e1e8']}},'2026-10-11'));
});
test('La frontera del desafío diario sigue siendo medianoche de Uruguay',()=>{
  assert.equal(fechaMontevideo(new Date('2026-10-12T02:59:59Z')),'2026-10-11');
  assert.equal(fechaMontevideo(new Date('2026-10-12T03:00:00Z')),'2026-10-12');
});
