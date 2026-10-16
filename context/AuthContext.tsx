"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { accesoUsuario, nombreCuentaVisible } from "@/lib/accesoUsuario";
import { useAvisos } from "./AvisosContext";

// Único admin real del sitio. Cualquier otra sesión iniciada (por ejemplo,
// un socio del club que entra con Google para anotarse a un torneo) NO da
// permisos de administrador — session != null ya no alcanza para eso, hay
// que revisar esAdmin.
const EMAIL_ADMIN = "elagu04@gmail.com";

type AuthContextType = {
  session: Session | null;
  esAdmin: boolean;
  usuarioInterno: string | null;
  nombreCuenta: string;
  entrarConUsuario: (usuario:string,password:string) => Promise<void>;
  crearCuentaInterna: (usuario:string,password:string,nombre:string) => Promise<void>;
  guardarAccesoInterno: (usuario:string,password:string) => Promise<void>;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<string | null>;
  iniciarSesionConGoogle: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [cargando, setCargando] = useState(true);
  const avisar = useAvisos();
  const [acceso, setAcceso] = useState<{id:string;usuario:string|null}|null>(null);
  const usuarioInterno = acceso?.id===session?.user.id ? acceso?.usuario??null : null;
  const idUsuario = session?.user.id;
  useEffect(() => {
    if(!idUsuario)return;
    let vigente=true;
    void accesoUsuario('info').then(d=>{if(vigente)setAcceso({id:idUsuario,usuario:d.usuario??null});}).catch(()=>{});
    return ()=>{vigente=false;};
  },[idUsuario]);

  async function autenticar(accion:'entrar'|'crear',usuario:string,password:string,nombre='') {
    const datos=await accesoUsuario(accion,{usuario,password,nombre});
    if(!datos.session)throw new Error('No se confirmó la sesión. Volvé a entrar.');
    const {data,error}=await supabase.auth.setSession(datos.session);
    if(error||!data.user)throw new Error('No se confirmó la sesión. Volvé a entrar.');
    setAcceso({id:data.user.id,usuario:usuario.trim().toLowerCase()});
  }
  async function guardarAccesoInterno(usuario:string,password:string){
    const datos=await accesoUsuario('configurar',{usuario,password});
    if(session&&datos.usuario)setAcceso({id:session.user.id,usuario:datos.usuario});
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCargando(false);
    }).catch(() => { avisar("No se pudo comprobar la sesión. Volvé a intentar."); setCargando(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion);
      setCargando(false);
    });
    return () => listener.subscription.unsubscribe();
  }, [avisar]);

  async function iniciarSesion(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }

  async function iniciarSesionConGoogle() {
    try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (error) throw error;
    } catch { avisar("No se pudo iniciar sesión con Google. Volvé a intentar."); }
  }

  async function cerrarSesion() {
    try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    } catch { avisar("No se pudo cerrar la sesión. Volvé a intentar."); }
  }

  const esAdmin = session?.user?.email === EMAIL_ADMIN;

  return (
    <AuthContext.Provider
      value={{ session, esAdmin, cargando, iniciarSesion, iniciarSesionConGoogle, cerrarSesion,
        usuarioInterno, nombreCuenta:session?nombreCuentaVisible(session.user,usuarioInterno):'',
        entrarConUsuario:(u,p)=>autenticar('entrar',u,p),crearCuentaInterna:(u,p,n)=>autenticar('crear',u,p,n),guardarAccesoInterno }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}
