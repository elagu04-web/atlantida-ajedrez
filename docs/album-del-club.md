# Álbum del club
Ruta: `/album`. Edición inicial: 24 jugadores con retrato individual, 8 campeones y El Charly de la Suerte. Cada figurita tiene rareza común, rara y mítica, combinada con acabado normal, foil y full art: 33 figuritas iniciales, ampliadas el 27/11/2026 a 39 y 351 combinaciones. Los identificadores anteriores se conservan. El álbum personal protege las cartas no obtenidas; por pedido posterior de Agustín se pueden visitar las versiones conseguidas en los álbumes de compañeros, junto con sus aperturas.

## Sobres por actividad
- Bienvenida: 6 figuritas una sola vez. Incluye el propio jugador normal si está en esta edición.
- Torneo presencial finalizado: 6, con al menos una partida registrada entre dos jugadores. No alcanza con anotarse o recibir un BYE.
- Torneo online finalizado: 6, con participación efectiva en una mesa con resultado confirmado.
- Victoria online: 3, en una partida terminada entre dos cuentas distintas, con al menos cuatro medias jugadas. No cuentan tablas, mesas anuladas ni partidas sin jugar.
- Desafío diario: 3, por resolución oficial sin errores ni pistas.
- Se reconocen actividades desde el 24/11/2026. Los torneos online que empezaron antes y terminan después también cuentan.
- El servidor comprueba cada actividad. La misma clave de recompensa nunca entrega dos veces. No hay venta de sobres ni un sobre gratuito por entrar cada día.

La rareza se sortea primero: común 70%, rara 25%, mítica 5%. Luego se sortea la versión, de forma independiente: normal 80%, foil 15%, full art 5%. Dentro de cada combinación se elige uniformemente entre las figuritas activas. La figurita propia garantizada de bienvenida es una excepción explícita al sorteo.

El resultado se guarda antes de mostrar la animación. La tira se rasga con mouse o dedo en cualquiera de las dos direcciones al recorrer el 64% del ancho; un movimiento vertical o incompleto cancela. Recargar no cambia lo obtenido. Hay alternativa con botón y teclado, y se respeta movimiento reducido. Las obtenidas admiten inclinación táctil o con mouse, brillo prismático foil y barniz full art.

Las cartas normales y foil muestran nombre, Elo unificado actual, ranking y partidas desde los mismos datos públicos que Ranking. Full art reserva espacio a la foto y deja nombre y Elo. No se inventan estadísticas para Charly.

La composición se define en `components/CartaAlbum.tsx` y su módulo CSS: proporción 2:3, retrato sin ventana interior, transición hacia el nombre y las estadísticas, un único borde y sello inferior de rareza. El estado de la colección queda fuera de la carta. Común usa metal frío, rara violeta y mítica oro; full art extiende la foto y desplaza el Elo a la esquina. La tipografía se adapta al ancho de cada carta, con tamaños mínimos para la vista móvil. El álbum muestra cuatro columnas en escritorio, tres en pantallas intermedias y dos en celular; el detalle y la revelación usan cartas más grandes. La vista de prueba local no forma parte de la publicación.

## Intercambios
Hay que activar «Compartir mis repetidas». Otros participantes de la mesa ven sólo el nombre público y las copias disponibles, sin correos ni la colección completa. Cada versión tiene existencias independientes.

Una propuesta ofrece una copia por otra; se reserva la copia ofrecida. El receptor acepta o rechaza; el emisor puede cancelar antes. Ambas entregas se ejecutan en una transacción y nunca se entrega la última copia de una versión. Los reintentos son idempotentes.

Límites: 5 propuestas salientes, 10 entrantes por receptor y una pendiente por pareja. Caducan a los 7 días. Desactivar los intercambios cancela los pendientes. El historial conserva todos los cambios y la interfaz muestra las últimas 60 propuestas.

## Catálogo ampliable y retratos
El administrador puede abrir «Gestión del álbum» e incorporar jugadores que ya tengan una foto en su perfil. El servidor vuelve a comprobar el permiso y la existencia de la foto. Cada incorporación añade el siguiente número y las nueve combinaciones, sin desplegar código.

Usar retratos individuales recortados; no fotos con dos personas. El catálogo conserva su propia foto para que un cambio del perfil no introduzca a otro jugador en una figurita existente. La edición inicial usa los recortes del club en `public/imagenes/retratos`.

`lib/albumCatalogo.json` es la base inicial que permite mostrar el álbum mientras se consulta el catálogo público remoto. La base de datos es la autoridad para incorporaciones. No reutilizar identificadores ni números activos.

El prototipo inicial incluía figuritas sin foto. Sus copias permanecen guardadas internamente, pero se retiran de la selección y de los intercambios. Si el administrador incorpora al jugador al cargarle una foto, su identificador se reactiva y recupera esas copias. No se borraron sobres ni inventarios durante este ajuste.

