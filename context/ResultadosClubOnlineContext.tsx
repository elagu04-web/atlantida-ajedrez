"use client";
import {createContext,useContext,type ReactNode} from 'react';
import {useColeccionRemota} from './useColeccionRemota';
import {resultadoClubDesdeFila,type FilaResultadoClubOnline,type ResultadoClubOnline} from '@/lib/resultadosClubOnline';
const Contexto=createContext<{resultados:ResultadoClubOnline[];cargando:boolean;error:string|null}>({resultados:[],cargando:false,error:null});
export function ResultadosClubOnlineProvider({children}:{children:ReactNode}){
 const {items,cargando,errorCarga}=useColeccionRemota<FilaResultadoClubOnline,ResultadoClubOnline>('partidas_club_online',resultadoClubDesdeFila);
 return <Contexto.Provider value={{resultados:items,cargando,error:errorCarga}}>{children}</Contexto.Provider>;
}
export function useResultadosClubOnline(){return useContext(Contexto);}
