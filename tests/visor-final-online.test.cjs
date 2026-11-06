const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {Chess}=require('chess.js');
const {crearEstadoOnline,unirEstadoOnline,aplicarAccionOnline}=require('../lib/partidaOnline.ts');
const {recorridoOnline}=require('../lib/recorridoOnline.ts');
function probarVisor(partida,color){
 let cursor=0,salidas=0;const estados=[],efectos=[];
 const jsx=(type,props)=>({type,props});function Tablero(){}
 const modulo={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../components/VisorPartidaOnline.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  exports:modulo.exports,module:modulo,document:{addEventListener(){},removeEventListener(){}},
  require(n){
   if(n==='react')return {useState(v){const i=cursor++;if(!(i in estados))estados[i]=typeof v==='function'?v():v;return [estados[i],n=>{estados[i]=typeof n==='function'?n(estados[i]):n;}];},useMemo:fn=>fn(),useRef:v=>({current:v}),useEffect:fn=>efectos.push(fn)};
   if(n==='react/jsx-runtime')return {jsx,jsxs:jsx};
   if(n==='react-chessboard')return {Chessboard:Tablero};
   if(n==='@/lib/recorridoOnline')return {recorridoOnline};
   return new Proxy({},{get:(_,k)=>k==='default'?new Proxy({},{get:(_,v)=>String(v)}):()=>null});
  },
 });
 function buscar(n,p){if(!n||typeof n!=='object')return null;if(p(n))return n;for(const c of [n.props?.children].flat(Infinity)){const r=buscar(c,p);if(r)return r;}return null;}
 function render(){cursor=0;return modulo.exports.VisorPartidaOnline({partida,color,volver:()=>salidas++});}
 let arbol=render();for(const fn of efectos)fn();
 return {get salidas(){return salidas;},posicion:()=>buscar(arbol,n=>n.type===Tablero).props.options.position,
  pulsar(nombre){buscar(arbol,n=>n.type==='button'&&n.props['aria-label']===nombre).props.onClick();arbol=render();}};
}
test('Después del mate conserva la posición final, para ambos jugadores, y deja repasarla sin salir',()=>{
 let estado=unirEstadoOnline(crearEstadoOnline('5+3','w','Uno'),'Dos',1000);
 for(const uci of ['f2f3','e7e5','g2g4','d8h4'])estado=aplicarAccionOnline(estado,estado.turno,{tipo:'mover',uci},estado.desde+1000);
 assert.equal(estado.fase,'terminada');assert.equal(estado.motivo,'Jaque mate');
 for(const color of ['w','b']){
  const v=probarVisor({id:'prueba',creada:'2026-11-06T20:00:00Z',estado},color);
  assert.equal(v.posicion(),estado.fen);assert.ok(new Chess(v.posicion()).isCheckmate());assert.equal(v.salidas,0);
  v.pulsar('Jugada anterior');assert.equal(new Chess(v.posicion()).isCheckmate(),false);assert.equal(v.salidas,0);
  v.pulsar('Ir al comienzo de la partida');assert.equal(v.posicion(),new Chess().fen());
  v.pulsar('Ir al final de la partida');assert.equal(v.posicion(),estado.fen);assert.equal(v.salidas,0);
 }
});
test('Una partida sin movimientos sigue mostrando un tablero válido',()=>{
 const e=unirEstadoOnline(crearEstadoOnline('5+3','w','Uno'),'Dos',1000);
 const estado=aplicarAccionOnline(e,'w',{tipo:'rendirse'},2000);
 const v=probarVisor({id:'sin-jugadas',creada:'2026-11-06T20:00:00Z',estado},'w');
 assert.equal(v.posicion(),new Chess().fen());assert.equal(v.salidas,0);
});
