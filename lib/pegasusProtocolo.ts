/** DGT: identificador con bit alto, longitud de 14 bits (incluye cabecera), datos. */
export type MensajePegasus = { tipo:"casilla"; indice:number; ocupada:boolean } | { tipo:"tablero"; ocupado:boolean[] };
export class DecodificadorPegasus {
  private buffer:number[]=[];
  constructor(private recibir:(mensaje:MensajePegasus)=>void, private error:(mensaje:string)=>void=()=>{}) {}
  reiniciar(){this.buffer=[];}
  agregar(valor:DataView) {
    for(let i=0;i<valor.byteLength;i++)this.buffer.push(valor.getUint8(i));
    while(this.buffer.length){
      if(!(this.buffer[0]&128)){this.buffer.shift();continue;}
      if(this.buffer.length<3)return;
      const longitud=(this.buffer[1]<<7)|this.buffer[2];
      if(this.buffer[1]>127||this.buffer[2]>127||longitud<3||longitud>2048){this.error("Cabecera Bluetooth inválida; esperando el siguiente mensaje.");this.buffer.shift();continue;}
      if(this.buffer.length<longitud)return;
      const trama=this.buffer.splice(0,longitud);
      if(trama[0]===0x8e){
        if(longitud!==5||trama[3]>63||trama[4]>1){this.error("Actualización de casilla inválida.");continue;}
        this.recibir({tipo:"casilla",indice:trama[3],ocupada:trama[4]===1});
      } else if(trama[0]===0x86){
        if(longitud!==67){this.error("Foto de tablero incompleta o inválida.");continue;}
        this.recibir({tipo:"tablero",ocupado:trama.slice(3).map(Boolean)});
      }
    }
  }
}
/** Recupera la cola después de un rechazo, sin ejecutar dos operaciones GATT a la vez. */
export class ColaPegasus {
  private anterior:Promise<unknown>=Promise.resolve();private cerrada=false;
  ejecutar<T>(operacion:()=>Promise<T>):Promise<T>{const actual=this.anterior.then(()=>{if(this.cerrada)throw new Error("Tablero desconectado");return operacion();});this.anterior=actual.catch(()=>{});return actual;}
  cerrar(){this.cerrada=true;}
}
