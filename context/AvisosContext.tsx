"use client";

import { createContext, useCallback, useContext, useState } from "react";

const AvisosContext = createContext<((mensaje: string) => void) | null>(null);

export function AvisosProvider({ children }: { children: React.ReactNode }) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const avisar = useCallback((texto: string) => setMensaje(texto), []);
  return (
    <AvisosContext.Provider value={avisar}>
      {mensaje && (
        <div role="alert" className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-2xl items-start gap-4 rounded-xl border border-red-400/40 bg-zinc-900 p-4 text-sm text-red-200 shadow-xl">
          <p className="flex-1">{mensaje}</p>
          <button type="button" onClick={() => setMensaje(null)} aria-label="Cerrar aviso" className="rounded px-2 py-1 hover:bg-white/10">✕</button>
        </div>
      )}
      {children}
    </AvisosContext.Provider>
  );
}

export function useAvisos() {
  const avisar = useContext(AvisosContext);
  if (!avisar) throw new Error("useAvisos requiere AvisosProvider");
  return avisar;
}
