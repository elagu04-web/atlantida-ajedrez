# Acabado de las fichas de jugadores

Las fichas individuales del ranking y el retrato destacado en Estadísticas comparten `CartaBrillante`: borde metalizado, reflejo tornasolado y luz de entrada. Foto e información forman dos cartas separadas. Con mouse, la foto se amplía un 4,5% y se inclina hasta siete grados por eje; la carta de datos usa un movimiento menor para facilitar la lectura. Conserva las fotografías y los datos existentes.

- Los eventos de movimiento se agrupan con `requestAnimationFrame`; no actualizan estado de React.
- Las capas de luz no reciben clics. Los enlaces, controles de gráficas y el scroll siguen disponibles.
- En dispositivos táctiles se reproduce una pasada de luz al tocar, sin capturar el puntero ni bloquear el desplazamiento.
- La luz automática se reproduce una sola vez al entrar en pantalla. No hay bucles permanentes.
- `prefers-reduced-motion` desactiva inclinación y destellos. Se cancelan tareas y animaciones al desmontar u ocultar la pestaña.
- En las fichas, una máscara concentra el acabado sobre la fotografía; en Estadísticas queda limitado al retrato. Los nombres y números conservan su contraste.

Comprobación: TypeScript, ESLint de los componentes modificados y compilación de producción. Revisión visual del perfil de Gabi y su ficha de octubre en Estadísticas; formato de celular de 390 × 844, sin desbordamiento horizontal y con scroll operativo. En computadora se verificaron las variables del reflejo y la transformación al mover el puntero.
