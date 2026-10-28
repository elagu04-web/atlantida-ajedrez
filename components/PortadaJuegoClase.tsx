import Image,{type ImageLoader} from 'next/image';
import {type JuegoClase} from '@/lib/mesaClasesInterfaz';
import {arteTarjetaClase,imagenTarjetaClase} from '@/lib/tarjetasClase';
import s from './MesaClases.module.css';
// Pre-sized local WebP assets preserve the original art and avoid a second compression.
const cargarPortada:ImageLoader=({src,width})=>src.replace('-960.webp',width<=480?'-480.webp':'-960.webp');
export function PortadaJuegoClase({juego:m}:{juego:JuegoClase}){
 const arte=arteTarjetaClase(m.id);
 return <div className={s.portada} data-portada={m.id} aria-hidden="true">
  <Image loader={cargarPortada} src={imagenTarjetaClase(m.id)} alt="" fill sizes="(max-width:650px) calc(100vw - 40px), (max-width:1000px) 50vw, 33vw" className={s.ilustracion} loading="lazy"/>
  <span className={s.tipoActividad}>{m.category==='story'?'CUENTO INTERACTIVO':m.category==='challenge'?'DESAFÍO':m.category==='teacher'?'TU ESPACIO DE CLASE':'JUEGO DE AJEDREZ'}</span>
  <span className={s.abrirPortada}><svg viewBox="0 0 24 24" fill="none" focusable="false"><path d="m8 5 10 7-10 7V5Z" fill="currentColor"/></svg></span>
  <span className={s.lemaPortada}>{arte.lema}</span>
 </div>;
}
