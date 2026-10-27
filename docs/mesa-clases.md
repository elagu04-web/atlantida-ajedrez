# Mesa privada de clases

Entrada: `/clases`, visible en Gestión solo para la cuenta administradora.
La copia corresponde a la app Mesa de juego del chat fijado «juego de ajedrez»,
revisada el 27 de octubre de 2026: 134 archivos, 46.813.643 bytes. Incluye
juegos, desafíos, cuentos, Profe, pantalla de proyección y reconocimiento local
de voz, con los avisos y licencias originales de sus dependencias.

## Alojamiento y acceso

Los recursos NO se distribuyen en Git ni en public/. Están en el bucket privado
`clases-mesa`. Una política de SELECT limita los recursos al UUID verificado del
profesor. No existen permisos de carga, modificación o borrado para los clientes.
La comprobación real de RLS devuelve 134 archivos para el profesor y cero para
otra cuenta y para anon. La carga inicial temporal quedó cerrada al terminar.

`POST /api/clases/acceso` verifica la identidad con Auth antes de emitir una cookie
HttpOnly, Secure, SameSite=Strict, limitada a /api/clases/mesa y de 90 segundos.
La página renueva el acceso mientras está abierta y lo elimina al cerrar sesión.
Cada recurso vuelve a pasar por RLS con el JWT del usuario; no se usa service_role.
Los dos recursos grandes de voz usan firmas de 60 segundos para evitar los límites
de tamaño de las respuestas de Vercel. Las respuestas de la app son private/no-store,
noindex y solo admiten ser embebidas desde el propio sitio.

## Conservación del trabajo

Se conserva la navegación relativa, BroadcastChannel y la pantalla de proyección.
Las clases preparadas en Mesa usan su almacenamiento original del navegador;
exportar/importar desde Profe permite trasladarlas. Esto no promete sincronización
de esas clases con la cuenta de Atlántida.

Esta es una copia versionada: los cambios futuros de la otra app requieren subir
una nueva versión privada y actualizar VERSION_MESA. No copiar la app al repositorio
público ni abrir el bucket para simplificar una actualización.

Comprobaciones: `node --test tests/clases-privadas.test.cjs`, RLS sobre el proyecto
real, compilación de Next y revisión del catálogo en el navegador.
