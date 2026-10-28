const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function cargarTs(file){const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(require.resolve(file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports);return m.exports;}
const {leerCatalogoClases}=cargarTs('../lib/mesaClasesInterfaz.ts'),{vestirMesaClases}=cargarTs('../lib/temaMesaClases.ts');
test('El catálogo integrado admite datos de presentación sin inyectar HTML ni URLs',()=>{
 const items=leerCatalogoClases([{id:'caballo',title:'Caballo',description:'Saltá',category:'challenge',size:8,preview:['♘'],order:2,cover:'<script>mal</script>'},{id:'../secreto',title:'No',category:'game'},{id:'otro',title:'No',category:'secreto'}]);
 assert.equal(items.length,1);assert.equal(items[0].id,'caballo');assert.equal(items[0].cover,undefined);assert.equal(items[0].rows,8);assert.deepEqual(leerCatalogoClases(null),[]);
});
test('Se integra solamente el documento principal; las reglas y recursos privados siguen relativos',()=>{
 const html='<html><head><script defer src="reglas.js"></script><script defer src="piezas.js"></script><script defer src="sonidos.js"></script></head><body><section id="tateti-screen"></section></body></html>';
 const integrado=vestirMesaClases(html,true),pantalla=vestirMesaClases(html);
 assert.ok(integrado.includes('clases-integradas.css'));assert.ok(integrado.includes('clases-recursos/integracion.js'));assert.ok(integrado.includes('src="reglas.js"'));assert.ok(integrado.includes('id="tateti-screen"'));assert.ok(integrado.includes('clases-recursos/piezas.js'));assert.ok(!pantalla.includes('clases-recursos/integracion.js'));assert.ok(!pantalla.includes('clases-integradas.css'));
});
test('El puente ignora ventanas ajenas, orígenes externos y juegos inexistentes',()=>{
 const listeners={},events={},sent=[],opened=[],parent={postMessage:(data,origin)=>sent.push({data,origin})};
 const root={parent,Mesa:{modes:()=>[{id:'normal',title:'Ajedrez',size:8,order:0,preview:[]}],mode:id=>id==='normal'?{id,screen:'normal-screen'}:undefined,current:()=> 'menu',navigate:id=>opened.push(id)},MesaSound:{isEnabled:()=>true,setEnabled:()=>{}},addEventListener:(name,fn)=>listeners[name]=fn};
 const context={globalThis:root,location:{origin:'https://club.test'},document:{getElementById:()=>null,body:{dataset:{},getBoundingClientRect:()=>({height:500})},documentElement:{style:{setProperty:()=>{}}},addEventListener:(name,fn)=>events[name]=fn},requestAnimationFrame:fn=>fn(),ResizeObserver:class{observe(){}},MutationObserver:class{observe(){}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/clases-recursos/integracion.js'),'utf8'),context);events.DOMContentLoaded();
 assert.ok(sent.some(s=>s.data.tipo==='catalogo'&&s.origin==='https://club.test'));
 const msg=(source,origin,id)=>listeners.message({source,origin,data:{canal:'atlantida-clases-v1',tipo:'abrir',id}});
 msg({},'https://club.test','normal');msg(parent,'https://atacante.test','normal');msg(parent,'https://club.test','inventado');assert.equal(opened.length,0);msg(parent,'https://club.test','normal');assert.deepEqual(opened,['normal']);
});
test('Las piezas de clase usan SVG locales cburnett sin sustituir el dragón ni romper reservas',()=>{
 const root={DragonArtAssets:{wD:'dragon.svg'}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/clases-recursos/piezas.js'),'utf8'),{globalThis:root});
 assert.ok(root.PieceArt.html('n','w','reserve-art').includes('/piezas/cburnett/wN.svg'));assert.ok(root.PieceArt.fromGlyph('♛').includes('/piezas/cburnett/bQ.svg'));assert.ok(root.PieceArt.html('d','w').includes('dragon.svg'));assert.equal(root.PieceArt.html('<script>','w'),'');
 for(const color of ['w','b'])for(const p of ['K','Q','R','B','N','P'])assert.ok(fs.readFileSync(require.resolve('../public/piezas/cburnett/'+color+p+'.svg'),'utf8').includes('<svg'));
});
test('El sonido de madera se emite una vez por movimiento y respeta silenciar',()=>{
 const counts={sources:0},events={},listeners={},button={dataset:{},setAttribute(){},addEventListener(){}},param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}),node=()=>({gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){},start(){},stop(){}});
 class Audio{constructor(){this.state='running';this.currentTime=0;this.sampleRate=48000;}createGain(){return node()}createDynamicsCompressor(){return {threshold:param(),ratio:param(),connect(){}}}createBuffer(){return {getChannelData:()=>new Float32Array(100)}}createBufferSource(){counts.sources++;return node()}createBiquadFilter(){return node()}createOscillator(){return node()}}
 const root={AudioContext:Audio,addEventListener:(n,fn)=>listeners[n]=fn,dispatchEvent(){}},storage=new Map();
 vm.runInNewContext(fs.readFileSync(require.resolve('../public/clases-recursos/sonidos.js'),'utf8'),{globalThis:root,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{hidden:false,createElement:()=>button,getElementById:()=>({before(){}}),addEventListener:(n,fn)=>events[n]=fn},CustomEvent:class{},Math});
 assert.equal(counts.sources,0);events.pointerdown();root.MesaSound.play('move');assert.equal(counts.sources,1);assert.equal(button.dataset.soundCount,'1');root.MesaSound.setEnabled(false);root.MesaSound.play('capture');assert.equal(counts.sources,1);root.MesaSound.setEnabled(true);root.MesaSound.play('capture');assert.equal(counts.sources,2);
});
