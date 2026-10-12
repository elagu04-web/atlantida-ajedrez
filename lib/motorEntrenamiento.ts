import { Chess } from "chess.js";
import type { AnalisisPosicion } from "./stockfish";

const vacio = (): AnalisisPosicion => ({ evaluacionCentipawns: null, mateEn: null, mejorJugada: null, variantePrincipal: null, profundidad: 0 });
/** Cada evaluación termina con bestmove; nunca se reutiliza la respuesta de otra posición. */
export class MotorEntrenamiento {
  private worker: Worker;
  readonly listo: Promise<void>;
  private cerrado = false;
  private preparado = false;
  private cargaTimer: ReturnType<typeof setTimeout>;
  private resolveCarga!: () => void;
  private rejectCarga!: (e: Error) => void;
  private solicitud: { resolve: (a: AnalisisPosicion) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout>; turno: "w" | "b"; analisis: AnalisisPosicion } | null = null;
  constructor(private actualizar: (a: AnalisisPosicion) => void = () => {}, crearWorker = () => new Worker("/stockfish/stockfish-18-lite-single.js"), cargaMs = 30000, private limiteMs = 15000) {
    this.worker = crearWorker();
    this.listo = new Promise((resolve, reject) => { this.resolveCarga = resolve; this.rejectCarga = reject; });
    void this.listo.catch(() => {});
    this.cargaTimer = setTimeout(() => this.fallar(new Error("El motor tardó en cargar. Revisá la conexión y reintentá.")), cargaMs);
    this.worker.addEventListener("message", this.recibir);
    this.worker.addEventListener("error", this.error);
    this.worker.addEventListener("messageerror", this.error);
    this.worker.postMessage("uci");
  }
  private error = () => this.fallar(new Error("No se pudo cargar el motor de análisis."));
  private recibir = (evento: MessageEvent) => {
    if (this.cerrado) return;
    for (const linea of String(evento.data).split(/\r?\n/)) {
      if (linea === "uciok") {
        for (const orden of ["setoption name Hash value 32", "setoption name MultiPV value 1", "setoption name UCI_LimitStrength value false", "setoption name Skill Level value 20", "isready"]) this.worker.postMessage(orden);
      }
      if (linea === "readyok" && !this.preparado) { this.preparado = true; clearTimeout(this.cargaTimer); this.resolveCarga(); }
      const s = this.solicitud;
      if (!s) continue;
      if (linea.startsWith("info ") && !/\b(?:upperbound|lowerbound)\b/.test(linea)) {
        const datos = linea.match(/\bdepth (\d+).*?\bscore (cp|mate) (-?\d+).*?\bpv (.+)/);
        if (datos && Number(datos[1]) >= s.analisis.profundidad) {
          const signo = s.turno === "w" ? 1 : -1, valor = Number(datos[3]) * signo;
          s.analisis = { profundidad: Number(datos[1]), evaluacionCentipawns: datos[2] === "cp" ? valor : null, mateEn: datos[2] === "mate" ? valor : null, variantePrincipal: datos[4].trim().split(/\s+/), mejorJugada: datos[4].trim().split(/\s+/)[0] };
        }
      }
      if (linea.startsWith("bestmove ")) {
        this.solicitud = null; clearTimeout(s.timer);
        const uci = linea.split(/\s+/)[1];
        if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci) || (s.analisis.evaluacionCentipawns === null && s.analisis.mateEn === null)) s.reject(new Error("No se pudo evaluar esa posición. Reintentá el análisis."));
        else { const a = { ...s.analisis, mejorJugada: uci }; this.actualizar(a); s.resolve(a); }
      }
    }
  };
  async evaluarPosicion(fen: string, turno: "w" | "b", tiempoMs = 650): Promise<AnalisisPosicion> {
    const ajedrez = new Chess(fen);
    if (ajedrez.turn() !== turno) throw new Error("El turno no coincide con la posición.");
    if (this.cerrado) throw new DOMException("Análisis cancelado", "AbortError");
    if (ajedrez.isCheckmate()) return { ...vacio(), mateEn: turno === "w" ? -1 : 1 };
    if (ajedrez.isGameOver()) return { ...vacio(), evaluacionCentipawns: 0 };
    await this.listo;
    if (this.cerrado) throw new DOMException("Análisis cancelado", "AbortError");
    if (this.solicitud) throw new Error("Ya hay una posición en análisis.");
    return new Promise((resolve, reject) => {
      this.solicitud = { resolve, reject, turno, analisis: vacio(), timer: setTimeout(() => this.fallar(new Error("El motor no respondió. Tu partida sigue disponible para reintentar.")), this.limiteMs) };
      this.worker.postMessage(`position fen ${fen}`);
      this.worker.postMessage(`go movetime ${Math.max(100, Math.min(2000, tiempoMs))}`);
    });
  }
  async analizar(fen: string, turno: "w" | "b", tiempoMs = 650) { await this.evaluarPosicion(fen, turno, tiempoMs); }
  private fallar(error: Error) {
    if (this.cerrado) return;
    this.cerrado = true; clearTimeout(this.cargaTimer);
    if (!this.preparado) this.rejectCarga(error);
    if (this.solicitud) { clearTimeout(this.solicitud.timer); this.solicitud.reject(error); this.solicitud = null; }
    this.worker.removeEventListener("message", this.recibir); this.worker.removeEventListener("error", this.error); this.worker.removeEventListener("messageerror", this.error); this.worker.terminate();
  }
  destruir() { this.fallar(new DOMException("Análisis cancelado", "AbortError")); }
}
