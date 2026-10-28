"use client";
import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/context/AuthContext';
import {supabase} from '@/lib/supabase';
import {tablaTorneoOnline,etiquetaEstadoOnline,type TorneoOnline,type DatosTorneoOnline,type CruceOnline} from '@/lib/torneosOnline';
import {AuthWidget} from './AuthWidget';
import s from './TorneosOnline.module.css';

async function rpc<T>(nombre:string,args:Record<string,unknown>={}):Promise<T>{
 const {data,error}=await supabase.rpc(nombre,args);
 if(error)throw Error(error.message);
 return data as T;
}
async function pedirTorneo(accion:'publicar'|'actualizar',id:string,version?:number):Promise<DatosTorneoOnline>{
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw Error('Iniciá sesión para entrar al torneo.');
 const r=await fetch('/api/torneos-online',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({accion,id,version}),signal:AbortSignal.timeout(55000)});
 const data=await r.json();if(!r.ok)throw Error(data.error||'No pudimos actualizar el torneo.');return data.datos;
}
const formato=(t:TorneoOnline)=>t.formato==='suizo'?'Sistema suizo':'Todos contra todos';
function fecha(hora:string){return new Intl.DateTimeFormat('es-UY',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}).format(new Date(hora));}
const puntos=(n:number)=>n===.5?'½':String(n).replace('.5','½');

