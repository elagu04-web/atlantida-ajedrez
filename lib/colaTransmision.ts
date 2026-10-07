/** Una escritura en vuelo, conserva el último estado y reintenta sin perderlo. */
export class ColaTransmision<T> {
  private pendiente:{datos:T;version:number}|null=null;private version=0;private enviando=false;private cerrada=false;
  private esperas:{version:number;resolver:(ok:boolean)=>void}[]=[];
  constructor(private guardar:(datos:T)=>Promise<void>,private estado:(estado:"guardando"|"guardado"|"pendiente",error?:unknown)=>void){}
  agregar(datos:T):Promise<boolean>{if(this.cerrada)return Promise.resolve(false);this.pendiente={datos,version:++this.version};const respuesta=new Promise<boolean>(resolver=>this.esperas.push({version:this.version,resolver}));void this.reintentar();return respuesta;}
  private responder(version:number,ok:boolean){const listas=this.esperas.filter(e=>e.version<=version);this.esperas=this.esperas.filter(e=>e.version>version);listas.forEach(e=>e.resolver(ok));}
  async reintentar(){
    if(this.enviando||this.cerrada||!this.pendiente)return;this.enviando=true;
    try{while(this.pendiente&&!this.cerrada){const actual:{datos:T;version:number}=this.pendiente;this.estado("guardando");try{await this.guardar(actual.datos);}catch(error){this.responder(this.version,false);this.estado("pendiente",error);return;}this.responder(actual.version,true);if(this.pendiente?.version===actual.version){this.pendiente=null;this.estado("guardado");}}}finally{this.enviando=false;}
  }
  cerrar(){this.cerrada=true;this.responder(this.version,false);}
}
