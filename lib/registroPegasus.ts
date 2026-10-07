import { Chess, type Move, type Square } from "chess.js";
import { casillaDesdeIndice } from "./pegasus";
export const QUIETUD_PEGASUS_MS=900;
export function ocupacion(chess:Chess){return chess.board().flat().map(Boolean);}
export function diferencias(chess:Chess,real:boolean[]){const esperada=ocupacion(chess);return esperada.flatMap((v,i)=>v===real[i]?[]:[casillaDesdeIndice(i)]);}
export type LecturaPegasus={tipo:"sin-foto"|"acomodar"|"moviendo"|"sin-cambio"|"desajuste"|"elegir"|"jugada";diferencias:string[];candidatos:Move[]};

/** Pegasus ve ocupación, no identifica piezas. Nunca inventa varias jugadas para encajar una foto. */
export class RegistroPegasus {
  private real:boolean[]|null=null;
  private tocadas=new Set<string>();
  private apoyadas=new Set<string>();
  private actividad=0;
  private sincronizado=false;
  private candidata:{movimiento:Move;posteriores:Set<string>;apoyosPosteriores:Set<string>}|null=null;
  iniciarConexion(){this.real=null;this.tocadas.clear();this.apoyadas.clear();this.sincronizado=false;this.candidata=null;}
  campo(casilla:string,ocupada:boolean,ahora=Date.now()){
    if(!this.real)return;
    const indice=(8-Number(casilla[1]))*8+"abcdefgh".indexOf(casilla[0]);
    if(indice<0||indice>63||this.real[indice]===ocupada)return;
    this.real[indice]=ocupada;this.tocadas.add(casilla);this.candidata?.posteriores.add(casilla);this.actividad=ahora;
    if(ocupada){this.apoyadas.add(casilla);this.candidata?.apoyosPosteriores.add(casilla);}else{this.apoyadas.delete(casilla);this.candidata?.apoyosPosteriores.delete(casilla);}
  }
  /** Confirma una transición realmente observada cuando empieza el siguiente turno.
   * Permite jugadas rápidas sin buscar ni inventar secuencias desde una sola foto. */
  campoConPartida(chess:Chess,casilla:string,ocupada:boolean,ahora=Date.now()):Move|null{
    let confirmada:Move|null=null;
    if(this.candidata&&!ocupada){
      const prueba=new Chess(chess.fen());prueba.move(this.candidata.movimiento.san);
      if(prueba.get(casilla as Square)?.color===prueba.turn()){
        // La capturada del siguiente turno puede retirarse primero. Esos cambios
        // deben encajar en una continuación legal, no en una corrección abandonada.
        const posteriores=this.candidata.posteriores;
        const compatible=prueba.moves({verbose:true}).filter(m=>m.from===casilla).some(m=>{
          const permitidas=new Set<string>([m.from,m.to]);
          if(m.isEnPassant())permitidas.add(`${m.to[0]}${m.from[1]}`);
          if(m.isKingsideCastle()||m.isQueensideCastle()){permitidas.add(`${m.isKingsideCastle()?"h":"a"}${m.from[1]}`);permitidas.add(`${m.isKingsideCastle()?"f":"d"}${m.from[1]}`);}
          return [...posteriores].every(c=>permitidas.has(c));
        });
        if(compatible){confirmada=chess.move(this.candidata.movimiento.san);this.tocadas=new Set(posteriores);this.apoyadas=new Set(this.candidata.apoyosPosteriores);}
        this.candidata=null;
      }
    }
    this.campo(casilla,ocupada,ahora);
    if(this.sincronizado){const lectura=this.evaluar(chess,ahora+2001,0);const m=lectura.candidatos[0];const torreEnEspera=lectura.tipo==="elegir"&&lectura.candidatos.length===1&&m.piece==="r"&&!m.captured&&!m.promotion;if(lectura.tipo==="jugada"||torreEnEspera)this.candidata={movimiento:m,posteriores:new Set(),apoyosPosteriores:new Set()};}
    return confirmada;
  }
  foto(real:boolean[],ahora=Date.now()){
    if(real.length!==64)throw new Error("Se requieren las 64 casillas");
    if(!this.real||real.some((v,i)=>v!==this.real![i]))this.actividad=ahora;
    if(this.real)real.forEach((v,i)=>{if(v!==this.real![i]){const c=casillaDesdeIndice(i);this.tocadas.add(c);this.candidata?.posteriores.add(c);if(v){this.apoyadas.add(c);this.candidata?.apoyosPosteriores.add(c);}else{this.apoyadas.delete(c);this.candidata?.apoyosPosteriores.delete(c);}}});
    this.real=[...real];
  }
  confirmar(){this.tocadas.clear();this.apoyadas.clear();this.candidata=null;}
  exigirAcomodo(){this.sincronizado=false;this.tocadas.clear();this.apoyadas.clear();this.candidata=null;}
  evaluar(chess:Chess,ahora=Date.now(),quietud=QUIETUD_PEGASUS_MS):LecturaPegasus{
    const resultado=(tipo:LecturaPegasus["tipo"],candidatos:Move[]=[],distintas:string[]=[]):LecturaPegasus=>({tipo,candidatos,diferencias:distintas});
    if(!this.real)return resultado("sin-foto");
    const distintas=diferencias(chess,this.real);
    if(!distintas.length){this.sincronizado=true;this.tocadas.clear();this.apoyadas.clear();this.candidata=null;return resultado("sin-cambio");}
    if(!this.sincronizado)return resultado("acomodar",[],distintas);
    if(ahora-this.actividad<quietud)return resultado("moviendo",[],distintas);
    let candidatos=chess.moves({verbose:true}).filter(m=>{const prueba=new Chess(chess.fen());prueba.move(m.san);return !diferencias(prueba,this.real!).length;});
    // Si faltó la notificación de una captura, su destino no se puede deducir sólo por ocupación.
    if(candidatos.length>1){const conEventos=candidatos.filter(m=>this.tocadas.has(m.from)&&this.tocadas.has(m.to));if(conEventos.length)candidatos=conEventos;}
    if(candidatos.length===1){
      const m=candidatos[0];
      // Levantar la atacante puede parecer una captura aunque siga en la mano.
      // Sin un apoyo observado en el destino se requiere confirmación humana.
      if(m.captured&&!this.apoyadas.has(m.to))return resultado("elegir",[m],distintas);
      // La torre puede ser la primera mitad de un enroque: esperar al rey o a una confirmación.
      const enroques=chess.moves({verbose:true}).filter(c=>c.isKingsideCastle()||c.isQueensideCastle());
      const torreEnroque=enroques.some(c=>m.piece==="r"&&m.from===`${c.isKingsideCastle()?"h":"a"}${c.from[1]}`&&m.to===`${c.isKingsideCastle()?"f":"d"}${c.from[1]}`);
      if(torreEnroque){if(ahora-this.actividad<Math.max(2000,quietud))return resultado("moviendo",[],distintas);return resultado("elegir",[m],distintas);}
      return resultado("jugada",[m],distintas);
    }
    return candidatos.length?resultado("elegir",candidatos,distintas):resultado("desajuste",[],distintas);
  }
  confirmarJugada(chess:Chess,san:string){const m=chess.move(san);this.confirmar();return m;}
}

export function recuperarPartida(datos:{pgn?:string|null;jugadas?:string[];fen?:string|null}){
  const chess=new Chess();
  if(datos.pgn){chess.loadPgn(datos.pgn);if(datos.fen&&chess.fen()!==datos.fen)throw new Error("El PGN y la posición guardada no coinciden");return chess;}
  for(const san of datos.jugadas??[])chess.move(san);
  if(datos.fen&&chess.fen()!==datos.fen){if(!datos.jugadas?.length){chess.load(datos.fen);return chess;}throw new Error("Las jugadas y la posición guardada no coinciden");}
  return chess;
}

export function hacerJugadaManual(chess:Chess,uci:string){
  const valor=uci.trim().toLowerCase();
  if(!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(valor))throw new Error("Escribí origen y destino, por ejemplo e2e4 o a7a8q.");
  return chess.move({from:valor.slice(0,2) as Square,to:valor.slice(2,4) as Square,promotion:valor[4]});
}
