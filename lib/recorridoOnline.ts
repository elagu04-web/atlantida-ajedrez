import { tableroOnline, type EstadoOnline } from './partidaOnline';
import type { RecorridoPgn } from './recorridoPgn';

/** Se reconstruye una copia: repasar nunca modifica la partida guardada. */
export function recorridoOnline(estado: EstadoOnline): RecorridoPgn {
  const tablero = tableroOnline(estado);
  const historial = tablero.history({ verbose: true });
  const piezas: Record<string, string> = { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' };
  return {
    posiciones: historial.length ? [historial[0].before, ...historial.map(j => j.after)] : [tablero.fen()],
    jugadas: historial.map(j => ({
      texto: `${j.before.split(' ')[5]}${j.color === 'w' ? '.' : '…'} ${j.san.replace(/^[KQRBN]/, c => piezas[c]).replace(/=([QRBN])/, (_, c: string) => `=${piezas[c]}`)}`,
      origen: j.from, destino: j.to,
    })),
    blancas: estado.blancas, negras: estado.negras, resultado: estado.resultado, pgn: estado.pgn,
  };
}
