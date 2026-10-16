import {leerBibliotecaEntrenamiento, type SesionEntrenamiento} from "./entrenamientoPersonal";
import {combinarProgresoGuiado,leerProgresoGuiado,progresoGuiadoInicial,type ProgresoGuiado} from "./entrenamientoGuiado";

export type DocumentoEntrenamiento={clave:string;revision:number;datos:unknown};
export type RespuestaGuardado={conflicto:boolean;revision:number;datos:unknown};
export type TransporteEntrenamiento={
  listar:(conocidos:Map<string,DocumentoEntrenamiento>)=>Promise<DocumentoEntrenamiento[]>;
  guardar:(clave:string,datos:unknown,revision:number)=>Promise<RespuestaGuardado>;
};
export type AlmacenEntrenamiento={getItem:(k:string)=>string|null;setItem:(k:string,v:string)=>void};
export type EstadoGuardado="local"|"cargando"|"guardando"|"guardado"|"pendiente";
export type VistaEntrenamientoCuenta={sesiones:SesionEntrenamiento[];guiado:ProgresoGuiado;estado:EstadoGuardado;errorLocal:boolean;pendientes:number};
export const clavesEntrenamiento=(cuenta:string)=>({biblioteca:`atlantida-entrenamiento-v1:${cuenta}`,guiado:`atlantida-entrenamiento-guiado-v1:${cuenta}`});
export function firmaEntrenamiento(v:unknown):string{
  if(Array.isArray(v))return `[${v.map(firmaEntrenamiento).join(",")}]`;
  if(v&&typeof v==="object")return `{${Object.entries(v).filter(([,x])=>x!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>`${JSON.stringify(k)}:${firmaEntrenamiento(x)}`).join(",")}}`;
  return JSON.stringify(v)??"null";
}
export function normalizarSesionCuenta(s:SesionEntrenamiento):SesionEntrenamiento{
  return {...s,practicasActualizadas:Object.fromEntries(Object.keys(s.practicas).map(k=>[k,s.practicasActualizadas?.[k]??s.actualizada])),notasActualizadas:Object.fromEntries(Object.keys(s.notas??{}).map(k=>[k,s.notasActualizadas?.[k]??s.actualizada]))};
}
export function combinarSesionCuenta(a:SesionEntrenamiento,b:SesionEntrenamiento):SesionEntrenamiento{
  a=normalizarSesionCuenta(a);b=normalizarSesionCuenta(b);
  const nueva=b.actualizada>=a.actualizada?b:a;
  if(a.pgn!==b.pgn||a.color!==b.color)return nueva;
  const practicas={...nueva.practicas},notas={...nueva.notas},pt={...nueva.practicasActualizadas},nt={...nueva.notasActualizadas};
  for(const k of new Set([...Object.keys(a.practicas),...Object.keys(b.practicas)])){
    const indice=Number(k),j=nueva.resultado.jugadas[indice];
    const compatible=(s:SesionEntrenamiento)=>s.resultado.jugadas[indice]?.fenAntes===j?.fenAntes&&s.resultado.jugadas[indice]?.mejorJugadaSan===j?.mejorJugadaSan;
    const pa=compatible(a)?a.practicas[k]:undefined,pb=compatible(b)?b.practicas[k]:undefined;
    if(!pa&&!pb){delete practicas[k];delete pt[k];continue;}
    const elegida=!pa?b:!pb?a:(b.practicasActualizadas?.[k]??"")>=(a.practicasActualizadas?.[k]??"")?b:a;
    const valor=elegida.practicas[k];
    practicas[k]={...valor,aciertos:Math.max(pa?.aciertos??0,pb?.aciertos??0),fallos:Math.max(pa?.fallos??0,pb?.fallos??0)};
    pt[k]=elegida.practicasActualizadas![k];
  }
  for(const k of new Set([...Object.keys(a.notas??{}),...Object.keys(b.notas??{})])){
    const elegida=(b.notasActualizadas?.[k]??"")>=(a.notasActualizadas?.[k]??"")?b:a;
    notas[k]=elegida.notas?.[k]??"";nt[k]=elegida.notasActualizadas?.[k]??elegida.actualizada;
  }
  const finales: NonNullable<SesionEntrenamiento["finales"]> = {};
  for (const k of new Set([...Object.keys(a.finales ?? {}), ...Object.keys(b.finales ?? {})])) {
    const fen = nueva.resultado.jugadas[Number(k)]?.fenAntes;
    const ea = a.finales?.[k]?.fen === fen ? a.finales[k] : undefined;
    const eb = b.finales?.[k]?.fen === fen ? b.finales[k] : undefined;
    const elegida = !ea ? eb : !eb ? ea : eb.actualizada >= ea.actualizada ? eb : ea;
    if (elegida) finales[k] = elegida;
  }
  return {...nueva,creada:a.creada<b.creada?a.creada:b.creada,practicas,notas,practicasActualizadas:pt,notasActualizadas:nt,...(a.finales || b.finales ? {finales} : {})};
}
export function unirSesionesCuenta(...listas:SesionEntrenamiento[][]){
  const mapa=new Map<string,SesionEntrenamiento>();
  for(const s of listas.flat()){const anterior=mapa.get(s.id);mapa.set(s.id,anterior?combinarSesionCuenta(anterior,s):normalizarSesionCuenta(s));}
  return [...mapa.values()].sort((a,b)=>b.creada.localeCompare(a.creada)||a.id.localeCompare(b.id));
}
function datosValidos(clave:string,datos:unknown):SesionEntrenamiento|ProgresoGuiado|null{
  if(clave==="guiado:v1")return datos&&typeof datos==="object"&&"version" in datos&&datos.version===1?leerProgresoGuiado(JSON.stringify(datos)):null;
  if(!clave.startsWith("sesion:"))return null;
  const sesion=leerBibliotecaEntrenamiento(JSON.stringify([datos]))[0];
  return sesion&&clave===`sesion:${sesion.id}`?normalizarSesionCuenta(sesion):null;
}

