# Acceso con usuario y contraseña

El botón «Iniciar sesión» permite entrar o crear una cuenta sin pedir correo. Quien ya usa Google entra primero con su cuenta y selecciona «Mi acceso» para agregar un usuario y contraseña conservando su UUID y todos sus datos. El nombre de acceso es único e inmutable; la contraseña se puede actualizar desde esa misma pantalla. El nombre del jugador de torneos se sigue eligiendo en el flujo habitual, sin duplicar ni reclamar perfiles automáticamente.

La Edge Function `acceso-usuario` verifica la sesión con Auth antes de configurar un acceso. Las contraseñas las procesa Supabase Auth: no se guardan en tablas propias ni registros. Las cuentas nuevas llevan un identificador interno aleatorio para compatibilidad con las relaciones existentes, sin envío de correos. Los accesos y los contadores están en el esquema privado, con RLS y sin privilegios para `anon` o `authenticated`; solo el servicio puede resolver nombres. Los límites de intentos son persistentes y usan claves HMAC.

Se conservan Google y el acceso anterior por correo. Para recuperar un acceso sin correo se ofrece el contacto del club; todavía no hay recuperación automática ni fusión de cuentas duplicadas. Nunca asignar un usuario a una cuenta basándose únicamente en el nombre de un jugador.

Despliegue: aplicar la migración `acceso_usuario`, publicar la Edge Function con verificación JWT habilitada y publicar el cliente. No hace falta agregar claves privadas a Vercel.

Validación: `node --test tests/acceso-usuario-db.test.cjs` y una cuenta temporal autorizada verificaron alta, contraseña incorrecta, nombres normalizados, ingreso independiente, cambio de contraseña e identidad estable. La misma cuenta completó una partida de 44 medias jugadas en el servidor, sin cliente abierto, y recuperó el análisis en la interfaz de entrenamiento.
