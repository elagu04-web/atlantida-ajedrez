import { DATOS_BOTS_PRACTICA, NIVELES_PRACTICA, type NivelPractica } from "./partidaPractica";

export type VarianteMotor={uci:string;tipo:"cp"|"mate";valor:number;profundidad:number};

export class MotorPractica {
  private variantesActuales=new Map<string,VarianteMotor>();
  get variantes(){return [...this.variantesActuales.values()];}
  readonly listo:Promise<void>;
  private worker:Worker;
  private cerrado=false;
  private errorCierre:Error|null=null;
  private preparado=false;
  private resolverCarga:()=>void=()=>{};
  private rechazarCarga:(error:Error)=>void=()=>{};
  private cargaTimer:ReturnType<typeof setTimeout>;
  private busqueda:{resolve:(uci:string)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}|null=null;
  constructor(crearWorker:()=>Worker=()=>new Worker("/stockfish/stockfish-18-lite-single.js"),cargaMs=30000,private limiteMs=20000){
    this.worker=crearWorker();
    this.listo=new Promise((resolve,reject)=>{this.resolverCarga=resolve;this.rechazarCarga=reject;});
    this.cargaTimer=setTimeout(()=>this.fallar(new Error("El bot tardó demasiado en cargar. Probá de nuevo.")),cargaMs);
    this.worker.addEventListener("message",this.recibir);
    this.worker.addEventListener("error",this.errorWorker);
    this.worker.addEventListener("messageerror",this.errorWorker);
    this.worker.postMessage("uci");
  }
  private errorWorker=(event:Event)=>{event.preventDefault();this.fallar(new Error("No se pudo iniciar el bot. Revisá la conexión y probá de nuevo."));};
  private recibir=(event:MessageEvent)=>{
    if(this.cerrado)return;
    for(const linea of String(event.data).split(/\r?\n/u)){
      if(linea.trim()==="uciok"){
        this.worker.postMessage("setoption name Hash value 16");
        this.worker.postMessage("setoption name MultiPV value 1");
        this.worker.postMessage("setoption name UCI_LimitStrength value false");
        this.worker.postMessage("isready");
      }
      if(linea.trim()==="readyok"&&!this.preparado){this.preparado=true;clearTimeout(this.cargaTimer);this.resolverCarga();}
      if(this.busqueda&&!/\b(?:upperbound|lowerbound)\b/u.test(linea)){
        const info=linea.match(/\bdepth (\d+).*?\bscore (cp|mate) (-?\d+).*?\bpv ([a-h][1-8][a-h][1-8][qrbn]?)(?:\s|$)/u);
        if(info){const [,depth,tipo,valor,uci]=info;const previa=this.variantesActuales.get(uci);if(!previa||Number(depth)>=previa.profundidad)this.variantesActuales.set(uci,{uci,tipo:tipo as "cp"|"mate",valor:Number(valor),profundidad:Number(depth)});}
      }
      if(linea.startsWith("bestmove ")&&this.busqueda){
        const solicitud=this.busqueda;this.busqueda=null;clearTimeout(solicitud.timer);
        const uci=linea.trim().split(/\s+/u)[1];
        if(/^[a-h][1-8][a-h][1-8][qrbn]?$/u.test(uci))solicitud.resolve(uci);
        else solicitud.reject(new Error("El bot no devolvió una jugada. Podés reintentar."));
      }
    }
  };
  async buscar(jugadas:string[],nivel:NivelPractica,pista=false,opciones:{elo?:number;searchmoves?:string[];estiloAtaque?:boolean;evaluar?:boolean}={}):Promise<string>{
    await this.listo;
    if(this.cerrado)throw this.errorCierre??new DOMException("Búsqueda cancelada","AbortError");
    if(this.busqueda)throw new Error("El bot ya está pensando.");
    if(!jugadas.every(m=>/^[a-h][1-8][a-h][1-8][qrbn]?$/u.test(m)))throw new Error("Secuencia inválida.");
    if(opciones.elo!==undefined&&!Object.values(DATOS_BOTS_PRACTICA).some(b=>b.elo===opciones.elo))throw new Error("Fuerza de práctica inválida.");
    if(opciones.searchmoves&&(!opciones.searchmoves.length||!opciones.searchmoves.every(m=>/^[a-h][1-8][a-h][1-8][qrbn]?$/u.test(m))))throw new Error("Apertura inválida.");
    this.variantesActuales.clear();
    // La evaluación de una apertura usa toda la fuerza; la partida conserva su Elo.
    const limitada=!pista&&!opciones.evaluar&&opciones.elo!==undefined;
    const dificultad=NIVELES_PRACTICA.find(n=>n.id===nivel)!;
    return new Promise((resolve,reject)=>{
      this.busqueda={resolve,reject,timer:setTimeout(()=>this.fallar(new Error("El bot no respondió. Tu partida está guardada; reintentá.")),this.limiteMs)};
      this.worker.postMessage(`setoption name MultiPV value ${!pista&&!opciones.evaluar&&opciones.estiloAtaque?4:1}`);
      this.worker.postMessage(`setoption name UCI_LimitStrength value ${limitada}`);
      if(limitada)this.worker.postMessage(`setoption name UCI_Elo value ${opciones.elo}`);
      this.worker.postMessage(`setoption name Skill Level value ${pista||opciones.evaluar||limitada?20:dificultad.skill}`);
      this.worker.postMessage(`position startpos${jugadas.length?` moves ${jugadas.join(" ")}`:""}`);
      this.worker.postMessage(`go movetime ${pista||opciones.evaluar||limitada?1000:dificultad.tiempoMs}${!pista&&opciones.searchmoves?` searchmoves ${opciones.searchmoves.join(" ")}`:""}`);
    });
  }
  private fallar(error:Error){
    if(this.cerrado)return;
    this.errorCierre=error;
    if(!this.preparado)this.rechazarCarga(error);
    if(this.busqueda){clearTimeout(this.busqueda.timer);this.busqueda.reject(error);this.busqueda=null;}
    this.cerrar();
  }
  private cerrar(){this.cerrado=true;clearTimeout(this.cargaTimer);this.worker.removeEventListener("message",this.recibir);this.worker.removeEventListener("error",this.errorWorker);this.worker.removeEventListener("messageerror",this.errorWorker);this.worker.terminate();}
  destruir(){this.fallar(new DOMException("Búsqueda cancelada","AbortError"));}
}