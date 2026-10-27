"use client";
import {useEffect,useRef,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
import {AuthWidget} from './AuthWidget';
import s from './MesaClases.module.css';
export function MesaClases(){
 const {session,esAdmin,cargando}=useAuth(),[abierto,setAbierto]=useState(false),[listo,setListo]=useState(false),[error,setError]=useState(''),panel=useRef<HTMLDivElement>(null);
 const token=session?.access_token;
 useEffect(()=>{
  if(!token||!esAdmin){void fetch('/api/clases/acceso',{method:'DELETE'}).catch(()=>{});return;}
  if(!abierto)return;
  let vivo=true;
  async function renovar(){try{const r=await fetch('/api/clases/acceso',{method:'POST',headers:{Authorization:'Bearer '+token}});if(!r.ok)throw new Error('No pudimos confirmar el acceso. Volvé a abrir la mesa o iniciá sesión otra vez.');if(vivo){setListo(true);setError('');}}catch(e){if(vivo){setListo(false);setError((e as Error).message);}}}
  void renovar();const alVolver=()=>{if(document.visibilityState==='visible')void renovar();};window.addEventListener('focus',alVolver);document.addEventListener('visibilitychange',alVolver);const reloj=setInterval(()=>void renovar(),45000);
  return()=>{vivo=false;clearInterval(reloj);window.removeEventListener('focus',alVolver);document.removeEventListener('visibilitychange',alVolver);};
 },[token,esAdmin,abierto]);
 if(cargando)return <p role="status">Preparando tus clases…</p>;
 if(!session)return <section className={s.acceso}><p className="eyebrow">TU ESPACIO PARA ENSEÑAR</p><h1>Mis clases</h1><p>Iniciá sesión con tu cuenta de profesor.</p><AuthWidget/></section>;
 if(!esAdmin)return <section className={s.acceso}><h1>Esta mesa es privada.</h1><p>Los juegos de clase están disponibles para el profesor.</p></section>;
 return <section className={s.clases}><header><div><p className="eyebrow">SOLO VOS · MESA DE JUEGO</p><h1>Tu próxima clase empieza acá.</h1><p>Juegos, desafíos, cuentos y el tablero del profe, reunidos en un lugar.</p></div>{abierto&&listo&&<button type="button" className="button-secondary" onClick={()=>void panel.current?.requestFullscreen().catch(()=>setError('Podés usar el botón de pantalla completa dentro de la mesa.'))}>Pantalla completa ↗</button>}</header>{!abierto?<div className={s.entrada}><span aria-hidden="true">♞</span><div><h2>Elegí un juego. Armá tu clase.</h2><p>Encontrá todos los juegos de tu app Mesa de juego, incluido el Caballo fantasma. En Profe podés preparar posiciones y abrir la pantalla para proyectar.</p><button type="button" className="button-primary" onClick={()=>{setError('');setAbierto(true);}}>Abrir mi mesa de clases →</button></div></div>:<div ref={panel} className={s.mesa}>{listo?<iframe title="Mesa de juego privada para dar clases" src="/api/clases/mesa/index.html" allow="fullscreen; microphone" allowFullScreen/>:<p role="status">{error||'Abriendo tus juegos…'}</p>}</div>}{error&&<p role="alert">{error} <button type="button" className="text-link" onClick={()=>{setAbierto(false);setListo(false);}}>Volver a abrir</button></p>}<p className={s.nota}>Acceso exclusivo de tu cuenta. Las clases preparadas dentro de la mesa se conservan en este navegador: podés exportarlas desde Profe para llevarlas a otra computadora.</p></section>;
}
