import datos from './albumCatalogo.json';
export type RarezaAlbum = 'comun' | 'rara' | 'mitica';
export type VersionAlbum = 'normal' | 'foil' | 'full-art';
export type Figurita = Omit<(typeof datos)[number], 'rareza'> & { rareza: RarezaAlbum; rarezaBase: RarezaAlbum; baseId: string; version: VersionAlbum };
export const catalogoAlbum: Figurita[] = datos.map(f=>({...f,rareza:f.rareza as RarezaAlbum,rarezaBase:f.rareza as RarezaAlbum,baseId:f.id,version:'normal'}));
export function idVersionFigurita(f: Pick<Figurita,'baseId'|'rarezaBase'>,rareza:RarezaAlbum,version:VersionAlbum) {
  const raiz=f.baseId+(rareza===f.rarezaBase?'':`:rareza-${rareza}`);
  return raiz+(version==='normal'?'':`:${version}`);
}
export function expandirVersiones(catalogo: Figurita[]) { return catalogo.flatMap(f=>(['comun','rara','mitica'] as const).flatMap(rareza=>(['normal','foil','full-art'] as const).map(version=>({...f,id:idVersionFigurita(f,rareza,version),rareza,version})))); }
export const versionesAlbum=expandirVersiones(catalogoAlbum);
export function leerCatalogo(datos: unknown): Figurita[] | null {
  if (!Array.isArray(datos) || !datos.length) return null;
  const validos = datos.filter(f=>f&&typeof f.id==='string'&&typeof f.nombre==='string'&&typeof f.numero==='number'&&typeof f.foto==='string'&&f.foto);
  if (validos.length!==datos.length) return null;
  return validos.map(f=>({...f,baseId:f.id,version:'normal',rareza:['comun','rara','mitica'].includes(f.rareza)?f.rareza:'comun',rarezaBase:['comun','rara','mitica'].includes(f.rareza)?f.rareza:'comun'}));
}
export type Existencia = { id: string; cantidad: number; disponibles: number };
export type Intercambio = { id: string; emisor: string; receptor: string; ofrece: string; pide: string; estado: string; creadoEn: string; venceEn: string; nombre: string | null; jugadorId: string | null };
export type Sobre = { figuritas: string[]; nuevas: string[]; repetidas: string[]; yaAbierto: boolean };
export type RecompensaAlbum = { clave: string; titulo: string; fecha: string; cantidad: number };
export type EstadoAlbum = { catalogo: unknown; jugadorId: string | null; hoy: string; compartir: boolean; bienvenida: boolean; recompensas: RecompensaAlbum[]; inventario: Existencia[]; intercambios: Intercambio[]; sobre: Sobre | null };
export type Coleccionista = { cuenta: string; nombre: string; jugadorId: string; repetidas: { id: string; disponibles: number }[] };
export const figuritaPorId = new Map(versionesAlbum.map(f => [f.id, f]));
export const nombreRareza = {comun:'Común',rara:'Rara',mitica:'Mítica'};
export const nombreVersion = {normal:'Normal',foil:'Foil', 'full-art':'Full art'};
export function nombreFigurita(id: string) { const f=figuritaPorId.get(id);return f ? `${f.nombre} · ${nombreRareza[f.rareza]} · ${nombreVersion[f.version]}` : 'Figurita del club'; }
