# Un solo Elo Atlántida

Las partidas online por Elo y los resultados presenciales comparten el Elo
del ranking: K=20 y mínimo 1400, las reglas que ya usaba el club. Las partidas
amistosas conservan su historial privado y no modifican el rating.

La cuenta debe estar vinculada a exactamente un jugador del club para crear,
aceptar o inscribirse a una partida por Elo. La autorización usa Auth UID y
el vínculo del servidor; los nombres editables de la cuenta son solo texto.
Al iniciar se fijan los dos ids del club, nombres y Elo inicial. Un cambio
posterior del vínculo no reasigna el resultado de una partida en juego.

## Registro y cálculo

`partidas_club_online` contiene exclusivamente resultados deportivos oficiales:
ids de jugadores, resultado, nombre del encuentro y fecha. No publica Auth
UID, correo, posición ni PGN. Su lectura es pública como el ranking; el cliente
no puede escribir resultados. Cada partida tiene una sola fila por id.

El resultado y sus variaciones se confirman en la misma transacción que el
estado final de la partida. Un fallo revierte ambos. La versión optimista del
servidor de juego y la clave única evitan resultados duplicados.

El servidor y `lib/elo.ts` reproducen el mismo orden: inicio y UUID del torneo
presencial, luego ronda/mesa; las partidas online se intercalan según la fecha
de cierre y su id. Las importaciones `excluir_elo` aportan historial, sin volver
a mover el Elo. Los ratings guardados dentro del PGN describen el momento del
cierre; corregir después un torneo anterior recalcula el ranking y su gráfico.

Un bloqueo de transacción común serializa resultados por Elo con las ediciones
de torneos y jugadores. El cálculo es VOLATILE para leer resultados confirmados
después de esperar ese bloqueo. No depende de un valor calculado por el cliente.
El índice único y el control de versión protegen reintentos de red.

El frontend incorpora los resultados online al historial y los gráficos sin
crear torneos presenciales artificiales. Colegio Pinares y Épico conservan sus
planteles independientes. Los premios mensuales y Copa siguen los torneos
presenciales, hasta que el club decida incorporar torneos online concretos.

La migración conserva las inscripciones existentes, agrega sus enlaces a los
perfiles y ajusta el Elo de referencia al real del club. No regenera rondas ni
cambia resultados. Se rechaza si hay partidas por Elo activas durante el cambio.
Los datos de `online_elo` anteriores se conservan como legado y ya no se usan
como rating actual. Las partidas amistosas previas permanecen guardadas.

## Historial y experiencia de juego

`/jugar/partidas` pagina todo el archivo privado de partidas online terminadas,
sin limitarlo a las últimas treinta. Permite volver a ver la partida o cargar
su PGN en Entrenamiento con el color propio. El enlace directo de entrenamiento
también recupera una partida antigua por id, aplicando la misma RLS.

El golpe de las piezas se reproduce al mover y al llegar una jugada rival,
sin duplicarse cuando se confirma la jugada propia. El audio suspendido se
reanuda tras el gesto del usuario. El tablero se conserva entre los ticks del
reloj, y una respuesta de la misma versión no reconstruye sus piezas. Las
jugadas siguen confirmándose por el servidor y se recuperan al reconectar.

## Verificación

`tests/elo-club-online.test.cjs` aplica todas las migraciones en PostgreSQL
embebido. Compara el cálculo SQL con el frontend, incluyendo corrección de un
torneo presencial, resultado online, rollback, reintento, amistosa, vínculo
de jugador, Elo de inscripción y permisos de lectura/escritura.

Antes de activar el cambio se compararon los 48 Elo y cantidades de partidas
del club con la nueva función: ninguna diferencia. El torneo abierto y sus
tres inscripciones se conservaron. No se cargaron partidas ficticias en las
cuentas reales.
