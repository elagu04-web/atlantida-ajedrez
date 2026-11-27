export type ResumenAlbumPublico={id:string;nombre:string;foto:string|null;figuritas:number;versiones:number};
export type DirectorioAlbumes={jugadores:ResumenAlbumPublico[]};
export type AlbumPublico={jugador:ResumenAlbumPublico;inventario:{id:string;cantidad:number}[]};
