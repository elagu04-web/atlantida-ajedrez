import { Chess, type Square, type PieceSymbol } from "chess.js";

export const NIVELES_PRACTICA = [
  {id:"suave",nombre:"Suave",detalle:"Para empezar y encontrar oportunidades",skill:0,tiempoMs:350},
  {id:"club",nombre:"Club",detalle:"Un rival para practicar sin apuro",skill:4,tiempoMs:550},
  {id:"fuerte",nombre:"Fuerte",detalle:"Te exige calcular y cuidar cada pieza",skill:10,tiempoMs:850},
  {id:"experto",nombre:"Experto",detalle:"Un desafío con pocas concesiones",skill:20,tiempoMs:1400},
] as const;
export type NivelPractica = typeof NIVELES_PRACTICA[number]["id"];
export type ColorPractica = "w" | "b";
export const DATOS_BOTS_PRACTICA = {
  stockfish:{nombre:"Bot Atlántida",elo:null,imagen:null},
  fonchi:{nombre:"Fonchi y el Hipopótamo",elo:2150,imagen:"/imagenes/fonchi-hipopotamo-bot.png"},
  matias:{nombre:"Matías y su viento a favor",elo:2250,imagen:"/imagenes/matias-morra-bot.png"},
  victor:{nombre:"Víctor Terminator",elo:2300,imagen:"/imagenes/victor-terminator-avatar.png"},
} as const;
export const APERTURA_MORRA = ["e2e4","c7c5","d2d4","c5d4","c2c3","d4c3","b1c3"] as const;
export type PerfilBot = keyof typeof DATOS_BOTS_PRACTICA;
export type GuardadoPractica = {version:1;color:ColorPractica;nivel:NivelPractica;perfil?:PerfilBot;jugadas:string[];rendida:boolean};
export const CLAVE_PRACTICA = "atlantida-practica-v1";
export const sanPractica = (san:string) => san.replace(/^[KQRBN]/u,p=>({K:"R",Q:"D",R:"T",B:"A",N:"C"}[p]??p)).replace(/=([QRBN])/u,(_,p:string)=>`=${({Q:"D",R:"T",B:"A",N:"C"}[p]??p)}`);
export const uciPractica = (m:{from:string;to:string;promotion?:string})=>`${m.from}${m.to}${m.promotion??""}`;

