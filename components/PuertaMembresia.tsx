"use client";
import Link from 'next/link';
import {useAuth} from '@/context/AuthContext';
import {useAccesosMembresia} from '@/context/AccesosMembresiaContext';
import {AuthWidget} from './AuthWidget';
export function PuertaMembresia({recurso,children}:{recurso:'entrenamiento'|'docentes';children:React.ReactNode}){
 const {session}=useAuth(),{datos,cargando,error,actualizar}=useAccesosMembresia();
 if(cargando)return <p role="status" className="panel p-6">Comprobando tu acceso…</p>;
 if(error)return <section className="panel p-6"><h1>No pudimos comprobar tu acceso</h1><p role="alert" className="my-4">Volvé a intentar para abrir tu espacio.</p><button className="button-primary" onClick={()=>void actualizar()}>Reintentar</button></section>;
 if(datos?.[recurso].permitido)return <>{children}</>;
 return <section className="panel p-6 sm:p-10"><p className="eyebrow">TU CUENTA, TU ESPACIO</p><h1 className="mt-3 text-3xl font-bold">{recurso==='docentes'?'Juegos para tus clases':'Tu entrenamiento personal'}</h1><p className="my-5 max-w-xl text-sm leading-7 text-zinc-400">{!session?'Iniciá sesión para comprobar el acceso de tu cuenta.':recurso==='docentes'?'Tu cuenta todavía no tiene un acceso vigente a los juegos docentes. Podés coordinar una prueba o tu suscripción con Agustín.':'Tu cuenta no tiene un acceso vigente al entrenamiento. Tus partidas y tu progreso siguen guardados. Coordiná la activación o renovación con el club.'}</p>{!session?<AuthWidget/>:<div className="flex flex-wrap gap-3"><Link href="/membresia" className="button-primary">Ver mi membresía →</Link><a className="button-secondary" href="https://wa.me/59899861116?text=Hola%20Agust%C3%ADn%2C%20quiero%20habilitar%20mi%20acceso%20al%20entrenamiento%20o%20a%20los%20juegos%20docentes." target="_blank" rel="noopener noreferrer">Consultar por WhatsApp ↗</a><button className="button-secondary" onClick={()=>void actualizar()}>Ya me habilitaron: actualizar</button></div>}</section>;
}
