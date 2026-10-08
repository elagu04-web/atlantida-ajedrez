export type BloqueNoticia =
  | { tipo: "parrafo" | "subtitulo" | "jugadas"; texto: string }
  | { tipo: "lista"; items: string[] };

export type Noticia = {
  slug: string; titulo: string; bajada: string; categoria: string; fecha: string;
  imagen: string; imagenAlt: string; imagenPosicion?: string; pieFoto?: string; imagenVertical?: boolean;
  parrafos: string[]; bloques?: BloqueNoticia[];
  galeria?: {imagen: string; alt: string; pie?: string}[];
};

// Agregar aquí las noticias y sus fotos. Sólo se publican historias confirmadas del club.
export const noticias: Noticia[] = [{
  slug: "defensa-hipopotamo-cinco-claves", titulo: "Defensa Hipopótamo: cinco claves para jugarla y cinco para vencerla",
  bajada: "Una defensa que parece tranquila, pero esconde un contraataque. Conocé su esquema y las claves para jugar de ambos lados.",
  categoria: "Aprendé ajedrez", fecha: "2026-10-08",
  imagen: "/imagenes/defensa-hipopotamo.png",
  imagenAlt: "Montaje humorístico de un jugador de ajedrez con un hipopótamo acechando detrás de la reja",
  imagenPosicion: "50% 42%", imagenVertical: true,
  pieFoto: "Imagen editada con humor para ilustrar la defensa Hipopótamo.",
  parrafos: ["La defensa Hipopótamo parece una invitación al ataque: las negras ceden espacio y mantienen sus piezas detrás de una cadena de peones. Pero esa apariencia tranquila esconde una idea ambiciosa: frenar el contacto y preparar un contraataque cuando las blancas se comprometan demasiado."],
  bloques: [
    {tipo:"parrafo",texto:"La defensa Hipopótamo parece una invitación al ataque: las negras ceden espacio y mantienen sus piezas detrás de una cadena de peones. Pero esa apariencia tranquila esconde una idea ambiciosa: frenar el contacto y preparar un contraataque cuando las blancas se comprometan demasiado."},
    {tipo:"subtitulo",texto:"¿Cuáles son las primeras jugadas?"},
    {tipo:"parrafo",texto:"El Hipopótamo es un sistema: busca una disposición de piezas y peones, y el orden de las jugadas se adapta a lo que haga el rival. Su estructura característica incluye **alfiles en b7 y g7, caballos en d7 y e7 y peones centrales en d6 y e6**. Los avances **…a6 y …h6** completan la formación básica cuando la posición lo permite. [Vista previa del libro, New In Chess](https://www.newinchess.com/media/wysiwyg/product_pdf/9081.pdf)."},
    {tipo:"parrafo",texto:"Una secuencia ilustrativa para llegar a esa disposición es:"},
    {tipo:"jugadas",texto:"1. d4 g6 2. e4 Ag7 3. Cc3 d6 4. Cf3 e6\n5. Ae2 Ce7 6. O-O Cd7 7. Ae3 b6 8. Dd2 Ab7"},
    {tipo:"parrafo",texto:"Aquí, **A** significa alfil, **C** caballo, **D** dama y **O-O** enroque corto. En cada pareja aparece primero la jugada blanca y después la negra."},
    {tipo:"parrafo",texto:"¿Qué están construyendo las negras? **…g6 y …Ag7** colocan un alfil en la gran diagonal; **…b6 y …Ab7** hacen lo mismo en el otro flanco. **…d6 y …e6** forman un centro compacto, mientras los caballos se desarrollan detrás de los peones. Esta secuencia sirve para visualizar el esquema: las amenazas del rival pueden exigir cambiar el orden o apartarse de él."},
    {tipo:"subtitulo",texto:"Cinco consejos para jugar el Hipopótamo"},
    {tipo:"lista",items:[
      "**Acepta tener menos espacio.** Evita avanzar peones solo para aliviar la sensación de encierro: cada avance puede abrir una puerta al rival.",
      "**Coordina la estructura.** Peones y piezas deben sostenerse entre sí. La solidez exige algo más que colocar todo detrás de una barrera.",
      "**Maniobra con un propósito.** Mejora tus piezas y prepara líneas para los alfiles. Esperar también exige trabajo.",
      "**Prepara la ruptura.** Antes de avanzar un peón, comprueba qué líneas se abrirán y cuáles de tus piezas podrán aprovecharlas.",
      "**Observa las concesiones del atacante.** Las blancas pueden ganar espacio dejando casillas débiles. Dirige el contraataque hacia esos objetivos concretos."
    ]},
    {tipo:"subtitulo",texto:"Cinco consejos para vencerlo"},
    {tipo:"lista",items:[
      "**Ocupa el centro sin precipitarte.** Aprovecha el espacio disponible, pero mantén tus peones defendidos. Ganar territorio no obliga a atacar inmediatamente.",
      "**Desarrolla antes de abrir la posición.** Coordina las piezas y asegura el rey para que tu centro tenga respaldo.",
      "**No fuerces un ataque sin objetivos.** Si todavía no hay puntos de contacto, mejora tu posición y evita crear debilidades propias.",
      "**Anticipa el contraataque negro.** Antes de cada avance, revisa qué ruptura permites y qué alfil rival podría activarse.",
      "**Convierte el espacio en presión.** Mejora tu pieza peor situada, restringe una ruptura o acumula fuerzas sobre una debilidad. Haz que tu mayor libertad limite al rival."
    ]}
  ]
}, {
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
export function minutosNoticia(noticia: Noticia) {
  const partes = noticia.bloques?.flatMap(b => b.tipo === "lista" ? b.items : [b.texto]) ?? noticia.parrafos;
  const texto = partes.join(" ").replace(/\[([^\]]+)\]\(https:\/\/[^)]+\)/gu, "$1").replace(/\*\*/gu, "");
  return Math.max(1, Math.ceil(texto.trim().split(/\s+/u).length / 180));
}
