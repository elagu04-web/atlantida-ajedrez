const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const{Chess}=require('chess.js');const a=require('../lib/entrenamientoAperturas.ts');const g=require('../lib/entrenamientoGuiado.ts');const{registrarPractica}=require('../lib/entrenamientoPersonal.ts');const{EntrenamientoCuenta}=require('../lib/entrenamientoCuenta.ts');
const fecha=new Date('2026-10-14T20:00:00Z');
test('PGN conserva las variantes y subvariantes desde la posición correcta',()=>{
 const lineas=a.importarRepertorio('1. e4 c5 (1... e6 2. d4 d5 (2... Nf6 3. Nc3)) 2. Nf3 d6 *','b','Negras');
 assert.equal(a.importarRepertorio('1. e4 e5 (1... c5) (1... e6) 2. Nf3 *','b').length,3);assert.equal(lineas.length,3);assert.deepEqual(lineas.map(l=>a.posicionLinea(l,l.movimientos.length).history().join(' ')).sort(),['e4 c5 Nf3 d6','e4 e6 d4 Nf6 Nc3','e4 e6 d4 d5'].sort());
 assert.throws(()=>a.importarRepertorio('1. e4 (1. d4','w'),/paréntesis/);assert.throws(()=>a.importarRepertorio('1. e4 c5 2. Kxe8','w'),/jugada/);
});
test('Varios PGN, promoción y posiciones con negras al turno sobreviven a exportar y volver a cargar',()=>{
 const fen='7k/P7/8/8/8/8/8/7K w - - 0 1';const p=`[Event "Promoción"]\n[SetUp "1"]\n[FEN "${fen}"]\n\n1. a8=N *`;
 const l=a.importarRepertorio(p,'w')[0];assert.equal(l.movimientos[0],'a7a8n');assert.equal(a.importarRepertorio(a.exportarRepertorio([l]),'w')[0].id,l.id);
 const negra=a.nuevaLinea('Negra','b',new Chess().fen(),['e2e4','e7e6']);const r=a.comenzarLinea(a.agregarLineas(a.repertorioInicial(),[negra]),negra,fecha);assert.equal(r.recorrido.indice,1);assert.equal(a.posicionLinea(negra,r.recorrido.indice).turn(),'b');
});
test('3865 aperturas del catálogo son legales y el reconocimiento incluye la siciliana',()=>{
 const catalogo=require('../data/aperturas-catalogo.json');assert.equal(catalogo.length,3865);for(const x of catalogo){const c=new Chess();c.loadPgn(x.pgn);assert.equal(c.fen().split(' ').slice(0,4).join(' '),x.fen);}
 assert.match(a.reconocerApertura('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 *').nombre,/Sicilian/);assert.ok(a.buscarAperturas('francesa').some(x=>x.nombre.includes('French')));
});
test('Notas, archivo, progreso y variantes offline se unen sin borrar el repertorio anterior',()=>{
 const [l]=a.importarRepertorio('1. e4 e6 2. d4 d5 *','b');let p=a.agregarLineas(a.repertorioInicial(),[l]);const q=structuredClone(p);q.lineas[l.id]={...l,notas:'Romper con c5',activa:false,actualizada:'2026-10-14T21:00:00Z'};
 p.lineas[l.id].practica=registrarPractica(undefined,true,false,fecha);p.lineas[l.id].practicaActualizada=fecha.toISOString();const [otra]=a.importarRepertorio('1. d4 d5 2. c4 e6 *','b');p=a.agregarLineas(p,[otra]);
 const unido=a.combinarRepertorios(p,q);assert.equal(Object.keys(unido.lineas).length,2);assert.equal(unido.lineas[l.id].notas,'Romper con c5');assert.equal(unido.lineas[l.id].activa,false);assert.equal(unido.lineas[l.id].practica.aciertos,1);
 const guiado=g.leerProgresoGuiado(JSON.stringify({...g.progresoGuiadoInicial(),aperturas:unido}));assert.deepEqual(guiado.aperturas,unido);assert.deepEqual(g.combinarProgresoGuiado(guiado,g.progresoGuiadoInicial()).aperturas,unido);
});
test('La cuenta guarda el recorrido y lo recupera en otro dispositivo',async()=>{
 const docs=new Map(),transporte={listar:async()=>[...docs.values()],guardar:async(clave,datos,revision)=>{const d={clave,datos:structuredClone(datos),revision:revision+1};docs.set(clave,d);return{...d,conflicto:false};}};const almacen=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};const pc=new EntrenamientoCuenta('usuario',almacen(),transporte),cel=new EntrenamientoCuenta('usuario',almacen(),transporte);
 try{const [l]=a.importarRepertorio('1. e4 e6 2. d4 d5 *','b');const p=a.comenzarLinea(a.agregarLineas(a.repertorioInicial(),[l]),l,fecha);pc.guardarGuiado({...g.progresoGuiadoInicial(),aperturas:p});await pc.sincronizar();await cel.sincronizar();assert.equal(cel.leer().guiado.aperturas.recorrido.indice,1);assert.equal(cel.leer().guiado.aperturas.lineas[l.id].color,'b');}finally{pc.detener();cel.detener();}
});
test('Las mejoras de apertura conservan el camino previo y reemplazan la decisión errónea',()=>{
 const pgn='1. f3 e5 2. g4 Qh4# 0-1';const c=new Chess();c.loadPgn(pgn);const h=c.history({verbose:true});const s={pgn,color:'w',titulo:'Ejemplo',resultado:{jugadas:[{}, {},{numero:2,color:'w',san:'g4',mejorJugadaSan:'e4',perdidaCentipeones:700,varianteSan:['e4','Nf6']} ]}};const l=a.mejoraDeApertura(s,2);assert.deepEqual(a.posicionLinea(l,l.movimientos.length).history(),['f3','e5','e4','Nf6']);assert.equal(h[2].before,a.posicionLinea(l,2).fen());
});
