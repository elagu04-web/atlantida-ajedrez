import type {Figurita} from './album';
/** La firma gráfica es estable y propia de cada figurita, también entre dispositivos. */
export function arteFigurita(f:Pick<Figurita,'baseId'|'jugadorId'>){
 let semilla=2166136261;for(const c of f.baseId)semilla=Math.imul(semilla^c.charCodeAt(0),16777619)>>>0;
 const fonchi=f.jugadorId==='adaff79d-3a75-4532-8ff7-3ec7238a21b6';
 const familia=fonchi?'hipopotamo':(['club','mar','mate'] as const)[semilla%3];
 let x=semilla%8,y=(semilla>>>4)%8;const puntos=[`${x*10+15},${y*10+15}`];
 const saltos=[[1,2],[2,1],[-1,2],[-2,1],[1,-2],[2,-1],[-1,-2],[-2,-1]];
 let estado=semilla||1;
 for(let i=0;i<5;i++){estado^=estado<<13;estado^=estado>>>17;estado^=estado<<5;const posibles=saltos.filter(([dx,dy])=>x+dx>=0&&x+dx<8&&y+dy>=0&&y+dy<8);const [dx,dy]=posibles[(estado>>>0)%posibles.length];x+=dx;y+=dy;puntos.push(`${x*10+15},${y*10+15}`);}
 return {fondo:`/imagenes/album/${familia}.webp`,puntos:puntos.join(' '),marca:['♞','♜','♝','♛'][semilla%4],charly:f.baseId==='especial:charly-suerte'};
}