export function TorneosOnline({id}:{id?:string}){
 const {session,cargando}=useAuth();
 return <div className={s.pagina}>
  <header className={s.encabezado}><div><p className={s.sello}>El club, desde donde estés</p><h1>Torneos <em>online.</em></h1><p>Un rival, un horario y una mesa en Atlántida.</p></div><Link href={id?'/torneos/online':'/jugar/online'} className="text-link">{id?'Todos los torneos':'Ir a la sala online'} →</Link></header>
  {cargando?<p role="status">Comprobando tu sesión…</p>:session?<CuentaTorneos key={session.user.id+':'+(id??'lista')} id={id} usuario={session.user.id}/>:<section className={s.panel}><p className={s.sello}>Tu lugar en el torneo</p><h2>Entrá con tu cuenta para participar.</h2><p>Podés usar tu usuario del club o Google. La inscripción, los horarios y las partidas quedan asociados a tu cuenta.</p><AuthWidget/></section>}
 </div>;
}
function CuentaTorneos({id,usuario}:{id?:string;usuario:string}){
 return id?<SalaTorneo id={id} usuario={usuario}/>:<ListaTorneos/>;
}
function ListaTorneos(){
 const {esAdmin}=useAuth(),router=useRouter();
 const [torneos,setTorneos]=useState<TorneoOnline[]>([]),[error,setError]=useState(''),[cargando,setCargando]=useState(true),[crear,setCrear]=useState(false),[ocupado,setOcupado]=useState(false);
 const [nombre,setNombre]=useState(''),[tipo,setTipo]=useState('suizo'),[ritmo,setRitmo]=useState('10+3'),[rondas,setRondas]=useState(5),[dias,setDias]=useState(3),[elo,setElo]=useState(false);
 const creacionId=useRef<string|null>(null);
 useEffect(()=>{
  let viva=true;const cargar=async()=>{try{const ts=await rpc<TorneoOnline[]>('listar_torneos_online');if(viva){setTorneos(ts);setError('');}}catch(e){if(viva)setError(e instanceof Error?e.message:'No se pudieron cargar los torneos.');}finally{if(viva)setCargando(false);}};
  void cargar();const t=setInterval(()=>{if(document.visibilityState==='visible')void cargar();},15000);return()=>{viva=false;clearInterval(t);};
 },[]);
 async function guardar(e:FormEvent){
  e.preventDefault();if(ocupado)return;setOcupado(true);setError('');
  try{const nuevo=creacionId.current??crypto.randomUUID();creacionId.current=nuevo;await rpc('crear_torneo_online',{p_id:nuevo,p_nombre:nombre,p_formato:tipo,p_ritmo:ritmo,p_rondas:rondas,p_elo:elo,p_dias:dias});router.push('/torneos/online/'+nuevo);}catch(e){setError(e instanceof Error?e.message:'No se pudo crear el torneo.');setOcupado(false);}
 }
 return <>
  <section className={s.explicacion}><span>01 <b>Anotate con tu cuenta</b></span><span>02 <b>Coordiná con tu rival</b></span><span>03 <b>Jugá acá y sumá puntos</b></span></section>
  <div className={s.fila}><h2>La próxima ronda te espera.</h2>{esAdmin&&<button className="button-primary" onClick={()=>setCrear(!crear)}>{crear?'Cerrar formulario':'+ Organizar torneo'}</button>}</div>
  {error&&<p className={s.error} role="alert">{error}</p>}
  {crear&&esAdmin&&<form className={s.panel} onSubmit={guardar}>
   <p className={s.sello}>Nuevo torneo online</p><h2>Prepará la convocatoria.</h2>
   <div className={s.formulario}>
    <label className={s.ancho}>Nombre<input required minLength={3} maxLength={90} value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Copa del club · noviembre"/></label>
    <label>Formato<select value={tipo} onChange={e=>setTipo(e.target.value)}><option value="suizo">Suizo</option><option value="round-robin">Todos contra todos</option></select></label>
    <label>Ritmo<select value={ritmo} onChange={e=>setRitmo(e.target.value)}><option>10+3</option><option>5+3</option><option>3+2</option></select></label>
    {tipo==='suizo'&&<label>Rondas<input type="number" min={1} max={15} required value={rondas} onChange={e=>setRondas(Number(e.target.value))}/></label>}
    <label>Días para coordinar cada ronda<input type="number" min={1} max={14} required value={dias} onChange={e=>setDias(Number(e.target.value))}/></label>
    <label>Modalidad<select value={elo?'elo':'amistoso'} onChange={e=>setElo(e.target.value==='elo')}><option value="amistoso">Amistoso</option><option value="elo">Por Elo online</option></select></label>
   </div>
   <p className={s.muted}>Hasta 32 jugadores. En todos contra todos se calcula el calendario al cerrar la inscripción. En suizo, las rondas se limitan a la cantidad de rivales disponibles. Cada pareja acuerda su horario; el organizador publica las rondas.</p>
   <button className="button-primary" disabled={ocupado} type="submit">{ocupado?'Creando…':'Crear y abrir inscripción →'}</button>
  </form>}
  {cargando?<p role="status">Buscando torneos…</p>:torneos.length?<div className={s.lista}>{torneos.map(t=><Link className={s.tarjeta} key={t.id} href={'/torneos/online/'+t.id}>
   <div className={s.fila}><span className={s.etiqueta}>{etiquetaEstadoOnline[t.estado]}</span>{t.anotado&&<span className={s.inscripto}>Ya estás anotado ✓</span>}</div><h3>{t.nombre}</h3><p>{formato(t)} · {t.ritmo} · {t.por_elo?'Por Elo online':'Amistoso'}</p><div className={s.pie}><span>{t.inscriptos} jugadores{t.ronda_actual>0?' · Ronda '+t.ronda_actual+'/'+t.max_rondas:''}</span><b>Ver torneo ↗</b></div>
  </Link>)}</div>:<section className={s.panel}><h3>Estamos preparando los próximos encuentros.</h3><p>Los torneos online aparecerán acá cuando el organizador abra la inscripción.</p><Link href="/jugar/online" className="text-link">Mientras tanto, invitá a alguien a jugar →</Link></section>}
 </>;
}

