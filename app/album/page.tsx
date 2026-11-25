import type { Metadata } from 'next';
import { AlbumClub } from '@/components/AlbumClub';

export const metadata: Metadata = {
  title: 'El álbum del club · Atlántida Ajedrez',
  description: 'Coleccioná las figuritas de los jugadores y los momentos de Atlántida Ajedrez. Abrí tus sobres gratis e intercambiá las repetidas.',
};
export default function PaginaAlbum() { return <AlbumClub />; }
