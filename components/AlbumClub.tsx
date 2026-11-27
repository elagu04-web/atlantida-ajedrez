/* eslint-disable @next/next/no-img-element -- El álbum reutiliza los retratos locales y las fotos del club. */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {useSearchParams} from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useJugadores } from '@/context/JugadoresContext';
import { useMiJugador } from '@/context/useMiJugador';
import { supabase } from '@/lib/supabase';
import { rpcDeCuenta } from '@/lib/rpcCuenta';
import { expandirVersiones, nombreRareza, nombreVersion, type Figurita, type EstadoAlbum, type Coleccionista, type Sobre } from '@/lib/album';
import { evaluarRasgado } from '@/lib/rasgadoSobre';

import { DatosFiguritasProvider } from '@/context/DatosFiguritasContext';
import {CartaAlbum as Carta} from './CartaAlbum';
export {Carta};
import { AlbumCatalogoProvider, useCatalogoAlbum } from '@/context/AlbumCatalogoContext';
import { IdentidadJugador } from './IdentidadJugador';
import s from './AlbumClub.module.css';
const AlbumAperturas=dynamic(()=>import('./AlbumAperturas').then(m=>m.AlbumAperturas),{loading:()=> <p role="status">Abriendo tu colección de aperturas…</p>});
const AlbumesClub=dynamic(()=>import('./AlbumesClub').then(m=>m.AlbumesClub),{loading:()=> <p role="status">Abriendo los álbumes del club…</p>});

