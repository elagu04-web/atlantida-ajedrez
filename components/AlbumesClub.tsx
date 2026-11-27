/* eslint-disable @next/next/no-img-element -- Fotografías originales del plantel del club. */
'use client';
import {useState} from 'react';
import Link from 'next/link';
import {useAlbumPublico} from '@/context/useAlbumPublico';
import type {DirectorioAlbumes} from '@/lib/albumesPublicos';
import {retratoJugador} from '@/lib/retratosJugadores';
import s from './AlbumesClub.module.css';

export function AlbumesClub(){
 const {datos,cargando,error,refrescar}=useAlbumPublico<DirectorioAlbumes>(null);
 const [busqueda,setBusqueda]=useState('');
 const limpiar=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const jugadores=(datos?.jugadores??[]).filter(j=>limpiar(j.nombre).includes(limpiar(busqueda)));
 return <section id="albumes-del-club" className={s.directorio} aria-label="Álbumes de los jugadores"><header className={s.cabecera}><div><p className={s.kicker}>UNA COLECCIÓN PARA COMPARTIR</p><h2>Los álbumes del club.</h2><p>Visitá a tus compañeros, descubrí sus figuritas y recorré las aperturas que jugaron.</p></div><label>Buscar jugador<input type="search" value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscá un nombre…"/></label></header>
  {cargando?<p role="status">Buscando los álbumes del plantel…</p>:error?<div role="alert"><p>{error}</p><button className="button-secondary" onClick={refrescar}>Reintentar</button></div>:<><div className={s.jugadores}>{jugadores.map(j=><Link key={j.id} href={`/album/${j.id}`} className={s.jugador}><AvatarAlbum id={j.id} nombre={j.nombre} foto={j.foto}/><div><strong>{j.nombre}</strong><p>{j.figuritas} {j.figuritas===1?'figurita':'figuritas'} · {j.versiones} {j.versiones===1?'versión':'versiones'}</p><small>Su álbum y sus aperturas <span aria-hidden="true">↗</span></small></div></Link>)}</div>{!jugadores.length&&<p>No encontramos jugadores con ese nombre.</p>}</>}
 </section>;
}
export function AvatarAlbum({id,nombre,foto}:{id:string;nombre:string;foto:string|null}){
 const [fallo,setFallo]=useState(false),src=foto?retratoJugador({id,fotoUrl:foto}).miniatura:null;
 return <span className={s.avatar}>{src&&!fallo?<img src={src} alt="" loading="lazy" onError={()=>setFallo(true)}/>:<span aria-hidden="true">{nombre.trim()[0]??'♞'}</span>}</span>;
}
