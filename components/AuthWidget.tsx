"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function AuthWidget() {
  const { session, cargando, iniciarSesion, cerrarSesion } = useAuth();
  const [mostrarForm, setMostrarForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (cargando) return null;

  if (session) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-zinc-400">{session.user.email}</span>
        <button
          onClick={() => cerrarSesion()}
          className="rounded-md border border-white/20 px-2 py-1 font-medium hover:bg-white/10"
        >
          Cerrar sesión
        </button>
      </div>
    );
  }

  if (!mostrarForm) {
    return (
      <button
        onClick={() => setMostrarForm(true)}
        className="text-xs font-medium text-zinc-400 hover:text-white"
      >
        Iniciar sesión
      </button>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const mensaje = await iniciarSesion(email, password);
    setEnviando(false);
    if (mensaje) {
      setError("Email o contraseña incorrectos.");
    } else {
      setMostrarForm(false);
      setEmail("");
      setPassword("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-1.5">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-32 rounded-md border border-white/20 px-2 py-1 text-xs"
      />
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        className="w-28 rounded-md border border-white/20 px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={enviando}
        className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Entrar
      </button>
      <button
        type="button"
        onClick={() => {
          setMostrarForm(false);
          setError(null);
        }}
        className="text-xs text-zinc-400 hover:text-zinc-300"
      >
        Cancelar
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </form>
  );
}
