# Acceso a la mesa de un torneo

La sala online muestra primero los cruces de la cuenta en los torneos en curso. Cada tarjeta usa exclusivamente la ronda actual, el rival, el color y el ritmo configurados por la organización. Si existe partida, abre su tablero; si todavía no se creó, lleva a la preparación dentro del torneo. Un descanso no inventa un rival y una partida terminada conserva su acceso al visor.

Las invitaciones independientes están dentro de «Crear o aceptar una partida suelta · fuera del torneo». Ese flujo no registra puntos en el torneo. No se mezclan mesas por coincidencia de nombres ni se vinculan partidas retrospectivamente desde el cliente.

En el torneo, la preparación aparece antes de las posiciones. El botón «Estoy listo · jugar 5+3» conserva la coordinación existente y el comienzo cuando ambos confirman. Los minutos y colores no se eligen por los jugadores: se toman del torneo en el servidor. El administrador sigue pudiendo escoger el ritmo al organizar otro torneo, con 5+3 como propuesta inicial.

Proponer horarios y escribir al rival permanece disponible en un desplegable secundario. Los RPC de las tarjetas quedan ligados al token de la cuenta y se abortan al salir, evitando mostrar cruces de otra sesión.

Esta entrega no cambia las reglas de Elo, el margen inicial de dos minutos ni los resultados existentes. La corrección particular de Juan Diego–Fernando y la retirada de la ronda 2 se ejecutan por separado, con respaldo, comprobación de versiones y sin partidas nuevas en esa ronda. No se publica automáticamente un emparejamiento sustituto.
