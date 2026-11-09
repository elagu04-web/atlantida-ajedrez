"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {Icono} from './Icono';
import {aniosHistoria,categoriasHistoria,fechaHistoria,filtrarHistoria,publicacionesHistoria,rutaHistoria,type PublicacionHistoria} from '@/lib/historiaClub';
import s from './HistoriaClub.module.css';

export function ArchivoHistoria(){
 const parametros=useSearchParams();
 const anio=aniosHistoria.some(a=>String(a)===parametros.get('anio'))?parametros.get('anio')!:'',categoria=categoriasHistoria.includes(parametros.get('categoria')??'')?parametros.get('categoria')!:'',buscar=parametros.get('buscar')??'',fotos=parametros.get('fotos')==='1',orden=parametros.get('orden')==='recientes'?'recientes':'antiguas';
 const entradas=useMemo(()=>filtrarHistoria({anio,categoria,buscar,fotos,orden}),[anio,categoria,buscar,fotos,orden]);
 function filtrar(cambios:Record<string,string>){const q=new URLSearchParams(window.location.search);for(const [clave,valor] of Object.entries(cambios)){if(valor)q.set(clave,valor);else q.delete(clave);}window.history.replaceState(null,'','/historia'+(q.size?'?'+q:'')+'#archivo-historia');}
 const limpiar=()=>window.history.replaceState(null,'','/historia#archivo-historia');
 const hayFiltros=!!(anio||categoria||buscar||fotos);
 return <section className={s.archivo} id="archivo-historia" aria-labelledby="titulo-archivo">
  <div className={s.tituloSeccion}><div><p className="eyebrow">Los recuerdos del club</p><h2 id="titulo-archivo">Cada encuentro dejó <em>una historia.</em></h2></div><p>{publicacionesHistoria.length} publicaciones sobre la vida del club. El recorrido empieza en 2010 y avanza hacia los años siguientes.</p></div>
  <div className={s.filtros}>
   <label className={s.buscar}><span>Buscar en el archivo</span><div><Icono nombre="buscar"/><input type="search" value={buscar} onChange={e=>filtrar({buscar:e.target.value})} placeholder="Una persona, un torneo, un recuerdo…" maxLength={120}/></div></label>
   <label>Año<select value={anio} onChange={e=>filtrar({anio:e.target.value})}><option value="">Todos los años</option>{aniosHistoria.map(a=><option key={a} value={a}>{a} · {publicacionesHistoria.filter(p=>p.anio===a).length}</option>)}</select></label>
   <label>Qué querés recorrer<select value={categoria} onChange={e=>filtrar({categoria:e.target.value})}><option value="">Todas las publicaciones</option>{categoriasHistoria.map(c=><option key={c}>{c}</option>)}</select></label>
  </div>
  <div className={s.resultadosBarra}><p role="status" aria-live="polite"><strong>{entradas.length}</strong> {entradas.length===1?'publicación':'publicaciones'}{anio?' de '+anio:''}</p><div><label className={s.conFotos}><input type="checkbox" checked={fotos} onChange={e=>filtrar({fotos:e.target.checked?'1':''})}/>Con imágenes</label><label className={s.orden}><span className="sr-only">Orden de las publicaciones</span><select value={orden} onChange={e=>filtrar({orden:e.target.value==='antiguas'?'':e.target.value})}><option value="antiguas">Desde 2010 en adelante</option><option value="recientes">Más recientes primero</option></select></label>{hayFiltros&&<button className="text-link" onClick={limpiar}>Limpiar filtros</button>}</div></div>
  <ResultadosHistoria key={[anio,categoria,buscar,fotos,orden].join('|')} entradas={entradas} limpiar={limpiar}/>
 </section>;
}

