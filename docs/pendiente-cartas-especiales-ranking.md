# Cartas especiales doradas

Pedido de Agustín del 1 de noviembre de 2026. Implementado el 2 de noviembre: las dos cartas de la ficha y las cartas destacadas de Estadísticas usan marco dorado con relieve, textura, fondo bronce y reflejos metálicos.

- El jugador que ocupe el puesto 1 del ranking del club debe tener una carta especial totalmente dorada.
- El último ganador de un torneo de los martes también debe tener una carta especial dorada.
- La distinción debe cambiar automáticamente cuando cambie el número 1 o haya un nuevo campeón de los martes.
- Si ambos reconocimientos pertenecen a la misma persona, mostrar ambos motivos en su carta.
- Mantener las fotos originales, el efecto de carta brillante y la legibilidad de las estadísticas.
- Usar el ranking real y el ganador confirmado del torneo de los martes; no confundirlo con el campeón mensual ni con cualquier partida online.

La selección se calcula en `lib/cartasEspeciales.ts`, con el ranking de jugadores con partidas y los campeones oficiales ya validados por `calcularPremiosTorneo`. La fecha de inicio se interpreta en Uruguay. Los duelos de formato match no cuentan como torneo de los martes.
