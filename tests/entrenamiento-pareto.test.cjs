const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const{Chess}=require('chess.js');
const P=require('../lib/entrenamientoPareto.ts'),G=require('../lib/entrenamientoGuiado.ts');
const{registrarPractica,leerBibliotecaEntrenamiento}=require('../lib/entrenamientoPersonal.ts');
const{EntrenamientoCuenta}=require('../lib/entrenamientoCuenta.ts');
const{finalDePosicion}=require('../lib/finalesPersonales.ts');
const hoy=new Date('2026-10-17T17:00:00Z');
function partida(id,dia,errores=[],tipo='piezas',fen){
 const c=fen?new Chess(fen):new Chess();
 c.setHeader('Event','Partida '+id);c.setHeader('White','Jugador');c.setHeader('Black','Rival');c.setHeader('Date',`2026.10.${String(dia).padStart(2,'0')}`);
 if(fen){c.move('Kf5');c.move('Kf7');c.move('e5');c.move('Ke7');}else for(const san of ['e4','e5','Nf3','Nc6','Bc4','Bc5','d3','Nf6'])c.move(san);
 const fecha=`2026-10-${String(dia).padStart(2,'0')}T15:00:00.000Z`;
 return {id,creada:fecha,actualizada:fecha,titulo:'Jugador · Rival',pgn:c.pgn(),color:'w',practicas:{},resultado:{peorJugadaBlancas:null,peorJugadaNegras:null,jugadas:c.history({verbose:true}).map((m,i)=>{
   const error=errores.includes(i),san=error?new Chess(m.before).moves().find(x=>x!==m.san):null;
   return {numero:Number(m.before.split(' ')[5]),color:m.color,san:m.san,fenAntes:m.before,mejorJugadaSan:san??null,varianteSan:san?[san]:null,perdidaCentipeones:error?200:0,piezaColgada:error&&tipo==='piezas'?{casilla:'d1',pieza:'q',nombrePieza:'dama'}:null,llevaAMate:error&&tipo==='rey',piezaMovida:'Peón',estabaEnJaque:false};
 })}};
}
const resumen=(ss,p=G.progresoGuiadoInicial(),b=G.BANCO_ENTRENAMIENTO)=>P.analizarPareto(ss,p,b,hoy);
function repaso(){let p=registrarPractica(undefined,true,false,new Date('2026-10-14T17:00:00Z'));return registrarPractica(p,true,false,new Date('2026-10-15T17:00:00Z'));}

