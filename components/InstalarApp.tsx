"use client";
import {useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useInstalacion} from '@/context/InstalacionContext';
import styles from './InstalarApp.module.css';

export function InstalarApp(){
 const {disponible,enApp,instalar}=useInstalacion();
 const [ocupado,setOcupado]=useState(false),[mensaje,setMensaje]=useState('');
 async function pedir(){setOcupado(true);try{const resultado=await instalar();setMensaje(resultado==='accepted'?'Instalación aceptada. Buscá el ícono de Atlántida entre tus aplicaciones.':resultado==='dismissed'?'Podés instalarla más adelante desde el menú de tu navegador.':'Seguí los pasos de abajo para agregar el ícono.');}finally{setOcupado(false);}}
 return <div className={styles.pagina}>
  <header className={styles.portada}><Image src="/app-icons/icon-192.png" alt="" width={96} height={96} priority/><div><p className={styles.sello}>El club, a un toque</p><h1>Atlántida en tu celular.</h1><p>Un ícono para entrar directo a jugar, entrenar y seguir al club.</p></div></header>
  <section className={styles.destacado} aria-label="Instalar Atlántida Ajedrez">
   <div><h2>{enApp?'Ya estás usando la app.':'Tu misma cuenta. Todo a mano.'}</h2><p>Entrá con tu usuario o con Google. El progreso guardado en tu cuenta te acompaña en el celular y en la computadora.</p></div>
   <div className={styles.acciones}>{enApp?<Link href="/entrenamiento" className="button-primary">Ir a entrenar →</Link>:disponible?<button type="button" className="button-primary" disabled={ocupado} onClick={()=>void pedir()}>{ocupado?'Abriendo instalación…':'Instalar en este dispositivo'}</button>:<a className="button-primary" href="#pasos-instalar">Cómo agregar el ícono ↓</a>}<Link href="/jugar/online" className="button-secondary">Jugar online</Link></div>
   {mensaje&&<p className={styles.mensaje} role="status">{mensaje}</p>}
  </section>
  {!enApp&&<section id="pasos-instalar" className={styles.pasos} aria-label="Pasos de instalación">
   <article><p className={styles.sello}>Android</p><h2>Desde Chrome</h2><ol><li>Abrí esta página en <strong>Chrome</strong>.</li><li>Tocá el menú de <strong>tres puntos ⋮</strong>.</li><li>Elegí <strong>Agregar a pantalla principal</strong> o <strong>Instalar app</strong> y confirmá.</li></ol><p className={styles.nota}>Si aparece el botón «Instalar en este dispositivo» arriba, podés usarlo directamente.</p></article>
   <article><p className={styles.sello}>iPhone / iPad</p><h2>Desde Safari</h2><ol><li>Abrí esta página en <strong>Safari</strong>.</li><li>Tocá <strong>Compartir</strong> (el cuadrado con una flecha hacia arriba; puede estar dentro del menú).</li><li>Elegí <strong>Agregar a inicio</strong> o <strong>Añadir a pantalla de inicio</strong>. Si aparece <strong>Abrir como app web</strong>, dejalo activado y tocá <strong>Agregar</strong>.</li></ol></article>
  </section>}
  <div className={styles.detalles}><p><strong>¿Abriste el enlace desde WhatsApp o Instagram?</strong> Usá «Abrir en el navegador» y seguí los pasos de tu celular.</p><p><strong>También en computadora.</strong> En Chrome o Edge buscá la opción «Instalar Atlántida Ajedrez» en la barra de direcciones o en el menú del navegador.</p><p>La instalación no tiene costo. Para jugar online, cargar ejercicios y guardar el progreso necesitás conexión a internet. Al abrirla por primera vez puede pedirte iniciar sesión de nuevo.</p></div>
 </div>;
}
