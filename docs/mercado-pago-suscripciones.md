# Mercado Pago: conexión de las cuotas

Implementación del 3/11/2026. Los cobros quedan deshabilitados hasta configurar y verificar la cuenta receptora. No se realizó ningún cargo real.

## Qué incluye

- Plan Club: $400 UYU al mes. Club + entrenamiento: $550 UYU al mes. Precios calculados en el servidor, nunca enviados como autoridad por el navegador.
- Autorización mensual expresa antes de ir al checkout alojado de Mercado Pago Uruguay. No recibimos números de tarjeta.
- Cada compra está vinculada a un UUID interno, al usuario autenticado y a su jugador confirmado. El correo del pagador puede ser diferente; no se utiliza para decidir quién recibe la membresía.
- Una factura paga concede una sola vigencia en `membresias_privado.periodos`. Reintentos, pagos rechazados y notificaciones repetidas no duplican cuotas.
- Una suscripción `authorized` no es un cobro aprobado. Solo se activa después de consultar la factura y el pago en la API y verificar importe, moneda, cuenta receptora, referencia y ambiente.
- El período comienza en el día de débito de la factura en Uruguay y termina al comenzar la misma fecha del mes siguiente, ajustada al calendario.
- Cancelar desde Mi membresía detiene próximas renovaciones. Conserva los períodos ya pagados. No realiza reembolsos.
- Devoluciones totales y contracargos anulan la vigencia de ese cobro conservando el historial. Una devolución parcial queda registrada, conserva la vigencia y requiere resolver su tratamiento con el club.
- Al regresar del checkout se consulta el estado real. También hay un botón para actualizarlo. La URL de regreso jamás acredita dinero.
- La app docente de $200 sigue como Próximamente; no hay checkout ni acceso nuevo a los juegos privados. El torneo suelto de $150 se coordina por separado. No se cierra la beta de entrenamiento.

## Configurar la cuenta (sin compartir claves por chat)