## Persistencia y autorización
Tablas en `album_privado`: catálogo, perfiles, inventario, sobres e intercambios, con RLS y sin acceso directo de clientes. `public.album_club` es un envoltorio SECURITY INVOKER de un motor privado que comprueba la cuenta real y su jugador vinculado. El catálogo tiene un RPC de lectura pública que devuelve sólo nombres, números, fotos y atributos del coleccionable.

Los movimientos se serializan por cuenta; un intercambio bloquea ambas cuentas en orden de UUID y comprueba de nuevo las reservas. Las claves de sobre y los UUID de propuesta evitan entregas duplicadas. Los avisos informativos de RLS sin políticas son intencionales en estas tablas privadas: el acceso directo queda denegado.

## Validación
`node --test tests/album-club.test.cjs tests/rasgado-album.test.cjs tests/figuritas-visibilidad.test.cjs tests/rpc-cuenta.test.cjs`

Postgres/PGlite verifica autorización, privacidad, sobres y recompensas idempotentes, límites exactos de rareza y acabado, participación real, victorias de ambos colores y roles, desafíos fallidos, reservas, última copia por versión, aceptación doble, caducidad, falta de existencias e incorporaciones sólo por administrador. También comprueba que todos los retratos iniciales existan.

## Recurso de Bruno
Recorte guardado en `public/imagenes/retratos/bruno-album-transparente.webp`, generado con la herramienta integrada imagegen a partir de la foto facilitada para la noticia de Espacio Minga. Prompt: extraer sólo a Bruno en primer plano, conservar identidad, cabello, expresión, ropa, postura, brazos y ajedrez; eliminar por completo al otro jugador, la pared y las sillas; fondo transparente; sin texto ni estilización. Se conserva la fotografía original de la noticia.

## Ilustraciones y prueba administrativa
Fondos originales generados con imagegen, formato vertical y sin texto, rostros ni logotipos: `public/imagenes/album/{club,mar,hipopotamo,sobre}.webp`. Dirección de los prompts: gouache azul marino, verde petróleo y oro; centro despejado para el retrato; arquitectura de Épico, arcos violetas y lámparas ámbar para club y sobre (referencia fotográfica del club); costa, pinos y piezas náuticas para mar; emblema de hipopótamo dorado y ondas para Fonchi. El sobre tiene bordes metálicos sellados y línea de rasgado; los textos y el escudo auténtico se agregan en HTML. Cada jugador recibe además una firma estable de saltos legales de caballo. El fondo de mate se retiró a pedido de Agustín y sus figuritas usan el fondo del club.

Charly usa la foto original facilitada por Agustín, convertida a `charly-suerte-original.webp`, sin regenerar su cara. El fondo claro se integra en una edición verde y crema.

`reiniciar_prueba` sólo admite la cuenta administrativa preexistente y afecta únicamente su inventario y sobres. Antes guarda inventario, sobres y perfil en `album_privado.reinicios_prueba`; cancela sus propuestas pendientes y desactiva compartir. Conserva el historial aceptado y las colecciones ajenas. UUID de petición idempotente: repetirla no borra cartas abiertas después del reinicio. No se expone esta acción en la interfaz de usuarios.

## Aperturas en la colección personal

En `/album?seccion=aperturas#mis-aperturas`, cada jugador vinculado tiene un apartado adicional de aperturas, defensas, gambitos y sistemas. Se deriva de las partidas oficiales terminadas del archivo deportivo, incluidas las anteriores. Las jugadas persistidas son la evidencia; no hay un inventario paralelo que pueda divergir. Las partidas presenciales sin notación y los resultados manuales sin movimientos no conceden cartas.

`aperturas_partidas_jugador` pagina hasta 100 encuentros por petición y devuelve sólo el ID público, fecha, rival público, color, resultado y las primeras 40 medias jugadas. El envoltorio público es SECURITY INVOKER y la proyección privada conserva los filtros del archivo deportivo. No abre acceso a mesas, cuentas, correos ni PGN privados, ni recibe jugadas del navegador.

Desde el 27/11/2026, cada posición con nombre realmente alcanzada entrega su propia carta, incluidos los pasos anteriores. Cada diagrama usa el FEN y PGN de esa entrada del catálogo, sin reutilizar un tablero avanzado bajo el nombre de una familia general. Los ID dependen de la posición, no del orden de los archivos. Las transposiciones reconocen la posición alcanzada y no regalan antecesores que no se jugaron. Londres, Muro de Piedra e Hipopótamo conservan además su reconocimiento por formación propia, con IDs separados del catálogo. Las cartas no evalúan dominio ni precisión.

El explorador permite mover piezas, tocar casillas, elegir continuaciones, recorrer el historial, volver atrás, girar el tablero, buscar por nombre/ECO y filtrar ramas con cartas obtenidas. Muestra progreso de posiciones catalogadas, sin confundirlo con todas las posibilidades legales del ajedrez. Las cartas no obtenidas mantienen su estado pendiente; estudiar el tablero no las desbloquea. Las posiciones anteriores se recuperan de los encuentros oficiales ya guardados.

