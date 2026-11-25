# Álbum del club
Ruta: `/album`. Edición inicial: 24 jugadores con retrato individual y 8 figuritas de campeones. Cada una tiene versión normal, foil y full art: 32 figuritas, 96 versiones coleccionables. El catálogo es público; cada colección es privada.

## Sobres por actividad
- Bienvenida: 6 figuritas una sola vez. Incluye el propio jugador normal si está en esta edición.
- Torneo presencial finalizado: 6, con al menos una partida registrada entre dos jugadores. No alcanza con anotarse o recibir un BYE.
- Torneo online finalizado: 6, con participación efectiva en una mesa con resultado confirmado.
- Victoria online: 3, en una partida terminada entre dos cuentas distintas, con al menos cuatro medias jugadas. No cuentan tablas, mesas anuladas ni partidas sin jugar.
- Desafío diario: 3, por resolución oficial sin errores ni pistas.
- Se reconocen actividades desde el 24/11/2026. Los torneos online que empezaron antes y terminan después también cuentan.
- El servidor comprueba cada actividad. La misma clave de recompensa nunca entrega dos veces. No hay venta de sobres ni un sobre gratuito por entrar cada día.

La rareza se sortea primero: común 70%, rara 25%, mítica 5%. Luego se sortea la versión, de forma independiente: normal 80%, foil 15%, full art 5%. Dentro de cada combinación se elige uniformemente entre las figuritas activas. La figurita propia garantizada de bienvenida es una excepción explícita al sorteo.

El resultado se guarda antes de mostrar la animación. Rasgar el sobre y dar vuelta cada carta son efectos visuales: recargar no permite cambiar lo obtenido. Se puede omitir la animación y se respeta movimiento reducido.

## Intercambios
Hay que activar «Compartir mis repetidas». Otros participantes de la mesa ven sólo el nombre público y las copias disponibles, sin correos ni la colección completa. Cada versión tiene existencias independientes.

Una propuesta ofrece una copia por otra; se reserva la copia ofrecida. El receptor acepta o rechaza; el emisor puede cancelar antes. Ambas entregas se ejecutan en una transacción y nunca se entrega la última copia de una versión. Los reintentos son idempotentes.

Límites: 5 propuestas salientes, 10 entrantes por receptor y una pendiente por pareja. Caducan a los 7 días. Desactivar los intercambios cancela los pendientes. El historial conserva todos los cambios y la interfaz muestra las últimas 60 propuestas.

## Catálogo ampliable y retratos
El administrador puede abrir «Gestión del álbum» e incorporar jugadores que ya tengan una foto en su perfil. El servidor vuelve a comprobar el permiso y la existencia de la foto. Cada incorporación añade el siguiente número y las tres versiones, sin desplegar código.

Usar retratos individuales recortados; no fotos con dos personas. El catálogo conserva su propia foto para que un cambio del perfil no introduzca a otro jugador en una figurita existente. La edición inicial usa los recortes del club en `public/imagenes/retratos`.

`lib/albumCatalogo.json` es la base inicial que permite mostrar el álbum mientras se consulta el catálogo público remoto. La base de datos es la autoridad para incorporaciones. No reutilizar identificadores ni números activos.

El prototipo inicial incluía figuritas sin foto. Sus copias permanecen guardadas internamente, pero se retiran de la selección y de los intercambios. Si el administrador incorpora al jugador al cargarle una foto, su identificador se reactiva y recupera esas copias. No se borraron sobres ni inventarios durante este ajuste.

## Persistencia y autorización
Tablas en `album_privado`: catálogo, perfiles, inventario, sobres e intercambios, con RLS y sin acceso directo de clientes. `public.album_club` es un envoltorio SECURITY INVOKER de un motor privado que comprueba la cuenta real y su jugador vinculado. El catálogo tiene un RPC de lectura pública que devuelve sólo nombres, números, fotos y atributos del coleccionable.

Los movimientos se serializan por cuenta; un intercambio bloquea ambas cuentas en orden de UUID y comprueba de nuevo las reservas. Las claves de sobre y los UUID de propuesta evitan entregas duplicadas. Los avisos informativos de RLS sin políticas son intencionales en estas tablas privadas: el acceso directo queda denegado.

## Validación
`node --test tests/album-club.test.cjs tests/rpc-cuenta.test.cjs`

Postgres/PGlite verifica autorización, privacidad, sobres y recompensas idempotentes, límites exactos de rareza y acabado, participación real, victorias de ambos colores y roles, desafíos fallidos, reservas, última copia por versión, aceptación doble, caducidad, falta de existencias e incorporaciones sólo por administrador. También comprueba que todos los retratos iniciales existan.

## Recurso de Bruno
Recorte guardado en `public/imagenes/retratos/bruno-album-transparente.webp`, generado con la herramienta integrada imagegen a partir de la foto facilitada para la noticia de Espacio Minga. Prompt: extraer sólo a Bruno en primer plano, conservar identidad, cabello, expresión, ropa, postura, brazos y ajedrez; eliminar por completo al otro jugador, la pared y las sillas; fondo transparente; sin texto ni estilización. Se conserva la fotografía original de la noticia.
