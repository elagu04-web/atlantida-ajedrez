# Reloj para partidas presenciales

Ruta pública: `/reloj`. Acceso desde el menú, Jugar y la búsqueda. No requiere cuenta ni cambia partidas, Elo o torneos.

- Blancas empiezan; tocar el lado activo finaliza su turno y añade el incremento Fischer una sola vez.
- Un toque sobre el lado inactivo no modifica tiempos. Pointerdown responde al toque; click con detail=0 conserva el uso por teclado.
- Se descuenta el tiempo desde inicioTurno, no una cantidad por cada tick. Las pestañas suspendidas no regalan tiempo.
- Al llegar a cero se detienen ambos relojes; no se declara un ganador porque el reloj no conoce la posición ni el material de mate.
- Pausar congela ambos tiempos. Reiniciar o cambiar de ritmo tras el comienzo requiere confirmación en pausa.
- Ritmos 3+2, 5+3, 10+3, 10+5, 15+10 y 30+0. Personalizado de 1 segundo a 180 minutos e incremento de 0 a 60 segundos.
- Modo mesa ocupa la ventana; el botón destacado de pantalla completa nativa permanece accesible antes y después de empezar y permite salir de ella. En computadora ambos tiempos se leen derechos, con controles superiores. Solo la cara de arriba gira 180 grados en modo mesa vertical de celular, configurable; se pueden cambiar lados en pausa.
- Espacio cambia el turno en marcha; Escape pausa. Controles disponibles con Tab y Enter.
- Guardado local: al recargar se resta el tiempo transcurrido y se recupera en pausa, salvo que se haya agotado. No se sincroniza entre dispositivos.
- Wake Lock se solicita mientras corre y se libera al pausar o salir. Se vuelve a pedir al retornar a una pestaña visible; si el navegador lo deniega el reloj sigue funcionando.

Validación: `node --test tests/reloj-ajedrez.test.cjs`, ESLint, compilación y prueba visual.

Referencias: [Screen Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API), [temporizadores y suspensión](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now#ticking_during_sleep).
