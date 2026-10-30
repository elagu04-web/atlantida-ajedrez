export type BloqueNoticia =
  | { tipo: "parrafo" | "subtitulo" | "jugadas"; texto: string }
  | { tipo: "lista"; items: string[] };

export type Noticia = {
  slug: string; titulo: string; tituloTarjeta?: string; bajada: string; categoria: string; fecha: string;
  imagen: string; imagenAlt: string; imagenPosicion?: string; imagenZoom?: number; pieFoto?: string; imagenVertical?: boolean; imagenAspecto?: string; imagenAncho?: number; imagenCalidad?: 75 | 90; imagenSinCompresion?: boolean;
  parrafos: string[]; bloques?: BloqueNoticia[];
  galeria?: {imagen: string; alt: string; pie?: string; ancho?: number; alto?: number; maxAncho?: number}[];
};

// Agregar aquí las noticias y sus fotos. Sólo se publican historias confirmadas del club.
export const noticias: Noticia[] = [{
  slug: "sabados-ajedrez-ludoarte-epico-atlantida",
  titulo: "Los sábados también nos encontramos para aprender ajedrez",
  tituloTarjeta: "Los sábados, vení a aprender ajedrez",
  bajada: "Abrimos un espacio para aprender y jugar en Ludoarte, Épico Atlántida. Nos juntamos los sábados a las 18:30. Sumate al grupo para enterarte de todo.",
  categoria: "Aprendé con el club",
  fecha: "2026-10-30",
  imagen: "/imagenes/sabados-aprender-ajedrez-ludoarte.jpg",
  imagenAlt: "Dos integrantes del club estudian ajedrez con un libro abierto junto al tablero",
  imagenPosicion: "50% 52%",
  imagenSinCompresion: true,
  imagenVertical: true,
  imagenAspecto: "1104 / 629",
  imagenAncho: 960,
  imagenCalidad: 90,
  parrafos: [
    "¡Sumamos los sábados! Vamos a abrir un espacio para **venir a aprender ajedrez en Ludoarte, Épico Atlántida, los sábados a las 18:30**.",
    "Si tenías ganas de aprender y no sabías por dónde empezar, venite. La idea es juntarnos, ir entendiendo el juego y ponerlo en práctica frente al tablero. Y si ya sabés mover las piezas, también podés sumarte a seguir aprendiendo.",
    "No hace falta llegar sabiendo una apertura con nombre raro. Con ganas de aprender alcanza; lo demás lo vamos viendo juntos.",
    "Armamos un grupo de WhatsApp para compartir las novedades y coordinarnos. [Entrá al grupo de los sábados](https://chat.whatsapp.com/BVgxf0zdHvW74uEpWtNjnQ) y sumate. ¡Nos vemos frente al tablero!"
  ]
}, {
  "slug": "gabi-campeon-octubre-remontada",
  "titulo": "Gabi remontó y es el campeón de octubre",
  "tituloTarjeta": "Gabi se quedó con octubre",
  "bajada": "Otro 6 de 6 para Gabriel Coronel, doce victorias en los últimos dos torneos y una remontada que lo dejó primero en la tabla mensual. Sus admiradores lo siguieron de cerca.",
  "categoria": "Vida del club",
  "fecha": "2026-10-27",
  "imagen": "/imagenes/gabi-campeon-octubre-27-2026.jpg",
  "imagenAlt": "Gabriel Coronel concentrado frente al tablero, con dos compañeros siguiendo la partida de pie",
  "imagenPosicion": "50% 38%",
  "imagenVertical": true,
  "imagenAspecto": "4 / 3",
  "imagenAncho": 960,
  "imagenCalidad": 90,
  "imagenSinCompresion": true,
  "pieFoto": "Gabi, bajo la mirada de sus admiradores. Dentro de poco va a tener que firmar los tableros.",
  "parrafos": [
    "Gabi lo hizo de nuevo. **Seis partidas, seis victorias** en el torneo de hoy, 27 de octubre, y otro primer puesto. La semana pasada se había llevado todos los puntos y hoy parece que tampoco encontró motivos para repartirlos.",
    "Esta vez fueron cuatro jugadores, todos contra todos, ida y vuelta. Gabi les ganó dos veces a cada uno de sus rivales: **tres triunfos con blancas y tres con negras**. La tabla quedó con Gabi primero, con 6 puntos; Jorge, con 3; Camilo, con 2; y Yamandú Martínez, con 1.",
    "Pero había algo más en juego. Gabi llegó a esta última fecha **tres puntos detrás de Fonchi en la tabla de octubre**. Con el 6 de 6 dio vuelta la clasificación y terminó arriba: **16½ puntos contra 13½**. Tremenda remontada para convertirse en el **campeón de octubre**.",
    "Lo que viene haciendo merece una pausa: **dos torneos seguidos con puntaje perfecto, doce victorias en doce partidas**. Y en el Elo Atlántida también se nota: empezó octubre con 1675 y lo cierra en **1764, una subida de 89 puntos**. Nosotros seguimos buscando dónde se le acaba la racha.",
    "Mientras tanto, ya le apareció público. Miren la foto: Gabi pensando y sus admiradores siguiendo cada jugada. Arrancó persiguiendo la punta y termina el mes con campeonato y club de fans. Como siga así, para analizar una partida con él vamos a tener que pedir número.",
    "¡Felicitaciones, Gabi! Ya tenías tu lugar en la **Copa de Campeones de fin de año** y ahora cerrás octubre de esta manera. A los que lo van a enfrentar les queda un poco de tiempo para estudiar. Aprovechen.",
    "[Mirá los resultados del torneo](https://atlantida-ajedrez.vercel.app/torneos/56ba97fd-47e0-4cf4-85ed-85ed525ecf2e), [la tabla de octubre](https://atlantida-ajedrez.vercel.app/estadisticas) y [el recorrido de Gabi en el club](https://atlantida-ajedrez.vercel.app/jugadores/d1c933d4-197b-434a-924c-d404421e02a6)."
  ]
}, {
  slug: "gabi-campeon-invicto-copa-de-campeones",
  titulo: "Gabi, campeón invicto y a la Copa de Campeones",
  tituloTarjeta: "Gabi, campeón con puntaje perfecto",
  bajada: "Seis triunfos en seis partidas para ganar el torneo del 20 de octubre y clasificarse a la Copa de Campeones de fin de año.",
  categoria: "Orgullo del club", fecha: "2026-10-21",
  imagen: "/imagenes/gabi-campeon-20-octubre-2026.jpg",
  imagenAlt: "Gabi concentrado frente al tablero, moviendo una pieza blanca durante una partida del club",
  imagenPosicion: "50% 32%", imagenVertical: true, imagenAspecto: "9 / 16", imagenAncho: 720, imagenCalidad: 90, imagenSinCompresion: true,
  pieFoto: "Gabi, campeón invicto del torneo del 20 de octubre.",
  parrafos: [
    "Ayer Gabi estuvo intratable. **Seis partidas, seis victorias y campeón del torneo del 20 de octubre.** Ni una tabla para disimular. Esta vez vino con pocas ganas de repartir puntos y se los llevó todos.",
    "Hubo siete jugadores, todos contra todos, a ritmo **10+5**. Gabi les ganó a sus seis rivales y terminó con **6 puntos sobre 6**, uno más que Fonchi, que quedó segundo. No hubo que sacar la calculadora para buscar un desempate: la tabla no dejó dudas.",
    "Y lo hizo parejito: **tres victorias con blancas y tres con negras**. Cambiaba el color de las piezas, pero el resultado era el mismo. Cerró la jornada con el **100% de los puntos** y el título bien ganado.",
    "La racha tampoco empezó ayer. Al cerrar este torneo, Gabi llevaba **nueve victorias consecutivas**. Su octubre en el club quedó en **10 triunfos y una tabla en 11 partidas**, sin derrotas y con un **95,5% de los puntos**. Un mes para encuadrar.",
    "El Elo también acompaña: **subió 65 puntos en octubre, de 1675 a 1740 de Elo Atlántida**. Se está haciendo cada vez más difícil sentarse enfrente de Gabi y salir con algo.",
    "Con este campeonato, además, **clasificó a la Copa de Campeones de fin de año**. Ya tiene su lugar entre los campeones y, con este presente, va a ser un rival para tener muy en cuenta.",
    "¡Felicitaciones, Gabi! Tremendo torneo. Ahora a festejar un poco, que el resto vamos a tener que estudiar algo para la próxima.",
    "[Mirá todos los resultados del torneo](https://atlantida-ajedrez.vercel.app/torneos/f08e466c-b201-4cf0-a493-8a68f7e8d1a9) y [seguí el recorrido de Gabi en el club](https://atlantida-ajedrez.vercel.app/jugadores/d1c933d4-197b-434a-924c-d404421e02a6)."
  ]
}, {
  slug: "conocias-el-torneo-del-mate",
  titulo: "¿Conocías el Torneo del Mate?",
  bajada: "Cuatro amigos, un tablero y un cinturón que nadie quiere soltar. El mate se comparte; las ganas de ganarle al otro, también.",
  categoria: "Humor del club", fecha: "2026-10-14",
  imagen: "/imagenes/torneo-del-mate-gauchos.png",
  imagenAlt: "Dos jugadores vestidos de gauchos, con ponchos, sombreros y mates, concentrados frente al tablero de ajedrez",
  imagenPosicion: "50% 40%", imagenVertical: true, imagenAspecto: "3 / 4", imagenAncho: 720, imagenCalidad: 90,
  pieFoto: "El mate se comparte. El cinturón se disputa.",
  parrafos: [
    "En Atlántida tenemos el Torneo del Mate: una competencia paralela entre Fernando Torterolo, Camilo La Rosa, Jorge Franquez y Juan Diego Montenegro. Cuatro habituales del club que se juntan a jugar, tomar mate y pasarla bien. Bueno… pasarla bien hasta que el otro te gana.",
    "La idea es divertirnos entre amigos y seguir esa rivalidad que se va armando partida a partida. Ahora también tiene su lugar en la página: podés ver los puntos, los mano a mano y cómo vienen jugando. Así las discusiones sobre quién le gana a quién por lo menos tienen números. Las excusas todavía no las estamos registrando.",
    "La tabla permite mirar solo los duelos entre ellos o todas sus partidas contra los demás jugadores del club. Una victoria suma un punto y las tablas, medio. Todo sale de los resultados que ya tenemos cargados en los torneos.",
    "Pero lo mejor es **el cinturón**, como en el boxeo. Se estrena con la primera victoria registrada entre ellos y después hay que defenderlo: si otro de los cuatro le gana al que lo tiene, se lo lleva. Si el campeón gana o hace tablas, lo conserva. Acá se pelea sentado y el único golpe permitido es una buena jugada.",
    "El dueño puede cambiar, las cargadas siguen y el mate va dando vueltas. Es una forma de sumar un poco de picante a las partidas de siempre, sin perder lo que más nos gusta: juntarnos y compartir un buen rato. Aunque alguno mire la tabla antes de saludar.",
    "[Mirá la tabla y el recorrido del cinturón en las estadísticas del club](https://atlantida-ajedrez.vercel.app/estadisticas#torneo-del-mate). Después nos contás quién es tu favorito. Eso sí: **cebá tranquilo, pero no te cuelgues la dama.**"
  ]
}, {
  "slug": "ultimo-momento-fonchi-jugo-la-siciliana",
  "titulo": "Último momento: ¡Fonchi jugó la Siciliana!",
  "bajada": "Ganó la final 3+2 frente a Coronel Gabriel y se quedó con el torneo. Pero el Hipopótamo tuvo que mirar desde el banco.",
  "categoria": "Humor del club",
  "fecha": "2026-10-13",
  "imagen": "/imagenes/fonchi-siciliana-final-13-octubre.jpg",
  "imagenAlt": "Fonchi con lentes de sol frente al tablero, moviendo una pieza negra durante la jornada de ajedrez del club",
  "imagenPosicion": "50% 38%",
  "imagenVertical": true,
  "imagenAspecto": "3 / 4",
  "imagenAncho": 720,
  "imagenCalidad": 90,
  "imagenSinCompresion": true,
  "pieFoto": "Fonchi, campeón del torneo del 13 de octubre.",
  "parrafos": [
    "Hoy pasó algo que todavía estamos tratando de procesar en Atlántida. Fonchi ganó el torneo, sí. Pero lo verdaderamente grave es cómo lo ganó: **en la final 3+2 dejó al Hipopótamo y jugó la Siciliana.**",
    "El torneo del 13 de octubre reunió a ocho jugadores en cinco rondas por sistema suizo. Fonchi y Coronel Gabriel llegaron a la definición con 4½ puntos cada uno. Hasta ahí, una noche de ajedrez perfectamente normal.",
    "Entonces llegó la final. Todos esperábamos los peoncitos acomodados, los alfiles escondidos y al hipopótamo durmiendo atrás de la reja. Pero Fonchi decidió sacar el peón a c5. **A c5. Sin pedir permiso.**",
    "No sabemos si fue preparación secreta, un arranque de rebeldía o si el hipopótamo se había ido a comprar algo. Lo que sabemos es que la Siciliana funcionó: Fonchi ganó el 3+2 y se quedó con el torneo.",
    "El hipopótamo, después de tantos años de servicio, quedó mirando desde el banco. Ni un mensaje, ni una explicación. Fonchi lo cambió por la Defensa Siciliana justo en la final. Una traición a plena vista.",
    "Felicitaciones al campeón. Pero ahora que sabemos que conoce otra defensa, **se terminó la excusa de “yo juego siempre lo mismo”.**"
  ]
},
{
  "slug": "lara-escaris-vicecampeona-nacional-ecuador",
  "titulo": "Lara Escaris, vicecampeona nacional y clasificada a Ecuador",
  "tituloTarjeta": "Lara, vicecampeona nacional",
  "bajada": "La jugadora de Atlántida Ajedrez terminó invicta, con 5 puntos en 6 rondas, y consiguió uno de los dos cupos femeninos para los Juegos Sudamericanos Escolares.",
  "categoria": "Orgullo del club",
  "fecha": "2026-10-11",
  "imagen": "/imagenes/lara-escaris-vicecampeona-hd.png",
  "imagenAlt": "Lara Escaris sonríe junto a un tablero de ajedrez durante el torneo",
  "imagenPosicion": "50% 36%",
  "imagenVertical": true,
  "imagenAspecto": "1037 / 1517",
  "imagenAncho": 640,
  "imagenCalidad": 90,
  "imagenSinCompresion": true,
  "pieFoto": "Lara Escaris, integrante de Atlántida Ajedrez y vicecampeona nacional.",
  "parrafos": [
    "Una gran alegría para Atlántida Ajedrez: Lara Escaris, jugadora de nuestro club, obtuvo el vicecampeonato en la primera serie femenina de los Juegos Deportivos Nacionales y clasificó a los Juegos Sudamericanos Escolares en Ecuador. Lara participó representando al Colegio Imagine de El Pinar.",
    "Solo clasificaban dos chicas y Lara consiguió uno de esos lugares. Terminó invicta, con cuatro victorias y dos tablas: 5 puntos en 6 rondas, entre 33 jugadoras.",
    "La final se jugó el 9 y 10 de octubre en Montevideo. Lara ganó sus primeras cuatro partidas y después hizo tablas con Silvana Araque, quien fue la campeona, y con Sofía Muñoz.",
    "En Atlántida estamos muy contentos por Lara y compartimos esta alegría con su familia y su colegio Imagine. Felicitaciones, Lara, por el vicecampeonato y por el lugar en Ecuador. Vamos a estar acompañándote en lo que viene."
  ],
  "bloques": [
    {
      "tipo": "parrafo",
      "texto": "Una gran alegría para Atlántida Ajedrez: Lara Escaris, jugadora de nuestro club, obtuvo el vicecampeonato en la primera serie femenina de los Juegos Deportivos Nacionales y clasificó a los Juegos Sudamericanos Escolares en Ecuador. Lara participó representando al Colegio Imagine de El Pinar."
    },
    {
      "tipo": "parrafo",
      "texto": "Solo clasificaban dos chicas y Lara consiguió uno de esos lugares. Terminó invicta, con cuatro victorias y dos tablas: 5 puntos en 6 rondas, entre 33 jugadoras."
    },
    {
      "tipo": "parrafo",
      "texto": "La final se jugó el 9 y 10 de octubre en Montevideo. Lara ganó sus primeras cuatro partidas y después hizo tablas con Silvana Araque, quien fue la campeona, y con Sofía Muñoz."
    },
    {
      "tipo": "parrafo",
      "texto": "En Atlántida estamos muy contentos por Lara y compartimos esta alegría con su familia y su colegio Imagine. Felicitaciones, Lara, por el vicecampeonato y por el lugar en Ecuador. Vamos a estar acompañándote en lo que viene."
    },
    {
      "tipo": "parrafo",
      "texto": "[Ver los resultados completos del torneo](https://s2.chess-results.com/tnr1509307.aspx?lan=2&art=1&rd=6&turdet=YES&SNode=S0)."
    }
  ],
  "galeria": [
    {
      "imagen": "/imagenes/lara-escaris-en-partida-hd.png",
      "alt": "Lara Escaris anota una jugada junto al tablero; el rostro del jugador del fondo está suavemente desenfocado",
      "pie": "Lara, concentrada en una de sus partidas.",
      "ancho": 1156,
      "alto": 1361,
      "maxAncho": 560
    }
  ]
}, {
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
