# Partidas guardadas en los perfiles

Cada ficha de jugador incorpora un archivo de partidas oficiales online, con acceso directo desde la cabecera. La consulta es genérica por ID del jugador: sirve para todo el plantel y las nuevas partidas aparecen al consultar la ficha, sin copiar registros ni añadir jugadores a una lista manual. La lista tiene páginas de doce encuentros, rival enlazado, color, fecha de Uruguay, resultado y torneo.

`/partidas/[id]?jugador=[id del perfil]` abre un visor público con origen y destino resaltados, flechas, teclado, reproducción, giro, tamaño ajustable, lista de jugadas y descarga de PGN. Se puede volver al perfil de origen. Los resultados confirmados sin movimientos se identifican como tales: no se inventa una secuencia.

## Datos públicos y privacidad

`public.partidas_publicas_jugador` y `public.partida_publica_club` son envoltorios SECURITY INVOKER de dos consultas de lectura en `partidas_publicas_privado`. Esa proyección usa exclusivamente el registro oficial `partidas_club_online` y sólo incorpora movimientos de mesas terminadas por Elo. Si un resultado oficial fue cargado sin mesa, se devuelve únicamente el resultado.

La tabla `online_partidas` mantiene sus permisos y RLS. No se publica su estado completo, las cuentas Auth, correo, coordinación, relojes ni el PGN original. Amistosas, prácticas contra bots, partidas activas, canceladas y mesas sin resultado oficial quedan fuera del archivo. La vista interna no tiene SELECT para anon/authenticated; las funciones privadas autorizadas devuelven sólo la proyección deportiva. Los envoltorios admiten visitantes porque las partidas oficiales se muestran en perfiles públicos.

El navegador reconstruye y valida las jugadas UCI con chess.js. El PGN descargado se genera con nombres públicos del plantel, resultado oficial, fecha, torneo y ritmo; no reutiliza encabezados o comentarios privados. La repetición nunca modifica el juego, el resultado ni el Elo.

## Verificación

`node --test tests/partidas-publicas.test.cjs`

Postgres/PGlite comprueba visitantes y usuarios autenticados, paginación, ambos colores, exclusión de mesas activas/canceladas/amistosas, ausencia de datos privados y denegación de lectura directa. Las pruebas del PGN comprueban movimientos legales, nombres, resultado y falta de jugadas. Además se reconstruyeron las 24 secuencias oficiales existentes al publicar, y se verificó el recorrido perfil → partida → perfil y los controles del visor en escritorio y 390×844.

Referencias: [funciones de base de datos y permisos](https://supabase.com/docs/guides/database/functions). Se revisó también el changelog vigente antes de crear los RPC; no se cambió la autenticación ni se actualizó el cliente Supabase.
