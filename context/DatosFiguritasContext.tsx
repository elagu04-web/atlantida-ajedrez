'use client';
import {createContext,useContext,useMemo} from 'react';
import {useJugadoresEnVivo} from './useJugadoresEnVivo';
import {useJugadores} from './JugadoresContext';
import {useTorneos} from './TorneosContext';
import {useResultadosClubOnline} from './ResultadosClubOnlineContext';
import {posicionesElo} from '@/lib/rendimiento';
type Datos={nombre:string;elo:number;ranking:number|null;partidas:number};
const Contexto=createContext<ReadonlyMap<string,Datos>>(new Map());
export function DatosFiguritasProvider({children}:{children:React.ReactNode}){
 const jugadores=useJugadoresEnVivo(),roster=useJugadores(),torneos=useTorneos(),online=useResultadosClubOnline();
 const listo=!roster.cargando&&!torneos.cargando&&!online.cargando&&!roster.errorCarga&&!torneos.errorCarga&&!online.error;
 const datos=useMemo(()=>{if(!listo)return new Map<string,Datos>();const puestos=posicionesElo(jugadores.filter(j=>j.jugadas>0));return new Map(jugadores.map(j=>[j.id,{nombre:j.nombre,elo:j.eloAtlantida,ranking:puestos.get(j.id)??null,partidas:j.jugadas}]));},[jugadores,listo]);
 return <Contexto.Provider value={datos}>{children}</Contexto.Provider>;
}
export function useDatosFiguritas(){return useContext(Contexto);}
