# Desafío semanal del caballo

Ruta: `/jugar/caballo`. Todos comienzan en la misma casilla durante la semana. Se admiten intentos repetidos y se conserva solo la mejor marca. Cada lunes a las 00:00 de Uruguay cambia la casilla inicial y comienza una clasificación nueva; las marcas anteriores siguen almacenadas.

Activación: ejecutar `migrations/20261011_reto_caballo.sql` en Supabase y luego `migrations/20261012_records_caballo.sql`. No requiere un cron nuevo. Depende de la identidad de jugador ya instalada mediante `mi_nombre_jugador_desafio()`.

La vista Récords muestra la mejor marca de cada jugador entre todas las semanas y es la vista inicial de la clasificación. Esta semana conserva la competencia con una salida común. El récord personal no se reinicia los lunes; guardar una marca semanal menor que el récord sigue permitido. La migración de récords consulta las marcas anteriores sin modificarlas ni borrarlas.

Las marcas pertenecen a la cuenta autenticada. El servidor valida el recorrido completo: inicio semanal, saltos en L, límites del tablero y ausencia de casillas repetidas. La puntuación se calcula en la base; el cliente no puede escribir en la tabla. La clasificación pública expone el nombre y el identificador del jugador, sin correos ni identificadores de autenticación.

Sin sesión o conexión, el recorrido se conserva en el navegador por cuenta y semana. Una marca solo se presenta como guardada después de recibir confirmación del servidor. El botón Compartir invita a superar una marca; esta versión no tiene partidas simultáneas entre jugadores.

Verificación: `npm test` incluye recorridos legales/ilegales, cambio semanal en Uruguay, aislamiento de cuentas, conservación del historial, récords con empates y pruebas de la migración sobre PostgreSQL mediante PGlite. También se comprobó el tablero en computadora, celulares verticales y horizontales, guardado de 64 casillas y recuperación tras errores de red.
