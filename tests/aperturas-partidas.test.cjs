const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const a=require('../lib/aperturasPartidas.ts');
const ev=cp=>({evaluacionCentipawns:cp,mateEn:null,mejorJugada:'e2e4',variantePrincipal:['e2e4'],profundidad:18});
test('La carga separa partidas completas, conserva cabeceras y rechaza lotes inválidos sin importación parcial',()=>{
 const p='[Event "Club"]\n[White "Agustin"]\n[Black "Rival"]\n\n1. e4 c5 (1... e5) 2. Nf3 *';
 const l=a.cargarPartidasAperturas(p+'\n\n[Event "Otra"]\n[White "Otro"]\n[Black "Agustin"]\n\n1. d4 d5 *');
 assert.equal(l.length,2);assert.equal(l[0].blancas,'Agustin');assert.equal(l[1].negras,'Agustin');assert.equal(l[0].jugadas,3);assert.match(l[0].pgn,/e4 c5/);
 assert.throws(()=>a.cargarPartidasAperturas(p+'\n[Event "Rota"]\n\n1. Kxe8 *'),/partida 2/);
 assert.throws(()=>a.cargarPartidasAperturas(Array(31).fill(p).join('\n\n')),/30 partidas/);
 assert.throws(()=>a.cargarPartidasAperturas('x'.repeat(2000001)),/2 MB/);
});
test('Los errores de apertura usan solo el color propio, hasta la jugada 15 y con mejora disponible',()=>{
 const base={numero:5,color:'b',perdidaCentipeones:150,mejorJugadaSan:'d5',varianteSan:['d5']};
 const s={color:'b',resultado:{jugadas:[base,{...base,numero:16},{...base,color:'w'},{...base,perdidaCentipeones:70},{...base,mejorJugadaSan:null},{...base,numero:8,perdidaCentipeones:350}]}};
 assert.deepEqual(a.erroresDeApertura(s).map(x=>x.indice),[5,0]);
});
test('La práctica acepta buenas alternativas, evalúa desde el color correcto y no inventa un resultado sin evaluación',()=>{
 assert.equal(a.valorarIntentoApertura(ev(40),ev(20),'w').acierto,true);
 assert.equal(a.valorarIntentoApertura(ev(-40),ev(-20),'b').acierto,true);
 assert.equal(a.valorarIntentoApertura(ev(40),ev(-100),'w').acierto,false);
 assert.equal(a.valorarIntentoApertura(ev(-40),ev(100),'b').acierto,false);
 assert.equal(a.valorarIntentoApertura(ev(40),ev(100),'w').perdida,0);
 assert.throws(()=>a.valorarIntentoApertura({...ev(0),evaluacionCentipawns:null},ev(0),'w'),/comprobar/);
 assert.equal(a.valorarIntentoApertura(ev(0),{...ev(0),mateEn:-2},'w').acierto,false);
 assert.equal(a.valorarIntentoApertura({...ev(0),mateEn:2},{...ev(0),mateEn:8},'w').acierto,true);
 assert.equal(a.valorarIntentoApertura(ev(0),ev(-100),'w','e2e4').acierto,true);
});

test('El lote reconoce ambos colores por identidad y deja sin asignar partidas ajenas o ambiguas',()=>{
 assert.equal(a.detectarColorPartida({blancas:' Agustín Fuentes ',negras:'Rival'},'agustin fuentes'),'w');
 assert.equal(a.detectarColorPartida({blancas:'Rival',negras:'agustin'},'Agustin'),'b');
 assert.equal(a.detectarColorPartida({blancas:'Otro',negras:'Rival'},'agustin'),null);
 assert.equal(a.detectarColorPartida({blancas:'Ale',negras:'Ale'},'Ale'),null);
 assert.equal(a.detectarColorPartida({blancas:'Otro',negras:'Rival'},''),null);
});
