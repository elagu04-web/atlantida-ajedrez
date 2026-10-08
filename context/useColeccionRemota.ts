"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { actualizarFila } from "@/lib/escrituras";
import { useAvisos } from "./AvisosContext";

export function useColeccionRemota<Fila extends { id: string }, Modelo>(
  tabla: string, convertir: (fila: Fila) => Modelo, habilitado = true,
) {
  const [items, setItems] = useState<Modelo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);
  const [filas, setFilas] = useState(new Map<string, Record<string, unknown>>());
  const revision = useRef(0);
  const avisar = useAvisos();

  useEffect(() => {
    if (!habilitado) return;
    let activo = true;
    let pendiente = false;
    async function cargar() {
      if (pendiente || !activo) return;
      pendiente = true;
      const version = revision.current;
      try {
        const { data, error } = await supabase.from(tabla).select("*").order("created_at");
        if (!activo) return;
        if (error) throw error;
        // Una lectura iniciada antes de un guardado no debe deshacerlo.
        if (version !== revision.current) return;
        const registros = (data ?? []) as Fila[];
        setFilas(new Map(registros.map(f => [f.id, f as unknown as Record<string, unknown>])));
        setItems(registros.map(convertir));
        setErrorCarga(null);
        setUltimaActualizacion(new Date());
      } catch {
        if (activo) setErrorCarga("No se pudieron actualizar los datos. Se reintentará automáticamente.");
      } finally {
        pendiente = false;
        if (activo) setCargando(false);
      }
    }
    void cargar();
    const intervalo = setInterval(cargar, 5000);
    const canal = supabase.channel(`lista-${tabla}`).on("postgres_changes", { event: "*", schema: "public", table: tabla }, cargar).subscribe();
    window.addEventListener("online", cargar);
    return () => {
      activo = false;
      clearInterval(intervalo);
      window.removeEventListener("online", cargar);
      void supabase.removeChannel(canal);
    };
  }, [tabla, convertir, habilitado]);

  const guardar = useCallback(async (id: string, cambios: Record<string, unknown>) => {
    if (!habilitado) { avisar("Iniciá sesión antes de editar."); return false; }
    const anterior = filas.get(id);
    if (!anterior) { avisar("No se encontró el registro. Recargá antes de editar."); return false; }
    revision.current++;
    try {
      const data = await actualizarFila(tabla, id, cambios, anterior);
      setFilas(actuales => new Map(actuales).set(id, data));
      revision.current++;
      setItems(actuales => actuales.map(item => (item as { id: string }).id === id ? convertir(data as Fila) : item));
      setUltimaActualizacion(new Date());
      return true;
    } catch (error) {
      avisar(error instanceof Error ? error.message : "No se pudo guardar.");
      return false;
    }
  }, [tabla, convertir, avisar, filas, habilitado]);

  function incorporar(fila: Fila) {
    revision.current++;
    setFilas(actuales => new Map(actuales).set(fila.id, fila as unknown as Record<string, unknown>));
    setItems(actuales => actuales.some(item => (item as { id: string }).id === fila.id)
      ? actuales.map(item => (item as { id: string }).id === fila.id ? convertir(fila) : item)
      : [...actuales, convertir(fila)]);
  }

  const eliminar = useCallback(async (id: string) => {
    if (!habilitado) { avisar("Iniciá sesión antes de editar."); return false; }
    revision.current++;
    try {
      const { data, error } = await supabase.from(tabla).delete().eq("id", id).select("id").single();
      if (error || !data) throw error;
      setFilas(actuales => { const nuevas = new Map(actuales); nuevas.delete(id); return nuevas; });
      revision.current++;
      setItems(actuales => actuales.filter(item => (item as { id: string }).id !== id));
      return true;
    } catch { avisar("No se pudo eliminar. Comprobá la conexión y tus permisos."); return false; }
  }, [tabla, avisar, habilitado]);

  return { items: habilitado ? items : [], setItems, incorporar, cargando: habilitado && cargando, guardar, eliminar, avisar, errorCarga: habilitado ? errorCarga : null, ultimaActualizacion };
}