/** An account-scoped local cache plus versioned cloud documents. No guest data
 * is silently assigned to a signed-in user, and failed writes remain pending. */
export class EntrenamientoCuenta {
  private vista:VistaEntrenamientoCuenta;
  private guiadoPersistido=false;
  private remotos=new Map<string,DocumentoEntrenamiento>();
  private escuchas=new Set<()=>void>();
  private detenida=false;
  private procesando:Promise<void>|null=null;
  private repetir=false;
  private temporizador:ReturnType<typeof setTimeout>|null=null;
  readonly claves;
  constructor(readonly cuenta:string,private almacen:AlmacenEntrenamiento,private transporte:TransporteEntrenamiento|null){
    this.claves=clavesEntrenamiento(cuenta);
    let sesiones:SesionEntrenamiento[]=[],guiado=progresoGuiadoInicial(),errorLocal=false;
    try{sesiones=unirSesionesCuenta(leerBibliotecaEntrenamiento(almacen.getItem(this.claves.biblioteca)??"[]"));const crudo=almacen.getItem(this.claves.guiado);this.guiadoPersistido=!!crudo;if(crudo)guiado=leerProgresoGuiado(crudo);}catch{errorLocal=true;}
    this.vista={sesiones,guiado,errorLocal,estado:transporte?"cargando":"local",pendientes:0};
  }
  leer=()=>this.vista;
  suscribir=(fn:()=>void)=>{this.escuchas.add(fn);return()=>{this.escuchas.delete(fn);};};
  private publicar(p:Partial<VistaEntrenamientoCuenta>={}){if(this.detenida)return;this.vista={...this.vista,...p};this.escuchas.forEach(fn=>fn());}
  private documentos(){const mapa=new Map<string,unknown>(this.vista.sesiones.map(s=>[`sesion:${s.id}`,s]));if(this.guiadoPersistido)mapa.set("guiado:v1",this.vista.guiado);return mapa;}
  private pendientes(){return [...this.documentos()].filter(([k,v])=>firmaEntrenamiento(v)!==firmaEntrenamiento(this.remotos.get(k)?.datos)).length;}
  private persistir(){
    let errorLocal=false;
    try{this.almacen.setItem(this.claves.biblioteca,JSON.stringify(this.vista.sesiones));if(this.guiadoPersistido)this.almacen.setItem(this.claves.guiado,JSON.stringify(this.vista.guiado));}catch{errorLocal=true;}
    this.publicar({errorLocal,pendientes:this.pendientes()});
  }
  guardarSesion=(s:SesionEntrenamiento)=>{
    if(this.detenida)return;
    const valida=leerBibliotecaEntrenamiento(JSON.stringify([s]))[0];if(!valida)throw new Error("No pudimos guardar esa sesión: revisá sus datos.");
    this.publicar({sesiones:unirSesionesCuenta(this.vista.sesiones,[valida])});this.persistir();this.programar();
  };
  guardarGuiado=(p:ProgresoGuiado)=>{
    if(this.detenida)return;this.guiadoPersistido=true;this.publicar({guiado:combinarProgresoGuiado(this.vista.guiado,p)});this.persistir();this.programar();
  };
  importar=(sesiones:SesionEntrenamiento[],guiado?:ProgresoGuiado)=>{
    if(this.detenida)return;
    this.publicar({sesiones:unirSesionesCuenta(this.vista.sesiones,sesiones)});
    if(guiado){this.guiadoPersistido=true;this.publicar({guiado:combinarProgresoGuiado(this.vista.guiado,guiado)});}
    this.persistir();this.programar();
  };
  recargarLocal=()=>{
    if(this.detenida)return;
    try{const sesiones=leerBibliotecaEntrenamiento(this.almacen.getItem(this.claves.biblioteca)??"[]"),g=this.almacen.getItem(this.claves.guiado);
      this.publicar({sesiones:unirSesionesCuenta(this.vista.sesiones,sesiones)});
      if(g){this.guiadoPersistido=true;this.publicar({guiado:combinarProgresoGuiado(this.vista.guiado,leerProgresoGuiado(g))});}
      this.programar();
    }catch{this.publicar({errorLocal:true});}
  };
  private incorporar(clave:string,datos:unknown){
    const valor=datosValidos(clave,datos);if(!valor)return;
    if(clave==="guiado:v1"){
      const nuevo=this.guiadoPersistido?combinarProgresoGuiado(valor as ProgresoGuiado,this.vista.guiado):valor as ProgresoGuiado;
      this.guiadoPersistido=true;this.publicar({guiado:nuevo});
    }else this.publicar({sesiones:unirSesionesCuenta([valor as SesionEntrenamiento],this.vista.sesiones)});
  }
  private programar(){if(!this.transporte||this.detenida)return;this.publicar({estado:"guardando"});if(this.temporizador)clearTimeout(this.temporizador);this.temporizador=setTimeout(()=>void this.sincronizar(),400);}
  sincronizar=():Promise<void>=>{
    if(this.detenida||!this.transporte)return Promise.resolve();
    if(this.procesando){this.repetir=true;return this.procesando;}
    this.procesando=this.ejecutar().finally(()=>{this.procesando=null;if(this.repetir&&!this.detenida){this.repetir=false;this.programar();}});
    return this.procesando;
  };
  private async ejecutar(){
    const transporte=this.transporte!;this.publicar({estado:"guardando"});
    try{
      const documentos=await transporte.listar(this.remotos);if(this.detenida)return;
      for(const d of documentos){const valor=datosValidos(d.clave,d.datos);if(!valor)throw new Error("Documento remoto inválido.");this.remotos.set(d.clave,{...d,datos:valor});this.incorporar(d.clave,valor);}
      this.persistir();
      for(const [clave] of this.documentos()){
        for(let intento=0;intento<4;intento++){
          if(this.detenida)return;
          const local=this.documentos().get(clave),remoto=this.remotos.get(clave);
          if(firmaEntrenamiento(local)===firmaEntrenamiento(remoto?.datos))break;
          const respuesta=await transporte.guardar(clave,local,remoto?.revision??0);if(this.detenida)return;
          if(respuesta.revision===0&&respuesta.conflicto){this.remotos.delete(clave);continue;}
          const valida=datosValidos(clave,respuesta.datos);if(!valida)throw new Error("Respuesta de guardado inválida.");
          this.remotos.set(clave,{clave,revision:respuesta.revision,datos:valida});this.incorporar(clave,valida);this.persistir();
          if(!respuesta.conflicto)break;
        }
      }
      const pendientes=this.pendientes();this.publicar({estado:pendientes?"pendiente":"guardado",pendientes});
    }catch{if(!this.detenida)this.publicar({estado:"pendiente",pendientes:this.pendientes()});}
  }
  reactivar=()=>{this.detenida=false;};
  detener=()=>{this.detenida=true;if(this.temporizador)clearTimeout(this.temporizador);};
}
