# Premove y arranque online

Las mesas nuevas, incluidas las creadas por coordinación de torneos, guardan `inicioLibre: 2`. Las partidas anteriores conservan sus relojes. Un trigger de inserción incorpora la misma regla cuando la mesa nace desde SQL; no modifica partidas existentes.

Durante las primeras cuatro medias jugadas (dos de cada jugador) los relojes principales no descuentan tiempo ni reciben incremento. Cada turno tiene un plazo independiente de 120 segundos, medido desde `desde` por el servidor. Ofrecer tablas, consultar, recargar o cambiar de dispositivo no renueva ese plazo. Al agotarse se pierde por tiempo de inicio. Tras la segunda jugada negra empieza el reloj normal de blancas. El resumen del torneo publica el vencimiento correcto para que el arbitraje pueda cerrar mesas sin respuesta.

Un premove se prepara durante el turno rival, por clic o arrastre, con las piezas y colores habituales. Solo se guarda localmente una jugada, ligada a la mesa y a la cantidad de medias jugadas confirmadas. No se envía una jugada ni se altera el reloj al prepararla. Puede reemplazarse o cancelarse con el botón, Escape o clic derecho. No se conserva al ocultar la página, desconectar, perder sincronización, salir de la mesa o terminar la partida.

Después de exactamente una jugada rival, chess.js comprueba toda la legalidad: jaque, enroque, captura al paso, promoción elegida y piezas capturadas. Una jugada inválida se descarta; una válida se envía por el mismo canal autenticado y versionado de las jugadas manuales. El servidor vuelve a validarla y conserva la autoridad sobre posición, resultado y tiempo. El premove necesita la página abierta y conexión; no garantiza coste de reloj cero ni elimina la latencia de red.

Validación: pruebas de los tres ritmos, frontera de 120 segundos, cuatro medias jugadas, reanudación, mesas anteriores, promoción, enroque, captura al paso, jaque, contexto de mesa, permisos y vencimiento de torneo en PGlite. Prueba visual local con el componente real: clic, arrastre de caballo, ejecución tras respuesta rival y cancelación. La ruta temporal de prueba se eliminó antes de publicar; no se crearon partidas ficticias en producción.
