const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {Chess}=require('chess.js');
const f=require('../lib/finalesPersonales.ts');
const {leerBibliotecaEntrenamiento,crearSesionEntrenamiento}=require('../lib/entrenamientoPersonal.ts');
const {EntrenamientoCuenta,combinarSesionCuenta}=require('../lib/entrenamientoCuenta.ts');
const fen='8/4k3/8/4K3/4P3/8/8/8 w - - 0 1',hora='2026-10-16T16:00:00.000Z';
function partida(){
 const c=new Chess(fen);c.move('Kf5');c.move('Kf7');
 return {id:'partida-final',titulo:'Jugador · Rival',color:'w',creada:hora,actualizada:hora,pgn:c.pgn(),practicas:{},resultado:{peorJugadaBlancas:null,peorJugadaNegras:null,jugadas:c.history({verbose:true}).map((m,i)=>({numero:1,color:m.color,san:m.san,fenAntes:m.before,perdidaCentipeones:i===0?150:0,mejorJugadaSan:m.color==='w'?'Kd5':'Kd6',varianteSan:null,piezaColgada:null,llevaAMate:false,piezaMovida:'Rey',estabaEnJaque:false}))}};
}
function estado(){return {fen,ruta:['e5f5','e7f7'],errores:0,ayudas:0,valoracion:'ganar',plan:'activar',nota:'Acercar el rey antes de avanzar',actualizada:hora};}
test('Detecta finales por material, también desde FEN en la jugada uno; no confunde el medio juego sin damas',()=>{
 assert.equal(f.familiaFinal(fen),'Reyes y peones');
 assert.equal(f.familiaFinal('8/4k3/8/8/8/4K3/4P3/R6r w - - 0 1'),'Torres');
 assert.equal(f.familiaFinal(new Chess().fen()),null);
 const c=new Chess();c.remove('d1');c.remove('d8');assert.equal(f.familiaFinal(c.fen()),null);
 assert.equal(f.familiaFinal('8/8/8/8/8/4K3/8/7k w - - 0 1'),null);
 assert.equal(f.familiaFinal('corrupta'),null);
});
test('Propone decisiones propias, identifica el origen y no atribuye al usuario los errores del rival',()=>{
 const s=partida();const es=f.finalesDePartidas([s]);assert.equal(es.length,1);assert.equal(es[0].indice,0);assert.equal(es[0].fen,fen);assert.equal(es[0].errorDetectado,true);
 s.color='b';assert.equal(f.finalesDePartidas([s])[0].indice,1);assert.equal(f.finalesDePartidas([s])[0].errorDetectado,false);
});
test('Un recorrido solo se guarda en una posición estable; rechaza rutas ilegales, desmedidas o de otra partida',()=>{
 assert.equal(f.estadoFinalValido(estado(),fen,'w'),true);
 assert.equal(f.posicionFinal(estado()).turn(),'w');
 assert.equal(f.estadoFinalValido({...estado(),ruta:['e5f5']},fen,'w'),false);
 assert.equal(f.estadoFinalValido({...estado(),ruta:['a1a8']},fen,'w'),false);
 assert.equal(f.estadoFinalValido({...estado(),ruta:Array(401).fill('e5f5')},fen,'w'),false);
 const s=partida();s.finales={'0':estado()};assert.equal(leerBibliotecaEntrenamiento(JSON.stringify([s])).length,1);
 s.finales['0'].fen=new Chess().fen();assert.equal(leerBibliotecaEntrenamiento(JSON.stringify([s])).length,0);
});
test('Reanalizar conserva el recorrido compatible, y editar notas o practicar otro final no lo borra',()=>{
 const s=partida();s.finales={'0':estado()};
 const otra=structuredClone(s);delete otra.finales;otra.notas={'0':'Nota en otro dispositivo'};otra.notasActualizadas={'0':'2026-10-16T17:00:00Z'};otra.actualizada='2026-10-16T17:00:00Z';
 const unido=combinarSesionCuenta(s,otra);assert.deepEqual(unido.finales['0'].ruta,estado().ruta);assert.equal(unido.notas['0'],'Nota en otro dispositivo');
 const nuevo=crearSesionEntrenamiento([s],s.pgn,s.color,s.resultado,'otro');assert.deepEqual(nuevo.finales['0'].ruta,estado().ruta);
 const distinto=structuredClone(s.resultado);distinto.jugadas[0].fenAntes='8/4k3/8/4K3/3P4/8/8/8 w - - 0 1';
 assert.equal(Object.keys(crearSesionEntrenamiento([s],s.pgn,s.color,distinto,'otro').finales).length,0);
});
test('Acepta alternativas, normaliza el color negro y no equipara mate a una evaluación en peones',()=>{
 const a=(cp,mejor='e5f5',mate=null)=>({evaluacionCentipawns:cp,mejorJugada:mejor,mateEn:mate,profundidad:20,variantePrincipal:[mejor]});
 assert.equal(f.compararDecisionFinal(a(150),a(100),'w','e5d5').acierto,true);
 assert.equal(f.compararDecisionFinal(a(-150),a(0),'b','e7f7').acierto,false);
 assert.equal(f.compararDecisionFinal(a(null,'e5f5',4),a(null,'e5f5',7),'w','e5d5').acierto,true);
 assert.throws(()=>f.compararDecisionFinal(a(null),a(100),'w','e5f5'),/comprobar/);
});
test('Distingue victoria, derrota y tablas reales, sin adjudicar el final por una puntuación del motor',()=>{
 const mate=new Chess('7k/6Q1/5K2/8/8/8/8/8 b - - 0 1');assert.equal(f.resultadoFinal(mate,'w'),'victoria');assert.equal(f.resultadoFinal(mate,'b'),'derrota');
 assert.equal(f.resultadoFinal(new Chess('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1'),'w'),'tablas');
 assert.equal(f.resultadoFinal(new Chess(fen),'w'),null);
});
test('La cuenta recupera ruta, plan y práctica en otro dispositivo sin contaminar la cuenta invitada',async()=>{
 const docs=new Map(),transporte={listar:async()=>[...docs.values()],guardar:async(clave,datos,revision)=>{const d={clave,datos:structuredClone(datos),revision:revision+1};docs.set(clave,d);return{...d,conflicto:false};}};
 const almacen=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
 const pc=new EntrenamientoCuenta('persona',almacen(),transporte),cel=new EntrenamientoCuenta('persona',almacen(),transporte),invitado=new EntrenamientoCuenta('invitado',almacen(),null);
 try {const s=partida();s.finales={'0':estado()};pc.guardarSesion(s);await pc.sincronizar();await cel.sincronizar();assert.deepEqual(cel.leer().sesiones[0].finales['0'],estado());assert.equal(invitado.leer().sesiones.length,0);}finally{pc.detener();cel.detener();invitado.detener();}
});
