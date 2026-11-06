const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');

// Keep the same mounted account and hook state while Next changes the query.
// This reproduces following the assigned tournament Link from the lobby.
function sala(){
 let query='',cursor=0,efectos=[];const hooks=[];
 const react={
  useState(inicial){const i=cursor++;if(!(i in hooks))hooks[i]=typeof inicial==='function'?inicial():inicial;return [hooks[i],v=>{hooks[i]=typeof v==='function'?v(hooks[i]):v;}];},
  useRef(inicial){const i=cursor++;return hooks[i]??(hooks[i]={current:inicial});},
  useEffect(fn,deps){efectos.push(deps);},useCallback:fn=>fn,useMemo:fn=>fn(),
 };
 const jsx=(type,props)=>({type,props});
 const modulo={exports:{}};
 const window={location:{get search(){return query;}},history:{replaceState(_s,_t,url){query=new URL(url,'https://club.test').search;}}};
 const source=fs.readFileSync(require.resolve('../components/SalaOnline.tsx'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
  exports:modulo.exports,module:modulo,window,URLSearchParams,URL,
  require(n){
   if(n==='react')return react;
   if(n==='react/jsx-runtime')return {jsx,jsxs:jsx,Fragment:'fragment'};
   if(n==='next/navigation')return {useSearchParams:()=>new URLSearchParams(query)};
   if(n==='@/context/AuthContext')return {useAuth:()=>({session:{user:{id:'usuario'}},cargando:false})};
   if(n==='@/context/useMiJugador')return {useMiJugador:()=>({jugador:{},cargando:false})};
   if(n==='@/lib/partidaOnline')return {RITMOS_ONLINE:{'5+3':{}}};
   return new Proxy({},{get:(_,k)=>k==='default'?new Proxy({},{get:(_,v)=>String(v)}):()=>null});
  },
 });
 function buscar(n,p){if(!n||typeof n!=='object')return null;if(p(n))return n;for(const c of [n.props?.children].flat(Infinity)){const r=buscar(c,p);if(r)return r;}return null;}
 const cuenta=buscar(modulo.exports.SalaOnline(),n=>n.type?.name==='SalaCuenta');assert.ok(cuenta);
 function texto(n){if(n==null||typeof n==='boolean')return '';if(typeof n!=='object')return String(n);return [n.props?.children].flat(Infinity).map(texto).join(' ');}
 return {
  navegar(q){query=q;},
  render(){cursor=0;efectos=[];const arbol=cuenta.type(cuenta.props);return {arbol,texto:texto(arbol),efectos:[...efectos]};},
  boton(arbol,nombre){return buscar(arbol,n=>n.type==='button'&&texto(n)===nombre);},
 };
}
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
test('Entrar a la mesa desde la sala responde al enlace sin abrir otra pestaña',()=>{
 const s=sala();assert.match(s.render().texto,/Tus partidas/);
 s.navegar('?mesa='+a);const r=s.render();assert.match(r.texto,/Buscando la mesa/);assert.doesNotMatch(r.texto,/Invitaciones fuera de torneo/);
 assert.ok(r.efectos.some(d=>d?.[0]===a),'La sincronización recibe la mesa solicitada');
});
test('Cambiar de mesa y volver a la sala siguen la dirección actual',()=>{
 const s=sala();s.navegar('?mesa='+a);s.render();s.navegar('?mesa='+b);let r=s.render();
 assert.ok(r.efectos.some(d=>d?.[0]===b));
 const volver=s.boton(r.arbol,'Volver a la sala');assert.ok(volver);volver.props.onClick();
 r=s.render();assert.match(r.texto,/Tus partidas/);assert.doesNotMatch(r.texto,/Buscando la mesa/);
});
test('Un código inválido no abandona la sala ni intenta sincronizar una mesa',()=>{
 const s=sala();s.navegar('?mesa=no-es-un-id');const r=s.render();assert.match(r.texto,/Tus partidas/);
 assert.ok(r.efectos.some(d=>d?.[0]===null));
});
