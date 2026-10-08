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

No se requiere una clave privada en Vercel: las funciones SQL controlan las escrituras y comprueban la identidad con `auth.uid()`. Las tablas de resoluciones no se exponen directamente; la clasificación publica únicamente el nombre visible del jugador y sus contadores. Se registra una resolución por cuenta y día, se conserva el récord y una ausencia de un día o una jugada legal incorrecta corta la racha. Después de un error ese problema no puede sumar, aunque se reinicie el tablero o se resuelva luego. Una resolución ya acreditada no se revoca al practicar de nuevo. No es un sistema de arbitraje ni de control de trampas: las pistas y la solución son públicas.

Antes de ejecutar la migración, el servidor ofrece práctica con una selección diaria en caché. Si falla la fuente, muestra un problema de reserva identificado como tal y reintenta desde el navegador cada diez minutos. La práctica de reserva no suma rachas. La selección en caché se hace al recibir una visita; la programación independiente y el archivo persistente requieren activar el SQL anterior.

Para comprobar el cron sin consultar información personal:

```sql
select jobname, schedule, active from cron.job where jobname = 'atlantida-desafio-diario';
select dia, puzzle_id, rating from public.desafios_diarios order by dia desc limit 7;
```

## Rachas en portada y control del torneo

- La portada muestra hasta cinco jugadores en la tabla de rachas. En racha filtra los días actuales mayores a cero; Récords y Resueltos permiten consultar también el historial. La página /desafios mantiene la clasificación completa. Se actualiza cada 30 segundos y al guardar o fallar el problema.
- La clasificación requiere la migración de desafíos anterior. Si la función aún no existe, se informa que el registro no está habilitado; una caída de conexión se distingue de ese estado.
- Ejecutar `supabase/migrations/20261007_control_torneos.sql` en el SQL Editor para activar pagos y asistencia. La tabla `torneos_control` conserva una fila privada por torneo y sólo permite consultar o guardar con la cuenta administradora, mediante RLS. No altera resultados ni Elo.
- El guardado aplica el valor elegido, consulta el estado actual y compara sólo la lista afectada. Si otra pantalla guardó a la vez, relee y combina el cambio. Una alta simultánea nunca reemplaza un registro existente.
- Las casillas indican Guardando y confirman Pago guardado después de recibir y comprobar la respuesta. Si no hay confirmación, muestran un aviso para reintentar. Pagos y asistencia se cargan desde el registro privado al entrar o recargar.
- Las marcas que antes no llegaron a la base deben volver a ingresarse después de activar el almacenamiento. La migración no inventa pagos anteriores.

## Cuenta y jugador compartidos en rachas y torneos

- La sesión determina la cuenta dueña de la racha. Sin sesión sólo se practica; entrar, salir o cambiar de cuenta empieza un intento nuevo, sin transferir resoluciones ni errores entre cuentas.
- El desafío y la inscripción utilizan el mismo vínculo existente entre el correo de la cuenta y un jugador del club. Si falta, ambos ofrecen el mismo selector «Soy yo». Si el correo tiene varios jugadores, bloquean la selección arbitraria y piden corregirla.
- El desafío muestra «Jugás como» y envía el nombre visible de ese jugador; ya no ofrece un nombre independiente para las rachas.
- Después de activar los desafíos, ejecutar `supabase/migrations/20261007_identidad_rachas.sql` para que el servidor también obtenga el nombre del vínculo y descarte el nombre enviado por el cliente. La firma de la función se conserva para mantener compatibilidad durante el despliegue.
- Esta migración permite nombres repetidos y obtiene el nombre actualizado al consultar la clasificación. Sólo expone nombre y contadores. Una cuenta sin vínculo válido no aparece hasta que lo complete; sus resoluciones anteriores se conservan por `auth.uid()`.
- La migración no modifica los jugadores, torneos, pagos, permisos de inscripción ni la programación del problema diario. Ejecutarla después de la migración de desafíos; no volver a ejecutar la anterior encima de ésta porque restauraría las funciones antiguas.
## Jugadores nuevos desde su cuenta

El selector compartido ofrece «Soy nuevo · Crear mi perfil» y pide nombre y apellido.
La función `crear_mi_jugador` obtiene el correo confirmado de la cuenta, crea el jugador
con Elo inicial 1500 y devuelve su registro confirmado. El usuario no envía un correo
ajeno ni el Elo. Si la cuenta ya tiene un jugador, devuelve ese perfil sin duplicarlo.
Elegir un jugador existente conserva su historial; los nombres iguales de personas
distintas no se usan para vincular automáticamente sus cuentas.

Ejecutar `supabase/migrations/20261008_registro_jugadores.sql` en Supabase para habilitar
el alta. Las funciones de alta, vínculo y desvinculación comparten un bloqueo por
cuenta y no conceden permisos de escritura directa sobre jugadores a los socios.
Mientras se aplica la migración, elegir jugadores existentes conserva compatibilidad
con las políticas anteriores. El alta nueva requiere la función del servidor; no
simula un registro local ni sustituye la validación del servidor.
## Registro Pegasus

- Bluetooth recibe un flujo de tramas DGT. El decodificador conserva notificaciones fragmentadas y procesa varias tramas en una notificación, respetando la longitud de cabecera.
- Escrituras y lecturas GATT se serializan. Las solicitudes de foto se agrupan; el respaldo se pide cada dos segundos. Desconexión, error de preparación y vencimiento del intento limpian temporizadores y listeners.
- El registro sigue la ocupación física completa y los apoyos. Una captura no se registra sólo por levantar la atacante. Una transición completa observada puede confirmarse al empezar el turno siguiente, conservando los eventos posteriores: las jugadas rápidas no se funden en una sola foto.
- Una foto de 64 casillas repara eventos perdidos incluso con un movimiento en curso. No se reconstruyen combinaciones arbitrarias de varias jugadas desde una foto. Capturas ambiguas y coronaciones piden confirmación.
- Conexión y reconexión exigen verificar las piezas. Si la torre se mueve primero y puede ser un enroque, se espera al rey o a la confirmación de la jugada de torre; se recomienda mover primero el rey.
- Cada jugada se conserva en un borrador local, separado por cuenta y mesa. Al recargar se valida y recupera el PGN completo, comparándolo con el estado del canal. Nueva partida y edición de posición archivan el tramo anterior, con hasta diez copias en ese navegador.
- Las publicaciones se serializan, coalescen estados intermedios y reintentan cuando vuelve la conexión. Se compara actualizado_en antes de escribir para detectar otra pantalla. Apagar la transmisión conserva PGN y resultado. Las confirmaciones se muestran después de la respuesta de la base.
- Agregar una jugada legal y deshacer preservan el historial. La edición libre de FEN inicia un tramo nuevo; su aviso y la copia anterior evitan presentar ese tramo como una partida íntegra.
- La prueba local en /transmitir usa el mismo registro sin Bluetooth, sesión administrativa ni publicaciones. No sustituye una prueba con el dispositivo real. Para publicar se mantiene el permiso de administrador y hace falta que exista el canal transmision en Supabase.
- Descargar diagnóstico conserva en un JSON local los últimos 2000 eventos de casillas, fotos completas, conexiones y desconexiones, junto con el PGN. Permite revisar un fallo real sin enviar esos datos automáticamente.

Fuentes contrastadas: [DGT Pegasus y calibración](https://www.digitalgametechnology.com/products/home-use-e-boards/dgt-pegasus), [Web Bluetooth de Chrome](https://developer.chrome.com/docs/capabilities/bluetooth), [referencia de comandos Pegasus](https://github.com/EdNekebno/PegasusChessComChromeExtension).
