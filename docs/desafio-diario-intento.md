# Intento diario por cuenta

- La portada no muestra el desafío a visitantes sin sesión. En /desafios se pide iniciar sesión, sin tablero ni pistas.
- /api/desafio-diario verifica el token con Supabase Auth y devuelve 401 sin posición ni solución a visitantes, sesiones inválidas o anónimas. Las respuestas son privadas y no se almacenan en caché compartida.
- Antes de habilitar el tablero se consulta el intento de la cuenta. Una caída de conexión no lo convierte en un intento nuevo.
- Una jugada legal incorrecta o pedir una pista escribe inmediatamente una marca local por cuenta/día/problema. Se registra el fallo en Supabase con el RPC existente registrar_desafio_error. La marca se conserva al reiniciar y recargar, y se comunica a otras pestañas.
- Tras un error o pista se puede practicar, pero terminar la secuencia no muestra el distintivo de logrado ni registra una resolución válida. El cartel oficial requiere la confirmación del servidor.
- La base ya rechaza registrar_desafio_resuelto si existe un fallo para la misma cuenta y fecha. Un logro previamente confirmado se conserva si después se practica con pistas.
- No se modifican resultados históricos ni rachas de otros usuarios.

Validación: tests/desafio-cuenta.test.cjs, tests/desafio-revision.test.cjs y tests/desafios-db.test.cjs (PostgreSQL aislado). Incluye rechazo de resolución tras fallo, recuperación de estado por cuenta y permisos del endpoint.
