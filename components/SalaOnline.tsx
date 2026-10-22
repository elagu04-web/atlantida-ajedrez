"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {useAuth} from '@/context/AuthContext';
import {supabase} from '@/lib/supabase';
import {pedirOnline,listarOnline,leerMiEloOnline,ErrorOnline,type RespuestaOnline,type PerfilEloOnline} from '@/lib/juegoOnline';
import {colorOnline,tableroOnline,relojesOnline,RITMOS_ONLINE,type PartidaOnline,type RitmoOnline,type AccionOnline} from '@/lib/partidaOnline';
import {AuthWidget} from './AuthWidget';
import {TableroApertura} from './TableroApertura';
import {SonidoTablero} from '@/lib/sonidoTablero';
import {vistaJugadaOnline,type VistaJugadaOnline} from '@/lib/vistaJugadaOnline';
import styles from './SalaOnline.module.css';
import {AccionesPartidaOnline} from './AccionesPartidaOnline';
import {VisorPartidaOnline} from './VisorPartidaOnline';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function reloj(ms:number){const s=Math.max(0,Math.ceil(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
export function SalaOnline(){
 const {session,cargando}=useAuth();
 return <div className={styles.sala}><header className={styles.cabecera}><div><p className={styles.sello}>Una mesa para dos</p><h1>Jugá con el club.</h1><p>Elegí el ritmo, compartí la mesa y encontrate del otro lado del tablero.</p></div><Link className="text-link" href="/jugar">Volver a los bots →</Link></header>{cargando?<p role="status">Comprobando tu sesión…</p>:session?<SalaCuenta key={session.user.id} usuario={session.user.id}/>:<section className={`${styles.panel} ${styles.sesion}`}><h2>Entrá para sentarte a jugar.</h2><p>Los dos jugadores necesitan una cuenta. Podés usar tu usuario del club o Google.</p><AuthWidget/><p>3+2 · 5+3 · 10+3. Elegí amistosa o por Elo online. Las partidas quedan guardadas para volver a analizarlas.</p></section>}</div>;
}
function SalaCuenta({usuario}:{usuario:string}){
 const [mesas,setMesas]=useState<PartidaOnline[]>([]),[partida,setPartida]=useState<PartidaOnline|null>(null),[id,setId]=useState<string|null>(()=>{if(typeof window==='undefined')return null;const q=new URLSearchParams(window.location.search).get('mesa');return q&&uuid.test(q)?q:null;});
 const [ritmo,setRitmo]=useState<RitmoOnline>('10+3'),[color,setColor]=useState('azar'),[codigo,setCodigo]=useState('');
 const [porElo,setPorElo]=useState(false),[perfilElo,setPerfilElo]=useState<PerfilEloOnline|null>(null);
 const [error,setError]=useState(''),[aviso,setAviso]=useState(''),[ocupado,setOcupado]=useState(false),[cargando,setCargando]=useState(true),[sincronizado,setSincronizado]=useState(false);
 const [tick,setTick]=useState(0),[sonido,setSonido]=useState(true),[incierta,setIncierta]=useState(false);
 const viva=useRef(true),actual=useRef<PartidaOnline|null>(null),audio=useRef<SonidoTablero|null>(null);
 const [base,setBase]=useState({servidor:0,local:0});
 const relojValidado=useRef(false);
 const [vistaPendiente,setVistaPendiente]=useState<VistaJugadaOnline|null>(null);
 const pendiente=useRef<Record<string,unknown>|null>(null),enVuelo=useRef(false),ultimoSonido=useRef('');
 const aceptar=useCallback((p:PartidaOnline)=>{
  if(actual.current?.id===p.id&&actual.current.version>p.version)return;
  actual.current=p;setPartida(p);
  setVistaPendiente(v=>v?.id===p.id&&p.version>v.version?null:v);
  setMesas(ms=>[p,...ms.filter(m=>m.id!==p.id)]);
  if(pendiente.current&&p.ultima_accion===pendiente.current.peticion){pendiente.current=null;setIncierta(false);}
 },[]);
 const respuesta=useCallback((r:RespuestaOnline,inicio:number)=>{
  const llegada=performance.now();setBase({servidor:r.ahora+(llegada-inicio)/2,local:llegada});
  aceptar(r.partida);relojValidado.current=true;setSincronizado(true);setTick(llegada);
 },[aceptar]);
 const cargarMesas=useCallback(async()=>{
  try{const [m,perfil]=await Promise.all([listarOnline(usuario),leerMiEloOnline(usuario)]);if(viva.current){setMesas(m);setPerfilElo(perfil);}}catch(e){if(viva.current)setError(e instanceof Error?e.message:'No se pudieron cargar las mesas.');}finally{if(viva.current)setCargando(false);}
 },[usuario]);
 useEffect(()=>{viva.current=true;const reproductor=new SonidoTablero();audio.current=reproductor;
  void Promise.all([listarOnline(usuario),leerMiEloOnline(usuario)]).then(([ms,perfil])=>{if(viva.current){setMesas(ms);setPerfilElo(perfil);}}).catch(e=>{if(viva.current)setError(e instanceof Error?e.message:'No se pudieron cargar las mesas.');}).finally(()=>{if(viva.current)setCargando(false);});
  return()=>{viva.current=false;reproductor.cerrar();};},[usuario]);
 useEffect(()=>{audio.current?.configurar(sonido,.85);},[sonido]);
 useEffect(()=>{
  const t=setInterval(()=>{if(document.visibilityState==='visible')void cargarMesas();},20000);
  return()=>clearInterval(t);
 },[cargarMesas]);
 useEffect(()=>{
  if(!id)return;let vigente=true,consultando=false;
  async function sincronizar(){
   if(consultando||enVuelo.current||document.visibilityState==='hidden')return;consultando=true;
   const inicio=performance.now();
   try{
    if(actual.current?.id===id&&colorOnline(actual.current,usuario)){
     const r=await pedirOnline('ver',{id});if(viva.current&&vigente){respuesta(r,inicio);if(!pendiente.current)setError('');}return;
    }
    const {data,error:e}=await supabase.from('online_partidas').select('*').eq('id',id).maybeSingle();
    if(e)throw Error('No pudimos recuperar la mesa.');
    if(!data)throw Error('La mesa no está disponible para tu cuenta.');
    if(!viva.current||!vigente)return;
    const p=data as PartidaOnline;
    if(colorOnline(p,usuario)){
     const r=await pedirOnline('ver',{id});if(viva.current&&vigente){respuesta(r,inicio);if(!pendiente.current)setError('');}
    }else{aceptar(p);setSincronizado(false);}
   }catch(e){if(viva.current&&vigente){setSincronizado(false);setError(e instanceof Error?e.message:'No pudimos sincronizar.');}}finally{consultando=false;}
  }
  void sincronizar();
  const canal=supabase.channel('online-'+id+'-'+usuario).on('postgres_changes',{event:'UPDATE',schema:'public',table:'online_partidas',filter:'id=eq.'+id},evento=>{if(viva.current&&vigente){aceptar(evento.new as PartidaOnline);if(!relojValidado.current)void sincronizar();}}).subscribe(estado=>{if(estado==='SUBSCRIBED')void sincronizar();});
  const t=setInterval(()=>void sincronizar(),6000);
  const volver=()=>void sincronizar();window.addEventListener('online',volver);document.addEventListener('visibilitychange',volver);
  const offline=()=>{setSincronizado(false);setError('Sin internet. El reloj sigue corriendo; al volver recuperamos la partida.');};window.addEventListener('offline',offline);
  return()=>{vigente=false;clearInterval(t);window.removeEventListener('online',volver);window.removeEventListener('offline',offline);document.removeEventListener('visibilitychange',volver);void supabase.removeChannel(canal);};
 },[id,usuario,aceptar,respuesta]);
 const idPartida=partida?.id,fasePartida=partida?.estado.fase;
 useEffect(()=>{if(!idPartida||fasePartida!=='activa')return;const t=setInterval(()=>setTick(performance.now()),200);return()=>clearInterval(t);},[idPartida,fasePartida]);
 useEffect(()=>{
  if(!partida||!partida.estado.movimientos.length)return;
  const clave=partida.id+':'+partida.estado.movimientos.length;
  if(ultimoSonido.current.startsWith(partida.id+':')&&ultimoSonido.current!==clave)audio.current?.golpe();
  ultimoSonido.current=clave;
 },[partida]);
 const abrir=useCallback((p:PartidaOnline)=>{pendiente.current=null;setVistaPendiente(null);relojValidado.current=false;setIncierta(false);setError('');setAviso('');setSincronizado(false);aceptar(p);setId(p.id);window.history.replaceState(null,'','/jugar/online?mesa='+p.id);audio.current?.activar();},[aceptar]);
 function volver(){setId(null);actual.current=null;setPartida(null);pendiente.current=null;setVistaPendiente(null);relojValidado.current=false;setIncierta(false);setError('');window.history.replaceState(null,'','/jugar/online');void cargarMesas();}
 const crear=useCallback(async()=>{
  if(enVuelo.current)return;enVuelo.current=true;setOcupado(true);setError('');audio.current?.activar();const inicio=performance.now();
  try{const r=await pedirOnline('crear',{id:crypto.randomUUID(),ritmo,color,porElo});if(viva.current){abrir(r.partida);respuesta(r,inicio);}}catch(e){if(viva.current)setError(e instanceof Error?e.message:'No se pudo crear la mesa.');}finally{enVuelo.current=false;if(viva.current)setOcupado(false);}
 },[abrir,respuesta,ritmo,color,porElo]);
 const unirse=useCallback(async(p:PartidaOnline)=>{
  if(enVuelo.current)return;enVuelo.current=true;setOcupado(true);setError('');audio.current?.activar();const inicio=performance.now();
  try{const r=await pedirOnline('unirse',{id:p.id,aceptaElo:p.estado.porElo===true});if(viva.current){abrir(r.partida);respuesta(r,inicio);}}catch(e){if(viva.current){setError(e instanceof Error?e.message:'La mesa no está disponible.');void cargarMesas();}}finally{enVuelo.current=false;if(viva.current)setOcupado(false);}
 },[abrir,respuesta,cargarMesas]);
 async function enviar(accion?:AccionOnline){
  const p=actual.current;if(!p||enVuelo.current)return;
  if(!pendiente.current){if(!accion)return;pendiente.current={id:p.id,version:p.version,peticion:crypto.randomUUID(),jugada:accion};}
  if(accion?.tipo==='mover')setVistaPendiente({id:p.id,version:p.version,uci:accion.uci});
  enVuelo.current=true;setOcupado(true);setError('');audio.current?.activar();const inicio=performance.now();
  try{const r=await pedirOnline('jugar',pendiente.current);if(viva.current){respuesta(r,inicio);pendiente.current=null;setIncierta(false);}}
  catch(e){if(viva.current){if(e instanceof ErrorOnline&&e.status>0&&e.status<500){if(e.respuesta)respuesta(e.respuesta,inicio);pendiente.current=null;setIncierta(false);}else{setIncierta(true);setSincronizado(false);}setError(e instanceof Error?e.message:'No se pudo confirmar. Comprobá tu jugada antes de seguir.');}}
  finally{enVuelo.current=false;if(viva.current){setVistaPendiente(null);setOcupado(false);}}
 }
 async function buscar(){
  let c=codigo.trim();try{if(c.startsWith('https://'))c=new URL(c).searchParams.get('mesa')??'';}catch{c='';}
  if(!uuid.test(c)){setError('Pegá el enlace completo de la mesa o su código.');return;}
  const {data,error:e}=await supabase.from('online_partidas').select('*').eq('id',c).maybeSingle();if(!viva.current)return;
  if(e||!data){setError('No encontramos una invitación disponible. Comprobá el enlace.');return;}abrir(data as PartidaOnline);
 }
 async function copiar(){if(!partida)return;try{await navigator.clipboard.writeText(window.location.origin+'/jugar/online?mesa='+partida.id);setAviso('Enlace copiado. Mandáselo a tu rival.');}catch{setAviso('Copiá el enlace que aparece debajo.');}}
 const chess=useMemo(()=>{try{return partida?tableroOnline(partida.estado):null;}catch{return null;}},[partida]);
 const chessVisible=useMemo(()=>partida?(vistaJugadaOnline(partida,vistaPendiente)??chess):chess,[partida,vistaPendiente,chess]);
 const miColor=partida?colorOnline(partida,usuario):null,e=partida?.estado;
 const ahora=base.servidor?base.servidor+Math.max(0,tick-base.local):0;
 const relojes=e?relojesOnline(e,ahora):{w:0,b:0},rivalColor=miColor==='b'?'w':'b';
 const propias=mesas.filter(p=>colorOnline(p,usuario)),abiertas=mesas.filter(p=>!colorOnline(p,usuario)&&p.estado.fase==='espera');
 const mesa=(p:PartidaOnline)=>{const mia=colorOnline(p,usuario);return <article className={styles.mesa} key={p.id}><div><strong>{p.estado.fase==='espera'?(p.estado.colorCreador==='w'?p.estado.blancas:p.estado.negras):`${p.estado.blancas} · ${p.estado.negras}`}</strong><small>{p.estado.ritmo} · {p.estado.porElo?'Por Elo':'Amistosa'}{p.estado.porElo&&p.estado.fase==='espera'?` · ${p.estado.eloCreador??1400} Elo`:''} · {p.estado.fase==='espera'?'Esperando rival':p.estado.fase==='activa'?'En juego':p.estado.fase==='cancelada'?'Cancelada':p.estado.resultado}</small></div><button className="button-secondary" disabled={ocupado} onClick={()=>mia?abrir(p):void unirse(p)}>{mia?(p.estado.fase==='terminada'?'Ver partida':p.estado.fase==='activa'?'Continuar partida':'Abrir'):p.estado.porElo?'Jugar por Elo':'Jugar amistosa'}</button></article>;};
 return <>
  {error&&<p className={styles.mensaje} role="alert">{error}</p>}{aviso&&<p className={styles.mensaje} role="status">{aviso}</p>}
  {!id?<>{perfilElo&&<div className={styles.perfil}><strong>{perfilElo.elo} <span>Elo online</span></strong><p>{perfilElo.partidas} partidas por Elo · {perfilElo.victorias} ganadas · {perfilElo.tablas} tablas · {perfilElo.derrotas} perdidas{perfilElo.partidas<10?" · Provisional hasta completar 10 partidas":""}</p></div>}<div className={styles.dos}><section className={styles.panel}><p className={styles.sello}>La próxima partida</p><h2>Creá tu mesa.</h2><p>Compartí el enlace o esperá a que otro usuario acepte la invitación.</p><div className={styles.modalidad} role="group" aria-label="Modalidad de la partida"><button aria-pressed={!porElo} disabled={ocupado} onClick={()=>setPorElo(false)}>Amistosa</button><button aria-pressed={porElo} disabled={ocupado} onClick={()=>setPorElo(true)}>Por Elo</button></div><p className={styles.aviso}>{porElo?"El resultado suma o resta Elo online a ambos jugadores. Empieza en 1400 y se guarda en tu cuenta.":"Jugá sin cambiar tu Elo. Ideal para probar y practicar."}</p><div className={styles.ritmos} role="group" aria-label="Ritmo de la partida">{Object.keys(RITMOS_ONLINE).map(r=><button key={r} aria-pressed={ritmo===r} disabled={ocupado} onClick={()=>setRitmo(r as RitmoOnline)}>{r}</button>)}</div><label>Tu color<select value={color} onChange={ev=>setColor(ev.target.value)} disabled={ocupado}><option value="azar">Al azar</option><option value="w">Blancas</option><option value="b">Negras</option></select></label><button className="button-primary" disabled={ocupado} onClick={()=>void crear()}>{ocupado?'Preparando…':'Crear mesa e invitar'}</button><p className={styles.aviso}>La invitación dura 30 minutos. El reloj empieza cuando entra tu rival.</p></section><section className={styles.panel}><p className={styles.sello}>¿Te están esperando?</p><h2>Entrá con una invitación.</h2><label>Enlace o código de la mesa<input value={codigo} onChange={ev=>setCodigo(ev.target.value)} placeholder="Pegá el enlace que te pasaron" autoCapitalize="none"/></label><button className="button-secondary" disabled={!codigo.trim()||ocupado} onClick={()=>void buscar()}>Buscar la mesa</button><p className={styles.aviso}>Jugás con tu cuenta. Tus partidas se conservan al cambiar de computadora o celular.</p></section></div><section className={styles.abiertas}><div className={styles.cabecera}><h2>Mesas abiertas</h2><button className="text-link" onClick={()=>void cargarMesas()}>Actualizar</button></div>{cargando?<p role="status">Buscando rivales…</p>:abiertas.length?<div className={styles.lista}>{abiertas.map(mesa)}</div>:<p>Todavía no hay una mesa esperando rival. Creá la primera e invitá a alguien.</p>}</section><section className={styles.abiertas}><h2>Tus partidas</h2><p>Al terminar, tocá «Ver partida» para repasarla acá con el tablero y las flechas.</p><div className={styles.lista}>{propias.map(mesa)}</div>{!propias.length&&<p>Las partidas que juegues aparecerán acá.</p>}</section></>:!partida||partida.id!==id?<section className={styles.panel}><p role="status">Buscando la mesa…</p><button className="text-link" onClick={volver}>Volver a la sala</button></section>:e?.fase==='espera'?<section className={styles.panel}><p className={styles.sello}>{e.ritmo} · {e.porElo?"Por Elo online":"Amistosa"} · Invitación abierta</p><h2>{miColor?'Tu mesa está lista.':'Hay un lugar para vos.'}</h2><p>{miColor?'Tu rival debe iniciar sesión y aceptar la invitación. Cuando se siente, empieza el reloj.':`Vas a jugar contra ${e.colorCreador==='w'?e.blancas:e.negras}. El reloj empieza cuando aceptes.`}</p><p>{e.porElo?`Partida por Elo online. ${e.eloCreador??1400} Elo del creador. El resultado cambia el Elo online de ambos; no el del club.`:'Partida amistosa. El resultado no cambia ningún Elo.'}</p>{miColor?<><div className={styles.acciones}><button className="button-primary" onClick={()=>void copiar()}>Copiar invitación</button><button className="button-secondary" disabled={ocupado} onClick={()=>void enviar({tipo:'cancelar'})}>Cancelar invitación</button></div><p className={styles.enlace}>{'https://atlantida-ajedrez.vercel.app/jugar/online?mesa='+partida.id}</p></>:<button className="button-primary" disabled={ocupado} onClick={()=>void unirse(partida)}>Aceptar y jugar {e.porElo?"por Elo":"amistosa"} · {e.ritmo}</button>}<div className={styles.acciones}><button className="text-link" onClick={volver}>Volver a la sala</button></div></section>:e?.fase==='terminada'?<VisorPartidaOnline key={partida.id} partida={partida} color={miColor??'w'} volver={volver}/>:e&&chess?<div className={styles.partida}><section className={styles.tablero} aria-label="Partida online"><div className={styles.reloj} data-turno={e.fase==='activa'&&e.turno===rivalColor} data-bajo={relojes[rivalColor]<20000}><span>{rivalColor==='w'?e.blancas:e.negras} · {rivalColor==='w'?'Blancas':'Negras'}</span><strong>{reloj(relojes[rivalColor])}</strong></div><TableroApertura chess={chessVisible??chess} color={miColor??'w'} habilitado={e.fase==='activa'&&!!miColor&&e.turno===miColor&&sincronizado&&!ocupado&&!incierta&&relojes[miColor]>0} mover={(from,to,promotion)=>{if(enVuelo.current)return false;void enviar({tipo:'mover',uci:from+to+(promotion??'')});return true;}}/><div className={styles.reloj} data-turno={e.fase==='activa'&&e.turno===miColor} data-bajo={!!miColor&&relojes[miColor]<20000}><span>{miColor==='w'?e.blancas:e.negras} · Vos</span><strong>{miColor?reloj(relojes[miColor]):'—'}</strong></div><p className={styles.estado} role="status">{ocupado?vistaPendiente?'Enviando tu jugada…':'Confirmando en el servidor…':e.fase==='activa'?incierta?'Comprobá la última jugada antes de seguir.':!sincronizado?'Reconectando…':e.turno===miColor?chess.isCheck()?'Estás en jaque. Te toca jugar.':'Tu turno.':chess.isCheck()?'Jaque. Esperando al rival.':'Turno de tu rival.':e.motivo}</p>{e.fase==='activa'&&miColor&&<AccionesPartidaOnline color={miColor} oferta={e.oferta} bloqueado={ocupado||incierta||!sincronizado} enviar={accion=>void enviar(accion)}/>}</section><aside className={`${styles.panel} ${styles.opciones}`}><p className={styles.sello}>{e.ritmo} · {e.porElo?"Por Elo online":"Partida amistosa"}</p><h2>{e.fase==='cancelada'?'Invitación cancelada':'La partida se juega acá.'}</h2>{e.porElo&&e.eloInicio&&<p className={styles.aviso}>Elo al empezar: blancas {e.eloInicio.w} · negras {e.eloInicio.b}</p>}{e.elo&&miColor&&<div className={styles.resultado} role="status"><strong>Tu Elo online: {e.elo[miColor].antes} → {e.elo[miColor].despues} ({e.elo[miColor].variacion>=0?'+':''}{e.elo[miColor].variacion})</strong><p>Resultado registrado en tu cuenta.</p></div>}{e.fase==='activa'&&<><p>El reloj sigue corriendo si cerrás la página. Volvé con esta cuenta para retomar la misma posición.</p>{relojes[e.turno]<=0&&<button className="button-secondary" disabled={ocupado||incierta} onClick={()=>void enviar({tipo:'tiempo'})}>Confirmar resultado por tiempo</button>}</>}{incierta&&<button className="button-primary" disabled={ocupado} onClick={()=>void enviar()}>Comprobar mi jugada</button>}<p className={styles.aviso}>Para enrocar, llevá el rey dos casillas o sobre su torre. También podés tocar el rey y después el destino.</p><details><summary>Jugadas de la partida</summary><p className={styles.jugadas}>{chess.history().map((m,i)=>(i%2===0?`${Math.floor(i/2)+1}. `:'')+m).join(' ')||'La primera jugada abre la historia.'}</p></details><label className={styles.sonido}><input type="checkbox" checked={sonido} onChange={ev=>{setSonido(ev.target.checked);if(ev.target.checked)audio.current?.activar();}}/>Sonido de piezas</label><button className="text-link" onClick={volver}>Volver a mis mesas</button><p className={styles.aviso}>{e.porElo?"Esta partida modifica el Elo online, separado del Elo del club.":"Esta partida es amistosa y no cambia ningún Elo."} Se guarda para los dos jugadores. Las tablas por triple repetición y 50 jugadas se resuelven automáticamente.</p></aside></div>:null}
 </>;
}
