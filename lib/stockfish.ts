// Envoltorio chico para correr Stockfish (motor de ajedrez) directo en el
// navegador del espectador, vía Web Worker — el mismo enfoque que usa
// Lichess. Los archivos del motor viven en /public/stockfish (versión
// "lite single-thread": no exige cabeceras especiales del servidor).

export type AnalisisPosicion = {
  evaluacionCentipawns: number | null; // desde el punto de vista de blancas
  mateEn: number | null; // positivo: mate a favor de blancas
  mejorJugada: string | null; // en notación UCI, ej "e2e4"
  profundidad: number;
};

export class MotorAjedrez {
  private worker: Worker;
  listo: Promise<void>;
  private onActualizar: (a: AnalisisPosicion) => void;
  private turnoActual: "w" | "b" = "w";
  private parcial: AnalisisPosicion = {
    evaluacionCentipawns: null,
    mateEn: null,
    mejorJugada: null,
    profundidad: 0,
  };

  constructor(onActualizar: (a: AnalisisPosicion) => void) {
    this.onActualizar = onActualizar;
    this.worker = new Worker("/stockfish/stockfish-18-lite-single.js");
    this.listo = new Promise((resolve) => {
      const alListo = (event: MessageEvent) => {
        if (String(event.data).includes("uciok")) {
          this.worker.removeEventListener("message", alListo);
          resolve();
        }
      };
      this.worker.addEventListener("message", alListo);
      this.worker.postMessage("uci");
    });
    this.worker.addEventListener("message", (event) => this.procesarLinea(String(event.data)));
  }

  private procesarLinea(linea: string) {
    if (linea.startsWith("info") && linea.includes("score")) {
      const profundidadMatch = linea.match(/\bdepth (\d+)/);
      const cpMatch = linea.match(/score cp (-?\d+)/);
      const mateMatch = linea.match(/score mate (-?\d+)/);
      const pvMatch = linea.match(/\bpv (\S+)/);
      if (profundidadMatch) this.parcial.profundidad = Number(profundidadMatch[1]);
      // El motor siempre da el puntaje desde el punto de vista de quien mueve ahora.
      const signo = this.turnoActual === "w" ? 1 : -1;
      if (cpMatch) {
        this.parcial.evaluacionCentipawns = Number(cpMatch[1]) * signo;
        this.parcial.mateEn = null;
      } else if (mateMatch) {
        this.parcial.mateEn = Number(mateMatch[1]) * signo;
        this.parcial.evaluacionCentipawns = null;
      }
      if (pvMatch) this.parcial.mejorJugada = pvMatch[1];
      this.onActualizar({ ...this.parcial });
    }
    if (linea.startsWith("bestmove")) {
      const partes = linea.split(" ");
      if (partes[1]) this.parcial.mejorJugada = partes[1];
      this.onActualizar({ ...this.parcial });
    }
  }

  async analizar(fen: string, turno: "w" | "b", tiempoMs = 800) {
    await this.listo;
    this.turnoActual = turno;
    this.parcial = { evaluacionCentipawns: null, mateEn: null, mejorJugada: null, profundidad: 0 };
    this.worker.postMessage("stop");
    this.worker.postMessage(`position fen ${fen}`);
    this.worker.postMessage(`go movetime ${tiempoMs}`);
  }

  destruir() {
    try {
      this.worker.postMessage("quit");
    } catch {
      // no pasa nada si ya está cerrado
    }
    this.worker.terminate();
  }
}