Los recorridos canónicos se regeneran con `node scripts/generar-arbol-aperturas.cjs`. Son 3865 posiciones y hasta 36 medias jugadas; la proyección actual de 40 medias jugadas alcanza para todo el catálogo. No hizo falta ampliar la lectura pública de partidas.

Ediciones deterministas: común sin brillo si la jugada que define la posición fue del rival; rara sin foil si fue propia; rara foil si además ganó ese encuentro. El color que acaba de mover en el FEN define la autoría de cada carta de catálogo; una formación propia pertenece al color que la armó. El mejor acabado conseguido se conserva. No hay sorteos ni entrega por navegar. Cada primera carta o mejora de edición entra en el sobre de la partida donde se consiguió. Las repetidas sin mejora no generan otro premio.

Una rama con nombre y al menos tres posiciones obtiene su mítica al completar todas sus posiciones catalogadas y registrar una victoria propia con la apertura que la encabeza. Puede ganar antes o después de completar: el premio pertenece a la partida que cumpla el último requisito. Cada rama tiene una sola mítica, independiente de su carta normal. El explorador muestra ambos requisitos.

Al terminar una partida oficial aparece el sobre de aperturas para rasgar con mouse o dedo en ambas direcciones y revelar sus cartas de una en una. Incluye alternativa sin arrastre y sin animación, estados comunes sin efectos, foil y mítica dorada. En el álbum propio, «Mis sobres» recupera también los encuentros anteriores. Los premios deportivos se derivan de las jugadas; no se conceden por la animación.

`album_sobres_aperturas` guarda únicamente si la cuenta abrió el sobre. Su envoltorio es SECURITY INVOKER y la función privada comprueba auth.uid(), jugador verificado y participación en un encuentro del archivo oficial con al menos cuatro medias jugadas. Tabla privada con RLS y sin acceso directo; sin cambios en cuentas, inventarios, figuritas ni recompensas. Apertura idempotente, conservada entre dispositivos. Migración `20261128000053_sobres_aperturas_abiertos.sql`. La prueba en producción se hizo dentro de una transacción revertida.

Pruebas: `node --test tests/album-aperturas.test.cjs tests/recorridos-aperturas.test.cjs tests/sobres-aperturas.test.cjs tests/partidas-publicas.test.cjs`. Cubren todos los recorridos y diagramas del catálogo, identidad sin colisiones, transposiciones, colores, ediciones y mejoras, mítica incompleta/sin victoria/completa, premio antes o después de completar, autorización de sobres, idempotencia y privacidad. Verificación visual en escritorio y 390 px: recorrido Peón de Rey/Siciliana/Najdorf, movimientos por casillas, retroceso, búsqueda, cartas comunes sin foil y revelación dorada. Fonchi: nueve posiciones y formaciones reconocidas en sus cuatro partidas.

## Álbumes visitables y especiales elegidas
Desde el 27/11/2026, por pedido de Agustín, se pueden visitar los álbumes del plantel en `/album?seccion=club#albumes-del-club` y `/album/[jugadorId]`. Cada perfil tiene un acceso. Se muestran sólo las versiones activas obtenidas por el propietario, con sus cantidades, filtros y detalle. Las cartas que todavía no consiguió no se revelan. El encabezado identifica al dueño y permite cambiar entre sus figuritas y sus aperturas; estas últimas enlazan las partidas oficiales públicas.

`albumes_publicos_club` proyecta nombre y foto deportivos, ID público del jugador, progreso y existencias activas. La función privada usa únicamente cuentas verificadas con un vínculo unívoco al plantel. No devuelve UID de acceso, correo, sobres pendientes, propuestas ni reservas; no modifica inventarios ni permisos de intercambio. Se conservan el motor privado y la protección de las cartas no obtenidas del álbum personal.

Las seis nuevas especiales confirmadas en las láminas son: 34 La montaña de Elo (A09), 35 Hipopofonchy (A10), 36 Victornator (A12), 37 Momento histórico (F01), 38 Ludoarte (F07) y 39 Torneo en juego (F08). Usan imágenes existentes seleccionadas por Agustín, sin regenerar rostros. Cada una tiene nueve combinaciones. Total: 39 bases y 351 versiones. Las tres escenas mantienen la fotografía completa, sobre una extensión difuminada de la misma imagen; los retratos de jugadores siguen siendo individuales.

Validación adicional: `tests/album-social.test.cjs` comprueba las proyecciones de visita como anónimo y autenticado, la exclusión de cartas inactivas o no obtenidas y la imposibilidad de leer o alterar las tablas privadas. La revisión local confirmó la búsqueda, la visita a las 14 versiones de Agustín Fuentes, el filtro foil, las aperturas de Fonchi y el tamaño móvil a 390 px.
