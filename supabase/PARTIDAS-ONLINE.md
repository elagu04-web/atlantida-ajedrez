# Partidas entre cuentas

`/jugar/online` permite elegir amistosa o por Elo a 3+2, 5+3 y 10+3. Se usan las cuentas existentes, tanto Google como usuario y contraseña. Una invitación por creador; vence a los 30 minutos. Las partidas activas y terminadas están disponibles únicamente para los dos participantes. Las invitaciones vigentes muestran el nombre, la modalidad y el Elo online del creador a los usuarios con sesión.

## Modalidad y Elo online

La modalidad es inmutable después de crear la mesa. Las partidas antiguas sin `porElo` siguen siendo amistosas. Para aceptar una mesa por Elo, el botón lo indica expresamente y la función exige `aceptaElo:true`; clientes antiguos no entran sin esa confirmación.

El Elo online es independiente del Elo de los torneos presenciales. Comienza en 1400, es común a los tres ritmos y se marca provisional hasta completar 10 partidas por Elo. Se usa la expectativa Elo clásica con factor K=32 fijo, resultados 1/0.5/0 y mínimo 100; las variaciones de ambos jugadores son opuestas. Las cancelaciones de invitaciones y las partidas amistosas no alteran perfiles. Una partida por Elo aceptada cuenta si termina por mate, tiempo, rendición o tablas, incluso si aún no hubo movimientos.

El trigger `online_actualizar_elo`, SECURITY INVOKER y ejecutable solo por service_role, liquida los dos perfiles en la misma transacción que cierra la partida. Bloquea los perfiles en orden de UUID y calcula con sus valores vigentes al cierre, para no pisar resultados de otras partidas simultáneas. El resultado conserva antes/después/variación de cada color y los incluye en el PGN. Releer o reintentar un cierre no vuelve a puntuar. Un rollback revierte tanto la partida como los perfiles. Cada usuario solo puede leer su propio perfil agregado; las cifras del rival se comparten dentro de su invitación y sus partidas. No se permite editar ratings desde el cliente.

## Autoridad y sincronización

La función `juego-online` verifica el token con Auth en cada petición, rechaza sesiones anónimas y valida todas las jugadas con chess.js 1.4.0 en el servidor. Nunca acepta FEN, relojes, participantes o resultados enviados por el navegador. Solo la función usa la clave service role. No hay permisos de escritura para anon/authenticated en la tabla.

Cada modificación usa una comparación atómica de `version`. Una solicitud repetida usa un UUID idempotente y nunca aplica dos jugadas. Se conserva la última posición confirmada mientras se envía una jugada; una respuesta de red ambigua muestra «Comprobar mi jugada». Supabase Realtime anuncia actualizaciones, con lectura de respaldo cada 6 segundos durante la partida y resincronización al volver a la pestaña o recuperar internet. La sala se actualiza cada 20 segundos.

El reloj se calcula con la hora del servidor y el tiempo transcurrido desde el último movimiento. El incremento solo se concede a una jugada legal recibida antes del vencimiento. Cerrar la página no pausa el reloj. El resultado por tiempo se materializa en el siguiente acceso a la partida, incluso si ambos navegadores estaban cerrados. La pantalla aproxima el reloj con tiempo monotónico y una corrección de ida y vuelta; el servidor decide el resultado. No se compensa latencia de juego ni se ofrece protección antitrampas: es una primera sala amistosa, no un árbitro para torneos oficiales.

Hay mate, ahogado, material insuficiente, rendición, tablas acordadas y tablas automáticas por triple repetición/50 jugadas. Los finales por tiempo comprueban material básico para evitar ganar con rey solo o menor contra rey solo; posiciones excepcionales de mate imposible requieren un árbitro y no usan tablebases. No hay chat, emparejamiento por Elo ni espectadores de partidas activas.

Las partidas terminadas generan PGN con nombres, ritmo y resultado. Se conservan en la cuenta de ambos y aparecen en «Revisar partida» del entrenamiento. No alteran el Elo del club.

## Publicación

- Aplicar `20261019205821_partidas_online.sql` y `20261019224336_elo_online.sql` al proyecto existente.
- Publicar `supabase/functions/juego-online/index.ts`, `deno.json` y `../_shared/partidaOnline.ts` con JWT obligatorio. No hacen falta claves nuevas: usa los secretos incorporados de Edge Functions.
- Publicar la interfaz en Vercel.
- Verificar RLS y probar dos cuentas temporales con partida ficticia; eliminar únicamente los datos de esa prueba.

Pruebas: `node --test tests/partidas-online*.test.cjs`. No se modifican las políticas ni las tablas del entrenamiento, torneos o partidas contra bots.
