export type Noticia = {
  slug: string; titulo: string; bajada: string; categoria: string; fecha: string;
  imagen: string; imagenAlt: string; imagenPosicion?: string; pieFoto?: string;
  parrafos: string[];
  galeria?: {imagen: string; alt: string; pie?: string}[];
};

// Agregar aquí las noticias y sus fotos. Sólo se publican historias confirmadas del club.
export const noticias: Noticia[] = [{
  slug: "el-lado-b-del-club", titulo: "El club también tiene su lado B",
  bajada: "Las fotos, las anécdotas y las ocurrencias de Atlántida ahora tienen su propio rincón.",
  categoria: "Vida del club", fecha: "2026-10-08",
  imagen: "/imagenes/club-fondo.jpg", imagenAlt: "Dos jugadores del club concentrados en una partida de ajedrez",
  imagenPosicion: "50% 52%", pieFoto: "Una imagen del archivo del club.",
  parrafos: [
    "Estrenamos Fuera del tablero: un lugar para las novedades del club, las fotos que merecen una segunda mirada y las historias que seguimos contando después de terminar la partida.",
    "Acá también hay espacio para el humor. Las próximas crónicas llegarán con las fotos y las anécdotas de nuestra comunidad: esos pequeños momentos que hacen que Atlántida sea mucho más que una tabla de posiciones.",
    "Cada noticia se puede abrir desde su foto, leer completa y compartir. En el celular podés recorrer las tarjetas deslizando el dedo; en la computadora, arrastrando o usando las flechas."
  ]
}];

export function noticiasRecientes() { return [...noticias].sort((a,b) => b.fecha.localeCompare(a.fecha)); }
export function obtenerNoticia(slug: string) { return noticias.find(n => n.slug === slug); }
export function fechaNoticia(fecha: string) {
  return new Intl.DateTimeFormat("es-UY", {day:"numeric",month:"long",year:"numeric",timeZone:"America/Montevideo"}).format(new Date(`${fecha}T12:00:00Z`));
}
export function minutosNoticia(noticia: Noticia) { return Math.max(1,Math.ceil(noticia.parrafos.join(" ").split(/\s+/u).length/180)); }
