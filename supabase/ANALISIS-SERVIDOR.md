# Análisis de PGN sin mantener la página abierta

Con sesión iniciada, «Mis aperturas → Cargar partidas» permite enviar una partida o un lote de hasta 30 partidas / 2 MB. Hay que esperar el mensaje de recepción antes de cerrar. Los invitados conservan el análisis local y reciben una explicación explícita.

## Recorrido

1. `encolar_entrenamiento_analisis` identifica la cuenta con `auth.uid()`, comprueba los límites y guarda un lote de forma atómica e idempotente. El PGN y las evaluaciones parciales quedan en `atlantida_privado.analisis_datos`; la tabla pública de estados tiene RLS y solo permite consultar las filas propias.
2. `pg_net` despierta la Edge Function `analisis-entrenamiento-dispatch`. La petición solo contiene `{}` y la clave pública del proyecto. El gateway verifica su JWT. La función reclama un trabajo usando su identidad de servicio integrada; no devuelve el PGN ni la credencial del trabajo.
3. El relevo envía una credencial efímera a `/api/entrenamiento/procesar`. Vercel ejecuta el mismo Stockfish 18 del navegador en un proceso Node aislado. La credencial se acepta una sola vez por ejecución y caduca a los 90 segundos. Los rechazos no revelan información de otras cuentas.
4. Se guardan las evaluaciones cada 8 posiciones. Una ejecución trabaja aproximadamente 23 segundos, libera el trabajo y despierta al siguiente. No necesita conservar un token de sesión del usuario.
5. Un cron cada minuto recupera trabajos interrumpidos. Cinco ejecuciones sin avances dejan un error recuperable. Los usuarios pueden detener o retomar su lote; una ejecución antigua no puede publicar resultados después de perder su credencial.
6. La finalización guarda una sesión de entrenamiento usando revisión optimista. Ante una edición concurrente vuelve a unir las notas y prácticas compatibles. El cliente consulta los estados al regresar y sincroniza la biblioteca cuando aparece un resultado nuevo.

## Operación

- El interruptor administrativo está en `atlantida_privado.analisis_config.activo`. `clave_publica` contiene la clave pública heredada del proyecto para el JWT del gateway, nunca una clave de servicio.
- Las credenciales efímeras nunca se almacenan en las tablas de `pg_net`: algunas versiones administradas de la extensión conservan privilegios de su propietario sobre esas tablas.
- La función de servicio se despliega con verificación JWT activada. Sus variables `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` son las integradas de Supabase; no se copian al cliente ni al repositorio.
- El endpoint GET del procesador comprueba que Stockfish puede arrancar y cerrar en ese entorno. No consulta partidas ni genera registros de usuario.
- El empaquetado de Next incluye explícitamente el JS y WASM de Stockfish. No requiere descargar ejecutables ni consultar un proveedor externo de análisis.
- Límites iniciales: 30 partidas pendientes por cuenta, 60 partidas por cuenta en 24 horas y 240 partidas globales en 24 horas. No se modifica el Elo de torneos.
- El avance del trabajo activo es reanudable. El resultado final y las notas se mantienen en los documentos privados de entrenamiento existentes. Cerrar la página antes de la confirmación no garantiza que el lote haya llegado.

## Verificación

`tests/analisis-servidor-db.test.cjs` comprueba aislamiento entre cuentas, imposibilidad de reclamar trabajos desde roles públicos, uso único y vencimiento de credenciales, reanudación de puntos de guardado, cancelaciones y conflictos al guardar. El transporte HTTP del test solo guarda avisos sin credenciales privadas.

`tests/analisis-servidor.test.cjs` comprueba reanudación entre ejecuciones, cancelación, conservación de notas concurrentes y arranque real de Stockfish para ambos colores.
