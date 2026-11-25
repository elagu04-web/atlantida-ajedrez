const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),{createRequire}=require('node:module');
function cargar(nombre){const archivo=path.join(__dirname,'../lib',nombre+'.ts'),modulo={exports:{}};const js=ts.transpileModule(fs.readFileSync(archivo,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;new Function('require','module','exports',js)(createRequire(archivo),modulo,modulo.exports);return modulo.exports;}
test('Rasgar hacia ambos lados abre al completar el recorrido y permite cancelar sin abrir',()=>{
 const {evaluarRasgado:e}=cargar('rasgadoSobre');
 assert.equal(e(160,0,250).completo,true);assert.equal(e(-160,0,250).completo,true);assert.equal(e(-160,0,250).direccion,-1);
 assert.equal(e(80,0,250).progreso,.5);assert.equal(e(80,0,250).completo,false);assert.equal(e(0,0,250).progreso,0);
 assert.equal(e(200,150,250).completo,false);assert.equal(e(200,0,0).completo,false);assert.equal(e(NaN,0,250).completo,false);
});
test('Cada figurita tiene nueve combinaciones sin cambiar los identificadores que ya se entregaron',()=>{
 const {catalogoAlbum,expandirVersiones}=cargar('album');const todas=expandirVersiones(catalogoAlbum);assert.equal(new Set(todas.map(f=>f.id)).size,catalogoAlbum.length*9);
 for(const base of catalogoAlbum){const versiones=expandirVersiones([base]);assert.equal(versiones.find(f=>f.rareza===base.rareza&&f.version==='normal').id,base.id);assert.equal(versiones.find(f=>f.rareza===base.rareza&&f.version==='foil').id,base.id+':foil');assert.equal(new Set(versiones.map(f=>f.rareza)).size,3);assert.equal(new Set(versiones.map(f=>f.version)).size,3);}
 assert.ok(catalogoAlbum.some(f=>f.id==='especial:charly-suerte'));
});
test('Los fondos y sus firmas son estables, con el Hipopótamo propio de Fonchi',()=>{
 const {arteFigurita}=cargar('arteFiguritas'),{catalogoAlbum}=cargar('album');
 const firmas=catalogoAlbum.map(f=>arteFigurita(f));assert.equal(new Set(firmas.map(f=>f.puntos)).size,catalogoAlbum.length);
 for(const f of catalogoAlbum){const arte=arteFigurita(f);assert.deepEqual(arte,arteFigurita(f));assert.ok(fs.existsSync(path.join(__dirname,'../public',arte.fondo)));if(f.jugadorId==='adaff79d-3a75-4532-8ff7-3ec7238a21b6')assert.ok(arte.fondo.endsWith('/hipopotamo.webp'));}
});
