/* Cburnett SVG pieces: Colin M. L. Burnett, GPL-2.0-or-later. See /piezas/cburnett/CREDITOS.txt. */
(function(root){
 'use strict';
 const glyphs={'♔':['k','w'],'♕':['q','w'],'♖':['r','w'],'♗':['b','w'],'♘':['n','w'],'♙':['p','w'],'♚':['k','b'],'♛':['q','b'],'♜':['r','b'],'♝':['b','b'],'♞':['n','b'],'♟':['p','b'],'🐉':['d','w'],'🐲':['d','b']};
 function html(type,color='w',className='piece'){
  if(typeof type!=='string'||type.length!==1||!'kqrbnpd'.includes(type))return '';
  const key=(color==='b'?'b':'w')+type.toUpperCase(),src=type==='d'?(root.DragonArtAssets?.[key]||'vendor/dragon/'+key+'.svg'):'/piezas/cburnett/'+key+'.svg';
  return `<img class="chess-art ${className}" src="${src}" alt="" aria-hidden="true" draggable="false">`;
 }
 function fromGlyph(glyph,className='preview-art'){const p=glyphs[glyph];return p?html(p[0],p[1],className):glyph;}
 function decorate(container){container.querySelectorAll('.tiny-line>span,.classic-rule-overview>span,.forest-column-guide b').forEach(el=>{for(const node of [...el.childNodes])if(node.nodeType===3){const p=glyphs[node.textContent.trim()];if(p){const wrapper=document.createElement('span');wrapper.innerHTML=html(p[0],'w','icon-art');node.replaceWith(wrapper.firstChild);}}});}
 root.PieceArt={html,fromGlyph,decorate};
})(globalThis);
