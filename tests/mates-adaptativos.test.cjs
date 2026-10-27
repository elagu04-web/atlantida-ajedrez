const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {Chess}=require('chess.js');
const M=require('../lib/matesAdaptativos.ts');
const {progresoGuiadoInicial,leerProgresoGuiado,combinarProgresoGuiado}=require('../lib/entrenamientoGuiado.ts');
const {EntrenamientoCuenta}=require('../lib/entrenamientoCuenta.ts');
const vacio=()=>({version:1,intentos:[]});let numero=0;
function nuevo(p){return M.comenzarMateUno(p,'semilla-'+numero,'intento-'+(++numero),new Date(1793100000000+numero*1000));}
function resolver(p){const a=p.intentos.at(-1);return M.jugarMateUno(p,a.id,M.mateUno(a.ejercicioId).soluciones[0]).progreso;}
function registro(e,id,n,extras={}){return {id,ejercicioId:e.id,creado:new Date(1793100000000+n*1000).toISOString(),actualizado:new Date(1793100000000+n*1000).toISOString(),nivelAntes:1,fallos:[],pista:false,estado:'resuelto',solucion:e.soluciones[0],...extras};}
test('Las 73 posiciones son distintas, legales y aceptan TODOS sus mates, con ambos colores y cinco franjas',()=>{
 assert.equal(M.BANCO_MATES_UNO.length,73);const fens=new Set(),colores=new Set(),niveles=new Set();let alternativas=0;
 for(const e of M.BANCO_MATES_UNO){const c=new Chess(e.fen),clave=e.fen.split(' ').slice(0,4).join(' ');assert.ok(!fens.has(clave),e.id);fens.add(clave);colores.add(c.turn());niveles.add(e.nivel);assert.ok(!c.isGameOver());const reales=[];for(const m of c.moves({verbose:true})){const d=new Chess(e.fen);d.move(m.lan);if(d.isCheckmate())reales.push(m.lan);}assert.deepEqual([...e.soluciones].sort(),reales.sort(),e.id);alternativas+=reales.length;}
 assert.equal(colores.size,2);assert.equal(niveles.size,5);assert.ok(alternativas>73);
});
test('Empieza fácil, sube tras tres aciertos distintos sin ayuda y no repite las ocho últimas posiciones',()=>{
 let p=vacio();assert.equal(M.resumenMatesUno(p).nivel,1);const vistos=[];
 for(let i=0;i<15;i++){p=nuevo(p);const a=p.intentos.at(-1);assert.ok(!vistos.slice(-8).includes(a.ejercicioId));if(i===0)assert.equal(M.mateUno(a.ejercicioId).nivel,1);vistos.push(a.ejercicioId);p=resolver(p);if(i===2)assert.equal(M.resumenMatesUno(p).nivel,2);}
 assert.equal(M.resumenMatesUno(p).nivel,5);assert.equal(new Set(vistos).size,15);
});
test('Dos ejercicios con ayuda bajan un nivel; la ayuda y el error no desaparecen al acertar',()=>{
 let p=vacio();for(let i=0;i<3;i++)p=resolver(nuevo(p));assert.equal(M.resumenMatesUno(p).nivel,2);
 for(let i=0;i<2;i++){p=nuevo(p);const a=p.intentos.at(-1);p=M.pedirPistaMateUno(p,a.id);p=resolver(p);assert.equal(p.intentos.at(-1).pista,true);}
 assert.equal(M.resumenMatesUno(p).nivel,1);assert.equal(M.resumenMatesUno(p).limpios,3);
 p=nuevo(p);const a=p.intentos.at(-1),e=M.mateUno(a.ejercicioId),c=new Chess(e.fen);const mala=c.moves({verbose:true}).find(m=>!e.soluciones.includes(m.lan));assert.ok(mala);
 const ilegal=M.jugarMateUno(p,a.id,'a1a1');assert.equal(ilegal.legal,false);assert.equal(ilegal.progreso.intentos.at(-1).fallos.length,0);
 p=M.jugarMateUno(p,a.id,mala.lan).progreso;p=resolver(p);assert.deepEqual(p.intentos.at(-1).fallos,[mala.lan]);assert.equal(M.resumenMatesUno(p).limpios,3);
});
test('Saltar sin intentar no castiga; revelar es práctica con ayuda; repetir seguido no infla el nivel',()=>{
 let p=nuevo(vacio());p=M.omitirMateUno(p,p.intentos.at(-1).id);assert.equal(M.resumenMatesUno(p).nivel,1);assert.equal(M.resumenMatesUno(p).seguidos,0);
 p=nuevo(p);p=M.revelarMateUno(p,p.intentos.at(-1).id);assert.equal(p.intentos.at(-1).pista,true);assert.equal(M.resumenMatesUno(p).resueltos,0);
 const e=M.BANCO_MATES_UNO[0],repetida={version:1,intentos:Array.from({length:5},(_,i)=>registro(e,'r-'+i,i))};assert.equal(M.resumenMatesUno(repetida).nivel,1);
});
test('Los repasos espaciados permiten volver a subir después de agotar las posiciones nuevas',()=>{
 const disponibles=M.BANCO_MATES_UNO.filter(e=>e.nivel===1),e=disponibles[0],otros=disponibles.slice(1,9);const intentos=[registro(e,'origen',0)];
 otros.forEach((x,i)=>intentos.push(registro(x,'salto-'+i,i+1,{estado:'omitido',solucion:undefined})));
 intentos.push(registro(e,'repaso',9));const r=M.resumenMatesUno({version:1,intentos});assert.equal(r.seguidos,2,'El repaso espaciado cuenta sin necesitar ejercicios nuevos infinitos');
});
test('Dos dispositivos combinan el mismo intento sin duplicar aciertos y conservan pistas y errores',()=>{
 const p=nuevo(vacio()),a=p.intentos.at(-1),bien=resolver(p),pista=M.pedirPistaMateUno(p,a.id),unido=M.combinarMatesUno(bien,pista);
 assert.deepEqual(unido,M.combinarMatesUno(pista,bien));assert.deepEqual(unido,M.combinarMatesUno(unido,unido));assert.equal(unido.intentos.length,1);assert.equal(unido.intentos[0].estado,'resuelto');assert.equal(unido.intentos[0].pista,true);assert.equal(M.resumenMatesUno(unido).limpios,0);
 const guiado={...progresoGuiadoInicial(),matesUno:unido};const recargado=leerProgresoGuiado(JSON.stringify(guiado));assert.deepEqual(recargado.matesUno,unido);assert.deepEqual(combinarProgresoGuiado(guiado,progresoGuiadoInicial()).matesUno,unido);
});
test('Conserva los seis mates antiguos y el intento activo se recupera sin cambiar de posición',()=>{
 const curso={};for(let i=1;i<=6;i++)curso['mate-uno-'+i]={tablero:true,pregunta:true,fecha:'2026-10-27T12:00:00.000Z'};
 const previo={...progresoGuiadoInicial(),desdeCero:curso},p=leerProgresoGuiado(JSON.stringify(previo)).matesUno;assert.equal(M.resumenMatesUno(p).resueltos,6);assert.equal(M.resumenMatesUno(p).nivel,1);assert.deepEqual(M.conLegadoMates(p,curso),p);
 const activo=nuevo(p);assert.equal(M.leerMatesUno(JSON.parse(JSON.stringify(activo))).intentos.at(-1).ejercicioId,activo.intentos.at(-1).ejercicioId);
});
test('El guardado real del controlador sincroniza un mate activo y su resolución entre dispositivos',async()=>{
 const datos=new Map(),transporte={listar:async()=>[...datos.values()].map(x=>structuredClone(x)),guardar:async(clave,p,revision)=>{const viejo=datos.get(clave);if(revision!==(viejo?.revision??0))return {conflicto:true,datos:structuredClone(viejo?.datos??null),revision:viejo?.revision??0};const d={clave,datos:structuredClone(p),revision:revision+1};datos.set(clave,d);return {conflicto:false,...d};}};
 const almacen=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};},a=new EntrenamientoCuenta('alumna',almacen(),transporte),b=new EntrenamientoCuenta('alumna',almacen(),transporte);
 try{const p=nuevo(vacio());a.guardarGuiado({...progresoGuiadoInicial(),matesUno:p});await a.sincronizar();await b.sincronizar();assert.deepEqual(b.leer().guiado.matesUno,p);b.guardarGuiado({...b.leer().guiado,matesUno:resolver(p)});await b.sincronizar();await a.sincronizar();assert.equal(a.leer().guiado.matesUno.intentos.at(-1).estado,'resuelto');assert.equal(M.resumenMatesUno(a.leer().guiado.matesUno).resueltos,1);}finally{a.detener();b.detener();}
});
