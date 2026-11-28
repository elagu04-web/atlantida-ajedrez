'use client';
import {useEffect,useMemo,useRef,useState,type CSSProperties,type PointerEvent} from 'react';
import Link from 'next/link';
import {useAuth} from '@/context/AuthContext';
import {supabase} from '@/lib/supabase';
import type {CartaApertura as DatosCarta} from '@/lib/albumAperturas';
import {nuevasEdicionesPartida} from '@/lib/recompensasAperturas';
import {evaluarRasgado} from '@/lib/rasgadoSobre';
import {CartaApertura} from './CartaApertura';
import s from './SobresAperturas.module.css';

export function SobresAperturas({cartas,miticas,partidaId}:{cartas:DatosCarta[];miticas:DatosCarta[];partidaId?:string}){
 const {session}=useAuth();
 if(!session)return null;
 return <SobresDeCuenta key={session.user.id} cartas={cartas} miticas={miticas} partidaId={partidaId}/>;
}
function SobresDeCuenta({cartas,miticas,partidaId}:{cartas:DatosCarta[];miticas:DatosCarta[];partidaId?:string}){
 const [abiertos,setAbiertos]=useState<Set<string>|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[elegido,setElegido]=useState<string|null>(partidaId??null);
 const sobres=useMemo(()=>{
  const partidas=new Map(cartas.flatMap(c=>c.partidas.map(p=>[p.id,p] as const)));
  return [...partidas.values()].filter(p=>!partidaId||p.id===partidaId).map(p=>({partida:p,cartas:[...miticas.filter(c=>c.ramaCompleta?.partidaId===p.id),...nuevasEdicionesPartida(cartas,p.id)]})).filter(s=>s.cartas.length).sort((a,b)=>b.partida.fecha.localeCompare(a.partida.fecha)||b.partida.id.localeCompare(a.partida.id));
 },[cartas,miticas,partidaId]);
 useEffect(()=>{
  const control=new AbortController();
  void(async()=>{const r=await supabase.rpc('album_sobres_aperturas').abortSignal(control.signal);if(control.signal.aborted)return;if(r.error||!Array.isArray(r.data?.abiertos)){setError('No pudimos cargar tus sobres. Reintentá para abrirlos.');return;}setAbiertos(new Set(r.data.abiertos));setError('');})();
  return()=>control.abort();
 },[revision]);
 if(!sobres.length)return partidaId?<p className={s.ayuda}>No hubo cartas nuevas ni mejoras de edición en esta partida. Tus aperturas sumaron este encuentro a su historia.</p>:null;
 const sobre=sobres.find(s=>s.partida.id===elegido);
 async function abrir(id:string){const r=await supabase.rpc('album_sobres_aperturas',{p_partida:id,p_abrir:true});if(r.error||!Array.isArray(r.data?.abiertos))throw Error('No pudimos guardar la apertura del sobre. Volvé a intentar.');setAbiertos(new Set(r.data.abiertos));}
 return <section className={s.seccion} aria-label="Sobres de aperturas"><header><p className={s.kicker}>LO QUE DEJÓ EL TABLERO</p><h3>{partidaId?'Tu sobre de aperturas':'Tus sobres de aperturas'}</h3><p>{partidaId?'Las posiciones que descubriste y las ediciones que mejoraste en esta partida.':'Cada encuentro con cartas nuevas o mejoras deja un sobre. Los anteriores también están acá.'}</p></header>{error?<p role="alert">{error} <button className="text-link" onClick={()=>setRevision(r=>r+1)}>Reintentar</button></p>:!abiertos?<p role="status">Preparando tus sobres…</p>:sobre?<><SobreAperturasVisual key={sobre.partida.id} cartas={sobre.cartas} abierto={abiertos.has(sobre.partida.id)} abrir={()=>abrir(sobre.partida.id)}/>{!partidaId&&<button className={s.secundario} onClick={()=>setElegido(null)}>← Volver a los sobres</button>}</>:<div className={s.lista}>{sobres.map(({partida:p,cartas:c})=><button key={p.id} onClick={()=>setElegido(p.id)}><span><strong>{abiertos.has(p.id)?'✦ Sobre guardado':'✉ Sobre por abrir'}</strong><small>Contra {p.rival} · {new Date(p.fecha).toLocaleDateString('es-UY',{timeZone:'America/Montevideo'})}</small></span><b>{c.length} {c.length===1?'carta':'cartas'} →</b></button>)}</div>}</section>;
}

