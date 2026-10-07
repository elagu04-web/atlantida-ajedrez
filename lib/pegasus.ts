import { ColaPegasus, DecodificadorPegasus } from "./pegasusProtocolo";
export const SERVICE_UUID="6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const TX_CHARACTERISTIC_UUID="6e400002-b5a3-f393-e0a9-e50e24dcca9e";
export const RX_CHARACTERISTIC_UUID="6e400003-b5a3-f393-e0a9-e50e24dcca9e";
// Comandos DGT contrastados con https://github.com/EdNekebno/PegasusChessComChromeExtension
const DEVELOPER_KEY=Uint8Array.of(0x63,0x07,0xbe,0xf5,0xae,0xdd,0xa9,0x5f,0x00);
const RESET=Uint8Array.of(0x40),ESTADO=Uint8Array.of(0x42),ACTUALIZACIONES=Uint8Array.of(0x44);
export function casillaDesdeIndice(indice:number):string {
  if(!Number.isInteger(indice)||indice<0||indice>63)throw new Error("Casilla fuera del tablero");
  return `${"abcdefgh"[indice%8]}${8-Math.floor(indice/8)}`;
}
export type PegasusCallbacks={onLog:(linea:string)=>void;onPiezaLevantada:(casilla:string)=>void;onPiezaApoyada:(casilla:string)=>void;onVolcadoTablero:(ocupado:boolean[])=>void;onBateria?:(porcentaje:number)=>void;onDesconectado?:()=>void;};
type Caracteristica=EventTarget&{value?:DataView;readValue:()=>Promise<DataView>;writeValue?:(v:Uint8Array)=>Promise<void>;writeValueWithResponse?:(v:Uint8Array)=>Promise<void>;writeValueWithoutResponse?:(v:Uint8Array)=>Promise<void>;properties?:{write?:boolean;writeWithoutResponse?:boolean};startNotifications:()=>Promise<Caracteristica>};
type Servicio={getCharacteristic:(uuid:string)=>Promise<Caracteristica>};
type Servidor={connected?:boolean;connect:()=>Promise<Servidor>;disconnect:()=>void;getPrimaryService:(uuid:string)=>Promise<Servicio>};
type Dispositivo=EventTarget&{gatt:Servidor};
type Bluetooth={requestDevice:(opciones:{filters:{services:string[]}[];optionalServices:string[]})=>Promise<Dispositivo>};
export async function conectarPegasus(cb:PegasusCallbacks){
  const bt=(navigator as unknown as {bluetooth?:Bluetooth}).bluetooth;
  if(!bt||!window.isSecureContext)throw new Error("Usá Chrome o Edge con HTTPS (o localhost) y Bluetooth disponible. Safari y Firefox no ofrecen esta conexión.");
  cb.onLog("Elegí el DGT Pegasus. Cerrá la app DGT Chess y otras conexiones al tablero.");
  const device=await bt.requestDevice({filters:[{services:[SERVICE_UUID]}],optionalServices:["battery_service"]});
  const cola=new ColaPegasus();let cerrado=false,rx:Caracteristica|undefined,tx:Caracteristica|undefined;
  let bateriaTimer:ReturnType<typeof setInterval>|undefined,estadoTimer:ReturnType<typeof setInterval>|undefined,pedidoTimer:ReturnType<typeof setTimeout>|undefined;
  let timeout:ReturnType<typeof setTimeout>|undefined,pendiente=false,fallos=0;
  const decoder=new DecodificadorPegasus(m=>{if(cerrado)return;if(m.tipo==="tablero")cb.onVolcadoTablero(m.ocupado);else {const c=casillaDesdeIndice(m.indice);if(m.ocupada)cb.onPiezaApoyada(c);else cb.onPiezaLevantada(c);programarEstado();}},cb.onLog);
  const notificacion=(event:Event)=>{const valor=(event.target as Caracteristica)?.value;if(valor&&!cerrado)decoder.agregar(valor);};
  function limpiar(){if(cerrado)return;cerrado=true;cola.cerrar();clearInterval(bateriaTimer);clearInterval(estadoTimer);clearTimeout(pedidoTimer);clearTimeout(timeout);rx?.removeEventListener("characteristicvaluechanged",notificacion);device.removeEventListener("gattserverdisconnected",desconectado);decoder.reiniciar();}
  function desconectado(){limpiar();cb.onLog("Se cortó Bluetooth. La partida se conserva; reconectá y acomodá las piezas antes de seguir.");cb.onDesconectado?.();}
  device.addEventListener("gattserverdisconnected",desconectado);
  async function escribir(bytes:Uint8Array){const c=tx!;await cola.ejecutar(()=>c.properties?.write&&c.writeValueWithResponse?c.writeValueWithResponse(bytes):c.properties?.writeWithoutResponse&&c.writeValueWithoutResponse?c.writeValueWithoutResponse(bytes):c.writeValue?c.writeValue(bytes):Promise.reject(new Error("El tablero no permite escribir comandos")));}
  async function pedirEstado(){if(cerrado||pendiente||!tx)return;pendiente=true;try{await escribir(ESTADO);fallos=0;}catch{if(!cerrado&&++fallos===3)cb.onLog("No llega respuesta al pedir el tablero. Revisá Bluetooth; podés reconectar sin borrar la partida.");}finally{pendiente=false;}}
  function programarEstado(){clearTimeout(pedidoTimer);pedidoTimer=setTimeout(()=>void pedirEstado(),250);}
  try{
    cb.onLog("Conectando al tablero…");const conectando=device.gatt.connect();
    void conectando.then(s=>{if(cerrado)s.disconnect();},()=>{});
    const server=await Promise.race([conectando,new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(new Error("El tablero no respondió en 30 segundos. Cerrá otras apps conectadas y volvé a intentar.")),30000);})]);clearTimeout(timeout);
    const servicio=await cola.ejecutar(()=>server.getPrimaryService(SERVICE_UUID));rx=await cola.ejecutar(()=>servicio.getCharacteristic(RX_CHARACTERISTIC_UUID));tx=await cola.ejecutar(()=>servicio.getCharacteristic(TX_CHARACTERISTIC_UUID));
    rx.addEventListener("characteristicvaluechanged",notificacion);await cola.ejecutar(()=>rx!.startNotifications());
    await escribir(DEVELOPER_KEY);await escribir(RESET);await escribir(ACTUALIZACIONES);await escribir(ESTADO);
    try{const servicioBateria=await cola.ejecutar(()=>server.getPrimaryService("battery_service")),bateria=await cola.ejecutar(()=>servicioBateria.getCharacteristic("battery_level"));const leer=async()=>{try{const v=await cola.ejecutar(()=>bateria.readValue());if(!cerrado&&v.byteLength&&v.getUint8(0)<=100)cb.onBateria?.(v.getUint8(0));}catch{}};await leer();bateriaTimer=setInterval(()=>void leer(),60000);}catch{/* Batería opcional. */}
    if(cerrado)throw new Error("El tablero se desconectó durante la preparación.");
    estadoTimer=setInterval(()=>void pedirEstado(),2000);cb.onLog("Bluetooth listo. Comprobando las piezas antes de registrar movimientos.");
    return {pedirEstado,desconectar(){limpiar();device.gatt.disconnect();cb.onDesconectado?.();}};
  }catch(error){limpiar();try{device.gatt.disconnect();}catch{}throw error;}
}
