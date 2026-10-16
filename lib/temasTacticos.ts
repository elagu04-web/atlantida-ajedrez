export const GRUPOS_TACTICOS = [
  { id: "motivos", nombre: "Ataques y defensores" },
  { id: "maniobras", nombre: "Maniobras y defensa" },
  { id: "rey", nombre: "Ataque al rey" },
  { id: "peones", nombre: "Peones y jugadas especiales" },
  { id: "mates", nombre: "Redes de mate" },
] as const;
export type GrupoTactico = typeof GRUPOS_TACTICOS[number]["id"];
export type TemaTactico = { id: string; nombre: string; alias: string; grupo: GrupoTactico; definicion: string };
const tema = (id: string, nombre: string, alias: string, grupo: GrupoTactico, definicion: string): TemaTactico => ({id,nombre,alias,grupo,definicion});
export const TEMAS_TACTICOS: TemaTactico[] = [
  tema("fork","Ataque doble","doblete tenedor horquilla doble ataque","motivos","Una pieza ataca dos o más objetivos a la vez. La amenaza sobre uno permite ganar el otro."),
  tema("pin","Clavada","clavado absoluta relativa","motivos","Mover una pieza dejaría expuesto al rey o a un objetivo más valioso que está detrás. Aprovechá esa limitación."),
  tema("skewer","Enfilada","ataque en linea inversa clavada","motivos","La pieza más valiosa está delante: al apartarse del ataque, deja expuesta la que está detrás. No es lo mismo que rayos X."),
  tema("xRayAttack","Rayos X","rayos x ataque a traves radiografia","motivos","Una pieza de largo alcance ejerce presión a través de una pieza rival. Al desaparecer la pantalla, la línea cobra efecto."),
  tema("discoveredAttack","Ataque descubierto","descubierta ataque a la descubierta","motivos","Mover una pieza abre la línea de ataque de otra. La pieza que se aparta también puede crear una amenaza."),
  tema("discoveredCheck","Jaque descubierto","jaque a la descubierta","motivos","La pieza que se aparta abre una línea de jaque de otra pieza. El rival debe atender ese jaque."),
  tema("doubleCheck","Jaque doble","dos jaques simultaneos","motivos","Dos piezas dan jaque a la vez. El rey debe moverse: capturar o tapar una sola línea no resuelve ambos jaques."),
  tema("hangingPiece","Pieza indefensa","pieza colgada sin defensa capturar gratis","motivos","Una pieza puede capturarse sin compensación suficiente porque no está defendida o su defensa no alcanza."),
  tema("trappedPiece","Pieza atrapada","encerrada sin escape cazar dama","motivos","Una pieza atacada no tiene una retirada segura. Primero restringí sus salidas y después aprovechá la captura."),
  tema("capturingDefender","Eliminar al defensor","eliminacion del defensor captura defensor quitar defensa","motivos","Capturá la pieza que cumple una tarea defensiva importante para poder aprovechar la debilidad que deja."),
  tema("deflection","Desviación","desviar distraer apartar defensor","motivos","Obligá a una pieza a abandonar su tarea defensiva. A diferencia de la atracción, importa la casilla que deja de defender."),
  tema("attraction","Atracción","atraer atraer rey llevar a casilla","motivos","Forzá a una pieza rival a ocupar una casilla donde una táctica posterior funciona. Importa el lugar al que llega."),
  tema("overload","Sobrecarga","defensor sobrecargado demasiadas tareas","motivos","Un defensor tiene dos obligaciones que no puede cumplir a la vez. La sobrecarga puede permitir una desviación, pero no son sinónimos."),
  tema("sacrifice","Sacrificio","entrega sacrificar material calidad","maniobras","Entregá material para conseguir una compensación concreta: ataque, mate, promoción o recuperación con ventaja."),
  tema("clearance","Despeje","despejar liberar casilla linea evacuacion","maniobras","Apartá una pieza para liberar una casilla, fila, columna o diagonal que otra pieza necesita aprovechar."),
  tema("interference","Interferencia","intercepcion interponer cortar comunicacion","maniobras","Interponé una pieza entre dos piezas rivales para cortar una línea de defensa o de coordinación."),
  tema("intermezzo","Jugada intermedia","zwischenzug intermedia antes de recapturar","maniobras","Antes de la respuesta esperada, intercalá una amenaza que el rival debe atender. Después retomá la operación en mejores condiciones."),
  tema("quietMove","Jugada tranquila","jugada silenciosa calma amenaza oculta","maniobras","Una jugada sin jaque ni captura prepara una amenaza decisiva. No todas las tácticas empiezan con una jugada forzada."),
  tema("defensiveMove","Jugada defensiva","defensa defender parar amenaza recurso defensivo","maniobras","Encontrá una respuesta precisa a la amenaza rival. La defensa puede ser activa: no siempre consiste en retroceder."),
  tema("zugzwang","Zugzwang","obligacion de mover cualquier jugada empeora","maniobras","El rival estaría mejor si pudiera pasar: cualquiera de sus jugadas empeora su posición."),
  tema("collinearMove","Maniobra en la misma línea","movimiento colineal colinear enfrentadas","maniobras","Dos piezas rivales se enfrentan en una línea y una se desplaza por esa misma línea sin capturar a la otra."),
  tema("exposedKing","Rey expuesto","rey desprotegido descubierto sin refugio","rey","El rey tiene poco refugio o pocos defensores. Aprovechá las líneas abiertas y limitá sus casillas de escape."),
  tema("kingsideAttack","Ataque por el flanco de rey","enroque corto ataque al enroque corto","rey","Concentrá amenazas contra el rey refugiado en el flanco de rey, coordinando piezas y rupturas de peones."),
  tema("queensideAttack","Ataque por el flanco de dama","enroque largo ataque al enroque largo","rey","El ataque se dirige al rey en el flanco de dama. Revisá las líneas abiertas y las casillas alrededor del enroque largo."),
  tema("attackingF2F7","Ataque a f2 o f7","punto debil f2 f7 peon del alfil","rey","Aprovechá la vulnerabilidad de f2 o f7, casillas que al inicio solo defiende el rey."),
  tema("advancedPawn","Peón avanzado","peon pasado cerca de coronar","peones","Un peón cerca de la última fila crea amenazas de promoción y puede desviar o inmovilizar a los defensores."),
  tema("promotion","Promoción","coronacion coronar promocion peon","peones","Un peón llega a la última fila y se transforma en dama, torre, alfil o caballo. Elegí según lo que exige la posición."),
  tema("underPromotion","Subpromoción","subcoronacion coronar caballo torre alfil","peones","Coroná una pieza distinta de la dama para dar un jaque decisivo, evitar el ahogado o resolver una necesidad concreta."),
  tema("enPassant","Captura al paso","comer al paso en passant","peones","Justo después de que un peón rival avance dos casillas, un peón vecino puede capturarlo como si hubiera avanzado una."),
  tema("castling","Enroque","enrocar corto largo","peones","El movimiento conjunto de rey y torre también puede crear una amenaza táctica o resolver una defensa, si el enroque es legal."),
  tema("mate","Ataque de mate","jaque mate red de mate rey","mates","Coordiná un jaque del que el rey no pueda escapar: no debe existir captura del atacante, bloqueo ni casilla segura."),
  tema("mateIn1","Mate en una","mate en 1 una jugada","mates","Tu próxima jugada da jaque mate. Comprobá todas las salidas del rey y las posibles defensas."),
  tema("mateIn2","Mate en dos","mate en 2 dos jugadas","mates","Forzá el mate en dos jugadas propias, incluyendo la respuesta más resistente del rival entre ambas."),
  tema("mateIn3","Mate en tres","mate en 3 tres jugadas","mates","Forzá el mate en tres jugadas propias. El cálculo tiene que cubrir las defensas del rival."),
  tema("mateIn4","Mate en cuatro","mate en 4 cuatro jugadas","mates","La secuencia de mate requiere cuatro jugadas propias contra la mejor defensa."),
  tema("mateIn5","Mate en cinco o más","mate en 5 cinco largo","mates","Una red forzada de mate que requiere al menos cinco jugadas propias, con las defensas rivales incluidas."),
  tema("backRankMate","Mate de la última fila","pasillo octava primera fila","mates","Una torre o dama da mate en la primera u octava fila; las piezas o peones del rey bloquean su salida hacia adelante."),
  tema("smotheredMate","Mate de la coz","mate ahogado caballo asfixia philidor","mates","Un caballo da mate a un rey encerrado por sus propias piezas. No lo confundas con el ahogado, que es tablas."),
  tema("arabianMate","Mate árabe","arabe torre caballo esquina","mates","Torre y caballo se coordinan contra el rey en la esquina: el caballo protege la torre y controla una casilla de escape."),
  tema("anastasiaMate","Mate de Anastasia","anastasia torre caballo borde","mates","Una torre o dama da mate por el borde y un caballo controla las salidas; una pieza rival puede completar el encierro."),
  tema("bodenMate","Mate de Boden","boden dos alfiles cruzados","mates","Dos alfiles atacan por diagonales cruzadas a un rey cuyas propias piezas le impiden escapar."),
  tema("doubleBishopMate","Mate de dos alfiles","dos alfiles diagonales paralelas","mates","Dos alfiles coordinados en diagonales próximas cierran las rutas de escape y dan mate."),
  tema("dovetailMate","Mate de la cola de paloma","cola paloma dama","mates","La dama da mate junto al rey en diagonal; las dos salidas que la dama no controla están bloqueadas por piezas del propio rey."),
  tema("swallowstailMate","Mate de la cola de golondrina","cola golondrina dama","mates","La dama da mate cerca del rey formando una red en V, con las salidas restantes bloqueadas por piezas defensoras."),
  tema("epauletteMate","Mate de las charreteras","charretera hombreras","mates","El rey queda bloqueado a ambos lados por sus propias piezas y una pieza de largo alcance remata el encierro."),
  tema("cornerMate","Mate del rincón","esquina rincon caballo","mates","Un caballo da el jaque final y una torre o dama restringe al rey en una esquina."),
  tema("hookMate","Mate del gancho","gancho torre caballo peon","mates","Torre, caballo y peón se coordinan para dar mate; un peón rival también puede bloquear la salida del rey."),
  tema("pillsburysMate","Mate de Pillsbury","pillsbury torre alfil","mates","Una torre da el jaque final mientras un alfil controla las casillas de escape del rey."),
  tema("morphyMate","Mate de Morphy","morphy alfil torre","mates","Un alfil da el jaque final y una torre ayuda a encerrar al rey."),
  tema("operaMate","Mate de la ópera","opera alfil torre","mates","Una torre da el jaque final protegida por un alfil que también contribuye a cerrar la red."),
  tema("triangleMate","Mate del triángulo","triangulo dama torre","mates","Dama y torre, separadas por una casilla en la misma fila o columna, forman con el rey la red triangular de mate."),
  tema("vukovicMate","Mate de Vuković","vukovic torre caballo","mates","La torre da mate con apoyo de otra pieza mientras un caballo restringe las salidas del rey."),
  tema("balestraMate","Mate de Balestra","balestra alfil dama","mates","El alfil da el jaque final y la dama controla las casillas de escape del rey."),
  tema("blindSwineMate","Mate de los cerditos","cerditos dos torres septima","mates","Dos torres en la séptima o segunda fila se coordinan para encerrar al rey y dar mate."),
  tema("killBoxMate","Mate de la caja","caja dama torre","mates","La torre se coloca junto al rey para dar mate y una dama la protege, cerrando una pequeña zona de escape."),
] ;

