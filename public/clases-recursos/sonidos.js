/* Recorded chess pieces. One shared player for the club and classroom. */
(function(root){
 'use strict';
 let enabled=true,player=null,count=0;
 try{enabled=localStorage.getItem('mesa-sound')!=='off';}catch{}
 const button=document.createElement('button');button.id='mesa-sound';button.className='secondary sound-toggle';button.type='button';document.getElementById('back-menu')?.before(button);
 const preparado=import('/clases-recursos/madera.js?v=1').then(({SonidoMadera})=>{
  player=new SonidoMadera();player.configurar(enabled&&!document.hidden,.85);return player;
 }).catch(()=>null);
 function render(){button.textContent=enabled?'Sonido: sí':'Sonido: no';button.setAttribute('aria-label',enabled?'Silenciar sonidos':'Activar sonidos');button.setAttribute('aria-pressed',String(enabled));root.dispatchEvent(new CustomEvent('atlantida:sonido',{detail:{activo:enabled}}));}
 function unlock(){if(enabled)player?.activar();}
 function play(kind='move'){
  if(!enabled||document.hidden)return;
  if(!player){const solicitado=Date.now();void preparado.then(p=>{if(p&&Date.now()-solicitado<450)play(kind);});return;}
  player.golpe(kind==='capture');button.dataset.lastSound=kind;button.dataset.soundCount=String(++count);button.dataset.audioSource='grabacion-real';
 }
 function setEnabled(value){enabled=!!value;try{localStorage.setItem('mesa-sound',enabled?'on':'off');}catch{}player?.configurar(enabled&&!document.hidden,.85);render();}
 button.addEventListener('click',()=>{setEnabled(!enabled);if(enabled)play('move');});
 document.addEventListener('pointerdown',unlock,{capture:true});document.addEventListener('keydown',unlock,{capture:true});
 document.addEventListener('visibilitychange',()=>player?.configurar(enabled&&!document.hidden,.85));
 root.addEventListener('storage',e=>{if(e.key==='mesa-sound')setEnabled(e.newValue!=='off');});
 root.MesaSound={play,setEnabled,isEnabled:()=>enabled};render();
})(globalThis);
