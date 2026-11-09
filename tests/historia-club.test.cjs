const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const datos=require('../data/historia-blog.json');
const m={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/historiaClub.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,{module:m,exports:m.exports,require:n=>{assert.equal(n,'@/data/historia-blog.json');return datos;},Intl,Date,URL});
const {filtrarHistoria,normalizarHistoria,fechaHistoria,hitosHistoria,slugHistoria}=m.exports;
const porAnio={2010:26,2011:29,2012:85,2013:97,2014:52,2015:43,2016:17,2017:2,2018:10,2019:14,2020:19,2021:3,2022:3,2023:3};
test('Se conserva el archivo completo: 403 entradas únicas, incluidas las 20 sin título',()=>{
 assert.equal(datos.length,403);assert.equal(new Set(datos.map(p=>p.id)).size,403);assert.equal(new Set(datos.map(p=>p.fuente)).size,403);
 assert.equal(datos.filter(p=>p.sinTitulo).length,20);
 for(const [anio,cantidad] of Object.entries(porAnio))assert.equal(filtrarHistoria({anio}).length,cantidad,anio);
 assert.equal(filtrarHistoria({orden:'antiguas'})[0].fecha,'2010-08-16');assert.equal(datos[0].fecha,'2023-06-09');
});
test('El buscador funciona sin tildes, encuentra menciones del texto y combina filtros',()=>{
 assert.equal(normalizarHistoria('  ÁTLÁNTIDA  '),'atlantida');
 assert.equal(filtrarHistoria({buscar:'Atlántida'}).length,filtrarHistoria({buscar:'atlantida'}).length);
 const encontrados=filtrarHistoria({buscar:'Visillac'});assert.ok(encontrados.length>0);
 assert.ok(filtrarHistoria({anio:'2013',fotos:true,categoria:'Vida del club'}).every(p=>p.anio===2013&&p.fotos.length&&p.categoria==='Vida del club'));
 assert.equal(filtrarHistoria({buscar:'zzzinexistentezzz'}).length,0);
});
test('Las 371 imágenes recuperadas y sus miniaturas existen localmente; cada noticia conserva su fuente',()=>{
 const distintas=new Set();for(const p of datos){assert.match(p.fecha,/^\d{4}-\d{2}-\d{2}$/);assert.equal(new URL(p.fuente).hostname,'ajedrezenlifa.blogspot.com');assert.ok(p.titulo.trim());
  for(const f of p.fotos){distintas.add(f.src);assert.ok(f.ancho>0&&f.alto>0);for(const ruta of [f.src,f.mini]){assert.match(ruta,/^\/imagenes\/historia\/archivo-[a-f0-9]{16}(-mini)?\.webp$/);assert.ok(fs.statSync(path.join(__dirname,'../public',ruta)).size>0,ruta);}}
 }assert.equal(distintas.size,371);
});
test('La fecha mantiene el día del blog y la cronología enlaza recuerdos verificables',()=>{
 assert.match(fechaHistoria('2010-08-16'),/16.*agosto.*2010/);
 assert.equal(hitosHistoria.length,9);for(const h of hitosHistoria)assert.equal(new URL(h.fuente).hostname,'ajedrezenlifa.blogspot.com');
 const ordenados=filtrarHistoria({orden:'antiguas'});assert.ok(ordenados.every((p,i)=>!i||p.fecha>=ordenados[i-1].fecha));
});
test('Las 16 noticias de la página solicitada están incluidas y las 403 tienen ruta propia',()=>{
 const origen=require('../data/historia-blog-origen.json');
 assert.equal(origen.paginaSolicitada.publicaciones.length,16);
 for(const url of origen.paginaSolicitada.publicaciones)assert.ok(datos.some(p=>p.fuente===url),url);
 assert.equal(new Set(datos.map(p=>slugHistoria(p))).size,403);
});
test('Las noticias completas usan solamente texto y elementos seguros, con imágenes locales',()=>{
 const contenidos=require('../data/historia-contenidos.json');assert.equal(Object.keys(contenidos).length,403);
 const tags=new Set('div h2 h3 h4 h5 h6 strong b em i u s blockquote ul ol li table thead tbody tfoot tr td th pre code br hr a img'.split(' '));
 let imagenes=0,letras=0;
 function revisar(nodos){for(const n of nodos){if(typeof n==='string'){letras+=n.length;continue;}assert.ok(tags.has(n.tag),n.tag);for(const k of Object.keys(n))assert.ok(['tag','hijos','href','src','ancho','alto','alt','colspan','rowspan'].includes(k),k);if(n.href)assert.ok(['http:','https:'].includes(new URL(n.href).protocol));if(n.tag==='img'){imagenes++;assert.match(n.src,/^\/imagenes\/historia\/archivo-[a-f0-9]{16}\.webp$/);}revisar(n.hijos||[]);}}
 for(const p of datos){assert.ok(Array.isArray(contenidos[p.id]));revisar(contenidos[p.id]);}
 assert.ok(letras>190000);assert.equal(imagenes,371);
});
