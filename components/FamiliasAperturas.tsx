/* eslint-disable @next/next/no-img-element -- Miniaturas de cartas obtenidas con piezas SVG locales. */
'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {Chess} from 'chess.js';
import {familiasAperturas,ramasDeFamilia,identidadFamilia,type FamiliaAperturas,type RamaFamilia} from '@/lib/familiasAperturas';
import type {CartaApertura as DatosCarta,HallazgoApertura} from '@/lib/albumAperturas';
import {CartaApertura} from './CartaApertura';
import {ArteFamiliaApertura} from './ArteFamiliaApertura';
import s from './FamiliasAperturas.module.css';

const limpiar=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const favoritas=['Italian Game','Sicilian Defense','London System','Ruy Lopez','French Defense','Caro-Kann Defense',"Queen's Gambit","King's Indian Defense",'English Opening','Scotch Game'];
type Props={cartas:DatosCarta[];miticas:DatosCarta[];nombreJugador?:string;familiaId:string|null;seleccionarFamilia:(id:string|null)=>void;verCarta:(c:DatosCarta)=>void;estudiar:(id:string)=>void};

export function FamiliasAperturas({cartas,miticas,nombreJugador,familiaId,seleccionarFamilia,verCarta,estudiar}:Props){
 const familias=useMemo(()=>familiasAperturas(cartas,miticas),[cartas,miticas]),[busqueda,setBusqueda]=useState(''),[filtro,setFiltro]=useState('iniciadas'),[limite,setLimite]=useState(12);
 const familia=familias.find(f=>f.id===familiaId);
 if(familia)return <PaginaFamilia key={familia.id} familia={familia} nombreJugador={nombreJugador} volver={()=>seleccionarFamilia(null)} verCarta={verCarta} estudiar={estudiar}/>;
 const consulta=limpiar(busqueda),lista=familias.filter(f=>(filtro==='todas'||(filtro==='iniciadas'?f.obtenidas.length>0:f.obtenidas.length===0))&&limpiar(f.nombre+' '+f.id+' '+f.posiciones.map(p=>p.nombre+' '+p.eco).join(' ')).includes(consulta)).sort((a,b)=>b.obtenidas.length-a.obtenidas.length||prioridad(a.id)-prioridad(b.id)||a.nombre.localeCompare(b.nombre,'es'));
 return <div className={s.album}>
  <div className={s.resumen}><span><strong>{familias.filter(f=>f.obtenidas.length).length}</strong> familias iniciadas</span><span><strong>{cartas.length}</strong> posiciones conseguidas</span><span><strong>{miticas.length}</strong> míticas</span></div>
  <div className={s.herramientas}><div className={s.filtros} role="group" aria-label="Filtrar familias">{[['iniciadas',nombreJugador?'Su colección':'Mi colección'],['todas','Ver todas'],['pendientes','Por descubrir']].map(([id,label])=><button key={id} aria-pressed={filtro===id} onClick={()=>{setFiltro(id);setLimite(12);}}>{label}</button>)}</div><label><span>Buscar familia o variante</span><input type="search" value={busqueda} placeholder="Siciliana, Italiana, Londres…" onChange={e=>{setBusqueda(e.target.value);setLimite(12);}}/></label></div>
  <div className={s.familias}>{lista.slice(0,limite).map(f=><PortadaFamilia key={f.id} familia={f} abrir={()=>seleccionarFamilia(f.id)}/>)}</div>
  {!lista.length&&<div className={s.vacio}><p>{filtro==='iniciadas'?(consulta?'Esa familia todavía no aparece en esta colección.':nombreJugador?'Todavía no tiene cartas de aperturas.':'Tu primera figurita de aperturas está por llegar. Las conseguís jugando partidas guardadas.'):'No hay familias con ese nombre. Probá otra búsqueda.'}</p>{filtro==='iniciadas'&&<button className={s.mas} onClick={()=>setFiltro('todas')}>{consulta?'Buscar también las pendientes':'Descubrir otras familias'} →</button>}</div>}
  {lista.length>limite&&<button className={s.mas} onClick={()=>setLimite(n=>n+12)}>Ver más familias <span>({lista.length-limite})</span> ↓</button>}
  <details className={s.catalogo}><summary>Acerca de este álbum</summary><p>Las familias reúnen aperturas, defensas, gambitos y sistemas. El catálogo tiene 3865 posiciones con nombre; el progreso de cada familia cuenta únicamente las conseguidas en partidas guardadas. Las formaciones propias se agregan cuando aparecen en esas partidas.</p></details>
 </div>;
}
function prioridad(id:string){const i=favoritas.indexOf(id);return i<0?100:i;}

