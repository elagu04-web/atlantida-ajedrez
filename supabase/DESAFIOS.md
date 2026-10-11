# Desafíos diarios progresivos

Activar una vez en el SQL Editor de Supabase: ejecutar completa la migración 20261011_desafios_progresivos.sql. Requiere las migraciones anteriores de desafíos e identidad. La aplicación mantiene compatibilidad con los problemas antiguos hasta la activación.

El mismo desafío se comparte entre todos y queda fijo durante todo el día de Uruguay. El trabajo existente lo crea automáticamente a las 00:05; la primera visita también lo crea si aún falta. La migración conserva el problema actual y los resultados anteriores.

Al crear un día nuevo, el servidor calcula la mayor racha de resoluciones sin errores que terminó ayer. Con 0 o 1 día resuelto el objetivo es 1800; con 2 es 1850 (tercer día); con 3 es 1900. Fórmula: 1800 + 50 × max(racha de ayer − 1, 0). Un error o un día sin resolver interrumpe esa racha. Si todos la pierden, el objetivo del siguiente día vuelve a 1800. Se conserva el récord personal y no se usan los récords antiguos para elevar el nivel.

El banco privado contiene 2.437 problemas del [archivo oficial de Lichess](https://database.lichess.org/#puzzles), publicado bajo CC0. Se verificaron con chess.js el movimiento previo del rival, la posición inicial y toda la solución. La selección usa el tramo de 50 puntos más cercano al objetivo; la interfaz muestra el rating real del problema y el objetivo. Los ratings no se modifican ni se inventan. Si el objetivo supera el catálogo disponible, se utiliza el tramo más cercano que exista.

Evita repetir problemas en un tramo hasta agotarlo y luego reutiliza el menos reciente. El cron conserva su nombre para no duplicarse. Las cuentas públicas no pueden modificar el banco, el objetivo ni la selección. La solución sigue registrándose con la identidad de la cuenta y la validación del servidor.

Validación: pruebas de conversión de todos los problemas, compilación y comprobación de las funciones PostgreSQL con PGlite aislado (21 casos: subida, fallos, días salteados, líder alternativo, reinicio, inmutabilidad, repetición, permisos y registro).
