# Presentación de membresías — 2 de noviembre de 2026

Pedido: una ayuda visual para la web y otra para compartir por WhatsApp, con la estética de Atlántida Ajedrez, beneficios y precios fáciles de entender.

## Estado

Agustín confirmó los precios de las piezas: torneo suelto $150 UYU, Club $400/mes, Club + entrenamiento $550/mes. Se presentan como planes próximos a lanzarse, con consulta y activación coordinada con el club. La publicación no cambia cuotas, precios en inscripciones, restricciones ni registros de pago.

También pidió mostrar el costo por torneo. Ambas piezas explican el ejemplo de cuatro torneos en el mes: Club $100 por torneo y Club + entrenamiento $137,50 por torneo, con entrenamiento incluido. No se presenta ese promedio como una tarifa fija por participación.

## Piezas

- `/membresias`: presentación adaptable, dos planes, beneficios, comparador de uno a cinco torneos y contacto de WhatsApp por plan. Conserva el enlace a la consulta privada de la membresía existente.
- `/membresias/compartir/pantalla`: composición vertical de 1080 × 1440 para exportar a PNG, sin navegación. Comparte precios y nombres con la página en `lib/presentacionMembresias.ts`.
- Los PNG finales están en la carpeta `outputs` del chat: `membresias-web.png` y `membresias-whatsapp.png`. La pieza de WhatsApp también se ofrece como descarga pública en `/imagenes/membresias-whatsapp-20261102.png`.

No se promete biblioteca ni prestaciones pendientes. El entrenamiento actual continúa en prueba gratuita hasta el anuncio de activación. La gestión privada sigue con su propuesta anterior; esta presentación no sincroniza ni altera esa configuración. Se puede acceder a los planes desde una invitación en la portada y el enlace del pie del sitio; el enlace a la membresía privada existente se conserva.

## Validación

TypeScript, ESLint y compilación de producción. Revisión visual de la página y del PNG exportado, comprobación de que el texto entra en sus tarjetas, formato de celular y comparador: un torneo suelto $150 frente a $400 de cuota; cinco torneos $750 frente a $400; cuatro torneos $600 frente a $400. Los botones abren una consulta, no realizan pagos.

Pendiente para el cobro: fijar fecha del lanzamiento y completar la activación de pagos y los controles de beneficios según el trabajo de membresías ya documentado. No se activó débito automático ni se hicieron operaciones de cobro.
