# Perfil de entrenamiento por cuenta

`guiado:v1` en `entrenamiento_documentos` incorpora `historial`, sin cambio de esquema ni permisos. RLS y el RPC existente validan `auth.uid()` y la cuenta esperada. Invitados mantienen su caché independiente; no se importa automáticamente a otra cuenta.

Cada resultado de `registrarResultadoGuiado` genera una observación con UUID, ejercicio, fecha, origen (jugada/pista/solución), resultado, asistencia, hipótesis y nivel antes/después. La dificultad, actividad y motivos reales se consultan en el banco. No se recogen navegación, contactos ni datos ajenos al entrenamiento. Las respuestas intermedias correctas de una variante no se confunden con una resolución completa.

El historial conserva las últimas 1200 acciones, con fusión por UUID y orden determinista: recargar/sincronizar no duplica datos y dos dispositivos offline conservan ambas acciones. El detalle tiene este límite para respetar el documento de 1.5 MB; notas, niveles iniciales, resultados iniciales, última observación y calendario siguen guardados por separado. No se inventan intentos históricos a partir del legado.

El resumen agrupa por ejercicio/día de Montevideo: fallar o usar ayuda queda asociado a ese día aunque después se complete. El reconocimiento solo se valora con hipótesis completadas sin ayuda. Etiquetas válidas generales no son fallos, y etiquetas relacionadas sin confirmación suficiente no se fuerzan a correctas/incorrectas. La dificultad resuelta es el promedio de ratings de ejercicios limpios, no un Elo FIDE ni Elo del club. Evolución: diferencia en puntos porcentuales entre hasta 6 muestras recientes y hasta 6 anteriores, con al menos 3 por grupo. Una posición puede trabajar varios motivos; no sumar las filas para obtener un total global.

Se conserva la selección adaptativa existente (hasta 12 posiciones recientes distintas, refuerzo + variedad, cerca del nivel) y los repasos espaciados. «Reforzar» usa el motivo seleccionado para los nuevos ejercicios disponibles sin descartar una sesión en curso ni adelantar un repaso. Los niveles de táctica, candidatas y evaluación se ajustan de forma independiente con el primer resultado del ejercicio; repetir no infla Elo.

Validación: `tests/entrenamiento-historial.test.cjs`, `tests/entrenamiento-temas-adaptativo.test.cjs`, `tests/entrenamiento-cuenta.test.cjs`, `tests/entrenamiento-cuenta-db.test.cjs`, continuidad, nivel, candidatas/evaluación y Pareto.