function SalaTorneo({id,usuario}:{id:string;usuario:string}){
 const router=useRouter();
 const [datos,setDatos]=useState<DatosTorneoOnline|null>(null),[error,setError]=useState(''),[aviso,setAviso]=useState(''),[ocupado,setOcupado]=useState(false),[cargando,setCargando]=useState(true),[aceptaElo,setAceptaElo]=useState(false),[rondaElegida,setRondaElegida]=useState<number|null>(null),[cancelar,setCancelar]=useState(false);
 const viva=useRef(true),secuencia=useRef(0),mutando=useRef(false),consultando=useRef(false),esperandoMesa=useRef(false),ultimoArbitraje=useRef(0);
 const aplicar=useCallback((nuevo:DatosTorneoOnline)=>{
  if(!viva.current)return;setDatos(nuevo);
  const mia=nuevo.cruces.find(c=>c.ronda===nuevo.torneo.ronda_actual&&(c.blancasId===usuario||c.negrasId===usuario));
  if(esperandoMesa.current&&mia?.partidaId&&mia.fase==='activa'){esperandoMesa.current=false;router.push('/jugar/online?mesa='+mia.partidaId);}
 },[router,usuario]);
 const cargar=useCallback(async()=>{
  if(consultando.current||mutando.current)return;consultando.current=true;const numero=++secuencia.current;
  try{
   let d=await rpc<DatosTorneoOnline>('obtener_torneo_online',{p_id:id});
   const puede=d.torneo.organizador_id===usuario||d.jugadores.some(j=>j.usuario_id===usuario);
   if(puede&&Date.now()-ultimoArbitraje.current>20000&&d.cruces.some(c=>c.fase==='activa'&&c.vence!==null&&Number(c.vence)<=Date.now())){ultimoArbitraje.current=Date.now();d=await pedirTorneo('actualizar',id);}
   if(numero===secuencia.current)aplicar(d);
  }catch(e){if(viva.current&&numero===secuencia.current)setError(e instanceof Error?e.message:'No se pudo cargar la ronda.');}finally{consultando.current=false;if(viva.current)setCargando(false);}
 },[id,usuario,aplicar]);
 useEffect(()=>{viva.current=true;const contador=secuencia;void cargar();let ultimo=Date.now();const t=setInterval(()=>{if(document.visibilityState==='visible'&&(esperandoMesa.current||Date.now()-ultimo>=8000)){ultimo=Date.now();void cargar();}},1000);const foco=()=>void cargar();window.addEventListener('focus',foco);window.addEventListener('online',foco);return()=>{viva.current=false;++contador.current;clearInterval(t);window.removeEventListener('focus',foco);window.removeEventListener('online',foco);};},[cargar]);
 async function accion(trabajo:()=>Promise<unknown>,mensaje='',listo=false){
  if(mutando.current)return false;mutando.current=true;++secuencia.current;setOcupado(true);setError('');setAviso('');
  try{await trabajo();if(listo)esperandoMesa.current=true;const d=await rpc<DatosTorneoOnline>('obtener_torneo_online',{p_id:id});aplicar(d);if(viva.current)setAviso(mensaje);return true;}catch(e){if(viva.current)setError(e instanceof Error?e.message:'No se pudo confirmar. Volvé a intentar.');return false;}finally{mutando.current=false;if(viva.current)setOcupado(false);}
 }
 const tabla=useMemo(()=>datos?tablaTorneoOnline(datos):[],[datos]);
 if(cargando&&!datos)return <p role="status">Preparando el torneo…</p>;
 if(!datos)return <section className={s.panel}><p role="alert">{error||'No encontramos el torneo.'}</p><button className="button-secondary" onClick={()=>void cargar()}>Volver a intentar</button></section>;
 const {torneo:t,jugadores,cruces}=datos,organizador=t.organizador_id===usuario,anotado=jugadores.some(j=>j.usuario_id===usuario),nombre=(u:string|null)=>jugadores.find(j=>j.usuario_id===u)?.nombre??'Cuenta no disponible';
 const mia=cruces.find(c=>c.ronda===t.ronda_actual&&(c.blancasId===usuario||c.negrasId===usuario));
 const ronda=rondaElegida??t.ronda_actual,pendientes=cruces.filter(c=>c.negrasId&&c.fase!=='terminada'),final=t.estado==='finalizado'||t.estado==='cancelado';
 const coordinar=(c:CruceOnline,accionNombre:string,texto:string|null=null,hora:string|null=null)=>accion(()=>rpc('coordinar_torneo_online',{p_id:id,p_ronda:c.ronda,p_mesa:c.mesa,p_accion:accionNombre,p_texto:texto,p_hora:hora}),accionNombre==='mensaje'?'Mensaje enviado.':accionNombre==='listo'?'Listo. Esperando a tu rival…':accionNombre==='no_listo'?'Ya no figurás como listo.':'Horario actualizado.',accionNombre==='listo');
 return <>
  <section className={s.portada}>
   <div className={s.fila}><span className={s.etiqueta}>{etiquetaEstadoOnline[t.estado]}</span><button className={s.botonTexto} onClick={async()=>{try{await navigator.clipboard.writeText(window.location.href);setAviso('Enlace del torneo copiado.');}catch{setError('Copiá el enlace desde la barra del navegador.');}}}>Copiar enlace ↗</button></div>
   <h2>{t.nombre}</h2><p>{formato(t)} <span>·</span> {t.ritmo} <span>·</span> {t.por_elo?'Por Elo online':'Amistoso'}</p>
   <div className={s.resumen}><div><strong>{jugadores.length}</strong><span>jugadores</span></div><div><strong>{t.ronda_actual||'—'}<small>/{t.formato==='round-robin'&&t.estado==='abierto'?'?':t.max_rondas}</small></strong><span>ronda actual</span></div><div><strong>{t.dias_ronda} días</strong><span>para coordinar cada ronda</span></div></div>
   <p className={s.muted}>Las partidas se juegan en esta página. El horario lo acuerdan los dos rivales en cada ronda.{t.por_elo?' Las partidas jugadas cuentan para tu Elo online.':''}</p>
  </section>
  <div aria-live="polite">{aviso&&<p className={s.aviso}>{aviso}</p>}</div>{error&&<p className={s.error} role="alert">{error}</p>}
  {t.estado==='abierto'&&<section className={`${s.panel} ${s.inscripcion}`}><div><p className={s.sello}>{anotado?'Tu lugar está reservado':'Inscripción abierta'}</p><h3>{anotado?'Nos vemos en la primera ronda.':'¿Te sumás?'}</h3><p>{anotado?'Figurás como '+nombre(usuario)+'. El organizador publicará el primer emparejamiento.':'Al anotarte, tu rival podrá coordinar contigo desde esta misma página.'}</p></div><div>{t.por_elo&&!anotado&&<label className={s.check}><input type="checkbox" checked={aceptaElo} onChange={e=>setAceptaElo(e.target.checked)}/> Acepto jugar por Elo online.</label>}<button className={anotado?'button-secondary':'button-primary'} disabled={ocupado||(!anotado&&t.por_elo&&!aceptaElo)||(!anotado&&jugadores.length>=32)} onClick={()=>void accion(()=>rpc('inscribir_torneo_online',{p_id:id,p_anotar:!anotado,p_acepta_elo:aceptaElo}),anotado?'Te retiraste de la inscripción.':'Ya estás anotado.')}>{anotado?'Retirarme':'Anotarme al torneo →'}</button></div></section>}
  {organizador&&!final&&<section className={`${s.panel} ${s.organizador}`}><div><p className={s.sello}>Organización</p><h3>{t.estado==='abierto'?'Cuando estén todos, publicá la primera ronda.':pendientes.length?`${pendientes.length} ${pendientes.length===1?'partida pendiente':'partidas pendientes'} en esta ronda.`:'La ronda está completa.'}</h3><p>Publicar asigna los rivales y abre la coordinación. Los relojes empiezan cuando ambos marcan que están listos.</p></div><div className={s.acciones}><button className="button-primary" disabled={ocupado||jugadores.length<2||pendientes.length>0||t.ronda_actual>=t.max_rondas&&t.formato==='suizo'} onClick={()=>void accion(()=>pedirTorneo('publicar',id,t.version),'Ronda publicada. Ya pueden coordinar.')} >{ocupado?'Procesando…':'Publicar ronda '+(t.ronda_actual+1)+' →'}</button><button className={s.botonTexto} disabled={ocupado} onClick={()=>setCancelar(!cancelar)}>Cancelar torneo</button></div>{cancelar&&<div className={s.confirmacion}><p>Se cerrará el torneo. Las partidas ya jugadas se conservan.</p><button className="button-secondary" disabled={ocupado} onClick={()=>void accion(()=>rpc('cancelar_torneo_online',{p_id:id}),'Torneo cancelado.')}>Confirmar cancelación</button><button className={s.botonTexto} onClick={()=>setCancelar(false)}>Seguir con el torneo</button></div>}</section>}
  {t.estado==='finalizado'&&<section className={`${s.panel} ${s.ganador}`}><p className={s.sello}>Torneo terminado</p><h3>{tabla.filter(j=>j.posicion===1).map(j=>nombre(j.jugadorId)).join(' y ')}</h3><p>{tabla.filter(j=>j.posicion===1).length>1?'Comparten el primer puesto.':'Se queda con el primer puesto.'} Todas las partidas permanecen en el historial de quienes las jugaron.</p></section>}
  {mia&&t.estado==='en_curso'&&<section className={s.miMesa} id="mi-mesa"><div><p className={s.sello}>Tu ronda · Mesa {mia.mesa}</p><h3>{!mia.negrasId?'Esta ronda tenés libre.':mia.fase==='terminada'?'Tu partida ya terminó.':'Te toca con '+nombre(mia.blancasId===usuario?mia.negrasId:mia.blancasId)}</h3><p>{!mia.negrasId?(t.formato==='suizo'?'BYE automático · 1 punto.':'Descanso · 0 puntos.'):(mia.blancasId===usuario?'Jugás con blancas.':'Jugás con negras.')}{t.limite_ronda&&mia.fase!=='terminada'&&mia.negrasId?' Plazo sugerido: '+fecha(t.limite_ronda)+'.':''}</p></div>{mia.partidaId?<Link className="button-primary" href={'/jugar/online?mesa='+mia.partidaId}>{mia.fase==='terminada'?'Ver mi partida':'Entrar a mi partida'} →</Link>:mia.negrasId?<a className="button-primary" href="#coordinar-rival">Coordinar y jugar ↓</a>:null}</section>}
  <div className={s.columnas}>
   <section className={s.panel}><div className={s.fila}><div><p className={s.sello}>Punto a punto</p><h3>Posiciones</h3></div><span className={s.muted}>{t.ronda_actual?'Ronda '+t.ronda_actual:'Inscritos'}</span></div>
    <div className={s.tablaScroll}><table className={s.tabla}><thead><tr><th>#</th><th>Jugador</th><th>Pts.</th><th title="Partidas con resultado">PJ</th>{t.ronda_actual>0&&<><th title={t.formato==='suizo'?'Buchholz':'Enfrentamiento directo'}>{t.formato==='suizo'?'BH':'ED'}</th><th title="Sonneborn-Berger">SB</th></>}</tr></thead><tbody>{tabla.map(j=><tr key={j.jugadorId} className={j.jugadorId===usuario?s.filaMia:undefined}><td>{t.ronda_actual?j.posicion:'—'}</td><td>{nombre(j.jugadorId)}{j.jugadorId===usuario&&<small>Vos</small>}</td><td><b>{puntos(j.puntos)}</b></td><td>{j.partidasJugadas}</td>{t.ronda_actual>0&&<><td>{puntos(j.desempates[t.formato==='suizo'?'Buchholz':'Enfrentamiento directo']??0)}</td><td>{puntos(j.desempates['Sonneborn-Berger']??0)}</td></>}</tr>)}</tbody></table></div>
    {!jugadores.length&&<p>La inscripción está abierta. El primer lugar puede ser tuyo.</p>}
    <p className={s.nota}>{t.formato==='suizo'?'Desempates: Buchholz, luego Sonneborn-Berger. El BYE automático suma 1 punto.':'Desempates: enfrentamiento directo, luego Sonneborn-Berger. Los descansos suman 0 puntos.'} Los resultados aparecen al terminar cada partida.</p>
   </section>
   <section className={s.panel}><div className={s.fila}><div><p className={s.sello}>Los cruces</p><h3>{t.ronda_actual?'Ronda '+ronda:'Esperando el primer emparejamiento'}</h3></div><button className={s.botonTexto} disabled={ocupado} onClick={()=>{setError('');void cargar();}}>Actualizar ↻</button></div>
    {t.ronda_actual>1&&<nav className={s.rondas} aria-label="Elegir ronda">{Array.from({length:t.ronda_actual},(_,i)=><button key={i} aria-pressed={ronda===i+1} onClick={()=>setRondaElegida(i+1===t.ronda_actual?null:i+1)}>{i+1}</button>)}</nav>}
    {cruces.filter(c=>c.ronda===ronda).map(c=><div key={c.mesa} className={s.cruce}><span className={s.muted}>Mesa {c.mesa}</span><div className={s.duelo}><span>{nombre(c.blancasId)}<small>Blancas</small></span><b>{!c.negrasId?'Libre':c.resultado==='1/2-1/2'?'½–½':c.resultado??(c.fase==='activa'?'En juego':'vs.')}</b><span>{c.negrasId?nombre(c.negrasId):'Descanso'}{c.negrasId&&<small>Negras</small>}</span></div>
     {c.manual&&<p className={s.nota}>Resultado registrado por la organización · sin ajuste de Elo.</p>}
     {c.partidaId&&(c.blancasId===usuario||c.negrasId===usuario)&&<Link className="text-link" href={'/jugar/online?mesa='+c.partidaId}>{c.fase==='terminada'?'Volver a ver mi partida':'Ir al tablero'} →</Link>}
     {organizador&&!final&&c.ronda===t.ronda_actual&&c.negrasId&&!c.partidaId&&<details className={s.resolver}><summary>Resolver cruce sin jugar</summary><p>Para incomparecencias o un acuerdo de la organización. Suma en la tabla; no cambia el Elo online.</p><form onSubmit={e=>{e.preventDefault();const resultado=new FormData(e.currentTarget).get('resultado');void accion(()=>rpc('resolver_cruce_online',{p_id:id,p_ronda:c.ronda,p_mesa:c.mesa,p_resultado:resultado}),'Resultado registrado.');}}><select name="resultado" aria-label="Resultado sin jugar" defaultValue={c.resultado??'0-0'}><option value="0-0">Ninguno suma · 0–0</option><option value="1-0">Ganan blancas · 1–0</option><option value="0-1">Ganan negras · 0–1</option><option value="1/2-1/2">Tablas · ½–½</option></select><button className="button-secondary" disabled={ocupado}>Registrar</button></form></details>}
    </div>)}
    {!t.ronda_actual&&<p className={s.muted}>El organizador publicará la ronda cuando cierre la inscripción. Después encontrarás acá a tu rival.</p>}
   </section>
  </div>
  {mia?.negrasId&&mia.coordinacion&&t.estado==='en_curso'&&mia.fase!=='terminada'&&<Coordinar key={t.ronda_actual+':'+mia.mesa} cruce={mia} usuario={usuario} ocupado={ocupado} nombre={nombre(mia.blancasId===usuario?mia.negrasId:mia.blancasId)} enviar={coordinar} cancelarEspera={()=>{esperandoMesa.current=false;}}/>}
 </>;
}

