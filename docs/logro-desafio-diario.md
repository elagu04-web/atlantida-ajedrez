# Confirmación visible del desafío diario

Al completar la secuencia aparece un panel de logro junto al tablero, tanto en la portada como en Desafíos. La pantalla ampliada usa todo el ancho para el aviso y ajusta el tablero a la altura disponible.

Si la cuenta ya tiene el desafío de hoy guardado, la consulta existente `mi_desafio_resuelto` recupera ese estado y el aviso reaparece al entrar, recargar o volver a la pestaña. La consulta fija el token de la cuenta mediante `rpcDeCuenta`, se cancela al salir y sólo se aplica al día actual de Uruguay. No se cambió el esquema ni se añadieron permisos.

Resolver después de un error muestra que se completó en práctica; no devuelve la racha. El texto de guardado sólo aparece tras confirmación del servidor. El botón «Volver a practicar» permite repetir sin duplicar puntos.

Verificación: resolución real del problema en modo anónimo local, aviso visible y botón de práctica. Pruebas PostgreSQL de registro y recuperación del logro por cuenta, cambio de usuario sin heredar la resolución; pruebas del cálculo de cartas especiales, TypeScript, ESLint y compilación de producción.
