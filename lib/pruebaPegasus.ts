import { Chess, type Move } from "chess.js";
import { RegistroPegasus, ocupacion } from "./registroPegasus";
export const PARTIDA_PRUEBA="e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#";
export function eventosJugada(m:Move,atacadaPrimero=false):[string,boolean][]{
  const origen:[string,boolean]=[m.from,false],destino:[string,boolean]=[m.to,true];
  const captura:[string,boolean]|null=m.isEnPassant()?[`${m.to[0]}${m.from[1]}`,false]:m.captured?[m.to,false]:null;
  const eventos:[string,boolean][]=captura?(atacadaPrimero?[captura,origen,destino]:[origen,captura,destino]):[origen,destino];
  if(m.isKingsideCastle()||m.isQueensideCastle()){eventos.push([`${m.isKingsideCastle()?"h":"a"}${m.from[1]}`,false],[`${m.isKingsideCastle()?"f":"d"}${m.from[1]}`,true]);}
  return eventos;
}
export function ejecutarPruebaPegasus(rapida:boolean,orden:"atacante"|"atacada"|"alternar"){
  const esperado=new Chess(),registrado=new Chess(),sensor=new RegistroPegasus();let ahora=10000,confirmaciones=0;
  sensor.foto(ocupacion(esperado),ahora);sensor.evaluar(registrado,ahora);
  PARTIDA_PRUEBA.split(" ").forEach((san,i)=>{
    const m=esperado.move(san);
    for(const [c,ocupada] of eventosJugada(m,orden==="atacada"||(orden==="alternar"&&i%2===0))){ahora+=40;sensor.campoConPartida(registrado,c,ocupada,ahora);}
    // Duplicados y fotos periódicas no deben inventar una jugada ni reiniciar la quietud.
    sensor.foto(ocupacion(esperado),ahora);
    if(!rapida){
      ahora+=2500;const lectura=sensor.evaluar(registrado,ahora);
      if(lectura.tipo==="elegir"){
        // La prueba conoce la planilla y simula la confirmación del operador.
        // El registro real conserva la elección humana ante una ambigüedad.
        const elegida=lectura.candidatos.find(m=>m.san===san);
        if(!elegida)throw new Error(`No se encontró la opción ${san}`);
        sensor.confirmarJugada(registrado,elegida.san);confirmaciones++;
      }else if(lectura.tipo==="jugada")sensor.confirmarJugada(registrado,lectura.candidatos[0].san);
      else throw new Error(`No se reconoció ${san}: ${lectura.tipo}`);
    }
  });
  if(rapida){const ultima=sensor.evaluar(registrado,ahora+2500);if(ultima.tipo==="jugada")sensor.confirmarJugada(registrado,ultima.candidatos[0].san);}
  if(registrado.fen()!==esperado.fen()||registrado.history().join(" ")!==PARTIDA_PRUEBA)throw new Error("El registro no coincide con la partida completa");
  return {fen:registrado.fen(),jugadas:registrado.history(),pgn:registrado.pgn(),confirmaciones};
}
