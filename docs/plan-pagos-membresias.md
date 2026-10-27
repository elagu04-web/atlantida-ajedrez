# Pagos y membresías de Atlántida: propuesta de implementación

Estado: plan para revisión, 27 de octubre de 2026. No activa precios, restricciones ni cobros. Prioridad posterior a libres de torneos y curso desde cero.

## Propuesta para empezar

Mantener gratuito el curso desde cero, noticias, resultados, ranking, desafío diario y partidas sociales. Separar dos productos que pueden comprarse juntos:

| Producto | Qué recibe la persona | Forma inicial de cobro |
| --- | --- | --- |
| Socio del club | Beneficios presenciales y tarifa de socio en torneos. La biblioteca se incorpora cuando tenga catálogo y préstamos listos. | Cuota mensual registrada por el administrador. |
| Entrenamiento | Análisis de sus partidas, aperturas, finales, plan personal y repasos. Acceso también para público general. | Mensualidad; beneficio o descuento para socios, por definir. |
| Inscripción a un torneo | Una participación concreta, con precio de socio o general. | Efectivo, transferencia o Mercado Pago, ligado al torneo. |

No confundir iniciar sesión con ser socio. La misma cuenta de Google o acceso interno conserva las partidas y el progreso al pagar, cancelar o vencer una membresía.

La referencia anterior del club fue $100 por torneo: confirmar si sigue vigente antes de configurar precios. Propuesta a evaluar: conservar esa tarifa para socios y ofrecer una tarifa general mayor; no publicar ni aplicar la diferencia hasta fijar ambas. Definir la cuota por el valor real de los beneficios y el costo de análisis en servidor, no solo por el descuento de inscripción. Medir usuarios activos, costo de análisis por usuario y asistencia antes de fijar límites y precios finales.

## Primera entrega: cobro y activación manual

1. Panel privado «Socios y cobros»: buscar una cuenta/jugador, ver plan, vigencia y pagos. Filtros «vigentes», «vencen pronto» y «pendientes».
2. Registrar un cobro: concepto, moneda UYU, importe, medio, referencia, fecha y administrador que lo confirmó. Un comprobante presentado por el usuario queda pendiente hasta revisarlo.
3. Otorgar acceso desde una fecha hasta otra. Renovar desde el vencimiento vigente si aún está activo; desde hoy si ya venció. Los meses son meses de calendario, ajustando el último día de febrero u otros meses cortos, sin convertirlos en 30 días arbitrarios.
4. «Mi membresía» para el usuario: beneficios, vigencia, instrucciones para renovar e historial propio. Sin publicar datos de pagos ajenos.
5. Anotarse a un torneo muestra el precio exacto y el motivo: socio, general o premio. El precio se fija en la inscripción; cambiar una tarifa luego no modifica inscripciones anteriores.
6. El premio ya existente de «ganaste un torneo: tu próxima participación es gratis» sigue siendo una bonificación. No se registra como dinero recibido y no equivale a una cuota mensual pagada. Cancelar antes de consumirlo lo devuelve según la regla actual.
7. Vencer no borra progreso ni partidas. Se conserva consulta y exportación de lo propio; las nuevas acciones pagas se controlan en el servidor. El periodo gratuito actual termina solo cuando se anuncie una fecha y condiciones claras.

La primera entrega puede funcionar sin débitos automáticos: el administrador confirma dinero realmente recibido. No cerrar la beta hasta probar renovaciones, vencimientos, cancelaciones y recuperación de acceso.

## Segunda entrega: Mercado Pago

La documentación de Uruguay ofrece Link de pago/QR y API de Suscripciones. Empezar por pagos puntuales permite vender un mes sin crear una renovación automática; incorporar débito mensual después de validar la cuenta de cobro y los medios habilitados. Verificar las comisiones y plazos que Mercado Pago muestre para esa cuenta antes de calcular el ingreso neto; no dar una comisión fija por supuesta.

Flujo: cuenta autenticada → pedido interno con precio calculado en servidor → pago en Mercado Pago → notificación verificada → consulta del pago al proveedor → activar periodo una sola vez → mostrar confirmación. La URL de retorno o una captura de pantalla no acreditan el pago.

Para suscripciones automáticas, informar frecuencia, importe, renovación y cancelación antes de adherir. Registrar la aprobación de cada cobro; una suscripción autorizada no equivale a una mensualidad ya cobrada. Al cancelar se detienen futuras renovaciones y se mantiene el periodo ya abonado según las condiciones acordadas. Gestionar reembolsos y contracargos como eventos separados y no borrar el historial.

## Modelo técnico listo para desarrollar

- `planes`: código, nombre, moneda, precio, beneficios y versión de condiciones. Configuración por administrador.
- `membresias`: usuario, jugador opcional, plan, comienzo, vencimiento, estado y origen manual/proveedor. No inferir el usuario por el email enviado en un webhook.
- `pedidos`: usuario, concepto, torneo opcional, versión del precio, importe, moneda y estado pendiente/aprobado/rechazado/cancelado/reembolsado. Vinculación estable al ID interno.
- `pagos`: pedido, ID único de proveedor o referencia manual, monto confirmado, fecha y medio. Las referencias manuales y las activaciones tienen claves de idempotencia para no duplicarse al pulsar dos veces.
- `eventos_cobro`: registro privado de notificaciones, confirmaciones y correcciones. Fecha, actor y motivo; sin datos de tarjeta.
- `bonificaciones`: referencia al premio de torneo existente, sin inventar una entrada de efectivo.
- Operaciones de administrador y cambios de acceso con autorización en base de datos. Lectura del usuario limitada a su propia cuenta por RLS. Nadie activa su plan editando localStorage o metadatos de perfil.
- Cálculo de precio, vigencia y límites en servidor; políticas de recursos también para análisis que corre con la página cerrada. Las credenciales de Mercado Pago se guardan como secretos del servidor.
- Webhook con verificación de firma; consulta autenticada al proveedor para comprobar destinatario, estado, moneda, monto y referencia del pedido. Eventos repetidos o desordenados no renuevan dos veces ni retroceden un pago confirmado por una notificación antigua.
- Conciliación periódica de pendientes y pagos: un webhook perdido no deja al usuario bloqueado para siempre.

## Pruebas para habilitarlo

Pago manual y renovación anticipada; vencimiento al terminar el periodo; compra con dos pestañas; pago duplicado; pago rechazado; notificación repetida o sin firma válida; retorno del checkout sin cobro; devolución; cancelación de suscripción; socio que compra un torneo; campeón con torneo gratis; usuario con Google y acceso interno a la misma cuenta; pérdida de conexión; privacidad de cobros entre usuarios. Primero en entorno de prueba y sin cargos reales.

## Decisiones para la puesta en marcha

Precio de socio/general por torneo, cuota del club, precio de entrenamiento, beneficio del socio en entrenamiento, vigencia y periodo de gracia, límites de análisis, cuenta de Mercado Pago receptora, condiciones de cancelación y devolución, fecha del fin de beta y disponibilidad de comprobantes/facturación. Se fijan con el club antes de activar cobros.

## Fuentes oficiales consultadas

- https://www.mercadopago.com.uy/developers/es/docs/getting-started
- https://www.mercadopago.com.uy/developers/es/docs/subscriptions/overview
- https://www.mercadopago.com.uy/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks?scope=prod
