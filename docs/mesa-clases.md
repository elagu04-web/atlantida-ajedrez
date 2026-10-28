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

## Estética de Atlántida

Al servir los dos documentos HTML, temaMesaClases.ts agrega al final del head
la hoja propia /estilos/mesa-atlantida.css. Cambia catálogo, controles, Profe,
cuentos y proyección al azul de Atlántida. Los scripts, IDs, eventos, permisos
y clases guardadas de la app conservan su funcionamiento original. Los colores
que expresan equipos, casillas pintadas, flechas o reglas no se reemplazan.

Geist Latin se sirve localmente sin modificar, desde la copia incluida en
Next.js 16.3.1 (next-devtools/server/font/geist-latin.woff2). Se conserva la licencia
SIL OFL 1.1 en public/fuentes/GEIST-OFL.txt; obtenida del repositorio oficial
https://github.com/vercel/geist-font/blob/main/OFL.txt. No se agregan consultas
a servicios de fuentes externos durante la clase.
## Mesa integrada — octubre de 2026

El catálogo se renderiza en React dentro de /clases: categorías, búsqueda y 26
portadas ilustradas que representan el tema y las reglas de cada actividad.
Las tarjetas combinan el azul del club con un acento propio, la habilidad practicada
y una acción visible. En celular mantienen la ilustración completa sobre el texto.
Los WebP locales de 480 y 960 píxeles están en public/imagenes/clases/tarjetas-v2/;
un cargador estático de next/image selecciona la variante sin recomprimirla.
Se cargan al acercarse a la pantalla y respetan la preferencia de movimiento reducido.
La ilustración de cabecera está en public/imagenes/clases/mundo-ajedrez-v1.webp.

Los motores originales siguen privados y sin modificar en Storage. El documento
principal, al pedir integrado=1, incorpora un puente de presentación que comunica
solo metadatos de catálogo, actividad elegida, altura y sonido. El contenedor se
ajusta al contenido; no hay un segundo menú ni un segundo scroll de página. Los
mensajes comprueban origen, ventana emisora y tipos admitidos en ambos sentidos.
Las clases existentes conservan los mismos IDs, claves locales y BroadcastChannel.
La pantalla de proyección mantiene su documento independiente.

Piezas: cburnett de Colin M. L. Burnett, desde el repositorio oficial de Lichess,
SVG originales con atribución y GPL-2.0-or-later en public/piezas/cburnett/.
El dragón y las marcas que expresan reglas de cada juego conservan su significado.
El sonido usa tres grabaciones reales de piezas de simone_ds (CC0), servidas desde
public/audio/madera-real/. El reproductor compartido madera.js conserva el tono
y la velocidad, alterna muestras, reutiliza buffers y respeta silenciar/mesa-sound.
El mismo reproductor se usa en bots, online y las prácticas del club.
Fuente y recortes documentados en public/audio/madera-real/CREDITOS.txt.

Pruebas: clases-integradas.test.cjs (protocolo, piezas, sonido y transformación)
y clases-privadas.test.cjs (autorización, cookie, RLS y rutas).

### Proyección
El botón Proyectar ofrece instrucciones separadas para computadora y iPhone/iPad.
Chrome en computadora puede enviar la pestaña a Chromecast; iPhone usa duplicación
AirPlay si la tele es compatible. Chromecast desde un navegador iOS no está
soportado por el Web Sender SDK de Google: se explica la necesidad de una app
intermedia, con un enlace informativo a Replica y sus limitaciones de la versión
gratuita. No se afirma que la web inicie Cast automáticamente.
En Modo Profe se mantiene el enlace de pantalla del grupo, que sincroniza pestañas
del mismo navegador. No se promete sincronización entre dispositivos.
