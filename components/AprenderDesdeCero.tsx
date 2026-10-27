"use client";
import {useState} from 'react';
import Link from 'next/link';
import {Chess,type Square} from 'chess.js';
import {Chessboard} from 'react-chessboard';
import {useAuth} from '@/context/AuthContext';
import {useEntrenamientoCuenta} from '@/context/useEntrenamientoCuenta';
import {ETAPAS_APRENDER,LECCIONES_INICIALES,fenResuelto,resolverJugadaInicial,type PromocionInicial,type LeccionInicial} from '@/lib/aprenderDesdeCero';
import type {ProgresoGuiado} from '@/lib/entrenamientoGuiado';
import {BANCO_MATES_UNO,conLegadoMates,resumenMatesUno} from '@/lib/matesAdaptativos';
import {useSonidoPiezas} from '@/lib/useSonidoPiezas';
import {MatesAdaptativos} from './MatesAdaptativos';
import {PiezaAjedrez} from './PiezaAjedrez';
import s from './AprenderDesdeCero.module.css';
export function AprenderDesdeCero(){const {session,cargando}=useAuth();if(cargando)return <p role="status">Preparando tus primeras jugadas…</p>;return <Curso key={session?.user.id??'invitado'} cuenta={session?.user.id??'invitado'} conCuenta={!!session}/>;}
function Curso({cuenta,conCuenta}:{cuenta:string;conCuenta:boolean}){
 const {guiado,estado,errorLocal,guardarGuiado,reintentar}=useEntrenamientoCuenta(cuenta,conCuenta);
 const [indice,setIndice]=useState(0),avance=guiado.desdeCero??{};
 const sonido=useSonidoPiezas(),mates=conLegadoMates(guiado.matesUno,guiado.desdeCero),resumenMates=resumenMatesUno(mates);
 const total=LECCIONES_INICIALES.filter(l=>l.tipo!=='mate').length+BANCO_MATES_UNO.length;
 const completas=LECCIONES_INICIALES.filter(l=>l.tipo!=='mate'&&avance[l.id]?.tablero&&avance[l.id]?.pregunta).length+resumenMates.resueltos;
 const pendiente=LECCIONES_INICIALES.findIndex(l=>l.tipo!=='mate'&&(!avance[l.id]?.tablero||!avance[l.id]?.pregunta));
 const leccion=LECCIONES_INICIALES[indice],hecha=!!avance[leccion.id]?.tablero&&!!avance[leccion.id]?.pregunta;
 const etapa=leccion.etapa??'base';
 const leccionesEtapa=LECCIONES_INICIALES.map((l,i)=>({l,i})).filter(({l})=>(l.etapa??'base')===etapa);
 function abrirEtapa(id:string){const lista=LECCIONES_INICIALES.map((l,i)=>({l,i})).filter(({l})=>(l.etapa??'base')===id);setIndice((lista.find(({l})=>!avance[l.id]?.tablero||!avance[l.id]?.pregunta)??lista[0]).i);}
 function guardar(campo:'tablero'|'pregunta',jugada?:string){
  const a=guiado.desdeCero?.[leccion.id];
  const nuevo:ProgresoGuiado={...guiado,desdeCero:{...guiado.desdeCero,[leccion.id]:{tablero:a?.tablero??false,pregunta:leccion.tipo==='mate'&&campo==='tablero'?true:a?.pregunta??false,[campo]:true,fecha:new Date().toISOString(),...(jugada?{jugada}:a?.jugada?{jugada:a.jugada}:{})}}};guardarGuiado(nuevo);
 }
 return <div className={s.curso}><header className={s.hero}><div><p className="eyebrow">TU PRIMERA JUGADA · ATLÁNTIDA</p><h1>Aprendé ajedrez.<br/><em>Desde el principio.</em></h1><p>Tres etapas: aprendé lo básico, conocé las reglas extra y practicá mates en una jugada. Sin reloj.</p></div><div className={s.progreso}><strong>{completas}<span>/{total}</span></strong><span>prácticas completadas</span><progress max={total} value={completas} aria-label="Progreso del curso"/><button type="button" className="button-primary" onClick={()=>setIndice(pendiente<0?LECCIONES_INICIALES.findIndex(l=>l.tipo==='mate'):pendiente)}>{completas===total?'Repasar el recorrido':'Continuar mi recorrido'} →</button></div></header>
 <p className={s.guardado} role="status">{errorLocal?'No pudimos guardar en este navegador. Mantené esta pestaña abierta.':!conCuenta?'Tu avance queda en este navegador. Iniciá sesión para guardarlo en tu cuenta.':estado==='guardado'?'Avance guardado en tu cuenta. Podés seguir desde otro dispositivo.':estado==='pendiente'?'Guardado pendiente. Conservamos tu avance y reintentaremos al conectar.':estado==='cargando'?'Buscando tu avance en la cuenta…':'Guardando tu avance…'}{conCuenta&&estado==='pendiente'&&<button type="button" className="text-link" onClick={()=>void reintentar()}>Reintentar</button>}</p>
 <label className={s.guardado}><input type="checkbox" checked={sonido.activo} onChange={e=>sonido.setActivo(e.target.checked)}/> Sonido al apoyar las piezas</label><nav className={s.etapas} aria-label="Etapas del aprendizaje">{ETAPAS_APRENDER.map(e=>{const lista=LECCIONES_INICIALES.filter(l=>(l.etapa??'base')===e.id),resueltas=e.id==='mates'?resumenMates.resueltos:lista.filter(l=>avance[l.id]?.tablero&&avance[l.id]?.pregunta).length;return <button type="button" key={e.id} aria-pressed={etapa===e.id} onClick={()=>abrirEtapa(e.id)}><strong>{e.nombre}<span>{resueltas}/{e.id==='mates'?BANCO_MATES_UNO.length:lista.length}</span></strong><small>{e.detalle}</small></button>;})}</nav>
 {etapa==='mates'?<MatesAdaptativos progreso={mates} guardar={p=>guardarGuiado({...guiado,matesUno:p})} cuenta={cuenta} sonar={sonido.golpear}/>:<div className={s.disposicion}><nav className={s.lecciones} aria-label="Lecciones desde cero">{leccionesEtapa.map(({l,i},n)=><button key={l.id} type="button" aria-current={indice===i?'step':undefined} onClick={()=>setIndice(i)}><span>{avance[l.id]?.tablero&&avance[l.id]?.pregunta?'✓':String(n+1).padStart(2,'0')}</span>{l.titulo}</button>)}</nav><article className={s.leccion}><p className="eyebrow">{ETAPAS_APRENDER.find(e=>e.id===etapa)?.nombre} · {leccionesEtapa.findIndex(e=>e.i===indice)+1} DE {leccionesEtapa.length}</p><h2>{leccion.titulo}</h2><p className={s.idea}>{leccion.idea}</p>{leccion.explicacion.map(p=><p key={p}>{p}</p>)}<Practica key={leccion.id} leccion={leccion} tableroHecho={!!avance[leccion.id]?.tablero} preguntaHecha={!!avance[leccion.id]?.pregunta} jugadaGuardada={avance[leccion.id]?.jugada} guardar={guardar} sonar={sonido.golpear}/><div className={s.siguiente}>{hecha?<p>✓ Idea entendida y práctica completada.</p>:<p>{leccion.tipo==='mate'?'Encontrá el mate para completar esta posición.':'Completá la práctica y la pregunta para terminar esta lección.'}</p>}<div><button type="button" className="button-secondary" disabled={indice===0} onClick={()=>setIndice(i=>i-1)}>← Anterior</button>{indice<LECCIONES_INICIALES.length-1?<button type="button" className="button-primary" disabled={!hecha} onClick={()=>setIndice(i=>i+1)}>{(LECCIONES_INICIALES[indice+1]?.etapa??'base')!==etapa?'Siguiente etapa →':leccion.tipo==='mate'?'Siguiente mate →':'Siguiente lección →'}</button>:hecha&&<Link href="/jugar" className="button-primary">Probar mi primera partida →</Link>}</div></div></article></div>}<footer className={s.pie}><strong>Ya sabés mover. Ahora, a jugar.</strong><p>Podés volver a estas lecciones cuando quieras. Después, el entrenamiento te ayuda a reconocer amenazas y aprender de tus partidas.</p><Link className="text-link" href="/entrenamiento">Conocer el entrenamiento →</Link><a href="https://handbook.fide.com/chapter/E012023" target="_blank" rel="noopener noreferrer" className={s.fuente}>Consultar las reglas oficiales de la FIDE ↗</a></footer></div>;
}
function Practica({leccion:l,tableroHecho,preguntaHecha,jugadaGuardada,guardar,sonar}:{leccion:LeccionInicial;tableroHecho:boolean;preguntaHecha:boolean;jugadaGuardada?:string;guardar:(c:'tablero'|'pregunta',jugada?:string)=>void;sonar:(captura?:boolean)=>void}){
 const [seleccion,setSeleccion]=useState<Square|null>(null),[mensaje,setMensaje]=useState(''),[ayuda,setAyuda]=useState(false),[respuesta,setRespuesta]=useState<number|null>(null);
 const [coronacion,setCoronacion]=useState<{from:string;to:string}|null>(null);
 const posicion=tableroHecho?fenResuelto(l,jugadaGuardada):l.fen;
 const color=new Chess(l.fen).turn();
 function mover(from:string,to:string,promocion?:PromocionInicial){
  if(tableroHecho)return false;
  if(!promocion&&new Chess(l.fen).moves({verbose:true}).some(m=>m.from===from&&m.to===to&&m.promotion)){setCoronacion({from,to});setMensaje('Elegí la pieza en la que querés coronar.');return false;}
  const resultado=resolverJugadaInicial(l,from,to,promocion);
  if(resultado){sonar(!!new Chess(l.fen).move(resultado.uci).captured);guardar('tablero',resultado.uci);setSeleccion(null);setCoronacion(null);setMensaje(l.tipo==='mate'?'¡Jaque mate!':'¡Bien! Ese es el movimiento.');return true;}
  setMensaje(l.tipo==='mate'?'Todavía no es mate. Revisá si el rey puede escapar, capturar al atacante o tapar el jaque.':'Probá otra vez. '+l.pista);return false;
 }
 function tocar(square:Square){
  if(tableroHecho||coronacion)return;
  if(!l.origen){if(square===l.destino){guardar('tablero');setMensaje('¡Esa es la casilla!');}else setMensaje('Todavía no. '+l.pista);return;}
  if(l.tipo==='mate'){
   if(seleccion&&square!==seleccion&&mover(seleccion,square))return;
   if(new Chess(l.fen).get(square)?.color===color){setSeleccion(square);setMensaje('Ahora tocá la casilla de llegada.');}return;
  }
  if(square===l.origen){setSeleccion(square);setMensaje('Ahora tocá la casilla de llegada.');}else if(seleccion)mover(seleccion,square);else setMensaje('Tocá primero la pieza que vas a mover.');
 }
 const nombres:Record<string,string>={p:'peón',n:'caballo',b:'alfil',r:'torre',q:'dama',k:'rey'};
 return <><section className={s.practica} aria-label="Práctica en el tablero"><div><p className="eyebrow">PROBALO EN EL TABLERO</p><h3>{l.consigna}</h3>{l.contexto&&<p className={s.contexto}>{l.contexto}</p>}<p>{l.origen?'Podés tocar la pieza y su destino o arrastrarla.':'Ubicá la columna y la fila y tocá la casilla indicada.'}</p><button type="button" className="text-link" aria-expanded={ayuda} onClick={()=>setAyuda(v=>!v)}>{ayuda?'Ocultar ayuda':'Necesito una ayuda'}</button>{ayuda&&<p className={s.ayuda}>{l.pista}</p>}<p className={s.mensaje} role="status">{tableroHecho?(l.tipo==='mate'?'✓ ¡Jaque mate!': '✓ Práctica completada.'):mensaje||'Tomate tu tiempo.'}</p></div><div className={s.tablero}><Chessboard options={{id:'primeras-jugadas',position:posicion,boardOrientation:color==='w'?'white':'black',allowDragging:!!l.origen&&!tableroHecho&&!coronacion,canDragPiece:({piece})=>piece.pieceType.startsWith(color),allowDrawingArrows:false,allowAutoScroll:false,animationDurationInMs:150,lightSquareStyle:{backgroundColor:'#f0e6ce'},darkSquareStyle:{backgroundColor:'#638480'},squareStyles:seleccion?{[seleccion]:{backgroundColor:'#dfbf73aa'}}:{},onPieceDrop:({sourceSquare,targetSquare})=>!!targetSquare&&mover(sourceSquare,targetSquare),onSquareClick:({square})=>tocar(square as Square),squareRenderer:({square,piece,children})=><button type="button" className={s.casilla} aria-label={`${square}${piece?', '+nombres[piece.pieceType[1].toLowerCase()]+' '+(piece.pieceType[0]==='w'?'blanco':'negro'): ', vacía'}`}>{children}</button>}}/></div>{coronacion&&<fieldset className={s.coronacion}><legend>¿Con qué coronás?</legend><div>{(['q','r','b','n'] as const).map(p=><button type="button" key={p} aria-label={`Coronar a ${nombres[p]}`} onClick={()=>mover(coronacion.from,coronacion.to,p)}><PiezaAjedrez tipo={p} color={color}/><span>{nombres[p]}</span></button>)}</div><button type="button" className="text-link" onClick={()=>setCoronacion(null)}>Cancelar elección</button></fieldset>}</section>{l.tipo==='mate'?(tableroHecho&&<p className={s.ayuda}>{l.respuesta}</p>):<section className={s.pregunta} aria-label="Comprobar lo aprendido"><p className="eyebrow">UNA PREGUNTA PARA CERRAR</p><h3>{l.pregunta}</h3><div>{l.opciones.map((o,i)=><button type="button" key={o} disabled={preguntaHecha} aria-pressed={respuesta===i||preguntaHecha&&l.correcta===i} onClick={()=>{setRespuesta(i);if(i===l.correcta)guardar('pregunta');}}>{preguntaHecha&&i===l.correcta?'✓ ':''}{o}</button>)}</div><p role="status">{preguntaHecha?l.respuesta:respuesta!==null?'Revisá la explicación y probá otra respuesta.':'Elegí una respuesta.'}</p></section>}</>;
}
