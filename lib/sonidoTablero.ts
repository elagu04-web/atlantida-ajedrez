// Golpe breve de madera sintetizado: no requiere archivos ni peticiones de red.
// Sólo se prepara tras un gesto del usuario, como exige el navegador.
export class SonidoTablero {
  private contexto:AudioContext|null=null;
  private salida:GainNode|null=null;
  private ruido:AudioBuffer|null=null;
  private volumen=.85;
  private habilitado=true;
  configurar(habilitado:boolean,volumen:number){this.habilitado=habilitado;this.volumen=Math.max(0,Math.min(1,volumen));}
  activar(){
    if(!this.habilitado)return;
    try{
      if(!this.contexto){
        const ctx=new AudioContext();this.contexto=ctx;
        const compresor=ctx.createDynamicsCompressor();
        compresor.threshold.value=-8;compresor.knee.value=3;compresor.ratio.value=8;compresor.attack.value=.001;compresor.release.value=.08;
        this.salida=ctx.createGain();this.salida.connect(compresor);compresor.connect(ctx.destination);
        this.ruido=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*.07),ctx.sampleRate);
        const datos=this.ruido.getChannelData(0);for(let i=0;i<datos.length;i++)datos[i]=Math.random()*2-1;
      }
      if(this.contexto.state==="suspended")void this.contexto.resume().catch(()=>{});
    }catch{/* Sin audio disponible, la partida sigue funcionando. */}
  }
  golpe(captura=false){
    const ctx=this.contexto;if(!this.habilitado||!ctx||ctx.state!=="running"||!this.salida||!this.ruido)return;
    const t=ctx.currentTime;this.salida.gain.setValueAtTime(this.volumen,t);
    const fuente=ctx.createBufferSource();fuente.buffer=this.ruido;
    const filtro=ctx.createBiquadFilter();filtro.type="bandpass";filtro.frequency.value=captura?1500:1900;filtro.Q.value=.7;
    const ataque=ctx.createGain();ataque.gain.setValueAtTime(1.4,t);ataque.gain.exponentialRampToValueAtTime(.001,t+.065);
    fuente.connect(filtro);filtro.connect(ataque);ataque.connect(this.salida);fuente.start(t);fuente.stop(t+.07);
    const cuerpo=ctx.createOscillator();cuerpo.type="triangle";cuerpo.frequency.setValueAtTime(captura?360:460,t);cuerpo.frequency.exponentialRampToValueAtTime(captura?110:150,t+.035);
    const resonancia=ctx.createGain();resonancia.gain.setValueAtTime(.65,t);resonancia.gain.exponentialRampToValueAtTime(.001,t+.1);
    cuerpo.connect(resonancia);resonancia.connect(this.salida);cuerpo.start(t);cuerpo.stop(t+.11);
    fuente.onended=()=>{fuente.disconnect();filtro.disconnect();ataque.disconnect();};
    cuerpo.onended=()=>{cuerpo.disconnect();resonancia.disconnect();};
  }
  cerrar(){const ctx=this.contexto;this.contexto=null;this.salida=null;this.ruido=null;if(ctx)void ctx.close().catch(()=>{});}
}
