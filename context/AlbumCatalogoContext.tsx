'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { catalogoAlbum, expandirVersiones, leerCatalogo, type Figurita } from '@/lib/album';
import { supabase } from '@/lib/supabase';

const Contexto = createContext<{ catalogo: Figurita[]; porId: Map<string,Figurita>; actualizar: (datos: unknown)=>void } | null>(null);
export function AlbumCatalogoProvider({children}:{children:React.ReactNode}) {
  const [catalogo,setCatalogo]=useState(catalogoAlbum);
  const actualizar=useCallback((datos:unknown)=>{const nuevo=leerCatalogo(datos);if(nuevo)setCatalogo(nuevo);},[]);
  useEffect(()=>{const control=new AbortController();void (async()=>{const r=await supabase.rpc('catalogo_album_club').abortSignal(control.signal);if(!r.error&&!control.signal.aborted)actualizar(r.data);})();return()=>control.abort();},[actualizar]);
  const porId=useMemo(()=>new Map(expandirVersiones(catalogo).map(f=>[f.id,f])),[catalogo]);
  return <Contexto.Provider value={{catalogo,porId,actualizar}}>{children}</Contexto.Provider>;
}
export function useCatalogoAlbum(){const valor=useContext(Contexto);if(!valor)throw new Error('Falta el catálogo del álbum');return valor;}
