/* Local wooden-piece impact. No external audio, tracking or autoplay. */
(function(root){
 'use strict';
 let enabled=true,context=null,master=null,noise=null,count=0;
 try{enabled=localStorage.getItem('mesa-sound')!=='off';}catch{}
 const button=document.createElement('button');button.id='mesa-sound';button.className='secondary sound-toggle';button.type='button';document.getElementById('back-menu')?.before(button);
 function render(){button.textContent=enabled?'Sonido: sí':'Sonido: no';button.setAttribute('aria-label',enabled?'Silenciar sonidos':'Activar sonidos');button.setAttribute('aria-pressed',String(enabled));root.dispatchEvent(new CustomEvent('atlantida:sonido',{detail:{activo:enabled}}));}
 function unlock(){
  if(!enabled)return;
  try{if(!context){const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return;context=new Audio();master=context.createGain();const compressor=context.createDynamicsCompressor();compressor.threshold.value=-8;compressor.ratio.value=8;master.connect(compressor);compressor.connect(context.destination);master.gain.value=.7;noise=context.createBuffer(1,Math.ceil(context.sampleRate*.07),context.sampleRate);const d=noise.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;context.onstatechange=()=>{button.dataset.audioState=context.state;};}if(context.state==='suspended')void context.resume().catch(()=>{});button.dataset.audioState=context.state;}catch{}
 }
 function tone(freq,time,duration,volume=.15,end=freq){const o=context.createOscillator(),g=context.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,time);o.frequency.exponentialRampToValueAtTime(end,time+duration);g.gain.setValueAtTime(volume,time);g.gain.exponentialRampToValueAtTime(.001,time+duration);o.connect(g);g.connect(master);o.start(time);o.stop(time+duration+.01);o.onended=()=>{o.disconnect();g.disconnect();};}
 function play(kind='move'){
  if(!enabled)return;unlock();if(!context)return;
  if(context.state==='suspended'){void context.resume().then(()=>{if(context?.state==='running')play(kind);}).catch(()=>{});return;}
  if(context.state!=='running')return;
  try{const t=context.currentTime+.003;
   if(['move','capture','place','drop'].includes(kind)){
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=noise;filter.type='bandpass';filter.frequency.value=kind==='capture'?1500:1900;filter.Q.value=.7;gain.gain.setValueAtTime(1.4,t);gain.gain.exponentialRampToValueAtTime(.001,t+.065);source.connect(filter);filter.connect(gain);gain.connect(master);source.start(t);source.stop(t+.07);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};tone(kind==='capture'?360:460,t,.1,.6,kind==='capture'?110:150);
   }else if(kind==='win'){[523,659,784].forEach((f,i)=>tone(f,t+i*.12,.2,.1));}
   else if(kind==='draw'){tone(392,t,.15,.1);tone(330,t+.15,.2,.1);}
   else if(kind==='dice'){[360,270,410,230].forEach((f,i)=>tone(f,t+i*.045,.06,.12,100));}
   else if(kind==='check'){tone(740,t,.08,.1);tone(740,t+.13,.12,.1);}
   else if(kind==='undo')tone(330,t,.12,.09,220);
   else {tone(440,t,.1,.1);tone(660,t+.08,.15,.08);}
   button.dataset.lastSound=kind;button.dataset.soundCount=String(++count);
  }catch{}
 }
 function setEnabled(value){enabled=!!value;try{localStorage.setItem('mesa-sound',enabled?'on':'off');}catch{}if(master)master.gain.value=enabled&&!document.hidden?.7:0;render();}
 button.addEventListener('click',()=>{setEnabled(!enabled);if(enabled)play('move');});
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('visibilitychange',()=>{if(master)master.gain.value=enabled&&!document.hidden?.7:0;});
 root.addEventListener('storage',e=>{if(e.key==='mesa-sound')setEnabled(e.newValue!=='off');});
 root.MesaSound={play,setEnabled,isEnabled:()=>enabled};render();
})(globalThis);
