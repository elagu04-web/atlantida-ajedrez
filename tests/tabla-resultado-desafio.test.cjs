const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const ts=require('typescript');const React=require('react');const {renderToStaticMarkup}=require('react-dom/server');
const filas=[{nombre:'Ejemplo A',racha_actual:3,mejor_racha:4,total:10,ultimo_dia:'2026-11-17'},{nombre:'Ejemplo B',racha_actual:0,mejor_racha:2,total:6,ultimo_dia:'2026-11-15'}];
function renderTabla(enResultado){
 const estados=[filas,'listo','actual',0];const m={exports:{}};
 const fuente=ts.transpileModule(fs.readFileSync(require.resolve('../components/TablaRachas.tsx'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const dep={'react':{...React,useState:()=>[estados.shift(),()=>{}]},'next/link':({children,href})=>React.createElement('a',{href},children),'@/lib/supabase':{},'./Icono':{Icono:()=>null},'@/context/AuthContext':{useAuth:()=>({session:null,cargando:false})}};
 new Function('require','module','exports',fuente)(n=>n in dep?dep[n]:require(n),m,m.exports);
 return renderToStaticMarkup(React.createElement(m.exports.TablaRachas,{enResultado,miNombre:'Ejemplo B'}));
}
test('la tabla del resultado incluye a quien perdió la racha y conserva su total',()=>{const html=renderTabla(true);assert.match(html,/Ejemplo B/);assert.match(html,/data-es-mio="true"/);assert.match(html,/>Vos<\//);assert.match(html,/>6<\//);assert.match(html,/>16<\//);});
test('racha y resueltos se muestran juntos sin ocultar el total en celular',()=>{const html=renderTabla(true);assert.match(html,/Rachas y resueltos/);assert.match(html,/Desafíos resueltos/);assert.doesNotMatch(html,/hidden md:table-cell/);});
test('la tabla pública conserva su filtro de rachas activas',()=>{const html=renderTabla(false);assert.match(html,/Ejemplo A/);assert.doesNotMatch(html,/Ejemplo B/);assert.match(html,/id="rachas"/);});
