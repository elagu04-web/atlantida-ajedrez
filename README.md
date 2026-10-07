# Atlántida Ajedrez

Sistema de torneos, ranking Elo y transmisión del club. Next.js, React y Supabase.

## Desarrollo

- Configurá NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local. No publiques claves privadas.
- npm install
- npm run dev
- Abrí http://localhost:3000.

## Verificación

- npm test: calendarios, descansos, rondas, empates, finales, Elo y protección de escrituras simultáneas con datos ficticios. No accede a Supabase.
- npm run lint
- npx tsc --noEmit
- npm run build

## Reglas y sincronización

- Descanso en round robin: 0 puntos y 0 partidas. Bye suizo: conserva 1 punto.
- Los calendarios de round robin y match se generan completos; la pantalla sigue la ronda indicada por los resultados reales, no la última del calendario.
- Empates tras aplicar todos los criterios comparten posición. Se conserva la final de desempate propia del club.
- Las listas se sincronizan por Supabase Realtime, con respaldo por consulta cada 5 segundos. No se solapan consultas.
- Un cambio se muestra y registra después de confirmar su escritura. Las actualizaciones comparan el valor anterior de los campos modificados para evitar sobrescribir cambios de otra pantalla.
- No se permite eliminar jugadores que aparecen en calendarios de torneos.

## Permisos

Supabase debe aplicar RLS: ocultar botones en el navegador no concede ni limita permisos en la base de datos. Los módulos escolares se cargan únicamente para el administrador. Las políticas de acceso a datos personales requieren una revisión independiente. La migración de desafíos es aditiva y no cambia las tablas ni políticas existentes del club.

## Ranking y estadísticas

- El puesto del ranking es global; buscar o filtrar no cambia su numeración. Los empates de Elo comparten puesto. Quienes no tienen partidas aparecen sin puesto.
- La forma reciente y el rendimiento usan partidas contra un rival: V + ½ T, dividido entre PJ. Los descansos y byes no inflan estas métricas; conservan sus puntos oficiales en la tabla de torneos.
- Las estadísticas se filtran por mes o año de inicio del torneo. El progreso compara el Elo antes y después del período. El mínimo de partidas limita los destacados para evitar conclusiones con muestras pequeñas.
- Se pueden comparar hasta tres jugadores y descargar los resultados del período en CSV.

## Desafío diario y rachas: activación del servidor

1. Abrí el SQL Editor del proyecto Supabase que usa la aplicación.
2. Ejecutá `supabase/migrations/20261007_desafios_y_rachas.sql` con una sesión administrativa. Es reutilizable y no duplica el trabajo programado.
3. Confirmá que el trabajo `atlantida-desafio-diario` esté activo en Cron. Su horario es `5 * * * *` UTC: el primer intento del día ocurre a las 00:05 de Uruguay; los siguientes reintentan si la fuente falló y no consultan Lichess si ya existe el problema.
4. Abrí `/api/desafio-diario`: la respuesta debe tener la fecha actual de Uruguay, `registrable: true` y dificultad entre 1700 y 1900. La tabla `/desafios#rachas` quedará vacía hasta la primera resolución real.

La base guarda un problema compartido por fecha y evita repetir IDs. La fuente es la [API pública de problemas de Lichess](https://lichess.org/api); la [base de problemas](https://database.lichess.org/#puzzles) se publica bajo CC0. El rating de táctica no equivale a Elo FIDE.

No se requiere una clave privada en Vercel: las funciones SQL controlan las escrituras y comprueban la identidad con `auth.uid()`. Las tablas de resoluciones no se exponen directamente; la clasificación publica únicamente el nombre elegido y sus contadores. Se registra una resolución por cuenta y día, se conserva el récord y una ausencia de un día corta la racha. No es un sistema de arbitraje ni de control de trampas: las pistas y la solución son públicas.

Antes de ejecutar la migración, el servidor ofrece práctica con una selección diaria en caché. Si falla la fuente, muestra un problema de reserva identificado como tal y reintenta desde el navegador cada diez minutos. La práctica de reserva no suma rachas. La selección en caché se hace al recibir una visita; la programación independiente y el archivo persistente requieren activar el SQL anterior.

Para comprobar el cron sin consultar información personal:

```sql
select jobname, schedule, active from cron.job where jobname = 'atlantida-desafio-diario';
select dia, puzzle_id, rating from public.desafios_diarios order by dia desc limit 7;
```