function PortadaFamilia({familia:f,abrir}:{familia:FamiliaAperturas;abrir:()=>void}){
 const identidad=identidadFamilia(f.id),empezada=f.obtenidas.length>0;
 const figurita=f.miticas[0]??[...f.obtenidas].sort((a,b)=>Number(b.acabado==='foil')-Number(a.acabado==='foil')||Number(b.rareza==='rara')-Number(a.rareza==='rara')||b.profundidad-a.profundidad)[0];
 return <button className={`${s.portada} ${s[identidad.tono]} ${empezada?'':s.sinDescubrir}`} data-familia-estado={empezada?'obtenida':'pendiente'} onClick={abrir} aria-label={`Abrir ${f.nombre}, ${f.obtenidas.length} de ${f.posiciones.length} posiciones conseguidas`}>
  <div className={s.escena}><span className={s.sello}>ATLÁNTIDA · APERTURAS</span><span className={s.estado}>{empezada?'FIGURITA CONSEGUIDA':'POR DESCUBRIR'}</span><div className={`${s.pila} ${figurita?s.pilaFigurita:''}`}><span className={s.cartaTrasera}/><span className={s.cartaIntermedia}/>{figurita?<FiguritaPortada carta={figurita}/>:<span className={s.dorsoPortada} aria-hidden="true"><CandadoCarta/><b>POR DESCUBRIR</b><small>LAS CARTAS LLEGAN JUGANDO</small></span>}</div><p className={s.lema}>{empezada?identidad.lema:'UNA FAMILIA POR ESTRENAR'}</p></div>
  <div className={s.infoPortada}><h3>{f.nombre}</h3><div className={s.progresoTexto}><strong>{f.obtenidas.length} <span>/ {f.posiciones.length}</span></strong><small>{empezada?'posiciones conseguidas':'una familia por descubrir'}</small></div><progress max={f.posiciones.length||1} value={f.obtenidas.length}/><footer><span>{f.miticas.length?`✦ ${f.miticas.length} ${f.miticas.length===1?'mítica':'míticas'}`:f.tieneMitica?'✧ Mítica pendiente':empezada?'✓ Carta conseguida':'♧ Carta pendiente'}</span><b>Abrir familia →</b></footer></div>
 </button>;
}
function FiguritaPortada({carta}:{carta:DatosCarta}){
 const casillas=useMemo(()=>new Chess(carta.fen).board().flat(),[carta.fen]);
 return <span className={`${s.figuritaPortada} ${carta.acabado==='foil'?s.figuritaFoil:''} ${carta.rareza==='mitica'?s.figuritaMitica:''}`} aria-hidden="true"><span className={s.edicionFigurita}><b>{carta.rareza==='mitica'?'MÍTICA':carta.rareza==='rara'?'RARA':'COMÚN'}{carta.acabado==='foil'?' · FOIL':''}</b><small>{carta.eco??'CLUB'}</small></span><span className={s.tableroFigurita}>{casillas.map((p,i)=><span key={i} className={(Math.floor(i/8)+i%8)%2?s.casillaOscura:s.casillaClara}>{p&&<img src={`/piezas/cburnett/${p.color}${p.type.toUpperCase()}.svg`} alt="" loading="lazy" draggable={false}/>}</span>)}</span><strong>{carta.nombre}</strong>{carta.acabado==='foil'&&<i className={s.reflejoFigurita}/>}</span>;
}

