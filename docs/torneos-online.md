# Torneos online por rondas

Entrada: `/torneos/online`. Organiza la cuenta administrativa actual del club;
pueden inscribirse cuentas normales de Google o de usuario y contraseña.

## Funcionamiento

- Suizo o round robin a una vuelta, entre 2 y 32 jugadores; 10+3, 5+3 o 3+2.
- Inscripción abierta hasta publicar la primera ronda. El Elo de inscripción
  queda como referencia para ordenar el primer suizo. El Elo que se liquida
  al jugar es el online vigente, mediante el mecanismo ya existente.
- El organizador publica una ronda cuando no quedan partidas pendientes.
  Round robin reutiliza el calendario Berger del club. El suizo utiliza los
  emparejamientos existentes con historial de rivales, puntos y colores.
- Publicar no crea partidas ni inicia relojes. Cada pareja tiene mensajes
  privados y una propuesta de fecha/hora que el rival puede aceptar.
  Se almacenan instantes UTC y se muestran en la zona del dispositivo.
- Los días por ronda fijan un **plazo sugerido**, sin derrotas automáticas por
  no coordinar. El organizador resuelve los cruces que no empezaron.
- Las confirmaciones de disponibilidad caducan a los 2 minutos. Solo dos
  confirmaciones vigentes crean una mesa asignada y arrancan el reloj. La
  sala redirige al tablero si el usuario sigue esperando con ella abierta.
- Las partidas se juegan con el servidor online existente: movimientos
  legales, relojes, rendición, tablas, PGN, historial y Elo online.
  El PGN incluye nombre y ronda del torneo.
- Las posiciones se calculan sobre resultados del servidor. En suizo el
  BYE automático suma 1; el descanso de round robin suma 0. Una adjudicación
  sin jugar puede ser 1–0, 0–1, ½–½ o 0–0 y no afecta Elo.
- Desempates: Buchholz y Sonneborn-Berger para suizo; enfrentamiento directo
  y Sonneborn-Berger para round robin. Un empate completo comparte puesto.
  No hay final adicional automática.
- El torneo se da por finalizado al completar la última ronda. Los juegos
  siguen en el historial privado de sus dos participantes.

## Autoridad y privacidad

Las tablas públicas tienen RLS, sin permisos de escritura del cliente. Los
RPC invocadores delegan a funciones con autorización por Auth UID en el
esquema no expuesto `torneos_online_privado`. Los mensajes no se incluyen
para terceros ni para el organizador. La organización no puede modificar
el resultado de una partida que ya empezó.

Publicación y coordinación bloquean la fila del evento. La publicación usa
versión optimista para impedir cerrar una inscripción con datos viejos. El
inicio se hace en una transacción: una sola partida por cruce, nombres y
colores asignados, confirmaciones recientes y sin otra partida activa de
los rivales al comprobar. La lógica online conserva su CAS por versión.

`POST /api/torneos-online` calcula las rondas en el servidor usando el JWT
del usuario. No necesita una clave service-role en Next. Para materializar
un reloj vencido pide `arbitrar` a la Edge Function online: solo organizador
o inscritos; la Edge determina el resultado con su reloj y no devuelve
FEN, jugadas ni PGN ajenos. Si nadie abre la sala, el reloj sigue transcurriendo
y el resultado se confirma en la siguiente visita; no es una tarea cron.

La sala consulta cada 8 segundos (cada segundo si el usuario acaba de
confirmar que está listo), pausa en segundo plano y recupera al reconectar.
Los fallos se muestran y no simulan una inscripción, horario o resultado.
El mensaje escrito se conserva si no se pudo enviarlo.

## Verificación

`tests/torneos-online.test.cjs` aplica las migraciones reales en PostgreSQL
embebido y recorre un torneo completo con tres cuentas, permisos, mensajes,
confirmación caducada, inicio, Elo, resultado, descansos y cierre. También
comprueba tres rondas suizas sin rivales repetidos ni BYE futuro.
`tests/torneos-online-servidor.test.cjs` ejecuta el handler Edge con Auth y
persistencia controlados para verificar arbitraje, autoridad de reloj,
privacidad de respuesta y conflicto de una jugada concurrente.

No se cargan torneos ficticios ni se alteran rankings reales durante QA.
