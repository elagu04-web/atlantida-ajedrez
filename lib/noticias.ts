export type Noticia = {
  slug: string; titulo: string; bajada: string; categoria: string; fecha: string;
  imagen: string; imagenAlt: string; imagenPosicion?: string; pieFoto?: string; imagenVertical?: boolean;
  parrafos: string[];
  galeria?: {imagen: string; alt: string; pie?: string}[];
};

// Agregar aquí las noticias y sus fotos. Sólo se publican historias confirmadas del club.
export const noticias: Noticia[] = [{
  slug: "sumate-a-nuestro-grupo-de-estudio", titulo: "Sumate a nuestro grupo de estudio",
  bajada: "¡Todos los jueves nos juntamos a estudiar un poco y divertirnos!",
  categoria: "Vida del club", fecha: "2026-10-08",
  imagen: "/imagenes/grupo-estudio-jueves.png",
  imagenAlt: "Foto editada del grupo de estudio de ajedrez, rodeado de pilas de libros, cuadernos y anotaciones",
  imagenPosicion: "50% 50%", pieFoto: "Imagen editada para la invitación al grupo de estudio.",
  parrafos: [
    "Todos los jueves nos juntamos a estudiar un poco y divertirnos. Entre tableros, libros y alguna que otra discusión sobre cuál era la mejor jugada, siempre hay algo para aprender y un buen rato para compartir.",
    "Traé tus dudas, tus ideas y las ganas de pasarla bien. Libros y anotaciones, como verás, no nos faltan… ¡Sumate a nuestro grupo de estudio!"
  ]
}, {
  slug: "matias-y-su-viento-a-favor", titulo: "Matias y su viento a favor",
  bajada: "Campeón de setiembre, imparable y, según él, sin estudiar. Que alguien nos pase la receta.",
  categoria: "Humor del club", fecha: "2026-10-08",
  imagen: "/imagenes/matias-viento-a-favor.png",
  imagenAlt: "Montaje humorístico de Matías frente al tablero de ajedrez, con un celular en la mano",
  imagenPosicion: "50% 45%", imagenVertical: true,
  pieFoto: "Imagen editada con humor para esta nota.",
  parrafos: [
    "Matías fue el campeón de setiembre y estuvo imparable. Le salían todas: cuando parecía que se complicaba, encontraba la jugada y seguía como si nada. Lo mejor es que dice que no estudia. Yo todavía no entiendo cómo jugó tan bien; si ese es el resultado de no estudiar, capaz que estamos haciendo todo al revés.",
    "Por ahora vamos a decir que tuvo viento a favor. Mucho viento. Felicitaciones, Matías, pero para el próximo torneo pasanos la receta, que el resto también quiere jugar así."
  ]
}, {
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
