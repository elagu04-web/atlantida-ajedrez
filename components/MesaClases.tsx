"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
import {CANAL_CLASES,leerCatalogoClases,type CategoriaClase,type JuegoClase} from '@/lib/mesaClasesInterfaz';
import {AuthWidget} from './AuthWidget';
import {PortadaJuegoClase} from './PortadaJuegoClase';
import s from './MesaClases.module.css';
const grupos:{id:CategoriaClase;nombre:string;descripcion:string}[]=[{id:'game',nombre:'Juegos',descripcion:'Otra forma de pensar el tablero.'},{id:'challenge',nombre:'Desafíos',descripcion:'Una misión. Muchos caminos para resolverla.'},{id:'story',nombre:'Cuentos',descripcion:'Historias para leer, explorar y jugar.'},{id:'teacher',nombre:'Profe',descripcion:'Tus posiciones, tus ideas, tu clase.'}];
export function MesaClases(){
 const {session,esAdmin,cargando}=useAuth();
 const [listo,setListo]=useState(false),[error,setError]=useState(''),[catalogo,setCatalogo]=useState<JuegoClase[]>([]),[categoria,setCategoria]=useState<CategoriaClase>('game'),[busqueda,setBusqueda]=useState(''),[juego,setJuego]=useState<string|null>(null),[alto,setAlto]=useState(700),[sonido,setSonido]=useState(true),[concentrado,setConcentrado]=useState(false),[reintento,setReintento]=useState(0);
 const frame=useRef<HTMLIFrameElement>(null),panel=useRef<HTMLDivElement>(null),juegoActual=useRef<string|null>(null),primeraCarga=useRef(true),catalogoRef=useRef<JuegoClase[]>([]);
 const token=session?.access_token;
 const enviar=useCallback((tipo:string,datos:Record<string,unknown>={})=>frame.current?.contentWindow?.postMessage({canal:CANAL_CLASES,tipo,...datos},window.location.origin),[]);
 const medir=useCallback(()=>{const barra=panel.current?.querySelector('header')?.getBoundingClientRect().height||70,cabecera=document.querySelector('.site-header')?.getBoundingClientRect().height||0;enviar('viewport',{alto:Math.max(360,window.innerHeight-barra-cabecera-24)});},[enviar]);
 const abrir=useCallback((id:string|null)=>{
  if(id&&!catalogoRef.current.some(m=>m.id===id))return;
  juegoActual.current=id;setJuego(id);enviar('abrir',{id:id||'menu'});
  window.history.replaceState(null,'',window.location.pathname+window.location.search+(id?'#'+id:''));
  if(id)requestAnimationFrame(()=>{panel.current?.scrollIntoView({block:'start',behavior:'instant'});medir();});
 },[enviar,medir]);
 useEffect(()=>{
  if(!token||!esAdmin){void fetch('/api/clases/acceso',{method:'DELETE'}).catch(()=>{});return;}
  let vivo=true;
  async function renovar(){try{const r=await fetch('/api/clases/acceso',{method:'POST',headers:{Authorization:'Bearer '+token}});if(!r.ok)throw new Error('No pudimos confirmar el acceso. Volvé a intentar o iniciá sesión otra vez.');if(vivo){setListo(true);setError('');}}catch(e){if(vivo)setError((e as Error).message);}}
  void renovar();const alVolver=()=>{if(document.visibilityState==='visible')void renovar();};window.addEventListener('focus',alVolver);document.addEventListener('visibilitychange',alVolver);const reloj=setInterval(()=>void renovar(),45000);
  return()=>{vivo=false;clearInterval(reloj);window.removeEventListener('focus',alVolver);document.removeEventListener('visibilitychange',alVolver);};
 },[token,esAdmin,reintento]);
 useEffect(()=>{
  function mensaje(e:MessageEvent){
   if(e.origin!==window.location.origin||e.source!==frame.current?.contentWindow||e.data?.canal!==CANAL_CLASES)return;
   const d=e.data;
   if(d.tipo==='catalogo'){
    const items=leerCatalogoClases(d.juegos);catalogoRef.current=items;setCatalogo(items);setError('');
    if(primeraCarga.current){primeraCarga.current=false;const id=window.location.hash.slice(1);if(items.some(m=>m.id===id)){juegoActual.current=id;setJuego(id);enviar('abrir',{id});}}
    medir();
   }else if(d.tipo==='modo'){
    const id=d.id==='menu'?null:typeof d.id==='string'&&catalogoRef.current.some(m=>m.id===d.id)?d.id:null;juegoActual.current=id;setJuego(id);
   }else if(d.tipo==='alto'&&Number.isFinite(d.alto))setAlto(Math.max(200,Math.min(20000,Math.ceil(d.alto))));
   else if(d.tipo==='sonido'&&typeof d.activo==='boolean')setSonido(d.activo);
   else if(d.tipo==='enfocar')requestAnimationFrame(()=>panel.current?.scrollIntoView({block:'start',behavior:'instant'}));
  }
  window.addEventListener('message',mensaje);window.addEventListener('resize',medir);return()=>{window.removeEventListener('message',mensaje);window.removeEventListener('resize',medir);};
 },[enviar,medir]);
 useEffect(()=>{medir();},[concentrado,juego,medir]);
 useEffect(()=>{const seguirEnlace=()=>abrir(window.location.hash.slice(1)||null);window.addEventListener('hashchange',seguirEnlace);window.addEventListener('popstate',seguirEnlace);return()=>{window.removeEventListener('hashchange',seguirEnlace);window.removeEventListener('popstate',seguirEnlace);};},[abrir]);
 useEffect(()=>{if(!listo||catalogo.length)return;const espera=setTimeout(()=>setError('La mesa está tardando en cargar. Podés volver a intentar sin perder tus clases guardadas.'),25000);return()=>clearTimeout(espera);},[listo,catalogo.length,reintento]);
 if(cargando)return <p role="status">Preparando tus clases…</p>;
 if(!session)return <section className={s.acceso}><p className="eyebrow">TU ESPACIO PARA ENSEÑAR</p><h1>Mis clases</h1><p>Iniciá sesión con tu cuenta de profesor.</p><AuthWidget/></section>;
 if(!esAdmin)return <section className={s.acceso}><h1>Esta mesa es privada.</h1><p>Los juegos de clase están disponibles para el profesor.</p></section>;
 const elegido=catalogo.find(m=>m.id===juego),grupo=grupos.find(g=>g.id===categoria)!;
 const normalizar=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const visibles=catalogo.filter(m=>(busqueda?normalizar(m.title+' '+m.description).includes(normalizar(busqueda)):m.category===categoria));
 return <section className={s.clases} data-mesa-clases data-mesa-juego={juego||undefined} data-concentrado={concentrado&&!!juego}>
  {!juego&&<>
   <header className={s.hero}><div><p className="eyebrow">MIS CLASES · SOLO VOS</p><h1>Un tablero.<br/><em>Mil formas de aprender.</em></h1><p>Elegí un juego, reuní al grupo y empezá a explorar.</p><div className={s.heroDatos}><span>{catalogo.length||'…'} actividades</span><span>Piezas con sonido</span><span>Listo para proyectar</span></div></div><div className={s.mundo} role="img" aria-label="Un mundo de ajedrez para descubrir"/></header>
   <div className={s.filtros}><div className={s.pestanas} role="group" aria-label="Tipo de actividad">{grupos.map(g=><button type="button" key={g.id} aria-pressed={!busqueda&&categoria===g.id} onClick={()=>{setCategoria(g.id);setBusqueda('');}}>{g.nombre}<span>{catalogo.filter(m=>m.category===g.id).length}</span></button>)}</div><label className={s.buscar}><span aria-hidden="true">⌕</span><span className="sr-only">Buscar una actividad</span><input type="search" placeholder="Buscá un juego…" value={busqueda} onChange={e=>setBusqueda(e.target.value)}/></label></div>
   <div className={s.tituloGrupo}><div><p className="eyebrow">{busqueda?'TU BÚSQUEDA':grupo.nombre.toUpperCase()}</p><h2>{busqueda?`Resultados para «${busqueda}»`:grupo.descripcion}</h2></div><span>{visibles.length} {visibles.length===1?'actividad':'actividades'}</span></div>
   {!catalogo.length&&!error&&<p role="status" className={s.cargando}>Preparando el catálogo de tu mesa…</p>}
   {!!catalogo.length&&!visibles.length&&<p role="status">No encontramos esa actividad. Probá con «caballo», «cartas» o «rey».</p>}
   <div className={s.catalogo}>{visibles.map(m=><button type="button" key={m.id} className={s.tarjeta} onClick={()=>abrir(m.id)} aria-label={`Abrir ${m.title}`}><PortadaJuegoClase juego={m}/><div className={s.tarjetaTexto}><span className={s.etiqueta}>{m.tag}</span><h3>{m.title}</h3><p>{m.description}</p><div className={s.tarjetaPie}><span>{m.meta||`${m.size} × ${m.rows} · Personas o IA`}</span><b>{m.category==='story'?'Explorar':m.category==='teacher'?'Preparar clase':'Abrir juego'} <span aria-hidden="true">↗</span></b></div></div></button>)}</div>
  </>}
  <div ref={panel} className={s.espacio} data-en-juego={!!juego}>
   {juego&&<header className={s.barra}><button type="button" className={s.volver} onClick={()=>{abrir(null);setConcentrado(false);}}>← Todos los juegos</button><div className={s.juegoTitulo}><span>EN TU MESA</span><h1>{elegido?.title||'Tu juego'}</h1></div><div className={s.controles}><button type="button" aria-pressed={sonido} onClick={()=>enviar('sonido',{activo:!sonido})}>{sonido?'♪ Sonido':'♪ Sin sonido'}</button><button type="button" aria-pressed={concentrado} onClick={()=>setConcentrado(v=>!v)}>{concentrado?'Ver navegación':'Ampliar mesa'}</button><button type="button" aria-label="Pantalla completa" title="Pantalla completa" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void panel.current?.requestFullscreen().catch(()=>setError('La pantalla completa no está disponible en este navegador. Usá «Ampliar mesa».'));}}>⛶</button></div></header>}
   {listo&&<iframe key={reintento} ref={frame} title={juego?`Mesa de clase: ${elegido?.title||juego}`:'Motor privado de tus juegos de clase'} src="/api/clases/mesa/index.html?integrado=1" className={s.motor} style={{height:juego?alto:1}} tabIndex={juego?0:-1} aria-hidden={!juego} allow="fullscreen; microphone" allowFullScreen onLoad={()=>{medir();enviar('conectar');if(juegoActual.current)enviar('abrir',{id:juegoActual.current});}}/>}
  </div>
  {error&&<div className={s.error} role="alert"><p>{error}</p><button type="button" className="button-secondary" onClick={()=>{setError('');setListo(false);setReintento(v=>v+1);}}>Volver a intentar</button></div>}
  {!juego&&<p className={s.nota}>Tu mesa es privada. Las clases que preparás se guardan en este navegador; exportalas desde Profe para llevarlas a otra computadora. <a href="/piezas/cburnett/CREDITOS.txt" target="_blank" rel="noreferrer">Piezas: C. M. L. Burnett · Lichess</a></p>}
 </section>;
}
