// Protocolo Bluetooth del tablero DGT Pegasus, adaptado de la extensión de
// Chrome de código abierto EdNekebno/PegasusChessComChromeExtension (los
// UUID, la clave de desarrollador y los comandos son los mismos; acá no se
// simula un click en chess.com, se arma el estado del tablero con chess.js).

export const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
export const RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

const DEVELOPER_KEY = new Uint8Array([0x63, 0x07, 0xbe, 0xf5, 0xae, 0xdd, 0xa9, 0x5f, 0x00]);
const CMD_RESET = new Uint8Array([0x40]);
const CMD_BITBOARD = new Uint8Array([0x42]);
const CMD_SEND_UPDATES = new Uint8Array([0x44]);

const ARCHIVOS = "abcdefgh";

/**
 * El Pegasus numera las 64 casillas de 0 a 63 arrancando en a8 y recorriendo
 * cada fila hacia la derecha (a8..h8, a7..h7, ..., a1..h1) — el mismo orden
 * que usa un FEN.
 */
export function casillaDesdeIndice(indice: number): string {
  const fila = Math.floor(indice / 8);
  const columna = indice - fila * 8;
  const archivo = ARCHIVOS[columna];
  const rango = 8 - fila;
  return `${archivo}${rango}`;
}

export type PegasusCallbacks = {
  onLog: (linea: string) => void;
  onPiezaLevantada: (casilla: string) => void;
  onPiezaApoyada: (casilla: string) => void;
  /** Foto completa de qué casillas tienen pieza ahora mismo (índice = casillaDesdeIndice). */
  onVolcadoTablero: (ocupado: boolean[]) => void;
};

export async function conectarPegasus(cb: PegasusCallbacks) {
  const bt = (navigator as unknown as { bluetooth?: any }).bluetooth;
  if (!bt) {
    throw new Error(
      "Este navegador no soporta Bluetooth (Web Bluetooth). Probá con Chrome o Edge en computadora."
    );
  }

  cb.onLog("Buscando el tablero...");
  const device = await bt.requestDevice({ filters: [{ services: [SERVICE_UUID] }] });

  device.addEventListener("gattserverdisconnected", () => {
    cb.onLog("⚠ Se desconectó el tablero.");
  });

  cb.onLog("Conectando...");
  const server = await Promise.race([
    device.gatt.connect(),
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Se agotó el tiempo de espera conectando al tablero (15s).")),
        15000
      )
    ),
  ]);
  cb.onLog("Conectado. Buscando el servicio...");
  const service = await server.getPrimaryService(SERVICE_UUID);

  const caracteristicasRx = await service.getCharacteristics(RX_CHARACTERISTIC_UUID);
  const rx = caracteristicasRx.find((c: any) => c.uuid === RX_CHARACTERISTIC_UUID);
  const caracteristicasTx = await service.getCharacteristics(TX_CHARACTERISTIC_UUID);
  const tx = caracteristicasTx.find((c: any) => c.uuid === TX_CHARACTERISTIC_UUID);
  if (!rx || !tx) throw new Error("No se encontraron las características Bluetooth esperadas.");

  cb.onLog("Activando notificaciones...");
  await rx.startNotifications();

  async function pedirEstado() {
    try {
      await tx.writeValue(CMD_BITBOARD);
    } catch {
      // se reintenta en el próximo ciclo
    }
  }

  rx.addEventListener("characteristicvaluechanged", (event: any) => {
    const value: DataView = event.target.value;
    const tipo = value.getUint8(0);

    if (tipo === 142) {
      // 0x8E: una pieza se levantó o se apoyó en una casilla
      const casilla = casillaDesdeIndice(value.getUint8(3));
      const esLevantada = value.getUint8(4) === 0;
      const esApoyada = value.getUint8(4) === 1;

      if (esLevantada) cb.onPiezaLevantada(casilla);
      if (esApoyada) cb.onPiezaApoyada(casilla);
      pedirEstado();
    }

    if (tipo === 134 && value.byteLength >= 3 + 64) {
      // 0x86: foto completa de las 64 casillas (1 = ocupada, 0 = vacía)
      const ocupado: boolean[] = [];
      for (let i = 0; i < 64; i++) ocupado.push(value.getUint8(3 + i) !== 0);
      cb.onVolcadoTablero(ocupado);
    }
  });

  const intervalo = setInterval(pedirEstado, 500);

  cb.onLog("Inicializando el tablero...");
  await tx.writeValue(DEVELOPER_KEY);
  await tx.writeValue(CMD_RESET);
  await tx.writeValue(CMD_BITBOARD);
  await tx.writeValue(CMD_SEND_UPDATES);
  cb.onLog("✅ Listo. Mové una pieza para probar.");

  return {
    desconectar() {
      clearInterval(intervalo);
      try {
        device.gatt?.disconnect();
      } catch {
        // no hay mucho que hacer si esto falla
      }
    },
  };
}
