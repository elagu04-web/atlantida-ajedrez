'use client';
import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {DatosFiguritasProvider} from '@/context/DatosFiguritasContext';
import {AlbumCatalogoProvider,useCatalogoAlbum} from '@/context/AlbumCatalogoContext';
import {useAlbumPublico} from '@/context/useAlbumPublico';
import type {AlbumPublico} from '@/lib/albumesPublicos';
import {nombreRareza,nombreVersion,type Figurita} from '@/lib/album';
import {CartaAlbum} from './CartaAlbum';
import {AvatarAlbum} from './AlbumesClub';
import s from './AlbumesClub.module.css';
const AlbumAperturas=dynamic(()=>import('./AlbumAperturas').then(m=>m.AlbumAperturas),{loading:()=> <p role="status">Abriendo las aperturas…</p>});

export function AlbumVisitado({jugadorId}:{jugadorId:string}){
 return <DatosFiguritasProvider><AlbumCatalogoProvider><ColeccionVisitada key={jugadorId} jugadorId={jugadorId}/></AlbumCatalogoProvider></DatosFiguritasProvider>;
}
function ColeccionVisitada({jugadorId}:{jugadorId:string}){
 const {datos,cargando,error,refrescar}=useAlbumPublico<AlbumPublico>(jugadorId),{porId,catalogo}=useCatalogoAlbum();
 const [seccion,setSeccion]=useState<'figuritas'|'aperturas'>('figuritas'),[filtro,setFiltro]=useState('Todas'),[elegida,setElegida]=useState<Figurita|null>(null);
 const propias=new Map(datos?.inventario.map(f=>[f.id,f.cantidad])??[]);
 const figuritas=(datos?.inventario??[]).map(f=>porId.get(f.id)).filter((f):f is Figurita=>!!f).filter(f=>filtro==='Todas'||nombreRareza[f.rareza]===filtro||nombreVersion[f.version]===filtro).sort((a,b)=>a.numero-b.numero||a.id.localeCompare(b.id));
 if(cargando)return <p role="status" className={s.estado}>Abriendo el álbum del jugador…</p>;
 if(error)return <div role="alert" className={s.estado}><p>{error}</p><button className="button-secondary" onClick={refrescar}>Reintentar</button></div>;
 if(!datos)return <div className={s.estado}><h1>No encontramos ese jugador</h1><Link href="/album?seccion=club#albumes-del-club">Ver los álbumes del club →</Link></div>;
 const j=datos.jugador;
 return <div className={s.pagina}><Link className="text-link" href="/album?seccion=club#albumes-del-club">← Todos los álbumes</Link><header className={s.portada}><AvatarAlbum id={j.id} nombre={j.nombre} foto={j.foto}/><div><p className={s.kicker}>VISITANDO SU COLECCIÓN</p><h1>El álbum de {j.nombre}.</h1><p>{j.figuritas} de {catalogo.length} figuritas · {j.versiones} versiones conseguidas</p><Link href={`/jugadores/${j.id}`} className="text-link">Ver su perfil ↗</Link></div></header>
  <div className={s.tabs} role="group" aria-label={`Secciones del álbum de ${j.nombre}`}><button aria-pressed={seccion==='figuritas'} onClick={()=>setSeccion('figuritas')}>Sus figuritas</button><button aria-pressed={seccion==='aperturas'} onClick={()=>setSeccion('aperturas')}>Sus aperturas ✦</button></div>
  {seccion==='aperturas'?<AlbumAperturas jugadorId={j.id} nombreJugador={j.nombre}/>:<section aria-label={`Figuritas conseguidas por ${j.nombre}`}><div className={s.filtros} role="group" aria-label="Filtrar versiones">{['Todas','Común','Rara','Mítica','Foil','Full art'].map(f=><button key={f} aria-pressed={filtro===f} onClick={()=>setFiltro(f)}>{f}</button>)}</div><div className={s.figuritas}>{figuritas.map(f=><CartaAlbum key={f.id} f={f} cantidad={propias.get(f.id)??0} propietario={j.nombre} seleccionar={()=>setElegida(f)}/>)}</div>{!figuritas.length&&<p className={s.estado}>{j.versiones?'Todavía no tiene versiones con ese acabado o rareza.':`${j.nombre} todavía no abrió sus primeros sobres. Podés visitar sus aperturas mientras tanto.`}</p>}</section>}
  {elegida&&<DetalleFigurita f={elegida} cantidad={propias.get(elegida.id)??0} propietario={j.nombre} cerrar={()=>setElegida(null)}/>}
 </div>;
}
function DetalleFigurita({f,cantidad,propietario,cerrar}:{f:Figurita;cantidad:number;propietario:string;cerrar:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
 return <dialog ref={ref} className={s.modal} aria-label={`${f.nombre} en el álbum de ${propietario}`} onCancel={e=>{e.preventDefault();cerrar();}} onClick={e=>{if(e.target===e.currentTarget)cerrar();}}><header><h2>{f.nombre}</h2><button aria-label="Cerrar figurita" onClick={cerrar}>✕</button></header><CartaAlbum f={f} cantidad={cantidad} propietario={propietario} modo="detalle"/><p>{nombreRareza[f.rareza]} · {nombreVersion[f.version]} · {cantidad} {cantidad===1?'copia':'copias'} en el álbum de {propietario}.</p></dialog>;
}
