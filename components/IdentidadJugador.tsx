"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useJugadores } from "@/context/JugadoresContext";
import { useMiJugador } from "@/context/useMiJugador";
import { nombreVisible } from "@/lib/players";
import { AuthWidget } from "./AuthWidget";

export function IdentidadJugador() {
  const { session } = useAuth();
  return <SelectorJugador key={session?.user.id ?? "anon"}/>;
}

function SelectorJugador() {
  const { session } = useAuth();
  const { jugadores, reclamarJugador } = useJugadores();
  const { jugador, ambigua, cargando, error: errorCarga } = useMiJugador();
  const [busqueda, setBusqueda] = useState("");
  const [enviando, setEnviando] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function elegir(id: string) {
    if (!session?.user.email || enviando || jugador || ambigua) return;
    setEnviando(id); setError("");
    try {
      const resultado = await reclamarJugador(id, session.user.email);
      if (!resultado.ok) setError("No se pudo vincular ese jugador. Puede estar asociado a otra cuenta; reintentá o avisale al club.");
    } catch { setError("No se pudo conectar. Volvé a intentar."); }
    finally { setEnviando(null); }
  }

  if (cargando) return <p role="status" className="text-xs text-zinc-400">Comprobando tu jugador…</p>;
  if (!session) return <div className="space-y-3"><p className="text-xs text-zinc-400">Iniciá sesión y elegí tu jugador. Usaremos el mismo nombre en las rachas y al anotarte a torneos.</p><AuthWidget/></div>;
  if (errorCarga || ambigua) return <div className="space-y-3"><p role="alert" className="text-xs text-amber-200">{ambigua ? "Tu cuenta está vinculada a más de un jugador. Avisale al club para corregirlo antes de participar." : "No se pudo comprobar tu jugador. Recargá la página para reintentar."}</p><AuthWidget/></div>;
  if (jugador) return <div className="space-y-2"><p className="text-sm text-emerald-200">Jugás como <strong>{nombreVisible(jugador)}</strong>.</p><p className="text-xs text-zinc-400">Este es tu nombre para los torneos y las rachas.</p><AuthWidget/></div>;

  const opciones = jugadores.filter(j => !j.email && nombreVisible(j).toLocaleLowerCase("es").includes(busqueda.trim().toLocaleLowerCase("es"))).sort((a,b) => nombreVisible(a).localeCompare(nombreVisible(b), "es"));
  return <div className="space-y-3">
    <AuthWidget/>
    <p className="text-sm text-zinc-300">¿Cuál de estos jugadores sos vos?</p>
    <p className="text-xs text-zinc-400">Elegilo una vez. Tu cuenta conservará este jugador para los torneos y las rachas.</p>
    <label className="block text-xs text-zinc-400">Buscar tu nombre<input value={busqueda} onChange={e => setBusqueda(e.target.value)} autoComplete="off" className="mt-1 w-full rounded-lg border border-white/15 p-2" placeholder="Nombre o apodo"/></label>
    <div className="max-h-52 space-y-1 overflow-y-auto">
      {opciones.map(j => <button type="button" key={j.id} disabled={enviando !== null} onClick={() => void elegir(j.id)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-left text-sm hover:bg-white/5 disabled:opacity-50"><span>{nombreVisible(j)}{j.apodo && <span className="block text-xs text-zinc-500">{j.nombre}</span>}</span><span className="text-xs text-blue-300">{enviando === j.id ? "Vinculando…" : "Soy yo"}</span></button>)}
    </div>
    {!opciones.length && <p className="text-xs text-zinc-400">{busqueda ? "No hay nombres disponibles que coincidan." : "No hay jugadores disponibles para vincular."} Si no encontrás tu nombre o ya está vinculado, avisale al club.</p>}
    {error && <p role="alert" className="text-xs text-amber-200">{error}</p>}
  </div>;
}
