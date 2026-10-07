"use client";
import { useId, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function AuthWidget() {
  const { session, cargando, iniciarSesion, iniciarSesionConGoogle, cerrarSesion } = useAuth();
  const dialogo = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  function cerrar() { dialogo.current?.close(); setPassword(""); setError(null); }
  async function enviar(e: React.FormEvent) {
    e.preventDefault(); setEnviando(true); setError(null);
    try {
      const mensaje = await iniciarSesion(email.trim(), password);
      if (mensaje) setError("No se pudo iniciar sesión. Revisá el correo y la contraseña.");
      else cerrar();
    } catch { setError("No se pudo conectar. Volvé a intentar."); }
    finally { setEnviando(false); }
  }
  if (cargando) return <span className="text-xs text-zinc-400">Conectando…</span>;
  if (session) return <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs"><span className="max-w-48 truncate text-zinc-300" title={session.user.email}>{session.user.email}</span><button type="button" onClick={() => void cerrarSesion()} className="rounded-lg border border-white/20 px-3 py-2 hover:bg-white/10">Cerrar sesión</button></div>;
  return <>
    <button type="button" onClick={() => dialogo.current?.showModal()} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10">Iniciar sesión</button>
    <dialog ref={dialogo} aria-labelledby={`${id}-titulo`} onCancel={cerrar} onClick={e => { if (e.target === e.currentTarget) cerrar(); }} className="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl border border-white/15 bg-zinc-900 p-6 text-zinc-100 shadow-2xl backdrop:bg-black/70">
      <div className="mb-5 flex items-center justify-between gap-3"><h2 id={`${id}-titulo`} className="text-xl font-semibold">Iniciar sesión</h2><button type="button" onClick={cerrar} aria-label="Cerrar inicio de sesión" className="rounded-lg px-3 py-2 hover:bg-white/10">✕</button></div>
      <button type="button" onClick={() => void iniciarSesionConGoogle()} className="mb-5 w-full rounded-lg border border-white/20 px-4 py-3 font-medium hover:bg-white/10">Continuar con Google</button>
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <p className="text-sm text-zinc-400">Administración: entrá con tu correo y contraseña.</p>
        <label htmlFor={`${id}-email`} className="text-sm">Correo electrónico</label>
        <input id={`${id}-email`} type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-3" />
        <label htmlFor={`${id}-password`} className="text-sm">Contraseña</label>
        <input id={`${id}-password`} type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-lg border border-white/20 bg-zinc-950 px-3 py-3" />
        {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        <button type="submit" disabled={enviando} className="mt-2 rounded-lg bg-blue-600 px-4 py-3 font-medium hover:bg-blue-500 disabled:opacity-50">{enviando ? "Entrando…" : "Entrar"}</button>
      </form>
    </dialog>
  </>;
}
