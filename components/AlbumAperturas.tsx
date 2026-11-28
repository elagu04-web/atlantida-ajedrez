'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useAlbumAperturas} from '@/context/useAlbumAperturas';
import {useAuth} from '@/context/AuthContext';
import type {CartaApertura as DatosCarta} from '@/lib/albumAperturas';
import {claveFamiliaApertura} from '@/lib/familiasAperturas';
import {CartaApertura} from './CartaApertura';
import s from './AlbumAperturas.module.css';
const FamiliasAperturas=dynamic(()=>import('./FamiliasAperturas').then(m=>m.FamiliasAperturas),{loading:()=> <p role="status">Abriendo las familias de tu álbum…</p>});
const SobresAperturas=dynamic(()=>import('./SobresAperturas').then(m=>m.SobresAperturas));
const ExploradorAperturas=dynamic(()=>import('./ExploradorAperturas').then(m=>m.ExploradorAperturas),{loading:()=> <p role="status">Desplegando el mapa de aperturas…</p>});

const fecha=(valor:string)=>new Date(valor).toLocaleDateString('es-UY',{timeZone:'America/Montevideo',day:'numeric',month:'short',year:'numeric'});
export function AlbumAperturas(props:{jugadorId:string|null;nombreJugador?:string}){
 const {session}=useAuth();
 return <ContenidoAperturas key={`${session?.user.id??'anon'}:${props.jugadorId??'sin-jugador'}`} {...props}/>;
}
function ContenidoAperturas({jugadorId,nombreJugador}:{jugadorId:string|null;nombreJugador?:string}){
 const {cartas,miticas,partidas,cargando,error,refrescar}=useAlbumAperturas(jugadorId);
 const [elegida,setElegida]=useState<DatosCarta|null>(null),[familiaId,setFamiliaId]=useState<string|null>(null);
 const [vista,setVista]=useState<'mapa'|'cartas'|'sobres'>('cartas'),[inicio,setInicio]=useState<string|null>(null);
 const area=useRef<HTMLDivElement>(null),ultimaVista=useRef({vista,familiaId});
 useEffect(()=>{const anterior=ultimaVista.current;ultimaVista.current={vista,familiaId};if(anterior.vista!==vista||anterior.familiaId!==familiaId)area.current?.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});},[vista,familiaId]);
 function estudiar(id:string){setInicio(id);setVista('mapa');}
 return <section id="mis-aperturas" className={s.seccion} aria-label={nombreJugador?`Aperturas de ${nombreJugador}`:'Mi colección de aperturas'}>
  <header className={s.cabecera}><div><p className={s.kicker}>{nombreJugador?'OTRA PÁGINA DE SU ÁLBUM':'OTRA PÁGINA DE TU ÁLBUM'}</p><h2>{nombreJugador?`El repertorio de ${nombreJugador}.`:'Tu álbum de aperturas.'}</h2><p>{nombreJugador?'Una colección de familias, variantes e historias que dejaron sus partidas.':'Cada familia guarda las posiciones que jugaste, las cartas que ganaste y los caminos que quedan por descubrir.'}</p></div><div className={s.contador}><strong>{cartas.length+miticas.length}</strong><span>cartas descubiertas</span></div></header>
  {!jugadorId?<p>Iniciá sesión y vinculá tu jugador para descubrir tu colección personal.</p>:<>
   <div className={s.reglaColeccion}><span aria-hidden="true">♙</span><p>Las cartas se ganan en partidas amistosas o de torneo guardadas. Estudiar no entrega premios.</p><Link href="/jugar/online">Ir a jugar →</Link></div>
   <div className={`${s.filtros} ${s.vistas}`} role="group" aria-label="Vista de aperturas"><button aria-pressed={vista==='cartas'} onClick={()=>setVista('cartas')}>Familias del álbum</button>{!nombreJugador&&<button aria-pressed={vista==='sobres'} onClick={()=>setVista('sobres')}>Mis sobres ✉</button>}</div>
   <div ref={area} className={s.areaContenido}>{cargando?<p role="status">Recorriendo las partidas guardadas…</p>:error?<div role="alert"><p>{error}</p><button className="button-secondary" onClick={refrescar}>Reintentar</button></div>:<>
    {vista==='sobres'?<SobresAperturas cartas={cartas} miticas={miticas}/>:vista==='mapa'?<><button className={s.volverFamilia} onClick={()=>setVista('cartas')}>← Volver a la colección</button><ExploradorAperturas key={inicio??'inicio'} compacto inicioId={inicio} cartas={cartas} nombreJugador={nombreJugador} verCarta={setElegida}/></>:<FamiliasAperturas cartas={cartas} miticas={miticas} nombreJugador={nombreJugador} familiaId={familiaId} seleccionarFamilia={setFamiliaId} verCarta={setElegida} estudiar={estudiar}/>}
    <p className={s.nota}>{partidas.length} {partidas.length===1?'partida guardada revisada':'partidas guardadas revisadas'}. Se incluyen las partidas anteriores y se actualiza al volver a este apartado. <button onClick={refrescar}>Actualizar colección ↻</button></p>
   </>}</div>
   <details className={s.explicacion}><summary>¿Cómo se consiguen estas cartas?</summary><p>Se incorporan al terminar partidas amistosas o de torneo del club que tengan las jugadas guardadas, ganes, empates o pierdas. También recuperamos las que ya jugaste. La misma apertura suma encuentros a su carta. Al terminar, abrí tu sobre: común sin brillo si la jugada definitoria fue del rival; rara si fue tuya; rara foil si además ganaste. Una edición mejor reemplaza la anterior sin borrar su historia. La autoría la marca la jugada que define la posición: por ejemplo, …c5 para la Defensa Siciliana pertenece a negras.</p><p>Cada posición con nombre de las primeras 20 jugadas tiene su propia carta. Una partida puede conseguir varias: la apertura inicial, una defensa y sus variantes. Las cartas del catálogo muestran la posición exacta que las define; algunas formaciones, como el Hipopótamo, se reconocen por tus propias piezas. La carta indica con qué color jugaste y permite volver a esa partida. Representa una apertura que apareció en el encuentro; no una evaluación de cómo la jugaste.</p><p>Para conseguir una mítica, completá todas las posiciones con nombre de una rama de al menos tres cartas y ganá una partida en la que hayas hecho su jugada definitoria. Cada rama muestra su progreso y el requisito de victoria.</p><p>Las amistosas se suman a tu colección personal; sus jugadas no se publican al visitar otros álbumes. Las partidas presenciales con sólo el resultado no permiten reconocer la apertura. Catálogo de posiciones: <a href="https://github.com/lichess-org/chess-openings" target="_blank" rel="noreferrer">Lichess · CC0</a>.</p></details>
  </>}
  {elegida&&<DetalleApertura carta={elegida} jugadorId={jugadorId!} nombreJugador={nombreJugador} explorar={()=>{setFamiliaId(claveFamiliaApertura(elegida));estudiar(elegida.id);setElegida(null);}} cerrar={()=>setElegida(null)}/>}
 </section>;
}
function DetalleApertura({carta,jugadorId,nombreJugador,explorar,cerrar}:{carta:DatosCarta;jugadorId:string;nombreJugador?:string;explorar:()=>void;cerrar:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
 return <dialog ref={ref} className={s.modal} aria-label={carta.nombre} onCancel={e=>{e.preventDefault();cerrar();}} onClick={e=>{if(e.target===e.currentTarget)cerrar();}}><div className={s.modalCabecera}><h2>{carta.nombre}</h2><button type="button" onClick={cerrar} aria-label="Cerrar apertura">✕</button></div><div className={s.detalle}><CartaApertura carta={carta}/><div><p className={s.kicker}>{nombreJugador?`LA HISTORIA DE ${nombreJugador.toLocaleUpperCase('es')}`:'TU HISTORIA CON ESTA CARTA'}</p><p>{carta.ramaCompleta?'Mítica conseguida':'Primera aparición'}: {fecha(carta.ramaCompleta?.fecha??carta.partidas[0].fecha)}.</p><p>{carta.victorias} victorias · {carta.tablas} tablas · {carta.partidas.length-carta.victorias-carta.tablas} derrotas.</p><p className={s.nota}>{carta.eco?'Posición de referencia del catálogo.':'Formación de su primera partida registrada.'} {carta.pgn}</p>{carta.eco&&<button className="button-secondary" onClick={explorar}>Explorar sus continuaciones →</button>}<div className={s.partidas}>{[...carta.partidas].reverse().map(p=><Link key={p.id} href={p.amistosa?`/jugar/online?mesa=${p.id}`:`/partidas/${p.id}?jugador=${jugadorId}`}><span><strong>Contra {p.rival}</strong><small>{fecha(p.fecha)} · {p.amistosa?'Amistosa · ':''}{p.color==='w'?'Blancas':'Negras'} · {p.resultado}</small></span><b aria-hidden="true">↗</b></Link>)}</div></div></div></dialog>;
}
