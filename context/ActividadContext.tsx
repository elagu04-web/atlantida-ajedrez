"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Actividad } from "@/lib/actividad";
import { supabase } from "@/lib/supabase";

type FilaActividad = {
  id: string;
  tipo: string;
  descripcion: string;
  created_at: string;
};

type ActividadContextType = {
  actividades: Actividad[];
  cargando: boolean;
  registrar: (tipo: string, descripcion: string) => void;
};

const ActividadContext = createContext<ActividadContextType | null>(null);

function filaAActividad(fila: FilaActividad): Actividad {
  return {
    id: fila.id,
    tipo: fila.tipo,
    descripcion: fila.descripcion,
    creadoEn: fila.created_at,
  };
}

export function ActividadProvider({ children }: { children: ReactNode }) {
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from("actividad")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (!error && data) setActividades(data.map(filaAActividad));
      setCargando(false);
    }
    cargar();
  }, []);

  function registrar(tipo: string, descripcion: string) {
    // No se espera la respuesta: registrar actividad nunca debe frenar la acción principal.
    supabase
      .from("actividad")
      .insert({ tipo, descripcion })
      .select()
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setActividades((actuales) => [filaAActividad(data), ...actuales]);
        }
      });
  }

  return (
    <ActividadContext.Provider value={{ actividades, cargando, registrar }}>
      {children}
    </ActividadContext.Provider>
  );
}

export function useActividad() {
  const ctx = useContext(ActividadContext);
  if (!ctx) {
    throw new Error("useActividad debe usarse dentro de ActividadProvider");
  }
  return ctx;
}