1. Entrar con la cuenta receptora en [Tus integraciones de Mercado Pago Uruguay](https://www.mercadopago.com.uy/developers/panel/app). Crear o elegir la aplicación de Atlántida Ajedrez con Suscripciones.
2. Configurar notificaciones de `payment`, `subscription_preapproval` y `subscription_authorized_payment` hacia:

   `https://xewtgrrsepjlzwvknkxb.supabase.co/functions/v1/mercadopago-webhook`

   La creación de la suscripción también envía esa URL en `notification_url`. Guardar la clave secreta de firma de Webhooks (es distinta al Access Token).
3. En [Supabase → Edge Functions → Secrets](https://supabase.com/dashboard/project/xewtgrrsepjlzwvknkxb/functions/secrets), guardar directamente:

   | Nombre | Valor |
   |---|---|
   | `MP_ACCESS_TOKEN` | Access Token privado de la aplicación receptora |
   | `MP_WEBHOOK_SECRET` | Clave de firma de Webhooks de esa misma aplicación |
   | `MP_COLLECTOR_ID` | ID numérico del vendedor asociado al token |
   | `MP_PRODUCCION` | `true` para la cuenta productiva verificada |
   | `MP_COBROS_HABILITADOS` | Mantener `false` hasta terminar la verificación; `true` habilita el checkout |

   No poner secretos en variables `NEXT_PUBLIC_`, repositorio, capturas, conversación ni archivos públicos. El servidor ya tiene sus propias credenciales de Supabase; no hay que copiarlas al sitio.
4. Con la cuenta administradora, ir a [Mi membresía](https://atlantida-ajedrez.vercel.app/membresia), abrir «Conexión de cobros · administración» y pulsar «Comprobar conexión». Consulta `/users/me` y exige coincidencia de ID y país MLU. No muestra credenciales ni crea suscripciones.
5. Antes de abrir ventas, completar una prueba de punta a punta con una cuenta compradora de prueba de MP, verificar firma y notificaciones en el panel del proveedor, y confirmar que la mensualidad y fecha son correctas. La interfaz pública queda apagada en modo no productivo: las pruebas automatizadas usan un proveedor simulado y no certifican la configuración de la cuenta comercial. No efectuar cargos reales de prueba automáticamente.
6. Al habilitar ventas, actualizar el anuncio global de Próximamente y confirmar condiciones de inclusión de torneos con Agustín. Activar pagos no instala por sí solo un muro de pago ni cambia las inscripciones existentes.

Los secretos de Edge Functions se aplican sin volver a desplegar. El interruptor de cobros solo frena nuevas adhesiones: no cancela suscripciones que ya están autorizadas. Las renovaciones existentes se cancelan desde la membresía o el panel de Mercado Pago.

## Operación y recuperación

- `membresias-mercadopago` conserva validación JWT del gateway y comprueba el usuario con Auth. Solo permite consultar o cancelar suscripciones de esa cuenta. Tiene límites por usuario.
- `mercadopago-webhook` es público para el proveedor, sin JWT de usuario. Exige HMAC-SHA256 con `x-signature`, `x-request-id` y el `data.id` exacto de la query; comprueba su coincidencia con el cuerpo y consulta recursos por rutas fijas de la API.
- Se conserva la capitalización de `data.id`, según la corrección del SDK oficial #439. No se exige un timestamp fresco para evitar perder reintentos legítimos: los recursos se vuelven a consultar y la DB descarta actualizaciones antiguas.
- Ante fallo al guardar, responde con error para que MP reintente. Las operaciones ya guardadas son idempotentes.
- Si se corta una creación, se conserva la solicitud y se busca su referencia antes de hacer otra. No se repite un POST ambiguo. Si la API no encuentra exactamente una coincidencia, el club debe revisar en MP la referencia interna antes de resolver el caso. No borrar la fila para «probar de nuevo» sin comprobar si existe una autorización.
- «Actualizar estado del pago» consulta hasta 20 facturas por suscripción. Es recuperación manual, no hay cron de conciliación desplegado. Antes de acumular históricos largos, agregar paginación y conciliación programada. El canal normal de renovaciones es el webhook de cada factura.
- No se envían datos de tarjetas ni respuestas completas de MP a logs o clientes. La cuenta ve únicamente su propio resumen.

## Base de datos y verificación

Migración `20261103174553_mercado_pago_suscripciones.sql`: esquema cerrado `pagos_privado`, tablas `suscripciones`, `facturas`, `cobros`, RLS habilitada sin políticas públicas. Esa ausencia es intencional: ningún cliente tiene acceso a las tablas. RPC pública `pagos_mercadopago` SECURITY INVOKER con EXECUTE únicamente para service_role; delega en una función privada con search_path vacío. La función privada privilegiada es necesaria para actualizar también las vigencias, y solo es accesible por el servidor después de sus validaciones.

Se comprobó en producción: tablas con RLS, EXECUTE denegado a anon/authenticated, permitido al servidor, cero compras y cobros de prueba creados. El advisor informa «RLS Enabled No Policy» como INFO para estas tablas cerradas; no se agrega una política permisiva para ocultarlo. [Explicación del diagnóstico](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Pruebas: ACL, cuenta ajena, serialización de creación, precio de servidor, factura única, mes bisiesto, autorización sin pago, rechazo, repetición, estados atrasados, cancelación, devolución, firma falsa, firma con mayúsculas, IDs duplicados, receptor/moneda/monto/ambiente ajenos y retorno de checkout sin acreditar. Se usan PGlite y fetch simulado. Build y lint del sitio incluidos.

## Fuentes oficiales

- [Suscripción con pago pendiente y checkout](https://www.mercadopago.com.uy/developers/es/docs/subscriptions/integration-configuration/subscription-no-associated-plan/pending-payments)
- [Crear suscripción](https://www.mercadopago.com.uy/developers/es/reference/online-payments/subscriptions/create-preapproval/post)
- [Gestión: cancelar con status canceled](https://www.mercadopago.com.uy/developers/es/docs/subscriptions/subscription-management)
- [Notificaciones y firma](https://www.mercadopago.com.uy/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks)
- [Corrección de mayúsculas de firma en SDK oficial](https://github.com/mercadopago/sdk-nodejs/pull/439)
- [Secretos de Supabase](https://supabase.com/docs/guides/functions/secrets)
