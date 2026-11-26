import type {Metadata} from 'next';
import {PartidaPublica} from '@/components/PartidaPublica';
export const metadata:Metadata={title:'Partida guardada · Atlántida Ajedrez',description:'Recorré las partidas oficiales del club jugada a jugada y descargá su PGN.'};
export default async function PaginaPartida({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{jugador?:string}>}) {
 const {id}=await params,{jugador}=await searchParams;
 return <PartidaPublica key={id} id={id} jugador={jugador}/>;
}