function ResultadosHistoria({entradas,limpiar}:{entradas:PublicacionHistoria[];limpiar:()=>void}){
 const [limite,setLimite]=useState(24),[galeria,setGaleria]=useState<PublicacionHistoria|null>(null),[indice,setIndice]=useState(0);
 const dialogo=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=dialogo.current;if(galeria&&!d?.open)d?.showModal();else if(!galeria&&d?.open)d.close();},[galeria]);
 const abrir=(p:PublicacionHistoria)=>{setIndice(0);setGaleria(p);};
 const mover=(n:number)=>{if(galeria)setIndice(i=>(i+n+galeria.fotos.length)%galeria.fotos.length);};
 const foto=galeria?.fotos[indice];
 return <>
  {!entradas.length?<div className={s.vacio}><Icono nombre="buscar"/><h3>No encontramos ese recuerdo.</h3><p>Probá otro nombre, otra palabra o buscá en todos los años.</p><button className="button-secondary" onClick={limpiar}>Ver todo el archivo</button></div>:<div className={s.cuadricula}>{entradas.slice(0,limite).map(p=><article className={s.tarjeta} key={p.id}>
   {p.fotos.length?<button className={s.imagen} onClick={()=>abrir(p)} aria-label={'Ver las imágenes de '+p.titulo}><Image src={p.fotos[0].mini} alt={p.titulo+' · Archivo del club, '+p.anio} width={p.fotos[0].ancho} height={p.fotos[0].alto} unoptimized loading="lazy"/><span>{p.fotos.length===1?'Ver imagen':p.fotos.length+' imágenes'} ↗</span></button>:<div className={s.sinImagen} aria-hidden="true"><span>♞</span><small>Archivo del club</small></div>}
   <div className={s.textoTarjeta}><div className={s.fecha}><time dateTime={p.fecha}>{fechaHistoria(p.fecha)}</time><span>{p.anio}</span></div><p className={s.categoria}>{p.categoria}</p><h3><Link href={rutaHistoria(p)} prefetch={false}>{p.titulo}</Link></h3>{p.sinTitulo&&<p className={s.sinTitulo}>Una publicación sin título del archivo original.</p>}<Link className={s.leer} href={rutaHistoria(p)} prefetch={false}>Leer este recuerdo <Icono nombre="flecha" className="h-4 w-4"/></Link></div>
  </article>)}</div>}
  {entradas.length>0&&<div className={s.mas}><p>Mostrando {Math.min(limite,entradas.length)} de {entradas.length} publicaciones</p>{limite<entradas.length&&<button className="button-secondary" onClick={()=>setLimite(n=>n+24)}>Seguir recorriendo <Icono nombre="flecha" className="h-4 w-4 rotate-90"/></button>}</div>}
  <dialog ref={dialogo} className={s.dialogo} aria-labelledby="titulo-foto-historica" onClose={()=>setGaleria(null)} onClick={e=>{if(e.target===e.currentTarget)dialogo.current?.close();}} onKeyDown={e=>{if(e.key==='ArrowRight'){e.preventDefault();mover(1);}if(e.key==='ArrowLeft'){e.preventDefault();mover(-1);}}}>
   {galeria&&foto&&<div className={s.galeria}><header><div><p>{fechaHistoria(galeria.fecha)} · Archivo del club</p><h2 id="titulo-foto-historica">{galeria.titulo}</h2></div><button aria-label="Cerrar imágenes" onClick={()=>dialogo.current?.close()}><Icono nombre="cerrar"/></button></header><div className={s.fotoGrande}><Image src={foto.src} width={foto.ancho} height={foto.alto} unoptimized alt={galeria.titulo+' · Imagen '+(indice+1)} /></div><footer><div className={s.controlesFotos}><button aria-label="Imagen anterior" disabled={galeria.fotos.length<2} onClick={()=>mover(-1)}>←</button><span aria-live="polite">{indice+1} / {galeria.fotos.length}</span><button aria-label="Imagen siguiente" disabled={galeria.fotos.length<2} onClick={()=>mover(1)}>→</button></div><a className="text-link" href={galeria.fuente} target="_blank" rel="noopener noreferrer">Leer la publicación original ↗</a></footer></div>}
  </dialog>
 </>;
}
