/* Seamless host integration. The original private game engines keep their own state and storage keys. */
(function(root){
 'use strict';
 if(root.parent===root)return;
 const canal='atlantida-clases-v1',origin=location.origin;
 let scheduled=false,lastHeight=0,ready=false;
 const send=(tipo,datos={})=>root.parent.postMessage({canal,tipo,...datos},origin);
 function measure(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;const height=Math.ceil(document.body.getBoundingClientRect().height);if(height!==lastHeight){lastHeight=height;send('alto',{alto:height});}});}
 function arrange(){
  const id=root.Mesa?.current(),mode=root.Mesa?.mode(id),screen=mode&&document.getElementById(mode.screen);
  if(!screen)return;
  const voice=screen.querySelector('.voice-panel'),side=screen.querySelector('.side-panel');
  if(voice&&side&&!side.contains(voice))side.prepend(voice);
  const instruction=screen.querySelector('.board-panel > .instruction');
  if(instruction&&side){const help=document.createElement('div');help.className='clase-ayuda';help.append(instruction);side.prepend(help);}
 }
 function catalog(){
  if(!root.Mesa)return;
  const juegos=root.Mesa.modes().map(m=>({id:m.id,title:m.title,description:m.description,tag:m.tag||'',meta:m.meta||'',category:m.category||'game',size:m.size,rows:m.rows||m.size,order:m.order,preview:m.preview||[]}));
  const pantalla=document.getElementById('prof-open-students');let aula=null;
  if(pantalla)try{aula=new URL(pantalla.href).searchParams.get('aula');}catch{}
  send('catalogo',{juegos,aula});send('sonido',{activo:root.MesaSound?.isEnabled()!==false});measure();
 }
 root.addEventListener('message',e=>{
  if(e.origin!==origin||e.source!==root.parent||e.data?.canal!==canal)return;
  const d=e.data;
  if(d.tipo==='conectar'&&ready)catalog();
  else if(d.tipo==='abrir'&&ready&&typeof d.id==='string'&&(d.id==='menu'||root.Mesa.mode(d.id)))root.Mesa.navigate(d.id);
  else if(d.tipo==='viewport'&&Number.isFinite(d.alto)){document.documentElement.style.setProperty('--clase-alto',Math.max(360,Math.min(2400,d.alto))+'px');measure();}
  else if(d.tipo==='sonido'&&typeof d.activo==='boolean')root.MesaSound?.setEnabled(d.activo);
 });
 root.addEventListener('mesa:modechange',e=>{document.body.dataset.claseActual=e.detail.id;arrange();send('modo',{id:e.detail.id});measure();});
 root.addEventListener('atlantida:sonido',e=>send('sonido',e.detail));
 document.addEventListener('DOMContentLoaded',()=>{
  ready=true;document.body.dataset.claseActual=root.Mesa?.current()||'menu';arrange();
  new ResizeObserver(measure).observe(document.body);
  new MutationObserver(measure).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open','class']});
  // Legacy starts focus their game section. Restore the host toolbar after that scroll,
  // without interfering with piece clicks, dragging, history or saved class state.
  document.addEventListener('click',e=>{const button=e.target.closest?.('button');if(button&&/(^start$|-start$)/.test(button.id))requestAnimationFrame(()=>send('enfocar'));});
  document.addEventListener('load',measure,true);root.addEventListener('resize',measure);catalog();
 });
})(globalThis);
