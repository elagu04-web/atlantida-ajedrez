const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{Chess}=require('chess.js');
const raiz=path.join(__dirname,'..'),cache=new Map();let opciones;
function cargar(archivo){archivo=path.resolve(archivo);if(cache.has(archivo))return cache.get(archivo).exports;const modulo={exports:{}};cache.set(archivo,modulo);const codigo=ts.transpileModule(fs.readFileSync(archivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 function local(id){if(id.endsWith('.css'))return {__esModule:true,default:{}};if(id==='react-chessboard')return {Chessboard:({options})=>{opciones=options;return React.createElement('div');}};if(id.startsWith('@/'))return cargar(path.join(raiz,id.slice(2)+'.ts'));return require(id);}
 new Function('require','module','exports',codigo)(local,modulo,modulo.exports);return modulo.exports;
}
const {estilosUltimoMovimiento}=cargar(path.join(raiz,'lib/ultimoMovimiento.ts')),{TableroOnline}=cargar(path.join(raiz,'components/TableroOnline.tsx'));
function render(chess,visible=chess,color='w'){renderToStaticMarkup(React.createElement(TableroOnline,{mesa:'prueba',ply:chess.history().length,chess,visible,color,habilitado:false,puedePremover:false,mover:()=>false}));return opciones;}
test('La mesa marca la jugada visible, también antes de confirmarse, sin alterar la partida',()=>{
 const confirmado=new Chess();assert.deepEqual(render(confirmado).squareStyles,{});confirmado.move('e4');const preview=new Chess(confirmado.fen());preview.move('c5');
 const antes=confirmado.fen();assert.deepEqual(Object.keys(render(confirmado,preview,'b').squareStyles),['c7','c5']);assert.equal(confirmado.fen(),antes);
 assert.deepEqual(Object.keys(render(confirmado).squareStyles),['e2','e4']);confirmado.undo();assert.deepEqual(render(confirmado).squareStyles,{});
});
test('Enroque, promoción y captura al paso conservan origen y destino correctos',()=>{
 for(const [fen,uci,casillas] of [
 ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','e1g1',['e1','g1']],
 ['7k/P7/8/8/8/8/8/7K w - - 0 1','a7a8q',['a7','a8']],
 ['7k/8/8/3pP3/8/8/8/7K w - d6 0 2','e5d6',['e5','d6']],
 ]){const chess=new Chess(fen);chess.move(uci);assert.deepEqual(Object.keys(render(chess).squareStyles),casillas);}
 assert.deepEqual(estilosUltimoMovimiento({from:'x9',to:'a1'}),{});assert.deepEqual(estilosUltimoMovimiento(null),{});
});