function PaginaFamilia({familia:f,nombreJugador,volver,verCarta,estudiar}:{familia:FamiliaAperturas;nombreJugador?:string;volver:()=>void;verCarta:(c:DatosCarta)=>void;estudiar:(id:string)=>void}){
 const identidad=identidadFamilia(f.id),[vista,setVista]=useState<'cartas'|'mapa'>('cartas'),[limite,setLimite]=useState(12),[pendientes,setPendientes]=useState(8),[objetivo,setObjetivo]=useState<HallazgoApertura|null>(null);
 const propias=useMemo(()=>new Map(f.obtenidas.map(c=>[c.id,c])),[f.obtenidas]),ramas=useMemo(()=>ramasDeFamilia(f),[f]);
 const faltan=f.posiciones.filter(p=>!propias.has(p.id)).sort((a,b)=>a.profundidad-b.profundidad||a.nombre.localeCompare(b.nombre,'es'));
 const conseguidas=[...f.miticas,...f.obtenidas].sort((a,b)=>Number(b.rareza==='mitica')-Number(a.rareza==='mitica')||a.profundidad-b.profundidad||a.nombre.localeCompare(b.nombre,'es'));
 return <div className={`${s.paginaFamilia} ${s[identidad.tono]}`}>
  <button className={s.volver} onClick={volver}>← Todas las familias</button>
  <header className={s.heroFamilia}><div className={s.grabado}><ArteFamiliaApertura identidad={identidad}/></div><div className={s.heroDatos}><p className={s.kicker}>{identidad.lema}</p><h3>{f.nombre}</h3><p>{f.obtenidas.length} de {f.posiciones.length} posiciones conseguidas{nombreJugador?` por ${nombreJugador}`:''}.</p><progress max={f.posiciones.length||1} value={f.obtenidas.length}/><div className={s.accionesFamilia}>{f.entradaId&&<button onClick={()=>estudiar(f.entradaId!)}>Estudiar esta apertura ↗</button>}<span>Las cartas llegan jugando.</span></div></div></header>
  <div className={s.hito}><span className={s.iconoHito} aria-hidden="true">{f.miticas.length?'✦':'♧'}</span><div><strong>{f.miticas.length?`${f.miticas.length} ${f.miticas.length===1?'mítica conseguida':'míticas conseguidas'}`:'El siguiente gran logro'}</strong><p>{f.miticas.length?'Las ramas completadas con una victoria tienen su lugar especial en esta colección.':f.tieneMitica?'Completá una rama y ganá con esa apertura para conseguir su mítica. Cada rama tiene sus propias posiciones y requisitos.':'Esta formación tiene su propia carta. Jugala y ganá para conseguir su edición foil.'}</p></div></div>
  <div className={s.filtros} role="group" aria-label="Ver familia"><button aria-pressed={vista==='cartas'} onClick={()=>setVista('cartas')}>La colección</button><button aria-pressed={vista==='mapa'} onClick={()=>setVista('mapa')}>Mapa de variantes</button></div>
  {vista==='mapa'?<div className={s.mapa}><p className={s.nota}>Las líneas siguen las jugadas de cada variante. Expandí una rama para ver sus continuaciones; las cartas pendientes conservan su dorso.</p><ul className={s.arbol}>{ramas.map(r=><RamaColeccion key={r.carta.id} rama={r} propias={propias} profundidad={0} verCarta={verCarta} objetivo={setObjetivo}/>)}</ul></div>:<>
   <div className={s.tituloGrupo}><h4>{nombreJugador?'Sus cartas':'Tus cartas'}</h4><span>{conseguidas.length} conseguidas</span></div>
   {conseguidas.length?<><div className={s.cartas}>{conseguidas.slice(0,limite).map(c=><CartaApertura key={c.id} carta={c} seleccionar={()=>verCarta(c)}/>)}</div>{conseguidas.length>limite&&<button className={s.mas} onClick={()=>setLimite(l=>l+12)}>Ver más cartas conseguidas ↓</button>}</>:<div className={s.primeraCarta}><strong>La primera carta está por llegar.</strong><p>Alcanzá una de estas posiciones en una partida amistosa o de torneo guardada para comenzar esta familia.</p>{!nombreJugador&&<Link className="button-secondary" href="/jugar/online">Ir a jugar →</Link>}</div>}
   {!!faltan.length&&<><div className={s.tituloGrupo}><h4>Por jugar</h4><span>{faltan.length} posiciones pendientes</span></div><div className={s.cartas}>{faltan.slice(0,pendientes).map(c=><button key={c.id} className={s.hueco} onClick={()=>setObjetivo(c)} aria-label={`Ver objetivo: ${c.nombre}, ${c.eco??'CLUB'}, ${c.pgn}, carta no conseguida`}><DorsoFamilia simbolo={identidad.simbolo}/><div className={s.huecoTexto}><small>{c.eco??'CLUB'} · PASO {c.profundidad}</small><strong>{c.nombre===f.nombre?(c.id===f.entradaId?'Posición de la apertura':'Continuación de la apertura'):c.nombre.replace(f.nombre+' · ','')}</strong><em className={s.secuenciaPendiente} title={c.pgn}>{c.pgn}</em><span>Se consigue jugando ↗</span></div></button>)}</div>{faltan.length>pendientes&&<button className={s.mas} onClick={()=>setPendientes(p=>p+8)}>Ver más variantes pendientes ↓</button>}</>}
  </>}
  {objetivo&&<ObjetivoCarta carta={objetivo} simbolo={identidad.simbolo} cerrar={()=>setObjetivo(null)} estudiar={()=>estudiar(objetivo.id)} puedeEstudiar={objetivo.eco!==null}/>}
 </div>;
}

