import { NIVELES_PRACTICA, type NivelPractica } from "./partidaPractica";

export class MotorPractica {
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
      if(linea.startsWith("bestmove ")&&this.busqueda){
        const solicitud=this.busqueda;this.busqueda=null;clearTimeout(solicitud.timer);
        const uci=linea.trim().split(/\s+/u)[1];
        if(/^[a-h][1-8][a-h][1-8][qrbn]?$/u.test(uci))solicitud.resolve(uci);
        else solicitud.reject(new Error("El bot no devolvió una jugada. Podés reintentar."));
      }
    }
  };
  async buscar(jugadas:string[],nivel:NivelPractica,pista=false):Promise<string>{
    await this.listo;
    if(this.cerrado)throw this.errorCierre??new DOMException("Búsqueda cancelada","AbortError");
    if(this.busqueda)throw new Error("El bot ya está pensando.");
    if(!jugadas.every(m=>/^[a-h][1-8][a-h][1-8][qrbn]?$/u.test(m)))throw new Error("Secuencia inválida.");
    const dificultad=NIVELES_PRACTICA.find(n=>n.id===nivel)!;
    return new Promise((resolve,reject)=>{
      this.busqueda={resolve,reject,timer:setTimeout(()=>this.fallar(new Error("El bot no respondió. Tu partida está guardada; reintentá.")),this.limiteMs)};
      this.worker.postMessage(`setoption name Skill Level value ${pista?20:dificultad.skill}`);
      this.worker.postMessage(`position startpos${jugadas.length?` moves ${jugadas.join(" ")}`:""}`);
      this.worker.postMessage(`go movetime ${pista?1000:dificultad.tiempoMs}`);
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