# Accesos manuales por cuenta

Entrega del 3/11/2026. No necesita Mercado Pago. Ubicación: [Socios y membresías](https://atlantida-ajedrez.vercel.app/gestion/membresias), primer panel «Accesos por cuenta».

## Uso por Agustín

1. La persona se registra con Google, correo o usuario interno. No necesita figurar como jugador en el ranking para usar la app docente.
2. Buscar su nombre o correo y pulsar «Gestionar acceso».
3. Elegir Entrenamiento personal, Juegos para docentes o ambos. Indicar inicio y vencimiento, con nota privada opcional.
4. Revisar y confirmar. La autorización se guarda en su cuenta y sirve en celular y computadora. No cobra ni declara recibido dinero.
5. Para renovar, crear una nueva habilitación con la vigencia deseada. La sugerencia inicial es un mes desde hoy. Si todavía tiene días vigentes, usar su vencimiento actual como inicio del nuevo período y «Un mes desde el inicio»; revisar fechas y recursos antes de confirmar.
6. Para terminar una habilitación antes de fecha, usar «Dar de baja» con motivo. El registro queda en el historial. Si hay otra habilitación o cuota vigente para ese recurso, ese otro beneficio sigue valiendo.

Los pagos recibidos se registran en el formulario de cuotas existente. Un período vigente de Club + entrenamiento o Entrenamiento habilita automáticamente el entrenamiento, independientemente de si se confirmó en efectivo, transferencia, Mercado Pago o bonificación. Club por sí solo no incluye entrenamiento. Ningún plan de torneos habilita automáticamente los juegos docentes.

## Prueba abierta

Se conserva inicialmente la prueba gratuita de entrenamiento. No se cerró ni se habilitó a terceros durante la implementación.

El botón «Cerrar la prueba abierta» pide confirmación y cambia la política del entrenamiento para todos. Antes de usarlo, habilitar a quienes deben continuar. Se puede reabrir. La cuenta administradora conserva acceso a ambos recursos. Los juegos docentes siempre requieren una autorización individual vigente.

## Qué ve la persona

«Mi membresía» muestra sus accesos y fechas con enlaces a Entrenar y Mis juegos. Los docentes habilitados tienen un acceso directo en la navegación. Si no tiene permiso se ofrece iniciar sesión o consultar al club. Hay un botón para actualizar el acceso después de que el administrador lo habilita.

Los cambios se comprueban al abrir, volver al navegador y cada minuto en pestaña visible. El servidor consulta la vigencia en cada descarga protegida y cada nueva operación protegida; no usa permisos editables en localStorage ni user_metadata. Las URLs firmadas existentes del modelo de voz duran como máximo 60 segundos.

## Seguridad y datos

- `membresias_privado.accesos` guarda concesiones con recursos, fechas, nota privada, actor e historial de bajas. `acceso_config` conserva el modo de prueba y revisión para evitar cambios de pestañas atrasadas. RLS sin políticas y sin grants de tabla a clientes, intencionalmente cerradas.
- RPC pública de administración SECURITY INVOKER → función privada SECURITY DEFINER, con `search_path=''`, validación de `auth.uid()`, identidad administradora fija y rechazo de usuarios anónimos. Solo ese administrador puede enumerar cuentas o conceder/bajar permisos. Nunca se autoriza con metadatos editables.
- RPCs de consulta sin argumento de usuario: cada cuenta ve únicamente sus propios permisos. Un visitante solo ve si la prueba está abierta y sus permisos falsos de docente.
- Juegos: `/api/clases/acceso` verifica Auth y el permiso docente antes de crear la cookie HttpOnly. Storage vuelve a evaluar la autorización para cada archivo. La nueva política permite solo SELECT del bucket privado y del prefijo actual de la distribución; no admite subidas ni vuelve público el bucket. Al actualizar `VERSION_MESA`, actualizar también este prefijo de política.
- Entrenamiento: la interfaz valida permiso antes de montar herramientas. Políticas restrictivas controlan nuevos guardados, un trigger controla nuevos análisis y la RPC de reintento exige acceso cuando reinicia trabajo. Lectura de documentos propios y trabajos ya en cola se conservan; no se borra progreso ni partidas. Aprender desde cero, desafíos públicos, bots y juego online no cambian.
- Las clases preparadas en la app docente siguen guardándose en el navegador como antes. No se ha implementado sincronización de esas preparaciones entre dispositivos ni un espacio de almacenamiento remoto compartido entre docentes.
- Los permisos docentes no conceden acceso a gestión de torneos, listas de cuentas, colegios, administración de cuotas ni a las herramientas reservadas al administrador.

## Verificación

Pruebas con Postgres/PGlite: ACL, identidad de administrador, cuentas ajenas, fin de fecha exclusivo, bajas conservadas, operaciones idempotentes, cuotas que conceden entrenamiento, acceso docente limitado al prefijo, prueba abierta/cerrada y rechazo de guardados/nuevos análisis/reintentos sin permiso. Pruebas de API: profesor y docente habilitado, socio sin permiso, sesión vencida, origen ajeno, cookie segura, descarga tras baja y URLs de voz sin JWT expuesto.

No se crean usuarios ni permisos ficticios en producción. La comprobación final verifica que la prueba siga abierta, que no se hayan generado concesiones reales y que una cuenta normal no pueda consultar el listado de administración.
