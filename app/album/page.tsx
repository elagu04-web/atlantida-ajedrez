import type { Metadata } from 'next';
import { AlbumClub } from '@/components/AlbumClub';

export const metadata: Metadata = {
  title: 'El álbum del club · Atlántida Ajedrez',
  description: 'Coleccioná jugadores y campeones de Atlántida Ajedrez. Ganá sobres, descubrí figuritas foil y full art e intercambiá las repetidas.',
};
export default function PaginaAlbum() { return <AlbumClub />; }
