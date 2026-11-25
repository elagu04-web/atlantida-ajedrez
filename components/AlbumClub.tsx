/* eslint-disable @next/next/no-img-element -- El álbum reutiliza los retratos locales y las fotos del club. */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useJugadores } from '@/context/JugadoresContext';
import { useMiJugador } from '@/context/useMiJugador';
import { supabase } from '@/lib/supabase';
import { rpcDeCuenta } from '@/lib/rpcCuenta';
import { retratoJugador } from '@/lib/retratosJugadores';
import { catalogoAlbum, figuritaPorId, nombreFigurita, type Figurita, type EstadoAlbum, type Coleccionista, type Sobre } from '@/lib/album';
import { IdentidadJugador } from './IdentidadJugador';
import s from './AlbumClub.module.css';

function Modal({ titulo, cerrar, children }: { titulo: string; cerrar: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className={s.modal} onCancel={e => { e.preventDefault(); cerrar(); }} onClick={e => { if (e.target === e.currentTarget) cerrar(); }} aria-label={titulo}>
    <div className={s.modalHeader}><h2>{titulo}</h2><button type="button" onClick={cerrar} aria-label="Cerrar">✕</button></div>{children}
  </dialog>;
}

function ArteFigurita({ f }: { f: Figurita }) {
  const { jugadores } = useJugadores();
  const jugador = jugadores.find(j => j.id === f.jugadorId);
  const retrato = f.jugadorId ? retratoJugador(jugador ?? { id: f.jugadorId, fotoUrl: f.foto }) : null;
  const src = retrato?.src ?? f.foto;
  const [fallo, setFallo] = useState(false);
  return <div className={`${s.arte} ${retrato?.transparente ? s.recorte : ''}`}>
    {src && !fallo ? <img src={src} alt="" loading="lazy" onError={() => setFallo(true)} /> : <span className={s.monograma} aria-hidden="true">{f.nombre.split(/\s+/).slice(0,2).map(n => n[0]).join('')}</span>}
    <span className={s.marca}>ATLÁNTIDA<br/>AJEDREZ</span>
  </div>;
}

function Carta({ f, cantidad, vistaPrevia, seleccionar }: { f: Figurita; cantidad: number; vistaPrevia?: boolean; seleccionar?: () => void }) {
  const mostrar = cantidad > 0 || vistaPrevia;
  const interior = <>
    <span className={s.numero}>#{String(f.numero).padStart(2,'0')}</span>
    {mostrar ? <ArteFigurita f={f}/> : <div className={s.hueco} aria-hidden="true"><span>♞</span><small>POR ENCONTRAR</small></div>}
    <div className={s.nombre}><strong>{f.nombre}</strong><span>{f.serie === 'Jugadores' ? 'El club, jugada a jugada' : f.detalle}</span></div>
    <span className={s.etiqueta}>{vistaPrevia ? 'Vista del álbum' : cantidad > 1 ? `${cantidad - 1} repetida${cantidad > 2 ? 's' : ''}` : cantidad === 1 ? 'En tu álbum ✓' : 'Te falta'}</span>
  </>;
  const clases = `${s.carta} ${f.serie !== 'Jugadores' ? s.especial : ''} ${!mostrar ? s.falta : ''}`;
  return seleccionar ? <button type="button" className={clases} onClick={seleccionar} aria-label={`${f.nombre}, número ${f.numero}. ${cantidad ? `${cantidad} copia${cantidad>1?'s':''}` : vistaPrevia ? 'Vista previa' : 'Te falta'}`}>{interior}</button> : <div className={clases}>{interior}</div>;
}

export function AlbumClub() {
  const { session, cargando } = useAuth();
  return <AlbumCuenta key={session?.user.id ?? 'visitante'} cuenta={session?.user.id ?? null} cargandoAuth={cargando}/>;
}

function AlbumCuenta({ cuenta, cargandoAuth }: { cuenta: string | null; cargandoAuth: boolean }) {
  const { jugador } = useMiJugador();
  const [estado, setEstado] = useState<EstadoAlbum | null>(null);
  const [cargando, setCargando] = useState(Boolean(cuenta));
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [tab, setTab] = useState<'album'|'repetidas'|'cambios'>('album');
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
    try { const r = await rpc('resumen'); if (vivo.current && actual === revision.current) { setEstado(r); setError(''); } }
    catch (e) { if (vivo.current && actual === revision.current) setError(mensajeError(e)); }
    finally { if (vivo.current && actual === revision.current) setCargando(false); }
  },[rpc]);
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
      setEstado(r); setCargando(false); setAviso(texto);
      if (r.sobre) setSobre(r.sobre);
      if (accion === 'proponer') setPropuesta(null);
      if (tab === 'cambios') await cargarMercado();
    } catch(e) { if (vivo.current) setError(mensajeError(e)); }
    finally { trabajando.current = false; if (vivo.current) setOcupado(false); }
  }

  const existencias = new Map(estado?.inventario.map(f=>[f.id,f]) ?? []);
  const propias = estado?.inventario.length ?? 0;
  const repetidas = estado?.inventario.reduce((n,f)=>n+Math.max(0,f.cantidad-1),0) ?? 0;
  const disponibles = estado?.inventario.filter(f=>f.disponibles>0) ?? [];
  const pendientes = estado?.intercambios.filter(t=>t.estado==='pendiente') ?? [];
  const lista = catalogoAlbum.filter(f=>(filtro==='Todas'||f.serie===filtro||(filtro==='Me faltan'&&!existencias.has(f.id))) && f.nombre.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')) && (tab!=='repetidas'||(existencias.get(f.id)?.cantidad??0)>1));

  return <div className={s.pagina}>
    <header className={s.cabecera}>
      <div><p className={s.kicker}>PRIMERA EDICIÓN · ATLÁNTIDA AJEDREZ</p><h1>El álbum<br/><em>del club.</em></h1><p className={s.intro}>Las caras, las partidas y las historias que compartimos. Coleccioná las figuritas e intercambiá las repetidas.</p><a href="#tu-album" className={s.enlace}>Abrí tu álbum ↓</a></div>
      <div className={s.portada} aria-hidden="true">{[catalogoAlbum.find(f=>f.id==='especial:tio-ale')!,catalogoAlbum.find(f=>f.id==='jugador:adaff79d-3a75-4532-8ff7-3ec7238a21b6')!,catalogoAlbum.find(f=>f.id==='especial:gabi-octubre')!].map(f=><Carta key={f.id} f={f} cantidad={1} vistaPrevia/>)}</div>
    </header>

    <section id="tu-album" className={s.coleccion} aria-label="Tu colección">
      <div className={s.resumen}><div><span className={s.kicker}>{cuenta ? 'TU COLECCIÓN' : 'CONOCÉ LA COLECCIÓN'}</span><h2>{cuenta ? <>{propias}<span> / {catalogoAlbum.length} figuritas</span></> : <>{catalogoAlbum.length}<span> figuritas del club</span></>}</h2>{cuenta && <><progress value={propias} max={catalogoAlbum.length} aria-label="Progreso del álbum"/><p>{repetidas} repetida{repetidas!==1?'s':''} para compartir · Tu álbum se guarda en tu cuenta.</p></>}</div>
        {cuenta && estado?.jugadorId && <div className={s.sobres}><button className={s.botonDorado} disabled={ocupado||!estado.bienvenida} onClick={()=>void operar('sobre',{tipo:'bienvenida'},'Tu sobre de bienvenida está guardado.')}>✦ {estado.bienvenida ? 'Abrir bienvenida · 6 figuritas' : 'Bienvenida abierta ✓'}</button><button className={s.boton} disabled={ocupado||!estado.diario} onClick={()=>void operar('sobre',{tipo:'diario'},'Tu sobre de hoy está guardado.')}>{estado.diario ? 'Abrir sobre de hoy · 3 figuritas' : 'Sobre de hoy abierto ✓'}</button><small>Gratis. Un sobre diario, desde las 00:00 de Uruguay.</small></div>}
      </div>
      {(cargandoAuth||cargando) && <p role="status" className={s.estado}>Cargando tu álbum…</p>}
      {cuenta && !cargando && <button className={s.boton} disabled={ocupado} onClick={()=>void refrescar()}>Actualizar álbum</button>}
      {!cargandoAuth && (!cuenta||(!cargando&&estado&&!estado.jugadorId)) && <div className={s.acceso}><h3>{cuenta ? 'Vinculá tu jugador para empezar' : 'Tu primera colección empieza acá'}</h3><p>Un sobre de bienvenida con 6 figuritas y otro de 3 cada día. Iniciá sesión para guardarlas y cambiar tus repetidas.</p><IdentidadJugador/></div>}
      <div aria-live="polite">{aviso && <p className={s.aviso}>{aviso}</p>}</div>
      {error && <div role="alert" className={s.error}><p>{error}</p><button className={s.boton} disabled={ocupado} onClick={()=>void refrescar()}>Reintentar</button></div>}
      <div className={s.tabs} role="group" aria-label="Secciones del álbum">{([['album','El álbum'],['repetidas',`Mis repetidas (${repetidas})`],['cambios',`Intercambios${pendientes.length ? ` (${pendientes.length})` : ''}`]] as const).map(([id,label])=><button key={id} type="button" aria-pressed={tab===id} disabled={id!=='album'&&!estado?.jugadorId} onClick={()=>{setTab(id);setFiltro('Todas');if(id==='cambios')void cargarMercado();}}>{label}</button>)}</div>

      {tab!=='cambios' ? <>
        <div className={s.filtros}><div role="group" aria-label="Filtrar figuritas">{['Todas','Jugadores','Momentos especiales',...(cuenta?['Me faltan']:[])].map(v=><button key={v} aria-pressed={filtro===v} onClick={()=>setFiltro(v)}>{v}</button>)}</div><label><span className={s.sr}>Buscar figurita</span><input type="search" placeholder="Buscá un nombre…" value={busqueda} onChange={e=>setBusqueda(e.target.value)} /></label></div>
        {tab==='repetidas' && <p className={s.ayuda}>Conservás siempre una copia en el álbum. Las que ofrecés quedan reservadas hasta que la propuesta se resuelva o venza.</p>}
        <div className={s.grilla}>{lista.map(f=><Carta key={f.id} f={f} cantidad={existencias.get(f.id)?.cantidad??0} vistaPrevia={!cuenta} seleccionar={()=>setSeleccionada(f)}/>)}</div>
        {!lista.length && <p className={s.estado}>{tab==='repetidas' ? 'Todavía no tenés repetidas. Abrí tus sobres para seguir coleccionando.' : 'No encontramos figuritas con ese filtro.'}</p>}
      </> : <div className={s.intercambios}>
        <div className={s.activar}><div><h3>La mesa de intercambios</h3><p>Mostrá tus repetidas a otros coleccionistas del club. Cada cambio es de una por una y necesita la aceptación de ambos. Las propuestas vencen a los 7 días.</p></div><label><input type="checkbox" checked={estado?.compartir??false} disabled={ocupado} onChange={e=>void operar('compartir',{activo:e.target.checked},e.target.checked?'Tus repetidas ya se pueden ver en la mesa de intercambios.':'Dejaste de compartir y se cancelaron tus propuestas pendientes.')} /> Compartir mis repetidas</label></div>
        <section><div className={s.tituloFila}><h3>Últimas propuestas</h3><button className={s.boton} disabled={ocupado} onClick={()=>{void refrescar();void cargarMercado();}}>Actualizar</button></div>
          {!estado?.intercambios.length && <p className={s.ayuda}>Acá vas a ver las propuestas que enviás y las que recibís.</p>}
          <div className={s.propuestas}>{estado?.intercambios.map(t=><article key={t.id} className={s.propuesta}><div><span className={s.kicker}>{t.emisor===cuenta?'ENVIASTE A':'RECIBISTE DE'}</span><h4>{t.nombre??'Coleccionista del club'}</h4><p><strong>{nombreFigurita(t.ofrece)}</strong> <span aria-label="a cambio de">⇄</span> <strong>{nombreFigurita(t.pide)}</strong></p><small>{t.emisor===cuenta?'Entregás la primera y recibís la segunda.':'Recibís la primera y entregás la segunda.'}</small></div><div className={s.acciones}><span className={s.estadoCambio}>{etiquetaEstado(t.estado)}</span>{t.estado==='pendiente' && <><small>Vence el {new Date(t.venceEn).toLocaleDateString('es-UY',{timeZone:'America/Montevideo'})}</small>{t.emisor===cuenta ? <button className={s.boton} disabled={ocupado} onClick={()=>void operar('responder',{id:t.id,respuesta:'cancelar'},'Propuesta cancelada.')}>Cancelar propuesta</button> : <><button className={s.botonDorado} disabled={ocupado} onClick={()=>void operar('responder',{id:t.id,respuesta:'aceptar'},'Respuesta guardada. Revisá el estado de la propuesta.')}>Aceptar intercambio</button><button className={s.boton} disabled={ocupado} onClick={()=>void operar('responder',{id:t.id,respuesta:'rechazar'},'Propuesta rechazada.')}>Rechazar</button></>}</>}</div></article>)}</div>
        </section>
        <section><h3>Buscá la que te falta</h3>{!estado?.compartir ? <p className={s.ayuda}>Activá «Compartir mis repetidas» para ver a los otros coleccionistas.</p> : cargandoMercado ? <p role="status">Buscando repetidas…</p> : !mercado.length ? <p className={s.ayuda}>Todavía no hay otros coleccionistas compartiendo repetidas. ¡Invitá a alguien del club a abrir sus sobres!</p> : <div className={s.mercado}>{mercado.map(persona=><article className={s.persona} key={persona.cuenta}><Link href={`/jugadores/${persona.jugadorId}`}>{persona.nombre} ↗</Link><p>{persona.repetidas.length} figurita{persona.repetidas.length!==1?'s':''} para cambiar</p><div className={s.miniFiguritas}>{persona.repetidas.map(r=>{const f=figuritaPorId.get(r.id);return f&&<button key={r.id} disabled={ocupado||!disponibles.length} onClick={()=>setPropuesta({destino:persona,pide:r.id,ofrece:disponibles.find(x=>x.id!==r.id)?.id??'',id:crypto.randomUUID()})}><span>#{String(f.numero).padStart(2,'0')}</span>{f.nombre}{!existencias.has(f.id)&&<em>Te falta</em>}</button>;})}</div>{!disponibles.length&&<small>Necesitás una repetida disponible para proponer un cambio.</small>}</article>)}</div>}</section>
      </div>}
    </section>
    <footer className={s.pie}><strong>Un álbum hecho entre todos.</strong><p>Los jugadores y los momentos de esta primera edición quedan en la colección. Las próximas ediciones podrán sumar nuevas historias del club.</p></footer>

    {seleccionada && <Modal titulo={`#${seleccionada.numero} · ${seleccionada.nombre}`} cerrar={()=>setSeleccionada(null)}><div className={s.detalle}><Carta f={seleccionada} cantidad={existencias.get(seleccionada.id)?.cantidad??0} vistaPrevia/><p>{seleccionada.detalle}</p><p>{existencias.has(seleccionada.id)?`Tenés ${existencias.get(seleccionada.id)!.cantidad} copia(s). ${existencias.get(seleccionada.id)!.disponibles} repetida(s) disponibles para intercambiar.`:'Todavía te falta. Podés encontrarla en los sobres o conseguirla intercambiando.'}</p>{seleccionada.jugadorId&&<Link className={s.boton} href={`/jugadores/${seleccionada.jugadorId}`}>Conocer al jugador →</Link>}</div></Modal>}
    {sobre && <Modal titulo={sobre.yaAbierto?'Este sobre ya estaba abierto':'¡Tu sobre está abierto!'} cerrar={()=>setSobre(null)}><p className={s.ayuda}>{sobre.yaAbierto?'Estas son las figuritas que recibiste. Ya estaban guardadas en tu cuenta.':`${sobre.nuevas.length} nueva${sobre.nuevas.length!==1?'s':''} y ${sobre.repetidas.length} repetida${sobre.repetidas.length!==1?'s':''}. Ya quedaron guardadas en tu álbum.`}</p><div className={s.revelacion}>{sobre.figuritas.map((id,i)=>{const f=figuritaPorId.get(id);return f&&<div key={`${id}:${i}`} style={{animationDelay:`${i*100}ms`}}><Carta f={f} cantidad={existencias.get(id)?.cantidad??1}/></div>;})}</div><button className={s.botonDorado} onClick={()=>setSobre(null)}>Seguir coleccionando →</button></Modal>}
    {propuesta && <Modal titulo={`Intercambiar con ${propuesta.destino.nombre}`} cerrar={()=>{if(!ocupado)setPropuesta(null);}}><form className={s.formulario} onSubmit={e=>{e.preventDefault();void operar('proponer',{id:propuesta.id,destino:propuesta.destino.cuenta,ofrece:propuesta.ofrece,pide:propuesta.pide},'Propuesta enviada. La figurita ofrecida quedó reservada.');}}><label>Recibís<select value={propuesta.pide} disabled={ocupado} onChange={e=>setPropuesta({...propuesta,pide:e.target.value,ofrece:propuesta.ofrece===e.target.value?'':propuesta.ofrece})}>{propuesta.destino.repetidas.map(r=><option key={r.id} value={r.id}>{nombreFigurita(r.id)}</option>)}</select></label><label>Ofrecés una repetida<select required value={propuesta.ofrece} disabled={ocupado} onChange={e=>setPropuesta({...propuesta,ofrece:e.target.value})}><option value="">Elegí una figurita</option>{disponibles.filter(f=>f.id!==propuesta.pide).map(r=><option key={r.id} value={r.id}>{nombreFigurita(r.id)} · {r.disponibles} disponible(s)</option>)}</select></label><p>Conservás una copia. El cambio se completa cuando {propuesta.destino.nombre} lo acepta. Podés cancelar antes.</p>{error&&<p role="alert" className={s.error}>{error}</p>}<button type="submit" className={s.botonDorado} disabled={ocupado||!propuesta.ofrece}>{ocupado?'Enviando…':'Enviar propuesta de intercambio'}</button></form></Modal>}
  </div>;
}

function mensajeError(e: unknown) {
  const mensaje = e && typeof e==='object' && 'message' in e ? String(e.message) : '';
  return /^[A-ZÁÉÍÓÚ¿¡].*[áéíóúñ]|^(Elegí|Ambos|Hay |Ya |Una |No podés|Vinculá|Iniciá|La propuesta)/.test(mensaje) ? mensaje : 'No pudimos conectar con tu álbum. Volvé a intentar; tus figuritas quedan guardadas.';
}
function etiquetaEstado(estado: string) { return ({pendiente:'Pendiente',aceptado:'Intercambio completado ✓',rechazado:'Rechazada',cancelado:'Cancelada',vencido:'Vencida',sin_stock:'Ya no estaban disponibles'} as Record<string,string>)[estado]??estado; }