export class PartidaPractica {
  readonly ajedrez = new Chess();
  private rendida = false;
  constructor(readonly color:ColorPractica="w",readonly nivel:NivelPractica="club",readonly perfil:PerfilBot="stockfish"){
    if((perfil==="fonchi"||perfil==="victor")&&color!=="w")throw new Error("Fonchi y Víctor siempre juegan con negras.");
    if(perfil==="matias"&&color!=="b")throw new Error("Matías siempre juega con blancas.");
    if(perfil==="matias")for(const uci of APERTURA_MORRA)this.ajedrez.move(uci);
  }
  get turnoJugador(){return !this.terminada&&this.ajedrez.turn()===this.color;}
  get terminada(){return this.rendida||this.ajedrez.isGameOver();}
  get jugadas(){return this.ajedrez.history({verbose:true}).map(uciPractica);}
  get jugadasIniciales(){return this.perfil==="matias"?APERTURA_MORRA.length:0;}
  get puedeDeshacer(){return this.jugadas.length-this.jugadasIniciales>=(this.ajedrez.turn()===this.color?2:1);}
  moverJugador(from:Square,to:Square,promotion?:PieceSymbol){
    if(!this.turnoJugador)return false;
    try{return !!this.ajedrez.move({from,to,promotion});}catch{return false;}
  }
  moverBot(uci:string){
    if(this.terminada||this.ajedrez.turn()===this.color||!this.esLegal(uci))return false;
    this.ajedrez.move(uci);return true;
  }
  esLegal(uci:string){return this.ajedrez.moves({verbose:true}).some(m=>uciPractica(m)===uci);}
  promociones(from:Square,to:Square){return this.ajedrez.moves({square:from,verbose:true}).filter(m=>m.to===to&&m.promotion).map(m=>m.promotion!);}
  deshacer(){
    if(!this.puedeDeshacer)return false;
    const cantidad=this.ajedrez.turn()===this.color?2:1;
    for(let i=0;i<cantidad;i++)this.ajedrez.undo();
    this.rendida=false;return true;
  }
  rendirse(){if(!this.terminada)this.rendida=true;}
  estado(){
    if(this.rendida)return {texto:"Te rendiste. Siempre hay revancha.",resultado:this.color==="w"?"0-1":"1-0"};
    if(this.ajedrez.isCheckmate())return {texto:this.ajedrez.turn()!==this.color?"¡Ganaste por jaque mate!":"Jaque mate. El bot ganó esta vez.",resultado:this.ajedrez.turn()==="w"?"0-1":"1-0"};
    if(this.ajedrez.isStalemate())return {texto:"Tablas por ahogado.",resultado:"1/2-1/2"};
    if(this.ajedrez.isInsufficientMaterial())return {texto:"Tablas: material insuficiente.",resultado:"1/2-1/2"};
    if(this.ajedrez.isThreefoldRepetition())return {texto:"Tablas por repetición de la posición.",resultado:"1/2-1/2"};
    if(this.ajedrez.isDrawByFiftyMoves())return {texto:"Tablas por la regla de las 50 jugadas.",resultado:"1/2-1/2"};
    return {texto:this.turnoJugador?(this.ajedrez.isCheck()?"Estás en jaque. Protegé tu rey.":"Tu turno. Elegí una pieza."):"Turno del bot.",resultado:"*"};
  }
  guardar():GuardadoPractica{return {version:1,color:this.color,nivel:this.nivel,perfil:this.perfil,jugadas:this.jugadas,rendida:this.rendida};}
  pgn(){
    const nivel=NIVELES_PRACTICA.find(n=>n.id===this.nivel)!;
    const bot=DATOS_BOTS_PRACTICA[this.perfil];
    const nombreBot=this.perfil==="stockfish"?`Bot Atlántida (${nivel.nombre})`:`${bot.nombre} (aprox. ${bot.elo})`;
    const cabeceras:Record<string,string>={Event:"Práctica Atlántida",Site:"Atlántida Ajedrez",White:this.color==="w"?"Jugador":nombreBot,Black:this.color==="b"?"Jugador":nombreBot,Result:this.estado().resultado};
    for(const [clave,valor] of Object.entries(cabeceras))this.ajedrez.setHeader(clave,valor);
    return this.ajedrez.pgn();
  }
  static recuperar(valor:unknown):PartidaPractica|null{
    if(!valor||typeof valor!=="object")return null;
    const v=valor as Partial<GuardadoPractica>;
    if(v.version!==1||!['w','b'].includes(v.color??'')||!NIVELES_PRACTICA.some(n=>n.id===v.nivel)||typeof v.rendida!=="boolean"||!Array.isArray(v.jugadas)||v.jugadas.length>1000)return null;
    if(v.perfil!==undefined&&!["stockfish","fonchi","victor","matias"].includes(v.perfil)||(v.perfil==="fonchi"||v.perfil==="victor")&&v.color!=="w"||v.perfil==="matias"&&v.color!=="b")return null;
    const partida=new PartidaPractica(v.color!,v.nivel!,v.perfil??"stockfish");
    if(partida.jugadasIniciales&&(v.jugadas.length<partida.jugadasIniciales||APERTURA_MORRA.some((uci,i)=>v.jugadas![i]!==uci)))return null;
    try{for(const uci of v.jugadas.slice(partida.jugadasIniciales)){if(typeof uci!=="string"||!partida.esLegal(uci)||partida.terminada)return null;partida.ajedrez.move(uci);}partida.rendida=v.rendida;return partida;}catch{return null;}
  }
}

// El modo suave alterna Stockfish con algunas jugadas legales para dejar oportunidades.
export function respuestaSuave(partida:PartidaPractica,mejor:string,azar:()=>number=Math.random){
  if(partida.perfil!=="stockfish"||partida.nivel!=="suave"||azar()>=.3)return mejor;
  const legales=partida.ajedrez.moves({verbose:true});
  const alternativas=legales.filter(m=>!m.san.includes("#")&&uciPractica(m)!==mejor);
  if(!alternativas.length)return mejor;
  return uciPractica(alternativas[Math.min(alternativas.length-1,Math.floor(azar()*alternativas.length))]);
}
export function colorAleatorioPractica():ColorPractica{return Math.random()<.5?"w":"b";}
