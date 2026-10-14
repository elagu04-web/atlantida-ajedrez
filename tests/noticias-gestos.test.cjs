const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');

// Run the actual component's input handlers with a small DOM/event host. In
// particular, reproduce the pointercancel that interrupts a mobile swipe.
function carrusel(){
  let tiempo=100;
  const efectos=[],cambios=[],escuchas=new Map(),refs=[];
  const props={};
  const elemento={dataset:{},style:{setProperty:(k,v)=>props[k]=v,removeProperty:k=>delete props[k]},
    querySelector:()=>({offsetWidth:280}),hasPointerCapture:()=>false,setPointerCapture:()=>{},releasePointerCapture:()=>{},
    addEventListener:(k,fn,options)=>escuchas.set(k,{fn,options}),removeEventListener:k=>escuchas.delete(k)};
  const react={useId:()=> 'noticias',useRef:v=>{const ref={current:v};refs.push(ref);return ref;},
    useState:v=>[v,x=>cambios.push(x)],useCallback:fn=>fn,useEffect:fn=>efectos.push(fn)};
  const jsx=(type,props)=>({type,props});
  const modulo={exports:{}};
  const source=fs.readFileSync(path.join(__dirname,'../components/CarruselNoticias.tsx'),'utf8');
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(compiled,{exports:modulo.exports,module:modulo,performance:{now:()=>tiempo},Date,
    require:n=>n==='react'?react:n==='react/jsx-runtime'?{jsx,jsxs:jsx}:n==='@/lib/noticias'?{fechaNoticia:()=>'',minutosNoticia:()=>1}:n==='./Icono'?{Icono:()=>null}:{default:()=>null}});
  const noticias=Array.from({length:6},(_,i)=>({slug:String(i),titulo:'Noticia '+i,fecha:'2026-10-13',imagen:'/foto.png'}));
  const arbol=modulo.exports.CarruselNoticias({noticias});
  const buscar=n=>{if(!n||typeof n!=='object')return null;if(n.props?.className==='news-track')return n;return [n.props?.children].flat(Infinity).map(buscar).find(Boolean);};
  const pista=buscar(arbol).props;refs[0].current=elemento;
  const limpiar=efectos.map(fn=>fn());
  const toque=(x,y,id=1)=>({identifier:id,clientX:x,clientY:y});
  function enviar(tipo,touches,changedTouches=touches){
    tiempo+=100;
    const evento={touches,changedTouches,cancelable:true,evitado:false,preventDefault(){this.evitado=true;}};
    escuchas.get(tipo).fn(evento);return evento;
  }
  return {pista,elemento,cambios,escuchas,toque,enviar,limpiar};
}

test('El swipe táctil completa el cambio aunque el navegador cancele los pointer events',()=>{
  const c=carrusel();c.enviar('touchstart',[c.toque(250,200)]);
  assert.equal(c.enviar('touchmove',[c.toque(220,207)]).evitado,true);
  c.pista.onPointerCancel({pointerType:'touch',pointerId:1});
  c.pista.onLostPointerCapture({target:c.elemento,currentTarget:c.elemento});
  c.pista.onPointerLeave();
  c.enviar('touchmove',[c.toque(140,220)]);c.enviar('touchend',[],[c.toque(140,220)]);
  assert.deepEqual(c.cambios,[1]);assert.equal(c.elemento.dataset.arrastrando,undefined);
});
test('Un swipe hacia la derecha vuelve a la última noticia sin atascarse',()=>{
  const c=carrusel();c.enviar('touchstart',[c.toque(100,200)]);c.enviar('touchmove',[c.toque(190,205)]);c.enviar('touchend',[],[c.toque(190,205)]);assert.deepEqual(c.cambios,[5]);
});
test('Los gestos verticales mantienen el scroll de la página y no cambian noticia',()=>{
  const c=carrusel();c.enviar('touchstart',[c.toque(180,200)]);
  assert.equal(c.enviar('touchmove',[c.toque(183,225)]).evitado,false);
  assert.equal(c.enviar('touchmove',[c.toque(195,320)]).evitado,false);
  c.enviar('touchend',[],[c.toque(195,320)]);assert.deepEqual(c.cambios,[]);
});
test('El movimiento algo diagonal se reconoce y conserva la dirección horizontal',()=>{
  const c=carrusel();c.enviar('touchstart',[c.toque(250,200)]);
  assert.equal(c.enviar('touchmove',[c.toque(235,217)]).evitado,true);
  c.enviar('touchmove',[c.toque(130,260)]);c.enviar('touchend',[],[c.toque(130,260)]);assert.deepEqual(c.cambios,[1]);
});
test('Un toque abre el enlace, pero al soltar un swipe no abre una noticia por accidente',()=>{
  const c=carrusel();c.enviar('touchstart',[c.toque(180,200)]);c.enviar('touchend',[],[c.toque(180,200)]);
  let blocked=false;const click=()=>({detail:1,preventDefault(){blocked=true;},stopPropagation(){}});
  c.pista.onClickCapture(click());assert.equal(blocked,false);
  c.enviar('touchstart',[c.toque(250,200)]);c.enviar('touchmove',[c.toque(150,200)]);c.enviar('touchend',[],[c.toque(150,200)]);
  c.pista.onClickCapture(click());assert.equal(blocked,true);
});
test('Dos dedos dejan libre el zoom y cancelan el gesto del carrusel',()=>{
  const c=carrusel();c.enviar('touchstart',[c.toque(250,200)]);c.enviar('touchmove',[c.toque(150,200)]);
  assert.equal(c.enviar('touchmove',[c.toque(150,200),c.toque(280,200,2)]).evitado,false);
  c.enviar('touchend',[],[c.toque(150,200)]);assert.deepEqual(c.cambios,[]);
});
test('Un arrastre corto y lento vuelve a su tarjeta; touchcancel limpia el gesto',()=>{
  const c=carrusel();c.enviar('touchstart',[c.toque(250,200)]);c.enviar('touchmove',[c.toque(230,200)]);c.enviar('touchend',[],[c.toque(230,200)]);assert.deepEqual(c.cambios,[]);
  c.enviar('touchstart',[c.toque(250,200)]);c.enviar('touchmove',[c.toque(150,200)]);c.enviar('touchcancel',[]);assert.deepEqual(c.cambios,[]);assert.equal(c.elemento.dataset.arrastrando,undefined);
});
test('Se registra touchmove no pasivo y se eliminan los listeners al desmontar',()=>{
  const c=carrusel();assert.equal(c.escuchas.get('touchmove').options.passive,false);c.limpiar.forEach(fn=>fn?.());assert.equal(c.escuchas.size,0);
});
test('El arrastre de mouse sigue cambiando noticia y no se mezcla con los toques',()=>{
  const c=carrusel();
  const evento=x=>({pointerId:7,pointerType:'mouse',isPrimary:true,button:0,buttons:1,clientX:x,clientY:200,currentTarget:c.elemento,preventDefault(){}});
  c.pista.onPointerDown(evento(250));c.pista.onPointerMove(evento(150));c.pista.onPointerUp(evento(150));assert.deepEqual(c.cambios,[1]);
});
test('Touchend incorpora el último desplazamiento aunque no haya llegado un touchmove final',()=>{
  const c=carrusel();c.enviar('touchstart',[c.toque(250,200)]);c.enviar('touchmove',[c.toque(235,201)]);c.enviar('touchend',[],[c.toque(140,204)]);assert.deepEqual(c.cambios,[1]);
});
