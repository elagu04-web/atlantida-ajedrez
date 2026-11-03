# Presentación de membresías — 2 de noviembre de 2026

Pedido: una ayuda visual para la web y otra para compartir por WhatsApp, con la estética de Atlántida Ajedrez, beneficios y precios fáciles de entender.

## Estado

Agustín confirmó los precios de las piezas: torneo suelto $150 UYU, Club $400/mes, Club + entrenamiento $550/mes. Se presentan como planes próximos a lanzarse, con consulta y activación coordinada con el club. La publicación no cambia cuotas, precios en inscripciones, restricciones ni registros de pago.

También pidió mostrar el costo por torneo. Ambas piezas explican el ejemplo de cuatro torneos en el mes: Club $100 por torneo y Club + entrenamiento $137,50 por torneo, con entrenamiento incluido. No se presenta ese promedio como una tarifa fija por participación.

## Piezas

Segunda versión del 3/11/2026, a pedido de Agustín para WhatsApp: tres tarifas principales en orden — torneos del mes $400, torneo suelto $150 y torneos con entrenamiento $550 — y debajo la app de juegos para docentes a $200/mes. El cartel «Próximamente» y la pregunta «¿Querés probarla gratis?» pertenecen al bloque docente. La prueba se solicita por WhatsApp; no habilita cuentas ni acceso de forma automática. La página conserva la protección privada de los juegos y el cobro no se activa con esta pieza.

La imagen nueva es /imagenes/membresias-whatsapp-20261103-v2.png, en 1080 × 1350. Las versiones anteriores se conservan.

Actualización del 3/11/2026: Agustín pidió un espacio adicional «Recursos para docentes» a $200 UYU mensuales. Se presenta como opción independiente, con juegos y actividades para las clases; no se le calcula un costo por torneo ni se promete inscripción incluida. Se incorpora en la página, en la invitación de la portada y en las imágenes de WhatsApp e Instagram. La presentación conserva el estado «Próximamente» y no modifica permisos privados de clases ni activa cobros.

Las descargas vigentes se publican con fecha 20261103 para evitar que el navegador reutilice la imagen anterior. Instagram conserva 1080 × 1350; WhatsApp pasa a 1080 × 1620 para dar espacio al bloque docente.

- `/membresias`: presentación adaptable, dos planes, beneficios, comparador de uno a cinco torneos y contacto de WhatsApp por plan. Conserva el enlace a la consulta privada de la membresía existente.
- `/membresias/compartir/pantalla`: composición vertical de 1080 × 1440 para exportar a PNG, sin navegación. Comparte precios y nombres con la página en `lib/presentacionMembresias.ts`.
- Los PNG finales están en la carpeta `outputs` del chat: `membresias-web.png` y `membresias-whatsapp.png`. La pieza de WhatsApp también se ofrece como descarga pública en `/imagenes/membresias-whatsapp-20261102.png`.

No se promete biblioteca ni prestaciones pendientes. El entrenamiento actual continúa en prueba gratuita hasta el anuncio de activación. La gestión privada sigue con su propuesta anterior; esta presentación no sincroniza ni altera esa configuración. Se puede acceder a los planes desde una invitación en la portada y el enlace del pie del sitio; el enlace a la membresía privada existente se conserva.

## Validación

TypeScript, ESLint y compilación de producción. Revisión visual de la página y del PNG exportado, comprobación de que el texto entra en sus tarjetas, formato de celular y comparador: un torneo suelto $150 frente a $400 de cuota; cinco torneos $750 frente a $400; cuatro torneos $600 frente a $400. Los botones abren una consulta, no realizan pagos.

Pendiente para el cobro: fijar fecha del lanzamiento y completar la activación de pagos y los controles de beneficios según el trabajo de membresías ya documentado. No se activó débito automático ni se hicieron operaciones de cobro.
