# Mates en una jugada

Banco de 73 posiciones: 20 posiciones y variantes del curso del club y 53
problemas ya importados del banco público de Lichess (CC0). Se conservan los
seis identificadores anteriores para recuperar el progreso existente.

Las variantes del club reflejan columnas o intercambian color y filas. No
incluyen enroque ni al paso. Se eliminan duplicados por posición normalizada.
Cada solución se verifica con chess.js, incluyendo todos los mates alternativos.

Las cinco franjas son pedagógicas internas, no una medición Elo del usuario.
Los problemas de Lichess conservan su dificultad original y enlace; su origen
y licencia se detallan en entrenamiento-lichess-origen.md.

Regenerar: `node scripts/generar-mates-uno.cjs`.
Verificar: `node --test tests/mates-adaptativos.test.cjs`.

El selector prioriza posiciones no vistas de la franja personal y evita las ocho
más recientes cuando hay alternativas. Tres aciertos independientes sin ayuda
permiten subir; dos ejercicios con ayuda o varios errores permiten bajar. Los
repasos vuelven a contar para ajustar dificultad después de otras ocho posiciones.
El historial se combina por identificador de intento en el documento privado
`guiado:v1`; las pistas y errores no desaparecen al resolver después.
