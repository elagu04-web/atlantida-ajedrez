"use client";
import {useId,useRef,useState} from 'react';
import {useAuth} from '@/context/AuthContext';
type Modo='entrar'|'crear'|'correo'|'configurar';
export function AuthWidget(){
 const {session,cargando,nombreCuenta,usuarioInterno,iniciarSesion,iniciarSesionConGoogle,cerrarSesion,entrarConUsuario,crearCuentaInterna,guardarAccesoInterno}=useAuth();
 const dialogo=useRef<HTMLDialogElement>(null),id=useId();
 const [modo,setModo]=useState<Modo>('entrar');
 const [usuario,setUsuario]=useState(''),[correo,setCorreo]=useState(''),[nombre,setNombre]=useState('');
 const [password,setPassword]=useState(''),[confirmar,setConfirmar]=useState('');
 const [error,setError]=useState(''),[exito,setExito]=useState(''),[enviando,setEnviando]=useState(false);
 const alta=modo==='crear',configurar=modo==='configurar',nuevaClave=alta||configurar;
 function cerrar(){if(enviando)return;dialogo.current?.close();setPassword('');setConfirmar('');setError('');setExito('');}
 function cambiar(m:Modo){setModo(m);setPassword('');setConfirmar('');setError('');setExito('');}
 function abrir(m:Modo){cambiar(m);setUsuario(usuarioInterno??'');dialogo.current?.showModal();}
 async function enviar(e:React.FormEvent){
  e.preventDefault();if(enviando)return;setError('');setExito('');
  if(nuevaClave&&password!==confirmar){setError('Las contraseñas no coinciden.');return;}
  setEnviando(true);
  try{
   if(modo==='correo'){const mensaje=await iniciarSesion(correo.trim(),password);if(mensaje)throw new Error('Revisá el correo y la contraseña.');}
   else if(alta)await crearCuentaInterna(usuario,password,nombre);
   else if(configurar)await guardarAccesoInterno(usuario,password);
   else await entrarConUsuario(usuario,password);
   setPassword('');setConfirmar('');
   if(configurar)setExito('Listo. Ya podés entrar con tu usuario y contraseña desde cualquier dispositivo.');
   else dialogo.current?.close();
  }catch(e){setError(e instanceof Error?e.message:'No se pudo conectar. Volvé a intentar.');}
  finally{setEnviando(false);}
 }
 const campo='mt-1 w-full rounded-xl border border-white/15 bg-zinc-950 px-3 py-3 text-base outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20';
 if(cargando)return <span className="text-xs text-zinc-400">Conectando…</span>;
 return <>
  {session?<div className="flex min-w-0 flex-wrap items-center gap-2 text-xs"><button type="button" onClick={()=>abrir('configurar')} className="max-w-48 truncate rounded-lg px-2 py-2 text-zinc-200 hover:bg-white/10" title="Configurar usuario y contraseña">{nombreCuenta} <span className="text-blue-300">· Mi acceso</span></button><button type="button" onClick={()=>void cerrarSesion()} className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Cerrar sesión</button></div>:<button type="button" onClick={()=>abrir('entrar')} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10">Iniciar sesión</button>}
  <dialog ref={dialogo} aria-labelledby={`${id}-titulo`} onCancel={e=>{if(enviando)e.preventDefault();else cerrar();}} onClick={e=>{if(e.target===e.currentTarget)cerrar();}} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-white/15 bg-zinc-900 p-6 text-zinc-100 shadow-2xl backdrop:bg-black/75">
   <div className="mb-2 flex items-center justify-between gap-3"><h2 id={`${id}-titulo`} className="text-xl font-semibold">{configurar?'Tu acceso al club':alta?'Creá tu cuenta':'Qué bueno verte de nuevo'}</h2><button type="button" disabled={enviando} onClick={cerrar} aria-label="Cerrar inicio de sesión" className="rounded-lg px-3 py-2 hover:bg-white/10">✕</button></div>
   <p className="mb-5 text-sm leading-relaxed text-zinc-400">{configurar?'Agregá usuario y contraseña a esta misma cuenta. Conservás todas tus partidas y tu progreso.':alta?'Elegí un usuario y guardá tu progreso. No necesitás correo.':'Tus partidas, tus desafíos y tu entrenamiento, en la misma cuenta.'}</p>
   {!configurar&&<div className="mb-5 flex gap-2" aria-label="Tipo de acceso">{(['entrar','crear'] as const).map(m=><button key={m} disabled={enviando} type="button" aria-pressed={modo===m} onClick={()=>cambiar(m)} className={`flex-1 rounded-xl px-3 py-2 text-sm ${modo===m?'bg-blue-600 text-white':'border border-white/15 text-zinc-300'}`}>{m==='entrar'?'Entrar':'Crear cuenta'}</button>)}</div>}
   <form onSubmit={enviar} className="flex flex-col gap-3">
    <fieldset disabled={enviando} className="space-y-3 disabled:opacity-60">
     {alta&&<label className="block text-sm" htmlFor={`${id}-nombre`}>Nombre y apellido<input id={`${id}-nombre`} name="name" autoComplete="name" required minLength={2} maxLength={80} value={nombre} onChange={e=>setNombre(e.target.value)} className={campo}/></label>}
     {modo==='correo'?<label className="block text-sm" htmlFor={`${id}-correo`}>Correo electrónico<input id={`${id}-correo`} type="email" autoComplete="username" required value={correo} onChange={e=>setCorreo(e.target.value)} className={campo}/></label>:<label className="block text-sm" htmlFor={`${id}-usuario`}>Usuario<input id={`${id}-usuario`} name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={24} pattern="[a-zA-Z0-9][a-zA-Z0-9_]{2,23}" readOnly={configurar&&!!usuarioInterno} value={usuario} onChange={e=>setUsuario(e.target.value)} placeholder="Tu usuario" aria-describedby={`${id}-ayuda`} className={campo}/><span id={`${id}-ayuda`} className="mt-1 block text-xs text-zinc-500">3 a 24 letras sin tildes, números o guion bajo.</span></label>}
     <label className="block text-sm" htmlFor={`${id}-password`}>{nuevaClave?'Contraseña (mínimo 10 caracteres)':'Contraseña'}<input id={`${id}-password`} type="password" autoComplete={nuevaClave?'new-password':'current-password'} required minLength={nuevaClave?10:1} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} className={campo}/></label>
     {nuevaClave&&<label className="block text-sm" htmlFor={`${id}-confirmar`}>Repetí la contraseña<input id={`${id}-confirmar`} type="password" autoComplete="new-password" required minLength={10} maxLength={128} value={confirmar} onChange={e=>setConfirmar(e.target.value)} className={campo}/></label>}
    </fieldset>
    {alta&&<p className="text-xs leading-relaxed text-amber-200/90">Si ya entrabas con Google, usá esa cuenta y elegí «Mi acceso» para conservar tu avance.</p>}
    {error&&<p role="alert" className="text-sm text-red-300">{error}</p>}
    {exito&&<p role="status" className="text-sm text-emerald-300">{exito}</p>}
    <button type="submit" disabled={enviando} className="mt-1 rounded-xl bg-blue-600 px-4 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50">{enviando?'Un momento…':configurar?'Guardar mi acceso':alta?'Crear mi cuenta':'Entrar'}</button>
   </form>
   {!configurar&&<><div className="my-4 flex items-center gap-3 text-xs text-zinc-500"><span className="h-px flex-1 bg-white/10"/>o<span className="h-px flex-1 bg-white/10"/></div><button type="button" disabled={enviando} onClick={()=>void iniciarSesionConGoogle()} className="w-full rounded-xl border border-white/20 px-4 py-3 text-sm font-medium hover:bg-white/10">Continuar con Google</button><button type="button" disabled={enviando} onClick={()=>cambiar(modo==='correo'?'entrar':'correo')} className="mt-3 w-full py-2 text-xs text-zinc-400 hover:text-white">{modo==='correo'?'Usar mi nombre de usuario':'Ya tengo acceso con correo'}</button></>}
   <a href="https://wa.me/59899861116?text=Hola%2C%20necesito%20ayuda%20para%20entrar%20a%20mi%20cuenta." target="_blank" rel="noopener noreferrer" className="mt-3 block text-center text-xs text-zinc-400 hover:text-white">¿Necesitás ayuda para entrar? Escribinos.</a>
  </dialog>
 </>;
}
