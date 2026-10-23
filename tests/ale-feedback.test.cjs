const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {ajustePartidaAle}=require('../lib/progresoAle.ts');
test('El resultado muestra el ajuste de esa partida aunque ya esté guardada o haya resultados posteriores',()=>{
 const progreso={version:1,partidas:['gana','pierde','tablas'],resultados:{gana:'victoria',pierde:'derrota',tablas:'tablas'}};
 assert.deepEqual(ajustePartidaAle(progreso,'gana'),{antes:1400,despues:1450,variacion:50});
 assert.deepEqual(ajustePartidaAle(progreso,'pierde'),{antes:1450,despues:1400,variacion:-50});
 assert.deepEqual(ajustePartidaAle(progreso,'tablas'),{antes:1400,despues:1400,variacion:0});
 assert.equal(ajustePartidaAle(progreso,'sin-contar'),null);
});
test('Muestra la pérdida real al alcanzar el mínimo y el escalón de ajuste reducido',()=>{
 const suelo={version:1,partidas:['a','b'],resultados:{a:'derrota',b:'derrota'}};
 assert.deepEqual(ajustePartidaAle(suelo,'b'),{antes:1350,despues:1320,variacion:-30});
 const ids=Array.from({length:10},(_,i)=>'t-'+i),resultados=Object.fromEntries(ids.map(id=>[id,'tablas']));
 const p={version:1,partidas:[...ids,'v'],resultados:{...resultados,v:'victoria'}};
 assert.deepEqual(ajustePartidaAle(p,'v'),{antes:1400,despues:1425,variacion:25});
});