function Modal({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={s.modal} onCancel={e => { e.preventDefault(); cerrar(); }} onClick={e => { if (e.target === e.currentTarget) cerrar(); }} aria-label={titulo}>
    <div className={s.modalHeader}><h2>{titulo}</h2><button type="button" onClick={cerrar} aria-label="Cerrar">✕</button></div>{children}
  </dialog>;
}

export function AlbumClub() {
  const { session, cargando } = useAuth();
  const solicitada=useSearchParams().get('seccion');
  const inicial=solicitada==='aperturas'?'aperturas':solicitada==='club'?'club':'album';
  return <DatosFiguritasProvider><AlbumCatalogoProvider><AlbumCuenta key={(session?.user.id ?? 'visitante')+':'+inicial} cuenta={session?.user.id ?? null} cargandoAuth={cargando} inicial={inicial}/></AlbumCatalogoProvider></DatosFiguritasProvider>;
}

function AlbumCuenta({ cuenta, cargandoAuth, inicial }: { cuenta: string | null; cargandoAuth: boolean; inicial:'album'|'aperturas'|'club' }) {
  const { catalogo:catalogoAlbum,porId:figuritaPorId,actualizar:actualizarCatalogo }=useCatalogoAlbum();
  const {esAdmin}=useAuth();const {jugadores}=useJugadores();
  const [nuevoJugador,setNuevoJugador]=useState('');
  const nombreFigurita=(id:string)=>{const f=figuritaPorId.get(id);return f?`${f.nombre} · ${nombreRareza[f.rareza]} · ${nombreVersion[f.version]}`:'Figurita del club';};
  const { jugador } = useMiJugador();
  const [estado, setEstado] = useState<EstadoAlbum | null>(null);
  const [cargando, setCargando] = useState(Boolean(cuenta));
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [tab, setTab] = useState<'album'|'repetidas'|'cambios'|'aperturas'|'club'>(inicial);
  const [filtro, setFiltro] = useState('Todas');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionada, setSeleccionada] = useState<Figurita | null>(null);
  const [sobre, setSobre] = useState<Sobre | null>(null);
  const [mercado, setMercado] = useState<Coleccionista[]>([]);
  const [cargandoMercado, setCargandoMercado] = useState(false);
  const [propuesta, setPropuesta] = useState<{ destino: Coleccionista; ofrece: string; pide: string; id: string } | null>(null);
  const vivo = useRef(true), trabajando = useRef(false), peticiones = useRef(new Set<AbortController>()), revision = useRef(0);

  const rpc = useCallback(async (accion: string, datos: Record<string,unknown> = {}) => {
    if (!cuenta) throw new Error('Iniciá sesión para coleccionar.');
    const control = new AbortController(); peticiones.current.add(control);
    try {
      const r = await rpcDeCuenta(supabase,cuenta,'album_club',{p_accion:accion,p_datos:datos},control.signal);
      if (r.error) throw r.error;
      return r.data;
    } finally { peticiones.current.delete(control); }
  },[cuenta]);

  useEffect(() => {
    vivo.current = true;
    const pendientes = peticiones.current;
    return () => { vivo.current = false; for (const p of pendientes) p.abort(); pendientes.clear(); };
  },[]);
  const refrescar = useCallback(async () => {
    const actual = ++revision.current;
    try { const r = await rpc('resumen'); if (vivo.current && actual === revision.current) { actualizarCatalogo(r.catalogo);setEstado(r); setError(''); } }
    catch (e) { if (vivo.current && actual === revision.current) setError(mensajeError(e)); }
    finally { if (vivo.current && actual === revision.current) setCargando(false); }
  },[rpc,actualizarCatalogo]);
  // La actualización espera la respuesta remota; también vuelve a consultar al vincular el jugador.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (!cuenta) return; void refrescar(); },[cuenta,jugador?.id,refrescar]);
  // Actualizar propuestas al volver a la pestaña, sin peticiones continuas en segundo plano.
  useEffect(() => {
    if (!cuenta) return;
    const volver = () => { if (document.visibilityState === 'visible' && !trabajando.current) void refrescar(); };
    document.addEventListener('visibilitychange',volver);
    return () => document.removeEventListener('visibilitychange',volver);
  },[cuenta,refrescar]);

  async function cargarMercado() {
    setCargandoMercado(true);
    try { const r = await rpc('mercado'); if (vivo.current) setMercado(r); }
    catch(e) { if (vivo.current) setError(mensajeError(e)); }
    finally { if (vivo.current) setCargandoMercado(false); }
  }
  async function operar(accion: string, datos: Record<string,unknown>, texto: string) {
    if (trabajando.current) return;
    trabajando.current = true; ++revision.current; setOcupado(true); setError(''); setAviso('');
    try {
      const r: EstadoAlbum = await rpc(accion,datos);
      if (!vivo.current) return;
      actualizarCatalogo(r.catalogo);setEstado(r); setCargando(false); setAviso(texto);
      if (r.sobre) setSobre(r.sobre);
      if (accion === 'proponer') setPropuesta(null);
      if (tab === 'cambios') await cargarMercado();
    } catch(e) { if (vivo.current) setError(mensajeError(e)); }
    finally { trabajando.current = false; if (vivo.current) setOcupado(false); }
  }

  const existencias = new Map(estado?.inventario.map(f=>[f.id,f]) ?? []);
  const propias = new Set((estado?.inventario??[]).map(f=>figuritaPorId.get(f.id)?.baseId).filter(Boolean)).size;
  const repetidas = estado?.inventario.reduce((n,f)=>n+Math.max(0,f.cantidad-1),0) ?? 0;
  const disponibles = estado?.inventario.filter(f=>f.disponibles>0) ?? [];
  const pendientes = estado?.intercambios.filter(t=>t.estado==='pendiente') ?? [];
  const variantesDe=(baseId:string)=>{const base=catalogoAlbum.find(f=>f.baseId===baseId);return base?expandirVersiones([base]):[];};
  const mejorVersion=(f:Figurita)=>[...variantesDe(f.baseId)].reverse().find(v=>existencias.has(v.id))??variantesDe(f.baseId)[0]??f;
  const lista = (tab==='repetidas'?(estado?.inventario??[]).filter(f=>f.cantidad>1).map(f=>figuritaPorId.get(f.id)).filter((f):f is Figurita=>Boolean(f)):catalogoAlbum.map(mejorVersion)).filter(f=>(filtro==='Todas'||f.serie===filtro||(filtro==='Me faltan'&&!variantesDe(f.baseId).some(v=>existencias.has(v.id)))) && f.nombre.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')));
  const incorporables=jugadores.filter(j=>j.fotoUrl&&!catalogoAlbum.some(f=>f.jugadorId===j.id));

  return <div className={s.pagina}>
    <header className={s.cabecera}>
      <div><p className={s.kicker}>PRIMERA EDICIÓN · ATLÁNTIDA AJEDREZ</p><h1>El álbum<br/><em>del club.</em></h1><p className={s.intro}>Las caras, las partidas y las historias que compartimos. Coleccioná las figuritas e intercambiá las repetidas.</p><a href="#tu-album" className={s.enlace}>Abrí tu álbum ↓</a></div>
      <div className={s.portada} aria-hidden="true">{['JUGADORES','CAMPEONES','HISTORIAS'].map(texto=><div className={s.cartaReverso} key={texto}><img src="/imagenes/logo-club.png" alt=""/><strong>ATLÁNTIDA<br/>AJEDREZ</strong><small>{texto} POR DESCUBRIR</small></div>)}</div>
    </header>

    <section id="tu-album" className={s.coleccion} aria-label="Tu colección">
      <div className={s.resumen}><div><span className={s.kicker}>{cuenta ? 'TU COLECCIÓN' : 'CONOCÉ LA COLECCIÓN'}</span><h2>{cuenta ? <>{propias}<span> / {catalogoAlbum.length} figuritas</span></> : <>{catalogoAlbum.length}<span> figuritas del club</span></>}</h2>{cuenta && <><progress value={propias} max={catalogoAlbum.length} aria-label="Progreso del álbum"/><p>{repetidas} repetida{repetidas!==1?'s':''} para compartir · Tu álbum se guarda en tu cuenta.</p></>}</div>
        {cuenta && estado?.jugadorId && <div className={s.sobres}><button className={s.botonDorado} disabled={ocupado||!estado.bienvenida} onClick={()=>void operar('sobre',{tipo:'bienvenida'},'Tu sobre de bienvenida está guardado.')}>✦ {estado.bienvenida ? 'Abrir bienvenida · 6 figuritas' : 'Bienvenida abierta ✓'}</button><a href="#sobres-ganados" className={s.boton}>{estado.recompensas?.length??0} sobres ganados por abrir ↓</a><small>{estado.inventario.length} versiones encontradas de {catalogoAlbum.length*9}.</small></div>}
      </div>
      {(cargandoAuth||cargando) && <p role="status" className={s.estado}>Cargando tu álbum…</p>}
      {cuenta && !cargando && <button className={s.boton} disabled={ocupado} onClick={()=>void refrescar()}>Actualizar álbum</button>}
      {!cargandoAuth && (!cuenta||(!cargando&&estado&&!estado.jugadorId)) && <div className={s.acceso}><h3>{cuenta ? 'Vinculá tu jugador para empezar' : 'Tu primera colección empieza acá'}</h3><p>Recibí 6 figuritas de bienvenida. Después ganá sobres participando en torneos, ganando online y resolviendo el desafío diario. Iniciá sesión para coleccionar e intercambiar.</p><IdentidadJugador/></div>}
      <details className={s.reglas}><summary>Cómo ganar sobres y probabilidades</summary><div className={s.reglasInterior}><p><strong>Torneos:</strong> un sobre de 6 al terminar, si tenés una partida registrada. Cuenta presencial y online.</p><p><strong>Victoria online:</strong> un sobre de 3 por partida terminada, con al menos dos jugadas de cada lado. Las mesas anuladas no cuentan.</p><p><strong>Desafío diario:</strong> un sobre de 3 al resolverlo sin errores ni pistas. Actividades desde el 24/11/2026.</p><p><strong>Rarezas por figurita:</strong> común 70% · rara 25% · mítica 5%.</p><p><strong>Versiones:</strong> normal 80% · foil 15% · full art 5%. Se sortea la rareza y después la versión; dentro de cada grupo todas tienen la misma posibilidad.</p><p>La bienvenida incluye tu figurita común normal si ya estás en esta edición. El resto se sortea. Todo es gratis y las figuritas quedan guardadas antes de la animación.</p></div></details>
      {cuenta && estado?.jugadorId && <section id="sobres-ganados" className={s.premios}><div className={s.tituloFila}><h3>Tus sobres ganados</h3><span>{estado.recompensas?.length??0} pendientes</span></div>{!estado.recompensas?.length?<p className={s.ayuda}>Los sobres aparecerán acá cuando quede registrada tu participación, una victoria online o un desafío diario resuelto.</p>:<div className={s.premiosLista}>{estado.recompensas.map(p=><article key={p.clave}><div><strong>{p.titulo}</strong><span>{p.cantidad} figuritas</span></div><button className={s.botonDorado} disabled={ocupado} onClick={()=>void operar('sobre',{tipo:'recompensa',clave:p.clave},'Tu sobre ganado está guardado.')}>Abrir sobre →</button></article>)}</div>}</section>}
      {esAdmin&&cuenta&&<details className={s.reglas}><summary>Gestión del álbum · agregar jugadores con foto</summary><div className={s.reglasInterior}><p>Primero cargá una foto individual recortada en el perfil. Cada jugador nuevo se incorpora al final de la colección con sus nueve combinaciones.</p><label>Jugador con foto<select value={nuevoJugador} onChange={e=>setNuevoJugador(e.target.value)}><option value="">Elegí un jugador</option>{incorporables.map(j=><option key={j.id} value={j.id}>{j.apodo||j.nombre}</option>)}</select></label><button className={s.botonDorado} disabled={ocupado||!nuevoJugador} onClick={()=>void operar('agregar',{jugadorId:nuevoJugador},'Jugador incorporado al álbum con sus nueve combinaciones.')}>Agregar figurita</button>{!incorporables.length&&<p>Todos los jugadores con foto ya están en el álbum. Cargá una foto en otro perfil para incorporarlo.</p>}</div></details>}
      <div aria-live="polite">{aviso && <p className={s.aviso}>{aviso}</p>}</div>
      {error && <div role="alert" className={s.error}><p>{error}</p><button className={s.boton} disabled={ocupado} onClick={()=>void refrescar()}>Reintentar</button></div>}
      <div className={s.tabs} role="group" aria-label="Secciones del álbum">{([['album','El álbum'],['aperturas','Mis aperturas ✦'],['club','Álbumes del club'],['repetidas',`Mis repetidas (${repetidas})`],['cambios',`Intercambios${pendientes.length ? ` (${pendientes.length})` : ''}`]] as const).map(([id,label])=><button key={id} type="button" aria-pressed={tab===id} disabled={!['album','aperturas','club'].includes(id)&&!estado?.jugadorId} onClick={()=>{setTab(id);setFiltro('Todas');if(id==='cambios')void cargarMercado();}}>{label}</button>)}</div>

      {tab==='club'?<AlbumesClub/>:tab==='aperturas'?<AlbumAperturas key={jugador?.id??estado?.jugadorId??'sin-jugador'} jugadorId={cuenta?jugador?.id??estado?.jugadorId??null:null}/>:tab!=='cambios' ? <>
        <div className={s.filtros}><div role="group" aria-label="Filtrar figuritas">{['Todas','Jugadores','Campeones','Especiales',...(cuenta?['Me faltan']:[])].map(v=><button key={v} aria-pressed={filtro===v} onClick={()=>setFiltro(v)}>{v}</button>)}</div><label><span className={s.sr}>Buscar figurita</span><input type="search" placeholder="Buscá un nombre…" value={busqueda} onChange={e=>setBusqueda(e.target.value)} /></label></div>
        {tab==='repetidas' && <p className={s.ayuda}>Conservás siempre una copia en el álbum. Las que ofrecés quedan reservadas hasta que la propuesta se resuelva o venza.</p>}
        <div className={s.grilla}>{lista.map(f=><Carta key={f.id} f={f} cantidad={existencias.get(f.id)?.cantidad??0} seleccionar={()=>setSeleccionada(f)}/>)}</div>
        {!lista.length && <p className={s.estado}>{tab==='repetidas' ? 'Todavía no tenés repetidas. Abrí tus sobres para seguir coleccionando.' : 'No encontramos figuritas con ese filtro.'}</p>}
      </> : <div className={s.intercambios}>
        <div className={s.activar}><div><h3>La mesa de intercambios</h3><p>Mostrá tus repetidas a otros coleccionistas del club. Cada cambio es de una por una y necesita la aceptación de ambos. Las propuestas vencen a los 7 días.</p></div><label><input type="checkbox" checked={estado?.compartir??false} disabled={ocupado} onChange={e=>void operar('compartir',{activo:e.target.checked},e.target.checked?'Tus repetidas ya se pueden ver en la mesa de intercambios.':'Dejaste de compartir y se cancelaron tus propuestas pendientes.')} /> Compartir mis repetidas</label></div>
        <section><div className={s.tituloFila}><h3>Últimas propuestas</h3><button className={s.boton} disabled={ocupado} onClick={()=>{void refrescar();void cargarMercado();}}>Actualizar</button></div>
          {!estado?.intercambios.length && <p className={s.ayuda}>Acá vas a ver las propuestas que enviás y las que recibís.</p>}
          <div className={s.propuestas}>{estado?.intercambios.map(t=><article key={t.id} className={s.propuesta}><div><span className={s.kicker}>{t.emisor===cuenta?'ENVIASTE A':'RECIBISTE DE'}</span><h4>{t.nombre??'Coleccionista del club'}</h4><p><strong>{nombreFigurita(t.ofrece)}</strong> <span aria-label="a cambio de">⇄</span> <strong>{nombreFigurita(t.pide)}</strong></p><small>{t.emisor===cuenta?'Entregás la primera y recibís la segunda.':'Recibís la primera y entregás la segunda.'}</small></div><div className={s.acciones}><span className={s.estadoCambio}>{etiquetaEstado(t.estado)}</span>{t.estado==='pendiente' && <><small>Vence el {new Date(t.venceEn).toLocaleDateString('es-UY',{timeZone:'America/Montevideo'})}</small>{t.emisor===cuenta ? <button className={s.boton} disabled={ocupado} onClick={()=>void operar('responder',{id:t.id,respuesta:'cancelar'},'Propuesta cancelada.')}>Cancelar propuesta</button> : <><button className={s.botonDorado} disabled={ocupado} onClick={()=>void operar('responder',{id:t.id,respuesta:'aceptar'},'Respuesta guardada. Revisá el estado de la propuesta.')}>Aceptar intercambio</button><button className={s.boton} disabled={ocupado} onClick={()=>void operar('responder',{id:t.id,respuesta:'rechazar'},'Propuesta rechazada.')}>Rechazar</button></>}</>}</div></article>)}</div>
        </section>
        <section><h3>Buscá la que te falta</h3>{!estado?.compartir ? <p className={s.ayuda}>Activá «Compartir mis repetidas» para ver a los otros coleccionistas.</p> : cargandoMercado ? <p role="status">Buscando repetidas…</p> : !mercado.length ? <p className={s.ayuda}>Todavía no hay otros coleccionistas compartiendo repetidas. ¡Invitá a alguien del club a abrir sus sobres!</p> : <div className={s.mercado}>{mercado.map(persona=><article className={s.persona} key={persona.cuenta}><Link href={`/jugadores/${persona.jugadorId}`}>{persona.nombre} ↗</Link><p>{persona.repetidas.length} figurita{persona.repetidas.length!==1?'s':''} para cambiar</p><div className={s.miniFiguritas}>{persona.repetidas.map(r=>{const f=figuritaPorId.get(r.id);return f&&<button key={r.id} disabled={ocupado||!disponibles.length} onClick={()=>setPropuesta({destino:persona,pide:r.id,ofrece:disponibles.find(x=>x.id!==r.id)?.id??'',id:crypto.randomUUID()})}><span>#{String(f.numero).padStart(2,'0')}</span>{nombreFigurita(f.id)}{!existencias.has(f.id)&&<em>Te falta</em>}</button>;})}</div>{!disponibles.length&&<small>Necesitás una repetida disponible para proponer un cambio.</small>}</article>)}</div>}</section>
      </div>}
    </section>
    <footer className={s.pie}><strong>Un álbum hecho entre todos.</strong><p>Los jugadores y campeones de esta primera edición quedan en la colección. Las próximas ediciones podrán sumar nuevas historias del club.</p></footer>

    {seleccionada && <Modal titulo={`#${seleccionada.numero} · ${seleccionada.nombre}`} cerrar={()=>setSeleccionada(null)}><div className={s.detalle}><Carta modo="detalle" f={seleccionada} cantidad={existencias.get(seleccionada.id)?.cantidad??0}/><div className={s.versiones} role="group" aria-label="Elegir rareza">{(['comun','rara','mitica'] as const).map(r=><button key={r} aria-pressed={seleccionada.rareza===r} onClick={()=>setSeleccionada(variantesDe(seleccionada.baseId).find(f=>f.rareza===r&&f.version===seleccionada.version)!)}>{nombreRareza[r]}</button>)}</div><div className={s.versiones} role="group" aria-label="Elegir acabado">{variantesDe(seleccionada.baseId).filter(f=>f.rareza===seleccionada.rareza).map(f=><button key={f.id} aria-pressed={seleccionada.id===f.id} onClick={()=>setSeleccionada(f)}>{nombreVersion[f.version]} <span>{existencias.get(f.id)?.cantidad??0}</span></button>)}</div><p>{seleccionada.detalle}</p><p>{existencias.has(seleccionada.id)?`Tenés ${existencias.get(seleccionada.id)!.cantidad} copia(s). ${existencias.get(seleccionada.id)!.disponibles} repetida(s) disponibles para intercambiar.`:cuenta?'Todavía te falta esta combinación. Podés encontrarla en sobres o intercambiando.':'Cada figurita existe como común, rara y mítica, con acabados normal, foil y full art. Iniciá sesión para coleccionarlas.'}</p>{seleccionada.jugadorId&&<Link className={s.boton} href={`/jugadores/${seleccionada.jugadorId}`}>Conocer al jugador →</Link>}</div></Modal>}
    {sobre && <Modal titulo={sobre.yaAbierto?'Tu sobre guardado':'Abrí tu sobre del club'} cerrar={()=>setSobre(null)}><AperturaSobre sobre={sobre} existencias={existencias} cerrar={()=>setSobre(null)}/></Modal>}
    {propuesta && <Modal titulo={`Intercambiar con ${propuesta.destino.nombre}`} cerrar={()=>{if(!ocupado)setPropuesta(null);}}><form className={s.formulario} onSubmit={e=>{e.preventDefault();void operar('proponer',{id:propuesta.id,destino:propuesta.destino.cuenta,ofrece:propuesta.ofrece,pide:propuesta.pide},'Propuesta enviada. La figurita ofrecida quedó reservada.');}}><label>Recibís<select value={propuesta.pide} disabled={ocupado} onChange={e=>setPropuesta({...propuesta,pide:e.target.value,ofrece:propuesta.ofrece===e.target.value?'':propuesta.ofrece})}>{propuesta.destino.repetidas.map(r=><option key={r.id} value={r.id}>{nombreFigurita(r.id)}</option>)}</select></label><label>Ofrecés una repetida<select required value={propuesta.ofrece} disabled={ocupado} onChange={e=>setPropuesta({...propuesta,ofrece:e.target.value})}><option value="">Elegí una figurita</option>{disponibles.filter(f=>f.id!==propuesta.pide).map(r=><option key={r.id} value={r.id}>{nombreFigurita(r.id)} · {r.disponibles} disponible(s)</option>)}</select></label><p>Conservás una copia. El cambio se completa cuando {propuesta.destino.nombre} lo acepta. Podés cancelar antes.</p>{error&&<p role="alert" className={s.error}>{error}</p>}<button type="submit" className={s.botonDorado} disabled={ocupado||!propuesta.ofrece}>{ocupado?'Enviando…':'Enviar propuesta de intercambio'}</button></form></Modal>}
  </div>;
}

function mensajeError(e: unknown) {
  const mensaje = e && typeof e==='object' && 'message' in e ? String(e.message) : '';
  return /^[A-ZÁÉÍÓÚ¿¡].*[áéíóúñ]|^(Elegí|Ambos|Hay |Ya |Una |No podés|Vinculá|Iniciá|La propuesta)/.test(mensaje) ? mensaje : 'No pudimos conectar con tu álbum. Volvé a intentar; tus figuritas quedan guardadas.';
}
function etiquetaEstado(estado: string) { return ({pendiente:'Pendiente',aceptado:'Intercambio completado ✓',rechazado:'Rechazada',cancelado:'Cancelada',vencido:'Vencida',sin_stock:'Ya no estaban disponibles'} as Record<string,string>)[estado]??estado; }

export function AperturaSobre({sobre,existencias,cerrar}:{sobre:Sobre;existencias:Map<string,{cantidad:number}>;cerrar:()=>void}) {
  const {porId}=useCatalogoAlbum();
  const [fase,setFase]=useState<'cerrado'|'rasgando'|'revelar'|'todas'>(sobre.yaAbierto?'todas':'cerrado');
  const [indice,setIndice]=useState(0),[revelada,setRevelada]=useState(false);
  const gesto=useRef<{id:number;x:number;y:number;ancho:number}|null>(null);
  const [rasgado,setRasgado]=useState({progreso:0,direccion:1});
  const f=porId.get(sobre.figuritas[indice]);
  function rasgar(){setFase(window.matchMedia('(prefers-reduced-motion: reduce)').matches?'revelar':'rasgando');}
  function empezarRasgado(e:React.PointerEvent<HTMLButtonElement>){
    if(fase!=='cerrado'||e.button!==0)return;
    gesto.current={id:e.pointerId,x:e.clientX,y:e.clientY,ancho:e.currentTarget.getBoundingClientRect().width};
    e.currentTarget.setPointerCapture(e.pointerId);setRasgado({progreso:0,direccion:1});
  }
  function moverRasgado(e:React.PointerEvent<HTMLButtonElement>){
    const inicio=gesto.current;if(!inicio||inicio.id!==e.pointerId||fase!=='cerrado')return;
    const resultado=evaluarRasgado(e.clientX-inicio.x,e.clientY-inicio.y,inicio.ancho);setRasgado(resultado);
    if(resultado.completo){gesto.current=null;rasgar();}
  }
  function cancelarRasgado(){if(!gesto.current)return;gesto.current=null;setRasgado({progreso:0,direccion:1});}
  return <div className={s.apertura}>
    {fase!=='revelar'&&<p className={s.ayuda}>Las figuritas ya están guardadas en tu cuenta. Disfrutá la sorpresa.</p>}
    {(fase==='cerrado'||fase==='rasgando')&&<><div className={`${s.sobreFisico} ${fase==='rasgando'?s.rasgando:''}`} style={{'--direccion-rasgado':rasgado.direccion} as React.CSSProperties} onAnimationEnd={e=>{if(e.target===e.currentTarget&&fase==='rasgando')setFase('revelar');}}><div className={s.solapa}/><span className={s.kicker}>EL ÁLBUM DEL CLUB</span><span className={s.escudoSobre}><img src="/imagenes/logo-club.png" alt="" /></span><strong>ATLÁNTIDA<br/>AJEDREZ</strong><span>{sobre.figuritas.length} FIGURITAS · UNA NUEVA HISTORIA</span><button type="button" className={s.tiraSobre} disabled={fase==='rasgando'} aria-label="Rasgar el sobre: arrastrá hacia la izquierda o la derecha" onPointerDown={empezarRasgado} onPointerMove={moverRasgado} onPointerUp={cancelarRasgado} onPointerCancel={cancelarRasgado} onLostPointerCapture={cancelarRasgado} onDragStart={e=>e.preventDefault()} onClick={e=>{if(e.detail===0)rasgar();}}><span className={s.avanceRasgado} style={{width:`${rasgado.progreso*100}%`,...(rasgado.direccion<0?{right:0,left:'auto'}:{})}}/><span>← RASGÁ CON EL MOUSE O EL DEDO →</span></button></div><p className={s.ayuda}>Arrastrá la tira de un extremo al otro, en cualquiera de las dos direcciones.</p><button className={s.botonDorado} disabled={fase==='rasgando'} onClick={rasgar}>{fase==='rasgando'?'Abriendo el sobre…':'Abrir sin arrastrar ✦'}</button></>}
    {fase==='revelar'&&f&&<><p className={s.contadorSobre} aria-live="polite">Figurita {indice+1} de {sobre.figuritas.length}</p><button className={`${s.giro} ${revelada?s.girada:''} ${revelada&&f.rareza==='mitica'?s.hallazgoMitico:''}`} onClick={()=>setRevelada(true)} aria-label={revelada?`${f.nombre}, ${nombreRareza[f.rareza]}, versión ${nombreVersion[f.version]}`:'Dar vuelta la figurita'}><span className={s.giroInterior}><span className={s.dorso}><span>ATLÁNTIDA AJEDREZ</span><strong>♞</strong><span>TOCÁ PARA DESCUBRIR</span></span><span className={s.frente}><Carta modo="sobre" f={f} cantidad={existencias.get(f.id)?.cantidad??1}/></span></span></button><div className={s.infoHallazgo} aria-live="polite">{revelada?<><strong>{f.rareza==='mitica'?'¡Una mítica!':f.rareza==='rara'?'¡Salió una rara!':'Una nueva historia del club'}</strong><span>{f.nombre} · {nombreVersion[f.version]}</span></>:<span>¿Quién estará del otro lado?</span>}</div>{revelada?<button className={s.botonDorado} onClick={()=>{if(indice===sobre.figuritas.length-1)setFase('todas');else{setIndice(indice+1);setRevelada(false);}}}>{indice===sobre.figuritas.length-1?'Ver todo el sobre →':'Siguiente figurita →'}</button>:<button className={s.botonDorado} onClick={()=>setRevelada(true)}>Dar vuelta la figurita</button>}</>}
    {fase==='todas'&&<><p className={s.ayuda}>{sobre.yaAbierto?'Estas son las figuritas que ya recibiste.':`${sobre.nuevas.length} versión(es) nueva(s) y ${sobre.repetidas.length} repetida(s). ¡Ya están en tu álbum!`}</p><div className={s.revelacion}>{sobre.figuritas.map((id,i)=>{const carta=porId.get(id);return carta&&<div key={`${id}:${i}`} style={{animationDelay:`${i*70}ms`}}><Carta f={carta} cantidad={existencias.get(id)?.cantidad??1}/></div>;})}</div><button className={s.botonDorado} onClick={cerrar}>Volver al álbum →</button></>}
    {fase!=='todas'&&<button className={s.saltarAnimacion} onClick={()=>setFase('todas')}>Ver todas sin animación</button>}
  </div>;
}