function Coordinar({cruce:c,usuario,ocupado,nombre,enviar,cancelarEspera}:{cruce:CruceOnline;usuario:string;ocupado:boolean;nombre:string;enviar:(c:CruceOnline,accion:string,texto?:string|null,hora?:string|null)=>Promise<boolean>;cancelarEspera:()=>void}){
 const [hora,setHora]=useState(''),[texto,setTexto]=useState(''),[ahora,setAhora]=useState(()=>Date.now()),lista=useRef<HTMLDivElement>(null),co=c.coordinacion!;
 const propio=c.blancasId===usuario?co.listo_w:co.listo_b,otro=c.blancasId===usuario?co.listo_b:co.listo_w;
 const listo=!!propio&&Date.parse(propio)>ahora-120000,rivalListo=!!otro&&Date.parse(otro)>ahora-120000;
 useEffect(()=>{const t=setInterval(()=>setAhora(Date.now()),1000);return()=>clearInterval(t);},[]);
 useEffect(()=>{lista.current?.scrollTo({top:lista.current.scrollHeight,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});},[co.mensajes.length]);
 return <section className={s.panel} id="coordinar-rival"><p className={s.sello}>Solo vos y tu rival</p><h3>Coordiná con {nombre}.</h3><p>Los horarios se muestran en la zona horaria de tu dispositivo. El horario acordado sirve para encontrarse: la partida no comienza sola.</p>
  <div className={s.columnas}><div>
   {co.propuesta?<div className={s.propuesta}><b>{fecha(co.propuesta)}</b><p>{co.aceptada?'Horario acordado ✓':co.propuesta_por===usuario?'Esperando que tu rival acepte.':'Tu rival propone este horario.'}</p>{!co.aceptada&&co.propuesta_por!==usuario&&!c.partidaId&&<button className="button-secondary" disabled={ocupado} onClick={()=>void enviar(c,'aceptar')}>Aceptar horario</button>}</div>:<p className={s.muted}>Todavía no hay un horario propuesto. Podés sugerir uno o escribirle a tu rival.</p>}
   {!c.partidaId&&<form className={s.horario} onSubmit={e=>{e.preventDefault();void enviar(c,'proponer',null,new Date(hora).toISOString());}}><label>Proponer otro horario<input type="datetime-local" required value={hora} onChange={e=>setHora(e.target.value)}/></label><button className="button-secondary" disabled={ocupado||!hora}>Enviar propuesta</button></form>}
   <div className={s.preparados}>{c.partidaId?<Link href={'/jugar/online?mesa='+c.partidaId} className="button-primary">Entrar a la partida →</Link>:<><h4>{rivalListo?'Tu rival ya está listo.':'¿Ya están los dos para jugar?'}</h4><p>Cuando ambos marquen que están listos, se abrirá el tablero y arrancará el reloj. La confirmación dura 2 minutos.</p><button className="button-primary" disabled={ocupado} onClick={()=>{if(listo)cancelarEspera();void enviar(c,listo?'no_listo':'listo');}}>{listo?'Estoy listo · cancelar espera':'Estoy listo para jugar →'}</button>{listo&&<p role="status" className={s.inscripto}>Esperando a tu rival. Dejá esta página abierta.</p>}</>}</div>
  </div><div><h4>Mensajes para coordinar</h4><div className={s.mensajes} ref={lista} role="log" aria-label="Mensajes privados con tu rival" aria-live="polite">{co.mensajes.length?co.mensajes.map((m,i)=><div key={m.fecha+':'+i} className={m.usuario===usuario?s.mensajeMio:s.mensaje}><small>{m.usuario===usuario?'Vos':m.nombre} · {fecha(m.fecha)}</small><p>{m.texto}</p></div>):<p className={s.muted}>Un «¿a qué hora podés?» es un buen comienzo.</p>}</div><form className={s.enviar} onSubmit={async e=>{e.preventDefault();const enviado=texto;if(await enviar(c,'mensaje',enviado))setTexto(actual=>actual===enviado?'':actual);}}><label className={s.sr}>Mensaje a tu rival</label><textarea aria-label="Mensaje a tu rival" required maxLength={500} rows={2} placeholder="¿Podés hoy a las 20?" value={texto} onChange={e=>setTexto(e.target.value)}/><button className="button-secondary" disabled={ocupado||!texto.trim()}>Enviar</button></form><p className={s.nota}>Este espacio es privado entre ustedes dos. Se conservan los últimos 40 mensajes.</p></div></div>
 </section>;
}
