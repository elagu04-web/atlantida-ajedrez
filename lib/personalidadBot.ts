import type { PerfilBot } from "./partidaPractica";
export type EmocionBot="esperando"|"pensando"|"captura"|"jaque"|"amenazado"|"victoria"|"derrota"|"tablas";
const FRASES:Record<PerfilBot,Record<EmocionBot,string>>={
  fonchi:{esperando:"Vos ocupá el centro. El hipo espera acá atrás.",pensando:"Shhh… el hipo está pensando.",captura:"Un bocadito para el hipopótamo.",jaque:"¡Se despertó el hipo!",amenazado:"Pará, que me hacés levantar al hipo.",victoria:"El hipo esperó su momento.",derrota:"Hoy el hipo tenía sueño. ¿Revancha?",tablas:"El hipo y yo firmamos la paz."},
  victor:{esperando:"Objetivo: tu rey.",pensando:"Analizando tu próxima equivocación…",captura:"Pieza eliminada.",jaque:"Objetivo localizado.",amenazado:"Amenaza detectada. Recalculando.",victoria:"Misión cumplida.",derrota:"Volveré.",tablas:"Empate registrado. La misión continúa."},
  stockfish:{esperando:"Probá una idea. Hay tiempo.",pensando:"Buscando la mejor respuesta…",captura:"Una pieza menos, un plan nuevo.",jaque:"¡Atención al rey!",amenazado:"Buen jaque. Veamos cómo seguimos.",victoria:"¿Probamos otra partida?",derrota:"Bien jugado. ¡Vamos por la revancha!",tablas:"Ni para vos ni para mí. Otra partida."},
};
export function fraseBot(perfil:PerfilBot,emocion:EmocionBot){return FRASES[perfil][emocion];}
