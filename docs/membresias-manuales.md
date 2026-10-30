# Membresías: primera versión de gestión

30 de octubre de 2026. Modelo elegido por Agustín: cuota mensual con torneos incluidos y opciones de entrenamiento.

## Qué funciona

- `/gestion/membresias`: administrador del club. Comparador y propuesta privada, cuotas recibidas, bonificaciones, renovación, historial, anulaciones con motivo, filtros y vínculo de periodos pendientes a una cuenta confirmada.
- `/membresia`: cada persona consulta únicamente sus periodos y beneficios registrados, con las mismas cuentas de Google o acceso interno.
- Tres planes: Club (torneos habituales), Club + entrenamiento, Entrenamiento (sin torneos). El alcance comercial definitivo sigue pendiente de confirmar.
- Los pagos son registros manuales de dinero que el administrador confirmó haber recibido. No hay cobro ni débito de Mercado Pago. Una bonificación tiene importe cero y no se contabiliza como efectivo recibido.

## Propuesta editable, todavía sin publicar

Importes en UYU: torneo suelto $200, Club $500/mes, Club + entrenamiento $750/mes, entrenamiento solo $300/mes. Son valores iniciales de un simulador privado, no tarifas aprobadas ni aplicadas.

Quien juega cuatro torneos hoy gasta $400. Con el nuevo precio suelto propuesto gastaría $800 y con Club $500: paga $100 más que hoy y $300 menos que con cuatro entradas al nuevo precio. No presentar esos $300 como ahorro sobre el gasto actual. Un mes de cinco torneos puede ser más atractivo; para una sola participación puede convenir pagar suelto. Medir costos del lugar, premios, tiempo de enseñanza, costos de motor y cobro antes de decidir precio final.

## Vigencias y registro

Importes enteros en centavos. Fechas civiles de Montevideo: `desde` inclusivo, `hasta` exclusivo (fecha de renovación). Meses calendario con ajuste al último día del mes. Una renovación que comparte beneficios comienza al finalizar los periodos ya abonados, sin perder días. Club y entrenamiento pueden tener periodos independientes. Un cambio a un plan que comparte beneficios se programa después de esos periodos; no hay prorrateo ni cambio inmediato de plan en esta entrega.

UUID de operación conserva el mismo registro al reintentar; un mismo UUID con datos diferentes se rechaza. Bloqueo transaccional por jugador para evitar solapamientos en renovaciones simultáneas. Anular conserva importe, fechas, actor, fecha y motivo originales; no emite un reembolso. Registrar una propuesta nueva no modifica cuotas anteriores.

Los periodos quedan a nombre de un jugador y, si ya tiene una cuenta confirmada y vínculo único, al ID estable de esa cuenta. Si no existe cuenta, quedan pendientes: reclamar un jugador después no otorga automáticamente beneficios pagados. El administrador debe pulsar «Vincular cuenta». El correo no se recibe del cliente para asignar beneficios. Cambiar el correo o agregar usuario y contraseña no cambia la titularidad de un periodo ya vinculado.

## Seguridad

Tablas en `membresias_privado`, con RLS habilitada y sin permisos directos para `anon` ni `authenticated`. Las funciones privadas que gestionan dinero y vigencia comprueban el UUID de administrador; la consulta propia comprueba `auth.uid()` y filtra por ese ID. Ambas rechazan una cuenta distinta de `p_usuario`. Las envolturas públicas son `security invoker`, solo para usuarios autenticados. No se usan metadatos editables para autorización ni claves de servicio en el navegador. No se cambian permisos del resto del sitio.

Pruebas PGlite de privacidad, permisos, duplicación, entradas inválidas, renovación y febrero bisiesto, correcciones, precios y asociación explícita de cuentas. No se cargan cuotas reales ni usuarios ficticios en producción para la prueba de esta entrega.

## Pendiente para lanzamiento comercial

Confirmar precios y beneficios, qué torneos son habituales o especiales, condiciones de cancelación y devolución y fecha de lanzamiento. Después integrar un precio calculado por el servidor y fijado en cada inscripción, respetando el premio existente de «próximo torneo gratis». Esta entrega conserva ese premio y no cambia los $100 actuales, pagos ya marcados, ni entrenamiento en beta.

La gestión guarda vigencias, pero aún no restringe entrenamiento ni marca automáticamente inscripciones como incluidas. Antes de vender el plan hay que completar esa conexión y anunciar las condiciones. Las partidas y el progreso del usuario se conservan cuando venza su membresía.

Mercado Pago se conecta después: pedido interno + notificación verificada + consulta del pago al proveedor + activación idempotente. No confiar en URL de retorno ni captura de comprobante como acreditación automática. Comisiones y plazos se consultan en la cuenta real al activar; no hay una tasa asumida.

Documentación: https://www.mercadopago.com.uy/developers/es/docs/subscriptions/overview
