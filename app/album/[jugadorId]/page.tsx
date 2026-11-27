import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {AlbumVisitado} from '@/components/AlbumVisitado';
export const metadata:Metadata={title:'Álbum del jugador · Atlántida Ajedrez',description:'Visitá las figuritas conseguidas y las aperturas jugadas por tus compañeros del club.'};
export default async function PaginaAlbumJugador({params}:{params:Promise<{jugadorId:string}>}){
 const {jugadorId}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jugadorId))notFound();
 return <AlbumVisitado jugadorId={jugadorId}/>;
}