function CandadoCarta(){return <svg width="16" height="20" viewBox="0 0 20 24" fill="none" aria-hidden="true"><path d="M5 10V7a5 5 0 0 1 10 0v3M3 10h14v11H3V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 14v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;}
function DorsoFamilia({simbolo}:{simbolo:string}){return <div className={s.dorso} aria-hidden="true"><span>ATLÁNTIDA AJEDREZ</span><strong>{simbolo}</strong><i><CandadoCarta/></i><span>UNA HISTORIA<br/>POR JUGAR</span></div>;}
function contar(r:RamaFamilia,propias:Map<string,DatosCarta>):number{return Number(propias.has(r.carta.id))+r.hijos.reduce((n,h)=>n+contar(h,propias),0);}
function RamaColeccion({rama:r,propias,profundidad,verCarta,objetivo}:{rama:RamaFamilia;propias:Map<string,DatosCarta>;profundidad:number;verCarta:(c:DatosCarta)=>void;objetivo:(c:HallazgoApertura)=>void}){
 const [abierta,setAbierta]=useState(profundidad===0),propia=propias.get(r.carta.id),pasos=r.carta.pgn.split(/\s+/),ultimo=pasos.at(-1),n=contar(r,propias);
 return <li className={s.rama}>
  <div className={`${s.nodo} ${propia?s.nodoObtenido:''}`}><span className={s.san}>{r.carta.eco?`${Math.ceil(r.carta.profundidad/2)}${r.carta.lado==='w'?'.':'…'} ${ultimo}`:'CLUB'}</span><button className={s.nombreNodo} onClick={()=>propia?verCarta(propia):objetivo(r.carta)}><strong>{r.carta.nombre}</strong><small>{!propia&&<CandadoCarta/>}{propia?`✓ ${propia.rareza==='rara'?'Rara':'Común'}${propia.acabado==='foil'?' · Foil':''}`:'Carta pendiente'} · {r.carta.eco??'FORMACIÓN PROPIA'}</small></button>{!!r.hijos.length&&<button className={s.expandir} aria-expanded={abierta} onClick={()=>setAbierta(a=>!a)} aria-label={`${abierta?'Cerrar':'Abrir'} variantes de ${r.carta.nombre}`}><span>{n} conseguidas</span>{abierta?'−':'+'}</button>}</div>
  {abierta&&!!r.hijos.length&&<ul>{r.hijos.map(h=><RamaColeccion key={h.carta.id} rama={h} propias={propias} profundidad={profundidad+1} verCarta={verCarta} objetivo={objetivo}/>)}</ul>}
 </li>;
}
function ObjetivoCarta({carta,simbolo,cerrar,estudiar,puedeEstudiar}:{carta:HallazgoApertura;simbolo:string;cerrar:()=>void;estudiar:()=>void;puedeEstudiar:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
 return <dialog ref={ref} className={s.objetivo} onCancel={e=>{e.preventDefault();cerrar();}} onClick={e=>{if(e.target===e.currentTarget)cerrar();}} aria-label="Una carta por conseguir"><header><p className={s.kicker}>UNA CARTA POR CONSEGUIR</p><button onClick={cerrar} aria-label="Cerrar objetivo">✕</button></header><div className={s.objetivoDetalle}><DorsoFamilia simbolo={simbolo}/><div><h3>{carta.nombre}</h3><p>La carta sigue guardada detrás de su dorso. Para conseguirla, alcanzá esta posición en una partida amistosa o de torneo que quede guardada.</p><p className={s.lineaObjetivo}>{carta.pgn}</p><p>La edición depende de quién hizo la jugada que la define y del resultado de la partida.</p><div className={s.accionesObjetivo}><Link className="button-secondary" href="/jugar/online">Ir a jugar →</Link>{puedeEstudiar&&<button onClick={estudiar}>Estudiar esta posición ↗</button>}</div></div></div></dialog>;
}

export function ProgresoFamiliasSobre({cartas,miticas,reveladas}:{cartas:DatosCarta[];miticas:DatosCarta[];reveladas:DatosCarta[]}){
 const familias=useMemo(()=>familiasAperturas(cartas,miticas),[cartas,miticas]);
 const ids=new Set(reveladas.map(c=>c.id.replace('mitica:',''))),afectadas=familias.filter(f=>f.posiciones.some(c=>ids.has(c.id)));
 return <div className={s.avanceSobre}><p className={s.kicker}>LAS FAMILIAS DE ESTE SOBRE</p>{afectadas.map(f=><div key={f.id} className={s[identidadFamilia(f.id).tono]}><span>{identidadFamilia(f.id).simbolo}</span><div><strong>{f.nombre}</strong><small>{f.obtenidas.length} de {f.posiciones.length} posiciones · progreso actual</small><progress max={f.posiciones.length||1} value={f.obtenidas.length}/></div><b>{f.miticas.length?'✦':''}</b></div>)}</div>;
}
