# Álbum del club · primera edición

Ruta pública: `/album`. El catálogo muestra 60 figuritas del club (52 jugadores y 8 momentos). La colección de cada cuenta es privada. Se requiere una cuenta real y un jugador vinculado para abrir sobres o intercambiar.

## Reglas iniciales

- Un sobre de bienvenida de 6 figuritas por cuenta. Incluye su propio jugador si está en esta edición.
- Un sobre gratis de 3 figuritas por día de Uruguay. La fecha la calcula Postgres; el cliente no decide cuándo puede reclamarlo.
- Los sobres pueden traer repetidas. Las especiales tienen un peso de aparición menor que las comunes, igual para todos. No hay pagos ni venta de sobres.
- Para intercambiar se activa explícitamente «Compartir mis repetidas». Otros participantes de la mesa ven el nombre público del club y las repetidas disponibles, sin correos ni la colección completa.
- Una propuesta ofrece una copia por otra. El emisor debe tener una repetida libre; esa copia queda reservada. El receptor también debe tener una repetida libre al aceptar.
- Nunca sale la última copia del álbum. Aceptar ejecuta las dos entregas en la misma transacción, o ninguna. Repetir una solicitud no entrega dos veces.
- Máximo de 5 propuestas salientes pendientes y 10 entrantes por receptor. Sólo una propuesta pendiente por pareja. Vencen a los 7 días; se pueden cancelar o rechazar antes.
- Desactivar el intercambio cancela las propuestas pendientes de esa cuenta. Los sobres y la colección permanecen guardados.
- El historial guarda todos los cambios; la interfaz presenta las últimas 60 propuestas.

## Catálogo y ampliaciones

`lib/albumCatalogo.json` fija los identificadores y números de esta edición. No renumerar ni reutilizar identificadores. El motor privado contiene la misma lista de identificadores y pesos, sembrada en la migración `album_club_figuritas`. Cambiar fotos o corregir textos no altera la propiedad de las figuritas.

Las fotos usan los retratos de `lib/retratosJugadores.ts` y las imágenes ya publicadas del club. Si falta una foto, aparece un monograma; no se inventan retratos. Las fotos nuevas del perfil tienen prioridad sobre las anteriores.

Nuevos jugadores o nuevas ediciones requieren actualizar el catálogo y añadir una migración; no ampliar el catálogo sólo en el cliente. No borrar las figuritas que alguien ya consiguió. La edición inicial omite el segundo registro de Facundo Rodríguez para no duplicar su figurita; no modifica registros ni resultados del ranking.

## Persistencia y autorización

Tablas en `album_privado`: `catalogo`, `perfiles`, `inventario`, `sobres`, `intercambios`. RLS activado y sin permisos directos para clientes: el acceso se realiza por `public.album_club`, envoltorio SECURITY INVOKER de un motor privado que comprueba `auth.uid()`, rechaza sesiones anónimas y resuelve el jugador en el servidor.

Todos los movimientos de una cuenta se serializan con un bloqueo de transacción. Un intercambio bloquea las dos cuentas en orden de UUID, vuelve a comprobar las reservas y ejecuta ambas entregas juntas. Los UUID de propuesta y las claves de sobre hacen idempotentes los reintentos. Las propuestas ajenas no se pueden leer ni contestar.

Los avisos informativos de Supabase sobre RLS sin políticas en este esquema privado son intencionales: deniegan el acceso directo y el motor autorizado es la única vía de escritura. Los índices de claves foráneas están incluidos.

## Validación

`node --test tests/album-club.test.cjs tests/rpc-cuenta.test.cjs`

Las pruebas ejecutan la migración en Postgres/PGlite: permisos, usuarios anónimos, aislamiento entre cuentas, sobres idempotentes, bienvenida con figurita propia, reservas, última copia, aceptación doble, rechazo, cancelación, caducidad, falta de existencias y baja de la mesa de intercambio. En Supabase se verificó la apertura/reintento de un sobre dentro de una transacción revertida, sin entregar figuritas de prueba a usuarios reales.