/** Presentación pura: la autorización y la persistencia quedan en el RPC. */
export function SobreAperturasVisual({cartas,abierto,abrir}:{cartas:DatosCarta[];abierto:boolean;abrir:()=>Promise<void>}){
 const [fase,setFase]=useState<'cerrado'|'rasgando'|'revelar'|'todas'>(abierto?'todas':'cerrado'),[indice,setIndice]=useState(0),[revelada,setRevelada]=useState(false),[guardando,setGuardando]=useState(false),[error,setError]=useState(''),[rasgado,setRasgado]=useState({progreso:0,direccion:1});
 const gesto=useRef<{id:number;x:number;y:number;ancho:number}|null>(null),ocupado=useRef(false),carta=cartas[indice];
 async function abrirSobre(todas=false){if(ocupado.current)return;ocupado.current=true;setGuardando(true);setError('');try{await abrir();setFase(todas?'todas':window.matchMedia('(prefers-reduced-motion: reduce)').matches?'revelar':'rasgando');}catch(e){setError(e instanceof Error?e.message:'No pudimos abrir el sobre.');}finally{ocupado.current=false;setGuardando(false);}}
 function empezar(e:PointerEvent<HTMLButtonElement>){if(fase!=='cerrado'||guardando||e.button!==0)return;gesto.current={id:e.pointerId,x:e.clientX,y:e.clientY,ancho:e.currentTarget.getBoundingClientRect().width};e.currentTarget.setPointerCapture(e.pointerId);}
 function mover(e:PointerEvent<HTMLButtonElement>){const g=gesto.current;if(!g||g.id!==e.pointerId||guardando)return;const r=evaluarRasgado(e.clientX-g.x,e.clientY-g.y,g.ancho);setRasgado(r);if(r.completo){gesto.current=null;void abrirSobre();}}
 function cancelar(){if(!gesto.current)return;gesto.current=null;setRasgado({progreso:0,direccion:1});}
 if(!carta)return null;
 return <div className={s.apertura}>
  {(fase==='cerrado'||fase==='rasgando')&&<><div className={`${s.sobre} ${fase==='rasgando'?s.rasgando:''}`} style={{'--direccion':rasgado.direccion} as CSSProperties} onAnimationEnd={e=>{if(e.target===e.currentTarget&&fase==='rasgando')setFase('revelar');}}><span className={s.sello}>ATLÁNTIDA AJEDREZ</span><div className={s.mapa} aria-hidden="true"><span>e4</span><i/><span>c5</span><i/><span>Nf3</span></div><strong>CAMINOS<br/>DEL TABLERO</strong><span className={s.caballo} aria-hidden="true">♞</span><p>{cartas.length} {cartas.length===1?'CARTA NUEVA':'CARTAS NUEVAS O MEJORADAS'}</p><button className={s.tira} aria-label="Rasgar sobre de aperturas hacia la izquierda o derecha" disabled={guardando||fase==='rasgando'} onPointerDown={empezar} onPointerMove={mover} onPointerUp={cancelar} onPointerCancel={cancelar} onLostPointerCapture={cancelar} onDragStart={e=>e.preventDefault()} onClick={e=>{if(e.detail===0)void abrirSobre();}}><i style={{width:`${rasgado.progreso*100}%`,...(rasgado.direccion<0?{right:0,left:'auto'}:{})}}/><span>← RASGÁ EL SOBRE →</span></button></div><p className={s.ayuda}>Arrastrá la tira con el mouse o el dedo, en cualquiera de las dos direcciones.</p><button className={s.primario} disabled={guardando||fase==='rasgando'} onClick={()=>void abrirSobre()}>{guardando?'Guardando…':fase==='rasgando'?'Abriendo…':'Abrir sobre ✦'}</button><button className={s.secundario} disabled={guardando||fase==='rasgando'} onClick={()=>void abrirSobre(true)}>Ver todas sin animación</button></>}
  {error&&<p role="alert" className={s.error}>{error}</p>}
  {fase==='revelar'&&<><p className={s.ayuda} aria-live="polite">Carta {indice+1} de {cartas.length}</p><div key={carta.id} className={s.revelacion}>{revelada?<CartaApertura carta={carta}/>:<button className={s.dorso} onClick={()=>setRevelada(true)} aria-label="Dar vuelta la carta de apertura"><span>ATLÁNTIDA AJEDREZ</span><strong>♞</strong><span>UNA NUEVA POSICIÓN<br/>EN TU HISTORIA</span></button>}</div><p className={s.hallazgo} aria-live="polite">{revelada?(carta.rareza==='mitica'?`¡Rama completa! ${carta.ramaCompleta?.cartas} posiciones y una victoria.`:carta.acabado==='foil'?'¡Victoria con tu apertura! Rara foil.':carta.rareza==='rara'?'La jugada fue tuya. Una rara para el álbum.':'La propuso tu rival. Común, sin brillo.'):'Tocá la carta para descubrirla.'}</p><button className={s.primario} onClick={()=>{if(!revelada)setRevelada(true);else if(indice+1<cartas.length){setIndice(i=>i+1);setRevelada(false);}else setFase('todas');}}>{!revelada?'Dar vuelta la carta':indice+1<cartas.length?'Siguiente carta →':'Ver todo el sobre →'}</button></>}
  {fase==='todas'&&<><p className={s.ayuda}>Estas cartas y mejoras ya forman parte de tu historia.</p><div className={s.cartas}>{cartas.map(c=><CartaApertura key={c.id} carta={c}/>)}</div><Link className={s.secundario} href="/album?seccion=aperturas#mis-aperturas">Ir a mis aperturas →</Link></>}
 </div>;
}
