# Arranque online sin derrota — 2/11/2026

El margen de dos minutos durante las primeras dos jugadas por jugador pausa la mesa. No adjudica un resultado, ni modifica el Elo o la posición. Ambos jugadores deben confirmar en la misma mesa para retomar; el turno conserva un margen nuevo de dos minutos. Una confirmación repetida no confirma por el rival. El reloj principal empieza después de la cuarta media jugada y conserva su funcionamiento habitual.

La pausa y las confirmaciones se guardan en el estado existente de la partida; no requieren una migración ni cambios de permisos. La función de servidor valida que quien confirma sea uno de los dos participantes y conserva el control de versión y peticiones repetidas.

El caso Fonchi–Matías, ronda 2 mesa 2 del Segundo Torneo Online Octubre/Noviembre, se corrigió a 1-0 por confirmación de Agustín: jugaron en otra plataforma. Se conservó un único registro deportivo y no se inventaron jugadas. Elo corregido al registrar ese resultado: Fonchi 1876 → 1888; Matías 1956 → 1944. El respaldo anterior y el SQL con guardas están en outputs del chat. Las otras mesas y rondas no se modificaron.

Validación: pruebas de pausa en cada uno de los primeros cuatro turnos, recarga, confirmación individual y conjunta, repetición, conservación del tablero y relojes, y vencimiento normal del reloj principal. También se comprueban los premovimientos y los flujos existentes de las partidas.
