import datos from './albumCatalogo.json';
export const catalogoAlbum = datos;
export type Figurita = (typeof datos)[number];
export type Existencia = { id: string; cantidad: number; disponibles: number };
export type Intercambio = { id: string; emisor: string; receptor: string; ofrece: string; pide: string; estado: string; creadoEn: string; venceEn: string; nombre: string | null; jugadorId: string | null };
export type Sobre = { figuritas: string[]; nuevas: string[]; repetidas: string[]; yaAbierto: boolean };
export type EstadoAlbum = { jugadorId: string | null; hoy: string; compartir: boolean; bienvenida: boolean; diario: boolean; inventario: Existencia[]; intercambios: Intercambio[]; sobre: Sobre | null };
export type Coleccionista = { cuenta: string; nombre: string; jugadorId: string; repetidas: { id: string; disponibles: number }[] };
export const figuritaPorId = new Map(catalogoAlbum.map(f => [f.id, f]));
export function nombreFigurita(id: string) { return figuritaPorId.get(id)?.nombre ?? 'Figurita del club'; }
