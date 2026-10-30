import {Chess,type Color,type Square} from 'chess.js';

export type PremovimientoOnline={mesa:string;ply:number;uci:string};
const casilla=/^[a-h][1-8]$/;
// Speculative geometry only. The opponent can move a blocker, put a piece on
// a pawn capture square, or give check. Full legality is checked after that move.
export function destinosPremovimiento(chess:Chess,color:Color,from:string):Square[]{
 if(!casilla.test(from))return [];
 const p=chess.get(from as Square);if(!p||p.color!==color)return [];
 const x=from.charCodeAt(0)-97,y=Number(from[1]),destinos:Square[]=[];
 for(let a=0;a<8;a++)for(let b=1;b<=8;b++){
  const to=String.fromCharCode(97+a)+b,dx=a-x,dy=b-y,ax=Math.abs(dx),ay=Math.abs(dy);
  if(!ax&&!ay)continue;
  const propia=chess.get(to as Square)?.color===color;
  if(p.type==='k'&&from===(color==='w'?'e1':'e8')&&b===y&&['a','c','g','h'].includes(to[0])){
   const corto=['g','h'].includes(to[0]),derecho=color==='w'?(corto?'K':'Q'):(corto?'k':'q'),torre=(corto?'h':'a')+y;
   const entre=corto?['f','g']:['b','c','d'];
   if(chess.fen().split(' ')[2].includes(derecho)&&chess.get(torre as Square)?.type==='r'&&chess.get(torre as Square)?.color===color&&entre.every(f=>chess.get((f+y) as Square)?.color!==color))destinos.push(to as Square);
   continue;
  }
  if(propia)continue;
  const dir=color==='w'?1:-1;
  const geometria=p.type==='n'?ax*ay===2:p.type==='k'?Math.max(ax,ay)===1:p.type==='p'?(dy===dir&&ax<=1||dx===0&&dy===2*dir&&y===(color==='w'?2:7)):p.type==='b'?ax===ay:p.type==='r'?dx===0||dy===0:p.type==='q'?(ax===ay||dx===0||dy===0):false;
  if(!geometria)continue;
  if(p.type!=='n'&&p.type!=='k'){
   const pasos=Math.max(ax,ay);let libre=true;
   for(let i=1;i<pasos;i++)if(chess.get((String.fromCharCode(97+x+Math.sign(dx)*i)+(y+Math.sign(dy)*i)) as Square)?.color===color)libre=false;
   if(!libre)continue;
  }
  destinos.push(to as Square);
 }
 return destinos;
}
export function normalizarPremovimiento(chess:Chess,color:Color,from:string,to:string):Square|null{
 if(!destinosPremovimiento(chess,color,from).includes(to as Square))return null;
 const p=chess.get(from as Square);
 if(p?.type==='k'&&from[0]==='e'&&from[1]===to[1]&&['a','h'].includes(to[0]))return ((to[0]==='h'?'g':'c')+from[1]) as Square;
 return to as Square;
}
export function resolverPremovimiento(p:PremovimientoOnline,mesa:string,ply:number,chess:Chess,color:Color):'esperar'|'ejecutar'|'cancelar'{
 if(p.mesa!==mesa||ply<p.ply||ply>p.ply+1)return 'cancelar';
 if(ply===p.ply)return chess.turn()!==color?'esperar':'cancelar';
 if(chess.turn()!==color)return 'cancelar';
 try{const copia=new Chess(chess.fen());copia.move({from:p.uci.slice(0,2),to:p.uci.slice(2,4),promotion:p.uci[4]});return 'ejecutar';}catch{return 'cancelar';}
}
