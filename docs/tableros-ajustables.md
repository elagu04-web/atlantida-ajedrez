# Tamaño de los tableros

`MarcoTablero` agrega un deslizador, botón Auto y tirador con ratón/táctil y teclado. Se aplica a bots, partidas online, visor online, aperturas y desafío diario ampliado. El tamaño es compartido entre estas vistas y se conserva en este navegador; no se promete sincronización entre dispositivos.

Auto mide el ancho real del contenedor, la altura del viewport y la cabecera del sitio. Recalcula con ResizeObserver, resize y visualViewport; usa píxeles CSS sin transform/zoom. Manual respeta el ancho disponible y conserva el tamaño elegido para recuperarlo en una pantalla más grande. Nunca recrea la instancia de la partida ni cambia posiciones, relojes o premoves por un cambio de tamaño.

Se sustituyen en estas vistas los límites de ancho y alturas fijas superpuestos. El tablero mantiene proporción cuadrada y los controles no desbordan al reducirlo. El botón Auto permite volver a encajar el tablero en la pantalla después de agrandarlo manualmente.

Validación: pruebas de cálculo y preferencias en `tests/tamano-tablero.test.cjs`; regresiones de interacción, práctica, premove y visor. Pruebas de navegador local en 1024×600 y 390×844: tablero completo, sin desborde horizontal, ajuste manual, recuperación de preferencia tras recarga y arrastres e2–e4 / e7–e5 con ambos colores en una mesa ficticia. No se crearon partidas online ni resultados en producción. El atajo de zoom del navegador del chat no modifica su escala; se comprobaron cambios reales de viewport y geometría, sin afirmar una prueba de zoom nativo que esta herramienta no ejecuta.
