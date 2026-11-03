"use client";
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
import {supabase} from '@/lib/supabase';
import {fechaCuota,pesos} from '@/lib/membresias';
import s from './PagoMembresia.module.css';
import {useAccesosMembresia} from '@/context/AccesosMembresiaContext';

type Cobro={pago:string;estado:string;importe:number;devuelto:number;desde:string;hasta:string};
type Suscripcion={id:string;plan:'club'|'completo';importe:number;estado:string;checkout:string|null;proveedor_id:string|null;cobros:Cobro[]};
type Resumen={disponible:boolean;suscripciones:Suscripcion[]};
const planes={club:{nombre:'Club',precio:400,detalle:'Torneos habituales del club incluidos.'},completo:{nombre:'Club + entrenamiento',precio:550,detalle:'Torneos incluidos y entrenamiento personal.'}};
const estados:Record<string,string>={creando:'Verificando creación',pending:'Falta completar en Mercado Pago',authorized:'Renovación mensual autorizada',paused:'Renovación pausada',cancelled:'Renovación cancelada',revisar:'Pendiente de revisión'};
function urlCheckout(url:string|null,id:string|null){try{const u=new URL(url??'');return u.protocol==='https:'&&u.hostname==='www.mercadopago.com.uy'&&!u.username&&!u.password&&!u.port&&u.pathname==='/subscriptions/checkout'&&u.searchParams.get('preapproval_id')===id?u.href:null;}catch{return null;}}
export function PagoMembresia(){const {session,esAdmin}=useAuth();return session?<Contenido key={session.user.id} cuenta={session.user.id} admin={esAdmin}/>:null;}
function Contenido({cuenta,admin}:{cuenta:string;admin:boolean}){
 const {datos:accesos}=useAccesosMembresia();
 const [datos,setDatos]=useState<Resumen|null>(null),[ocupado,setOcupado]=useState(false),[error,setError]=useState(''),[aviso,setAviso]=useState(''),[correo,setCorreo]=useState(''),[plan,setPlan]=useState<'club'|'completo'>('club'),[acepta,setAcepta]=useState(false),[cancelar,setCancelar]=useState<string|null>(null),[conexion,setConexion]=useState('');
 const vivo=useRef(false),bloqueo=useRef(false),peticion=useRef<AbortController|null>(null),nonce=useRef(crypto.randomUUID());
 const llamar=useCallback(async(accion:string,datos:Record<string,unknown>={})=>{
  if(bloqueo.current)return null;bloqueo.current=true;setOcupado(true);setError('');
  const control=new AbortController();peticion.current=control;
  try{
   const {data,error}=await supabase.auth.getSession();if(error||!data.session||data.session.user.id!==cuenta)throw new Error('La cuenta cambió. Iniciá sesión de nuevo.');
   const r=await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/membresias-mercadopago`,{method:'POST',headers:{'Content-Type':'application/json',apikey:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({accion,...datos}),signal:control.signal,cache:'no-store'});
   const json=await r.json();if(!r.ok)throw new Error(json.error??'No se pudo consultar el pago.');
   // Never redirect or paint another account's response after logout/switch.
   const actual=await supabase.auth.getSession();if(!vivo.current||actual.data.session?.user.id!==cuenta)return null;
   if(Array.isArray(json.suscripciones))setDatos(json);return json;
  }catch(e){if(vivo.current&&(e as Error).name!=='AbortError')setError((e as Error).message??'No se pudo consultar el pago.');return null;}
  finally{bloqueo.current=false;if(vivo.current)setOcupado(false);}
 },[cuenta]);
 useEffect(()=>{vivo.current=true;let vigente=true;void Promise.resolve().then(()=>{
  if(!vigente)return;const parametros=new URLSearchParams(window.location.search),p=parametros.get('plan');if(p==='club'||p==='completo')setPlan(p);
  void llamar('resumen').then(async r=>{const activa=r?.suscripciones?.find((x:Suscripcion)=>x.estado!=='cancelled');if(vigente&&activa&&parametros.get('retorno')==='mercadopago'){const actual=await llamar('sincronizar',{id:activa.id});if(actual)window.dispatchEvent(new Event('membresia-actualizada'));}});
 });return()=>{vigente=false;vivo.current=false;peticion.current?.abort();};},[llamar]);
 const activa=datos?.suscripciones.find(x=>x.estado!=='cancelled');
 async function crear(e:React.FormEvent){e.preventDefault();const r=await llamar('crear',{id:nonce.current,plan,correo,acepta});if(!r)return;const checkout=urlCheckout(r.checkout,r.proveedor);if(checkout){window.location.assign(checkout);return;}setAviso('La solicitud está guardada. Actualizá el estado para consultar tu suscripción.');void llamar('resumen');}
 async function actualizar(id:string){const r=await llamar('sincronizar',{id});if(r){setAviso('Estado actualizado con Mercado Pago. Las cuotas confirmadas aparecen también en tu vigencia.');window.dispatchEvent(new Event('membresia-actualizada'));}}
 return <section className={s.panel} aria-labelledby="pago-membresia"><div className={s.cabecera}><div><p className="eyebrow">TU CUOTA, EN TU CUENTA</p><h2 id="pago-membresia">Membresía mensual</h2></div><span className={s.sello}>Mercado Pago</span></div>
 <p>Elegí tu plan y completá el pago de forma segura en Mercado Pago. La cuota queda asociada a esta cuenta.</p>
 {error&&<p className={s.error} role="alert">{error} <button disabled={ocupado} onClick={()=>void llamar('resumen')}>Reintentar consulta</button></p>}{aviso&&<p className={s.aviso} role="status">{aviso}</p>}
 {!datos&&!error&&<p role="status">Consultando tus suscripciones…</p>}
 {datos&&!activa&&<><div className={s.planes}>{Object.entries(planes).map(([id,p])=><button type="button" key={id} aria-pressed={plan===id} onClick={()=>{setPlan(id as 'club'|'completo');setAcepta(false);}} disabled={ocupado}><span>{p.nombre}</span><strong>${p.precio}<small> UYU / mes</small></strong><span>{p.detalle}</span></button>)}</div>
 {datos.disponible?<form onSubmit={crear} className={s.formulario}><label>Correo que usás en Mercado Pago<input autoComplete="email" type="email" required maxLength={254} value={correo} onChange={e=>setCorreo(e.target.value)} disabled={ocupado}/></label><label className={s.consentimiento}><input type="checkbox" checked={acepta} onChange={e=>setAcepta(e.target.checked)} required disabled={ocupado}/><span>Quiero el plan {planes[plan].nombre} de <strong>${planes[plan].precio} UYU por mes</strong>, con renovación automática mensual. Puedo cancelar las próximas renovaciones desde acá, conservando el período que ya pagué.</span></label><button className="button-primary" disabled={ocupado||!acepta}>{ocupado?'Comprobando…':`Continuar a Mercado Pago · $${planes[plan].precio}/mes →`}</button><p className={s.nota}>La autorización de la suscripción y el primer cobro pueden confirmarse en momentos distintos. Tu vigencia se activa al aprobarse el cobro.</p></form>:<div className={s.preparacion}><strong>Pagos online próximamente</strong><p>Mientras terminamos de habilitarlos, podés coordinar tu cuota con Agustín.</p><a className="button-secondary" href="https://wa.me/59899861116?text=Hola%20Agust%C3%ADn%2C%20quiero%20coordinar%20mi%20membres%C3%ADa." target="_blank" rel="noopener noreferrer">Consultar por WhatsApp ↗</a></div>}
 <p className={s.docentes}>App de juegos para docentes · $200/mes · <strong>Próximamente</strong>. <Link href="/membresias#recursos-docentes">Quiero probarla gratis ↗</Link></p></>}
 {datos?.suscripciones.map(x=>{const checkout=x.estado==='pending'?urlCheckout(x.checkout,x.proveedor_id):null;return <article key={x.id} className={s.suscripcion}><div className={s.cabecera}><h3>{planes[x.plan].nombre} · {pesos(x.importe)}/mes</h3><span>{estados[x.estado]??'Revisar estado'}</span></div><p>{x.estado==='authorized'?'La autorización permite los próximos cobros. Consultá abajo qué cuotas ya fueron aprobadas.':x.estado==='cancelled'?'No se renovará automáticamente. Los períodos ya pagados conservan su fecha de vigencia.':'La cuota todavía no se considera pagada por estar en este estado.'}</p><div className={s.acciones}><button className="button-secondary" disabled={ocupado} onClick={()=>void actualizar(x.id)}>Actualizar estado del pago</button>{checkout&&<a className="button-primary" href={checkout}>Completar en Mercado Pago ↗</a>}{x.estado!=='cancelled'&&<button className={s.cancelar} disabled={ocupado} onClick={()=>setCancelar(x.id)}>Cancelar próximas renovaciones</button>}</div>
 {cancelar===x.id&&<div className={s.confirmar} role="group" aria-label="Confirmar cancelación"><p>¿Querés detener las próximas renovaciones de {planes[x.plan].nombre}? Esto no devuelve ni elimina las cuotas ya pagadas.</p><button className="button-secondary" disabled={ocupado} onClick={()=>setCancelar(null)}>Seguir con mi plan</button><button className="button-secondary" disabled={ocupado} onClick={async()=>{const r=await llamar('cancelar',{id:x.id,confirmar:true});if(r){setCancelar(null);setAviso('Mercado Pago confirmó la cancelación de las próximas renovaciones.');}}}>Sí, cancelar renovación</button></div>}
 {x.cobros.length>0?<div className={s.cobros}><h4>Historial de cobros</h4>{x.cobros.map(c=><div key={c.pago}><span><strong>{c.estado==='approved'?'Cobro aprobado':c.estado==='refunded'?'Devuelto':c.estado==='charged_back'?'Contracargo':c.estado==='rejected'?'Cobro rechazado':'Pago en revisión'}</strong><small>{fechaCuota(c.desde)} a {fechaCuota(c.hasta)} · MP {c.pago}</small>{c.devuelto>0&&<small>Devolución registrada: {pesos(c.devuelto)}</small>}</span><b>{pesos(c.importe)}</b></div>)}</div>:<p className={s.nota}>Todavía no hay un cobro confirmado en esta suscripción.</p>}</article>;})}
 {admin&&<details className={s.admin}><summary>Conexión de cobros · administración</summary><p>La activación requiere verificar la cuenta receptora y configurar las credenciales privadas en el servidor.</p><button className="button-secondary" disabled={ocupado} onClick={async()=>{const r=await llamar('conexion');if(r)setConexion(r.disponible?'Conexión habilitada y cuenta de Uruguay verificada.':r.configurado?'Credenciales configuradas. Los cobros públicos siguen deshabilitados.':'Falta completar la conexión de la cuenta de Mercado Pago.');}}>Comprobar conexión</button>{conexion&&<p role="status">{conexion}</p>}</details>}
 <p className={s.nota}>El torneo suelto de $150 se coordina por separado. {accesos?.entrenamiento.abierto?'El entrenamiento conserva su prueba gratuita.':'El entrenamiento requiere un acceso vigente en tu cuenta.'}</p>
 </section>;
}