const normalizar = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const palabras = (s: string) => normalizar(s).split(/[^a-z0-9]+/).filter(Boolean);
const vacias = new Set(["de","del","la","el","los","las","en","al","a","con","por","y"]);
function distanciaUno(a: string,b: string): boolean {
  if(a.length<5||b.length<5||Math.abs(a.length-b.length)>1)return false;
  let i=0,j=0,errores=0;
  while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++errores>1)return false;if(a.length<=b.length)j++;if(a.length>=b.length)i++;}
  return errores+(i<a.length||j<b.length?1:0)<=1;
}
export function sugerirTemas(consulta: string, opciones: {grupo?:GrupoTactico; excluir?:string[]; limite?:number} = {}): TemaTactico[] {
  const q=normalizar(consulta),tokens=palabras(q).filter(t=>!vacias.has(t));
  return TEMAS_TACTICOS.filter(t=>(!opciones.grupo||t.grupo===opciones.grupo)&&!opciones.excluir?.includes(t.id))
    .map((t,i)=>{const nombre=normalizar(t.nombre),texto=palabras(`${t.nombre} ${t.alias} ${t.id}`);let score=0;
      for(const token of tokens){const puntos=Math.max(0,...texto.map(p=>p===token?6:p.startsWith(token)?4:distanciaUno(p,token)?1:0));if(!puntos)return {t,score:-1,i};score+=puntos;}
      return {t,score:score+(q&&nombre===q?30:q&&nombre.startsWith(q)?10:q&&normalizar(t.alias).startsWith(q)?8:0),i};})
    .filter(t=>t.score>=0).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,opciones.limite??8).map(t=>t.t);
}
export const obtenerTema = (id:string) => TEMAS_TACTICOS.find(t=>t.id===id);
export type RevisionTema = {tema:TemaTactico;estado:"confirmada"|"general"|"relacionada"|"sinConfirmar"; referencia?:TemaTactico};
// Only broader concepts are accepted as general: a specific motif is never inferred from a broad source label.
const padres:Record<string,string[]> = {discoveredCheck:["discoveredAttack"],doubleCheck:["discoveredCheck","discoveredAttack"],underPromotion:["promotion","advancedPawn"],promotion:["advancedPawn"]};
for(const t of TEMAS_TACTICOS.filter(t=>t.grupo==="mates"&&t.id!=="mate"))padres[t.id]=["mate"];
export function revisarTemas(elegidos:string[],esperados:string[]):RevisionTema[]{
  return [...new Set(elegidos)].flatMap<RevisionTema>(id=>{const t=obtenerTema(id);if(!t)return [];
    if(esperados.includes(id))return [{tema:t,estado:"confirmada" as const}];
    const general=esperados.find(e=>padres[e]?.includes(id));if(general)return [{tema:t,estado:"general" as const,referencia:obtenerTema(general)}];
    const relacionado=id==="overload"&&esperados.includes("deflection");
    return [{tema:t,estado:relacionado?"relacionada" as const:"sinConfirmar" as const,referencia:relacionado?obtenerTema("deflection"):undefined}];
  });
}
