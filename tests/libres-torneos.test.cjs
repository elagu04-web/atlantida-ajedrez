const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const r=require('../lib/tournaments.ts');
const ids=['a','b','c','d','e','f'],elos=new Map(ids.map((id,i)=>[id,2000-i*100]));
const torneo=(rondas,formato='suizo',jugadoresIds=ids)=>({id:'prueba',nombre:'Prueba',formato,jugadoresIds,rondas,desempates:['Progresivo'],estado:'en_curso',creadoEn:'2026-10-27',rondasObjetivo:5,inscriptosIds:[],asistieronIds:[],pagaronIds:[]});
function unaVez(ronda,esperados){assert.deepEqual(ronda.emparejamientos.flatMap(e=>[e.blancasId,...e.negrasId?[e.negrasId]:[]]).sort(),[...esperados].sort());}
test('Dos libres pedidos salen del emparejamiento y valen cero, sin PJ ni BYE recibido',()=>{
 const ronda=r.generarRondaUnoDutch(ids,elos,undefined,['a','c']);unaVez(ronda,ids);
 for(const id of ['a','c']){const e=ronda.emparejamientos.find(e=>e.blancasId===id);assert.equal(e.libreSolicitado,true);assert.equal(e.resultado,null);const s=r.calcularStandings(torneo([ronda])).get(id);assert.equal(s.puntos,0);assert.equal(s.partidasJugadas,0);assert.equal(s.receivedBye,false);}
});
test('Un libre pedido con cantidad par deja un BYE automático de 1 punto para otro',()=>{
 const ronda=r.generarRondaUnoDutch(ids,elos,undefined,['a']);unaVez(ronda,ids);
 assert.equal(ronda.emparejamientos.filter(e=>!e.negrasId).length,2);
 const tabla=r.calcularStandings(torneo([ronda]));assert.equal(tabla.get('a').puntos,0);assert.equal(tabla.get('f').puntos,1);
});
test('Las rondas siguientes preservan puntos/rivales/colores previos y el ausente vuelve',()=>{
 const primera=r.generarRondaUnoDutch(ids,elos,undefined,['a','b']);for(const e of primera.emparejamientos)if(e.negrasId)e.resultado='1-0';
 const segunda=r.generarRondaSuiza(torneo([primera]),2,elos,undefined,['c','d']);unaVez(segunda,ids);
 for(const e of segunda.emparejamientos.filter(e=>e.negrasId))assert.ok(!primera.emparejamientos.some(p=>p.negrasId&&[p.blancasId,p.negrasId].sort().join() === [e.blancasId,e.negrasId].sort().join()));
 assert.ok(segunda.emparejamientos.some(e=>e.negrasId&&[e.blancasId,e.negrasId].includes('a')));
});
test('Todos pueden pedir libre sin caídas, y la ronda queda completa con cero puntos',()=>{
 for(const ronda of [r.generarRondaUnoDutch(ids,elos,undefined,ids),r.generarRondaSuiza(torneo([]),2,elos,undefined,ids)]){unaVez(ronda,ids);assert.ok(r.rondaCompleta(ronda));assert.ok([...r.calcularStandings(torneo([ronda])).values()].every(s=>s.puntos===0));}
});
test('Los libres permanecen en el JSON y no se convierten en puntos al recargar ni con datos viejos',()=>{
 const ronda=JSON.parse(JSON.stringify(r.generarRondaUnoDutch(ids,elos,undefined,['a'])));ronda.emparejamientos.find(e=>e.libreSolicitado).resultado='1-0';assert.equal(r.calcularStandings(torneo([ronda])).get('a').puntos,0);
 assert.match(r.textoDescanso(torneo([]),ronda.emparejamientos.find(e=>e.libreSolicitado)),/0 puntos/);
 assert.throws(()=>r.generarRondaSuiza(torneo([]),1,elos,undefined,['desconocido']));
});
for(const n of [3,5,7,9])for(const doble of [false,true])test(`Orden libre de round robin ${n} jugadores, doble ${doble}`,()=>{
 const jugadores=Array.from({length:n},(_,i)=>String(i)),orden=[...jugadores].reverse();
 const antes=r.generarRoundRobin(jugadores,doble),despues=r.generarRoundRobin(jugadores,doble,undefined,orden);
 const cruces=rs=>rs.flatMap(r=>r.emparejamientos.filter(e=>e.negrasId).map(e=>e.blancasId+'-'+e.negrasId)).sort();assert.deepEqual(cruces(despues),cruces(antes));
 assert.deepEqual(despues.map(r=>r.emparejamientos.find(e=>!e.negrasId).blancasId),doble?[...orden,...orden]:orden);
 despues.forEach((r,i)=>{assert.equal(r.numero,i+1);unaVez(r,jugadores);});
 assert.ok([...r.calcularStandings(torneo(despues,'round-robin',jugadores)).values()].every(s=>s.puntos===0));
});
test('Orden parcial completa restantes sin repeticiones y rechaza entradas inválidas',()=>{
 assert.equal(r.generarRoundRobin(['a','b','c'],false,undefined,['b'])[0].emparejamientos.find(e=>!e.negrasId).blancasId,'b');
 assert.throws(()=>r.generarRoundRobin(['a','b','c'],false,undefined,['a','a']));assert.throws(()=>r.generarRoundRobin(['a','b'],false,undefined,['a']));
});
