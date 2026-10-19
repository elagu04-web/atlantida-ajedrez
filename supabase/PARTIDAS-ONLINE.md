# Partidas entre cuentas

`/jugar/online` permite jugar partidas amistosas a 3+2, 5+3 y 10+3. Se usan las cuentas existentes, tanto Google como usuario y contraseña. Una invitación por creador; vence a los 30 minutos. Las partidas activas y terminadas están disponibles únicamente para los dos participantes. Las invitaciones vigentes muestran el nombre del creador a los usuarios con sesión.

## Autoridad y sincronización

La función `juego-online` verifica el token con Auth en cada petición, rechaza sesiones anónimas y valida todas las jugadas con chess.js 1.4.0 en el servidor. Nunca acepta FEN, relojes, participantes o resultados enviados por el navegador. Solo la función usa la clave service role. No hay permisos de escritura para anon/authenticated en la tabla.

Cada modificación usa una comparación atómica de `version`. Una solicitud repetida usa un UUID idempotente y nunca aplica dos jugadas. Se conserva la última posición confirmada mientras se envía una jugada; una respuesta de red ambigua muestra «Comprobar mi jugada». Supabase Realtime anuncia actualizaciones, con lectura de respaldo cada 6 segundos durante la partida y resincronización al volver a la pestaña o recuperar internet. La sala se actualiza cada 20 segundos.

El reloj se calcula con la hora del servidor y el tiempo transcurrido desde el último movimiento. El incremento solo se concede a una jugada legal recibida antes del vencimiento. Cerrar la página no pausa el reloj. El resultado por tiempo se materializa en el siguiente acceso a la partida, incluso si ambos navegadores estaban cerrados. La pantalla aproxima el reloj con tiempo monotónico y una corrección de ida y vuelta; el servidor decide el resultado. No se compensa latencia de juego ni se ofrece protección antitrampas: es una primera sala amistosa, no un árbitro para torneos oficiales.

Hay mate, ahogado, material insuficiente, rendición, tablas acordadas y tablas automáticas por triple repetición/50 jugadas. Los finales por tiempo comprueban material básico para evitar ganar con rey solo o menor contra rey solo; posiciones excepcionales de mate imposible requieren un árbitro y no usan tablebases. No hay chat, emparejamiento por Elo ni espectadores de partidas activas.

Las partidas terminadas generan PGN con nombres, ritmo y resultado. Se conservan en la cuenta de ambos y aparecen en «Revisar partida» del entrenamiento. No alteran el Elo del club.

## Publicación

- Aplicar `20261019205821_partidas_online.sql` al proyecto existente.
- Publicar `supabase/functions/juego-online/index.ts`, `deno.json` y `../_shared/partidaOnline.ts` con JWT obligatorio. No hacen falta claves nuevas: usa los secretos incorporados de Edge Functions.
- Publicar la interfaz en Vercel.
- Verificar RLS y probar dos cuentas temporales con partida ficticia; eliminar únicamente los datos de esa prueba.

Pruebas: `node --test tests/partidas-online*.test.cjs`. No se modifican las políticas ni las tablas del entrenamiento, torneos o partidas contra bots.
