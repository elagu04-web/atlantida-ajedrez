# Premio del campeón: próxima inscripción gratis

Cada campeón oficial de un torneo del club finalizado obtiene un premio que cubre una sola inscripción. Se usa el ID del jugador vinculado a su cuenta, sin depender del nombre, alias o dispositivo. El recordatorio personal sólo aparece con una identidad autenticada inequívoca.

No hace falta SQL ni otra tabla. Los resultados, la final de desempate y las listas de jugadores/inscriptos que ya están guardadas permiten reconstruir el beneficio tras recargar. No hay escrituras extra ni campos de pago modificados.

## Reglas

- Líderes parciales, empate sin final resuelta, partidos con resultados faltantes, torneos vacíos o fechas de inicio inválidas/futuras no generan premio.
- El campeón usa las reglas actuales del club: los empates en puntos se definen por final, incluso cuando la planilla ordena a los finalistas.
- rondasObjetivo es un objetivo planificado. La app permite al administrador cerrar un torneo antes; si ya está finalizado y todas las partidas generadas terminaron, su campeón es oficial.
- Se consume en la primera participación posterior del propio jugador, no al torneo siguiente al que no asista.
- Una inscripción próxima reserva el premio. Mientras siga armado, se conserva si el administrador agregó al jugador a la lista final. Quitarlo de ambas listas libera la reserva.
- Al comenzar, sólo jugadoresIds consume: anotarse y luego quedar fuera no gasta el beneficio.
- Cada torneo ganado genera otro premio. Ganar el torneo al que entró gratis usa el anterior y obtiene uno nuevo.
- La gratuidad aparece separada de “pagó”. Ese checkbox continúa representando exclusivamente una marca de pago real.
- Corregir el ganador, borrar torneos o cambiar la lista recalcula los premios. No queda un cupón obsoleto a nombre del antiguo ganador.
- La inscripción muestra una vista previa; sólo se confirma después de la respuesta del guardado existente en Supabase. Fallos y conflictos no simulan reservas.

## Orden histórico y límite de los datos disponibles

No existe fecha de cierre del torneo ni timestamp individual de inscripción en el esquema actual. No se inventan esos datos: los torneos jugados se ordenan por iniciadoEn, o creadoEn para registros antiguos, con el ID como orden estable. Sólo una fecha de inicio estrictamente posterior puede consumir un premio. Torneos simultáneos no lo consumen entre sí.

Los torneos armados se procesan después de los jugados y se ordenan por creación e ID. Esto permite reservar un próximo torneo preparado antes de la victoria. Si se anotó en varios próximos, el más antiguo de esos torneos tiene prioridad; no es posible saber cuál inscripción ocurrió primero. Un cambio de estado/inicio puede cambiar esa prioridad al recalcular.

Este sistema es una ayuda organizativa derivada del historial; no es un registro contable inmutable ni una fecha de concesión auditada. Si posteriormente se exige concesión exacta al cerrar y reserva por hora de inscripción, hará falta una tabla de premios y una operación transaccional en el servidor.

## Validación

node --test tests/premiosTorneo.test.cjs comprueba campeón/final, cierre incompleto, fecha futura, asignación única, próxima inscripción anterior a la victoria, baja, ausencia, uso, repetición de campeones, correcciones y recarga. La interfaz se puede comprobar con fixtures de Supabase y sesión ficticia; nunca se necesitan cambios en registros reales.