test('Cada partida cuenta una vez por foco; varios errores y reimportaciones no inflan la frecuencia',()=>{
 const s=partida('una',10,[0,2,4,6]);const r=resumen([s]);assert.equal(r.partidas,1);assert.equal(r.focos[0].partidasConError,1);assert.equal(r.focos[0].evidencias.length,1);assert.equal(r.focos[0].primerasSenales,true);
 const copia=structuredClone(s);copia.id='copia';copia.pgn=copia.pgn.replace('Partida una','Importación duplicada');copia.actualizada='2026-10-17T16:00:00Z';
 assert.equal(resumen([s,copia]).partidas,1);assert.equal(resumen([s,copia]).focos[0].partidasConError,1);
});
test('Repetición entre partidas tiene más peso que muchos errores de una única partida; máximo dos focos',()=>{
 const ss=[partida('a',10,[0]),partida('b',11,[0]),partida('c',12,[0]),partida('d',13,[0,2,4,6],'rey')];
 const r=resumen(ss);assert.equal(r.focos[0].id,'piezas');assert.equal(r.focos[0].primerasSenales,false);assert.ok(r.focos.length<=2);
 const uno=resumen([partida('a',10,[0])]).focos[0].prioridad,muchos=resumen([partida('a',10,[0,2,4,6])]).focos[0].prioridad;assert.equal(uno,muchos);
});
test('Solo toma decisiones del color elegido y excluye el PGN de demostración',()=>{
 const s=partida('rival',12,[1,3],'rey');assert.equal(resumen([s]).focos.length,0);s.color='b';assert.equal(resumen([s]).focos[0].id,'rey');
 s.pgn=s.pgn.replace('Partida rival','Ejemplo de entrenamiento');assert.equal(resumen([s]).partidas,0);
 assert.equal(resumen([]).focos.length,0);assert.equal(resumen([{...s,pgn:'no es PGN'}]).partidas,0);
});
test('Una pérdida sin indicios concretos se clasifica por etapa, no inventa motivos tácticos o causas estratégicas',()=>{
 const s=partida('sin-etiqueta',12,[0],'generico');assert.equal(resumen([s]).focos[0].id,'apertura');
 s.resultado.jugadas[0].numero=30;const r=resumen([s]);assert.equal(r.focos[0].id,'calculo');assert.deepEqual(r.focos[0].temas,[]);
});
test('Reconoce finales desde FEN, sin llamarlos apertura por empezar en la jugada uno',()=>{
 const s=partida('final',12,[0],'generico','8/4k3/8/4K3/4P3/8/8/8 w - - 0 1');
 const r=resumen([s]);assert.equal(r.focos[0].id,'final-peones');assert.equal(r.focos[0].siguiente.destino,'final');assert.equal(finalDePosicion(s,r.focos[0].siguiente.indice).fen,s.resultado.jugadas[0].fenAntes);
 assert.equal(finalDePosicion(s,1),null);assert.equal(finalDePosicion(s,999),null);
});
test('No llama mejora a repetir una posición o a resolver muchas veces el mismo día',()=>{
 const s=partida('repetida',10,[0,2,4]);for(const i of [0,2,4]){let p;for(let j=0;j<20;j++)p=registrarPractica(p,true,false,new Date('2026-10-14T17:00:00Z'));s.practicas[String(i)]=p;}
 const r=resumen([s]);assert.equal(r.focos[0].mejoraEnRepasos,false);assert.equal(r.focos[0].repasosIndependientes,0);
});
test('Repasos independientes reducen prioridad; una partida nueva con el mismo error vuelve a abrir el foco',()=>{
 const s=partida('practicada',10,[0,2,4]);const inicial=resumen([s]).focos[0].prioridad;
 for(const i of [0,2,4])s.practicas[String(i)]=repaso();
 const r=resumen([s]);assert.equal(r.focos[0].mejoraEnRepasos,true);assert.equal(r.focos[0].repasosIndependientes,3);assert.ok(r.focos[0].prioridad<inicial);
 const nueva=partida('nuevo-fallo',17,[0]);const reabierto=resumen([s,nueva]).focos[0];assert.equal(reabierto.mejoraEnRepasos,false);assert.equal(reabierto.partidasConError,2);
});
test('Tres partidas nuevas sin el mismo aviso bajan el foco, aunque se reabra o edite una partida vieja',()=>{
 const vieja=partida('vieja',10,[0]);vieja.actualizada=hoy.toISOString();
 const ss=[vieja,partida('limpia1',14),partida('limpia2',15),partida('limpia3',16)];const r=resumen(ss);
 assert.equal(r.temas[0].mejoraEnPartidas,true);assert.equal(r.focos.length,0);
 assert.equal(resumen([...ss,partida('recaida',17,[0])]).focos[0].id,'piezas');
});
test('Sin hora fiable, importar partidas del mismo día no demuestra una mejora posterior al error',()=>{
 const ss=[partida('fallo',12,[0]),partida('a',12),partida('b',12),partida('c',12)];
 for(const s of ss)s.pgn=s.pgn.replace('[Black "Rival"]',`[Black "Rival ${s.id}"]`);
 assert.equal(resumen(ss).temas[0].mejoraEnPartidas,false);
 const s=partida('con-hora',12,[0]);s.pgn=s.pgn.replace('[Date "2026.10.12"]','[Date "2026.10.12"]\n[UTCTime "10:00:00"]');
 const otra=structuredClone(s);otra.id='otra-hora';otra.pgn=otra.pgn.replace('10:00:00','11:00:00');assert.equal(resumen([s,otra]).partidas,2);
});
test('Jugar sin finales no demuestra que mejoraron los finales: cuenta oportunidades de observar cada tema',()=>{
 const s=partida('final-viejo',10,[0],'generico','8/4k3/8/4K3/4P3/8/8/8 w - - 0 1');
 const r=resumen([s,partida('a',14),partida('b',15),partida('c',16)]);assert.equal(r.focos[0].id,'final-peones');assert.equal(r.focos[0].partidasObservadas,1);assert.equal(r.focos[0].mejoraEnPartidas,false);
});
test('Las muestras de ejercicios guiados también ajustan el foco, sin contar la misma posición dos veces',()=>{
 const s=partida('ejercicios',10,[0]);let p=G.progresoGuiadoInicial();
 const es=G.BANCO_ENTRENAMIENTO.filter(e=>e.fuente==='lichess'&&e.temas.includes('hangingPiece')).slice(0,3);
 for(const e of es){p=G.registrarResultadoGuiado(p,e.id,true,false,new Date('2026-10-14T17:00:00Z'));p=G.registrarResultadoGuiado(p,e.id,true,false,new Date('2026-10-15T17:00:00Z'));}
 const r=resumen([s],p);assert.equal(r.focos[0].mejoraEnRepasos,true);assert.equal(r.focos[0].repasosIndependientes,3);
 assert.equal(resumen([s],p,[es[0],es[0],es[0]]).focos[0].mejoraEnRepasos,false);
});
test('Las posiciones cuyo repaso es futuro no se vuelven a proponer como la siguiente decisión',()=>{
 const s=partida('futuro',10,[0]);s.practicas['0']={...repaso(),proxima:'2026-10-20'};
 const f=resumen([s]).focos[0];assert.equal(f.siguiente,undefined);assert.equal(f.evidencias.length,1);
});
test('Reimportar una partida histórica no borra mejoras posteriores ni pierde la práctica de otra copia',()=>{
 const s=partida('original',10,[0,2,4]);for(const i of [0,2,4])s.practicas[String(i)]=repaso();
 const copia=structuredClone(s);copia.id='importada';copia.pgn=copia.pgn.replace('Partida original','Otra importación');copia.creada='2026-10-17T15:00:00Z';copia.actualizada=copia.creada;copia.practicas={};
 const r=resumen([s,copia]);assert.equal(r.partidas,1);assert.equal(r.focos[0].mejoraEnRepasos,true);assert.equal(r.focos[0].repasosIndependientes,3);
});
test('Foco sin variante analizada conserva el diagnóstico prudente y ofrece ejercicios, sin inventar una solución propia',()=>{
 const s=partida('sin-variante',12,[0]);s.resultado.jugadas[0].mejorJugadaSan=null;
 const r=resumen([s]);assert.equal(r.focos[0].id,'piezas');assert.equal(r.focos[0].siguiente,undefined);assert.equal(r.focos[0].evidencias.length,0);
});
test('Trabaja con veinte partidas recientes por fecha de juego, sin reordenarlas por notas o repasos',()=>{
 const ss=Array.from({length:23},(_,i)=>{const s=partida('partida-'+i,1,[]);s.pgn=s.pgn.replace('2026.10.01',`2026.09.${String(i+1).padStart(2,'0')}`);s.creada='2026-10-17T15:00:00Z';return s;});
 ss[0].resultado.jugadas[0].perdidaCentipeones=200;ss[0].resultado.jugadas[0].mejorJugadaSan='d4';ss[0].actualizada='2026-10-17T16:00:00Z';
 const r=resumen(ss);assert.equal(r.partidas,20);assert.equal(r.totalDisponibles,23);assert.equal(r.focos.length,0);
});
test('Refuerzo cerca del nivel y variedad; no cambia una sesión pendiente ni adelanta repasos',()=>{
 let p=G.iniciarNivel(G.progresoGuiadoInicial(),1400,'j',new Date('2026-10-01T15:00:00Z'));
 const vencido=G.BANCO_ENTRENAMIENTO.find(e=>e.fuente==='lichess'&&e.rating>=1300&&e.rating<=1500);
 p.ejercicios[vencido.id]={practica:{aciertos:0,fallos:1,ayudado:true,proxima:'2026-10-17',ultimoDia:'2026-10-16'},actualizada:'2026-10-16T15:00:00Z'};
 const q=G.prepararSesionGuiada(p,hoy,['hangingPiece']);assert.equal(q.sesionEnCurso.items[0],vencido.id);
 const nuevos=q.sesionEnCurso.items.slice(1).map(G.ejercicioGuiado);assert.ok(nuevos[0].temas.includes('hangingPiece'));assert.ok(!nuevos[1].temas.includes('hangingPiece'));assert.ok(nuevos.every(e=>Math.abs(e.rating-1400)<=200));
 assert.strictEqual(G.prepararSesionGuiada(q,hoy,['mateIn3']),q);
 const fin={...q,sesionEnCurso:{...q.sesionEnCurso,terminada:true}};for(const id of fin.sesionEnCurso.items)fin.ejercicios[id]={...fin.ejercicios[id],practica:registrarPractica(undefined,true,false,hoy),actualizada:hoy.toISOString()};
 const otra=G.prepararSesionGuiada(fin,hoy,['hangingPiece']);assert.ok(otra.sesionEnCurso.items.every(id=>!fin.sesionEnCurso.items.includes(id)));
 assert.equal(P.nuevosSegunPareto([{id:'lejano',rating:2400,temas:['hangingPiece']}],1400,['hangingPiece']),null);
});
test('El mismo foco se recupera desde otro dispositivo; otro usuario no recibe sus partidas',async()=>{
 const almacen=()=>{const m=new Map();return{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};const nube=new Map();
 const transporte=cuenta=>({listar:async()=>[...(nube.get(cuenta)?.values()??[])],guardar:async(clave,datos,revision)=>{if(!nube.has(cuenta))nube.set(cuenta,new Map());const d={clave,datos:structuredClone(datos),revision:revision+1};nube.get(cuenta).set(clave,d);return{...d,conflicto:false};}});
 const a=new EntrenamientoCuenta('A',almacen(),transporte('A')),b=new EntrenamientoCuenta('A',almacen(),transporte('A')),otra=new EntrenamientoCuenta('B',almacen(),transporte('B'));
 try{const s=partida('guardada',10,[0,2,4]);for(const i of [0,2,4])s.practicas[String(i)]=repaso();assert.equal(leerBibliotecaEntrenamiento(JSON.stringify([s])).length,1);a.guardarSesion(s);await a.sincronizar();await b.sincronizar();await otra.sincronizar();
 const ra=resumen(a.leer().sesiones,a.leer().guiado),rb=resumen(b.leer().sesiones,b.leer().guiado);
 const perfil=r=>JSON.parse(JSON.stringify(r,(clave,valor)=>clave==='sesion'?{id:valor.id,color:valor.color}:valor));assert.deepEqual(perfil(rb),perfil(ra));assert.equal(resumen(otra.leer().sesiones).partidas,0);
 }finally{a.detener();b.detener();otra.detener();}
});
