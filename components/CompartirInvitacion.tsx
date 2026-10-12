"use client";
import { useState } from "react";
import { Icono } from "./Icono";

export function CompartirInvitacion({ titulo, texto, ruta, etiqueta = "Invitar a un compañero" }: { titulo: string; texto: string; ruta: string; etiqueta?: string }) {
  const [enviando, setEnviando] = useState(false);
  const [estado, setEstado] = useState("");
  const [manual, setManual] = useState("");
  async function compartir() {
    if (enviando) return;
    setEnviando(true); setEstado(""); setManual("");
    const url = new URL(ruta, window.location.origin).href;
    const invitacion = `${texto}\n${url}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(invitacion);
        setEstado("Invitación copiada. Pegala en WhatsApp o mandásela a un compañero.");
      } else if (navigator.share) await navigator.share({ title: titulo, text: texto, url });
      else { setManual(invitacion); setEstado("Copiá esta invitación para compartirla."); }
    } catch (e) {
      if ((e as Error).name !== "AbortError") { setManual(invitacion); setEstado("Copiá esta invitación para compartirla."); }
    } finally { setEnviando(false); }
  }
  return <div className="club-invitation"><button type="button" className="button-secondary" disabled={enviando} onClick={() => void compartir()} aria-label={`${etiqueta}: ${titulo}`}><Icono nombre="flecha" className="h-3.5 w-3.5 -rotate-45"/>{enviando ? "Preparando…" : etiqueta}</button><p role="status" className={estado ? "club-invitation-status" : undefined}>{estado}</p>{manual && <label className="club-invitation-manual">Invitación para copiar<textarea readOnly value={manual} onFocus={e => e.currentTarget.select()} /></label>}</div>;
}
