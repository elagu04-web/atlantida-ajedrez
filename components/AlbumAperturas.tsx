'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {useAlbumAperturas} from '@/context/useAlbumAperturas';
import {tiposCartaApertura,type CartaApertura as DatosCarta,type TipoCartaApertura} from '@/lib/albumAperturas';
import {CartaApertura} from './CartaApertura';
import s from './AlbumAperturas.module.css';

const fecha=(valor:string)=>new Date(valor).toLocaleDateString('es-UY',{timeZone:'America/Montevideo',day:'numeric',month:'short',year:'numeric'});
export function AlbumAperturas({jugadorId}:{jugadorId:string|null}){
 const {cartas,partidas,cargando,error,refrescar}=useAlbumAperturas(jugadorId);
 const [filtro,setFiltro]=useState<TipoCartaApertura|'todas'>('todas'),[busqueda,setBusqueda]=useState(''),[elegida,setElegida]=useState<DatosCarta|null>(null);
 const limpiar=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const lista=cartas.filter(c=>(filtro==='todas'||c.tipo===filtro)&&limpiar(c.nombre+' '+c.original+' '+(c.eco??'')).includes(limpiar(busqueda)));
 return <section id="mis-aperturas" className={s.seccion} aria-label="Mi colección de aperturas">
  <header className={s.cabecera}><div><p className={s.kicker}>OTRA PÁGINA DE TU ÁLBUM</p><h2>Tu forma de abrir la partida.</h2><p>Aperturas, defensas, gambitos y sistemas que aparecieron en tus partidas del club. Cada carta guarda los encuentros en los que la descubriste.</p></div><div className={s.contador}><strong>{cartas.length}</strong><span>cartas descubiertas</span></div></header>
  {!jugadorId?<p>Iniciá sesión y vinculá tu jugador para descubrir tu colección personal.</p>:<>
   <div className={s.herramientas}><div className={s.filtros} role="group" aria-label="Filtrar aperturas">{([['todas','Todas'],...Object.entries(tiposCartaApertura)] as [TipoCartaApertura|'todas',string][]).map(([id,nombre])=><button key={id} aria-pressed={filtro===id} onClick={()=>setFiltro(id)}>{nombre}{id!=='todas'?` (${cartas.filter(c=>c.tipo===id).length})`:''}</button>)}</div><label><span>Buscar apertura o ECO</span><input type="search" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Siciliana, Londres, B20…"/></label></div>
   {cargando?<p role="status">Recorriendo tus partidas guardadas…</p>:error?<div role="alert"><p>{error}</p><button className="button-secondary" onClick={refrescar}>Reintentar</button></div>:<>
    <div className={s.grilla}>{lista.map(c=><CartaApertura key={c.id} carta={c} seleccionar={()=>setElegida(c)}/>)}</div>
    {!lista.length&&<div className={s.vacio}><span aria-hidden="true">♞</span><h3>{cartas.length?'No hay cartas con ese filtro':'Tu primera apertura está por llegar'}</h3><p>{cartas.length?'Probá otro nombre o una categoría distinta.':'Jugá una partida online por Elo y, al terminar, sumaremos las aperturas que podamos reconocer en sus jugadas.'}</p>{!cartas.length&&<Link className="button-secondary" href="/jugar/online">Ir a jugar →</Link>}</div>}
    <p className={s.nota}>{partidas.length} {partidas.length===1?'partida oficial con jugadas revisada':'partidas oficiales con jugadas revisadas'}. Se incluyen las partidas anteriores y se actualiza al volver a este apartado. <button onClick={refrescar}>Actualizar colección ↻</button></p>
   </>}
   <details className={s.explicacion}><summary>¿Cómo se consiguen estas cartas?</summary><p>Se incorporan al terminar partidas por Elo del club que tengan las jugadas guardadas, ganes, empates o pierdas. También recuperamos las que ya jugaste. La misma apertura suma encuentros a su carta.</p><p>Reconocemos las posiciones de las primeras 20 jugadas con el catálogo de Lichess; algunas formaciones, como el Hipopótamo, se reconocen por tus propias piezas. La carta indica con qué color jugaste y permite volver a esa partida. Representa una apertura que apareció en el encuentro; no una evaluación de cómo la jugaste.</p><p>Las partidas presenciales con sólo el resultado no permiten reconocer la apertura. Catálogo de posiciones: <a href="https://github.com/lichess-org/chess-openings" target="_blank" rel="noreferrer">Lichess · CC0</a>.</p></details>
  </>}
  {elegida&&<DetalleApertura carta={elegida} jugadorId={jugadorId!} cerrar={()=>setElegida(null)}/>}
 </section>;
}
function DetalleApertura({carta,jugadorId,cerrar}:{carta:DatosCarta;jugadorId:string;cerrar:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
 return <dialog ref={ref} className={s.modal} aria-label={carta.nombre} onCancel={e=>{e.preventDefault();cerrar();}} onClick={e=>{if(e.target===e.currentTarget)cerrar();}}><div className={s.modalCabecera}><h2>{carta.nombre}</h2><button type="button" onClick={cerrar} aria-label="Cerrar apertura">✕</button></div><div className={s.detalle}><CartaApertura carta={carta}/><div><p className={s.kicker}>TU HISTORIA CON ESTA CARTA</p><p>Primera aparición: {fecha(carta.partidas[0].fecha)}.</p><p>{carta.victorias} victorias · {carta.tablas} tablas · {carta.partidas.length-carta.victorias-carta.tablas} derrotas.</p><p className={s.nota}>Posición de la primera partida registrada. Variante reconocida: {carta.variante}.</p><div className={s.partidas}>{[...carta.partidas].reverse().map(p=><Link key={p.id} href={`/partidas/${p.id}?jugador=${jugadorId}`}><span><strong>Contra {p.rival}</strong><small>{fecha(p.fecha)} · {p.color==='w'?'Blancas':'Negras'} · {p.resultado}</small></span><b aria-hidden="true">↗</b></Link>)}</div></div></div></dialog>;
}
