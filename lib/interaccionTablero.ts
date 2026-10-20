import {Chess,type Square} from 'chess.js';

// Accept both conventional king destinations and king-to-rook gestures.
// A gesture is normalized only when chess.js confirms that castling is legal.
export function destinoTablero(chess:Chess,from:string,to:string):Square|null{
 if(!/^[a-h][1-8]$/.test(from)||!/^[a-h][1-8]$/.test(to))return null;
 const legales=chess.moves({square:from as Square,verbose:true});
 if(legales.some(m=>m.to===to))return to as Square;
 if(chess.get(from as Square)?.type!=='k')return null;
 const torre=chess.get(to as Square);
 if(torre?.type!=='r'||torre.color!==chess.turn()||from[1]!==to[1])return null;
 const flag=to[0]==='h'?'k':to[0]==='a'?'q':null;
 return legales.find(m=>flag&&m.flags.includes(flag))?.to??null;
}
