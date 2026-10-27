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
const {resolverJugadaInicial,combinarDesdeCero}=require('../lib/aprenderDesdeCero.ts');
const leccion=id=>LECCIONES_INICIALES.find(l=>l.id===id);
test('Al paso retira el peón correcto con ambos colores y deja de ser legal al perder el turno',()=>{
 for(const [id,casillaCapturada] of [['al-paso','d5'],['al-paso-negras','e4']]){const l=leccion(id),c=new Chess(fenResuelto(l));assert.equal(c.get(casillaCapturada),undefined);assert.equal(c.get(l.destino).type,'p');assert.equal(resolverJugadaInicial({...l,fen:l.fen.replace(/ [de][36] /,' - ')},l.origen,l.destino),null);}
 const l={...leccion('al-paso'),fen:'7k/8/8/K2pP2r/8/8/8/8 w - d6 0 1'};assert.equal(resolverJugadaInicial(l,'e5','d6'),null,'Al paso no puede descubrir jaque al rey propio');
});
test('La coronación requiere elegir, acepta las cuatro piezas y permite evitar el ahogado con caballo',()=>{
 const l=leccion('coronacion');assert.equal(resolverJugadaInicial(l,l.origen,l.destino),null);
 for(const p of ['q','r','b','n']){const r=resolverJugadaInicial(l,l.origen,l.destino,p);assert.ok(r);assert.equal(new Chess(r.fen).get(l.destino).type,p);assert.equal(r.uci,'a7a8'+p);}
 const sub=leccion('subpromocion');assert.equal(resolverJugadaInicial(sub,'c7','c8','q'),null);assert.ok(new Chess(fenResuelto(sub)).isCheck());const q=new Chess(sub.fen);q.move({from:'c7',to:'c8',promotion:'q'});assert.ok(q.isStalemate());
});
test('Enroques corto/largo: mueve la torre, exige derechos y no puede cruzar jaque',()=>{
 const corto=leccion('enroque-corto'),largo=leccion('enroque-largo');assert.equal(new Chess(fenResuelto(corto)).get('f1').type,'r');assert.equal(new Chess(fenResuelto(largo)).get('d1').type,'r');
 assert.equal(resolverJugadaInicial({...corto,fen:corto.fen.replace(' K ',' - ')},'e1','g1'),null);
 assert.equal(resolverJugadaInicial({...corto,fen:leccion('enroque-prohibido').fen},'e1','g1'),null);
 assert.equal(resolverJugadaInicial({...corto,fen:'k3r3/8/8/8/8/8/8/4K2R w K - 0 1'},'e1','g1'),null);
 assert.equal(resolverJugadaInicial({...corto,fen:'k5r1/8/8/8/8/8/8/4K2R w K - 0 1'},'e1','g1'),null);
 assert.equal(resolverJugadaInicial({...corto,fen:'4k3/8/8/8/8/8/8/4KB1R w K - 0 1'},'e1','g1'),null);
 assert.ok(resolverJugadaInicial({...corto,fen:'k6r/8/8/8/8/8/8/4K2R w K - 0 1'},'e1','g1'),'La torre atacada no impide enrocar');
 assert.ok(resolverJugadaInicial({...largo,fen:'1r5k/8/8/8/8/8/8/R3K3 w Q - 0 1'},'e1','c1'),'El ataque a b1 no afecta el recorrido del rey');
});
test('Hay seis mates fáciles, se aceptan todas las soluciones de mate y se rechazan las jugadas sin mate',()=>{
 const mates=LECCIONES_INICIALES.filter(l=>l.tipo==='mate');assert.equal(mates.length,6);let alternativas=0;
 for(const l of mates){const c=new Chess(l.fen),jugadas=c.moves({verbose:true});for(const m of jugadas){const copia=new Chess(l.fen);copia.move(m.lan);const r=resolverJugadaInicial(l,m.from,m.to,m.promotion);assert.equal(!!r,copia.isCheckmate(),l.id+': '+m.san);if(r)alternativas++;}assert.ok(new Chess(fenResuelto(l)).isCheckmate());}
 assert.ok(alternativas>mates.length,'Existen soluciones alternativas, no se fuerza una sola');assert.ok(new Chess(leccion('ahogado').fen).isStalemate());
});
test('El progreso antiguo se conserva y recuerda la pieza coronada en cualquier dispositivo',()=>{
 const fecha='2026-10-27T18:00:00Z',a={coronacion:{tablero:true,pregunta:false,fecha,jugada:'a7a8n'},enroque:{tablero:true,pregunta:true,fecha}},b={coronacion:{tablero:false,pregunta:true,fecha,jugada:'a7a8q'}};
 assert.deepEqual(combinarDesdeCero(a,b),combinarDesdeCero(b,a));const p=progresoGuiadoInicial();p.desdeCero=a;const rec=leerProgresoGuiado(JSON.stringify(p));assert.equal(rec.desdeCero.enroque.tablero,true);assert.equal(new Chess(fenResuelto(leccion('coronacion'),rec.desdeCero.coronacion.jugada)).get('a8').type,'n');
});
