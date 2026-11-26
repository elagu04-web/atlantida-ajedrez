# Partidas guardadas en los perfiles

Cada ficha de jugador incorpora un archivo de partidas oficiales online con movimientos guardados (entre 1 y 2000 medias jugadas), con acceso directo desde la cabecera. La consulta es genérica por ID del jugador: sirve para todo el plantel y las nuevas partidas aparecen al consultar la ficha, sin copiar registros ni añadir jugadores a una lista manual. La lista tiene páginas de doce encuentros, rival enlazado, color, fecha de Uruguay, resultado y torneo. Los resultados sin movimientos permanecen en el historial deportivo y el Elo, pero no aparecen en esta lista de repaso ni tienen enlaces desde la tabla general.

`/partidas/[id]?jugador=[id del perfil]` abre un visor público con origen y destino resaltados, flechas, teclado, reproducción, giro, tamaño ajustable, lista de jugadas y descarga de PGN. Se puede volver al perfil de origen o usar «Anterior» y «Siguiente» para pasar a otra partida de ese mismo jugador. La navegación consulta todo su archivo, incluso entre páginas, ordenado por fecha y UUID descendentes. Conserva el perfil al cambiar de partida y deshabilita las direcciones que no tienen otro encuentro. `public.navegacion_partidas_jugador` devuelve sólo posición, total y los dos IDs adyacentes; excluye los resultados sin jugadas y rechaza asociaciones de otro jugador. Un enlace antiguo a un resultado sin movimientos sigue identificándolo como tal: no se inventa una secuencia.

## Datos públicos y privacidad

`public.partidas_publicas_jugador` y `public.partida_publica_club` son envoltorios SECURITY INVOKER de dos consultas de lectura en `partidas_publicas_privado`. Esa proyección usa exclusivamente el registro oficial `partidas_club_online` y sólo incorpora movimientos de mesas terminadas por Elo. Si un resultado oficial fue cargado sin mesa, se devuelve únicamente el resultado.

La tabla `online_partidas` mantiene sus permisos y RLS. No se publica su estado completo, las cuentas Auth, correo, coordinación, relojes ni el PGN original. Amistosas, prácticas contra bots, partidas activas, canceladas y mesas sin resultado oficial quedan fuera del archivo. La vista interna no tiene SELECT para anon/authenticated; las funciones privadas autorizadas devuelven sólo la proyección deportiva. Los envoltorios admiten visitantes porque las partidas oficiales se muestran en perfiles públicos.

El navegador reconstruye y valida las jugadas UCI con chess.js. El PGN descargado se genera con nombres públicos del plantel, resultado oficial, fecha, torneo y ritmo; no reutiliza encabezados o comentarios privados. La repetición nunca modifica el juego, el resultado ni el Elo.

## Verificación

`node --test tests/partidas-publicas.test.cjs`

Postgres/PGlite comprueba visitantes y usuarios autenticados, paginación, ambos colores, exclusión de mesas activas/canceladas/amistosas, ausencia de datos privados y denegación de lectura directa. Las pruebas del PGN comprueban movimientos legales, nombres, resultado y falta de jugadas. Además se reconstruyeron las 24 secuencias oficiales existentes al publicar, y se verificó el recorrido perfil → partida → perfil y los controles del visor en escritorio y 390×844.

Referencias: [funciones de base de datos y permisos](https://supabase.com/docs/guides/database/functions). Se revisó también el changelog vigente antes de crear los RPC; no se cambió la autenticación ni se actualizó el cliente Supabase.

## Datos disponibles para estadísticas

Con las jugadas legales pueden derivarse primeras jugadas y repertorio, cantidad de movimientos, capturas, jaques, promociones, enroque y material de las posiciones finales. Combinadas con los resultados oficiales permiten rendimiento por color, rival y ritmo. Para asignar nombres y códigos ECO precisos hace falta una base de aperturas; la primera jugada sola no alcanza para identificar una variante.

Precisión, errores, mejores alternativas y cambios de evaluación requieren analizar las posiciones con el motor y guardar profundidad y criterios del análisis. No pueden deducirse sólo del resultado ni del número de capturas. Los movimientos actuales no incluyen tiempos individuales: para estadísticas de apuros de reloj o segundos por jugada hay que empezar a conservar esos datos.

Estas estadísticas de juego deben informar el tamaño de la muestra reproducible, sin sustituir los totales deportivos y el Elo, que incluyen resultados oficiales sin movimientos. Este cambio implementa el filtro y la navegación; no añade todavía estos nuevos paneles de estadísticas.
