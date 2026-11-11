const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const archivo=require.resolve('../components/RevisionDesafio.tsx');
const m={exports:{}};
const fuente=ts.transpileModule(fs.readFileSync(archivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
new Function('require','module','exports',fuente)(require,m,m.exports);
const {RevisionDesafio,BotonTablaDesafio}=m.exports;
function revisar(autenticado,terminado){return renderToStaticMarkup(React.createElement(RevisionDesafio,{autenticado,terminado,puzzleId:'abc12',solucion:['Dh7+','Rf8','Dh8#']}));}
test('no publica enlaces ni solución sin cuenta, incluso al terminar una práctica',()=>{
  for(const terminado of [false,true]){const html=revisar(false,terminado);assert.doesNotMatch(html,/href=|Dh7|Dh8/);assert.match(html,/Iniciá sesión/);}
});
test('una cuenta con intento pendiente no puede abrir el original ni leer la solución',()=>{
  const html=revisar(true,false);assert.doesNotMatch(html,/href=|Dh7|Dh8/);assert.match(html,/cuando resolvés el desafío o fallás/);
});
test('un intento terminado habilita revisión y original para la cuenta',()=>{
  const html=revisar(true,true);assert.match(html,/https:\/\/lichess.org\/training\/abc12/);assert.match(html,/Dh7/);assert.match(html,/Repasar la solución/);
});
test('el acceso al resultado lleva directamente a la tabla de rachas',()=>{
  const html=renderToStaticMarkup(React.createElement(BotonTablaDesafio));assert.match(html,/href="\/desafios#rachas"/);assert.match(html,/Ver tabla de rachas/);
});
