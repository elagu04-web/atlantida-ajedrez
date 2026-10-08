import Image from "next/image";
import { DATOS_BOTS_PRACTICA, type PerfilBot } from "@/lib/partidaPractica";
import { fraseBot, type EmocionBot } from "@/lib/personalidadBot";

export function RivalEnPartida({perfil,emocion,reaccion}:{perfil:PerfilBot;emocion:EmocionBot;reaccion:number}){
  const bot=DATOS_BOTS_PRACTICA[perfil];
  return <section className="play-rival-card" data-perfil={perfil} data-emocion={emocion} aria-label="Tu rival en esta partida">
    <div className="play-rival-title"><div><p className="eyebrow">Tu rival</p><h2>{bot.nombre}</h2></div><span>{bot.elo?"≈"+bot.elo+" Elo":"Práctica"}</span></div>
    <div className="play-rival-body"><div key={reaccion} className="play-rival-art"><div className="play-rival-float">{bot.imagen?<Image src={bot.imagen} width={240} height={240} sizes="(max-width:900px) 120px, 160px" alt={perfil==="matias"?"Matías con su celular, tu rival":perfil==="victor"?"Víctor Terminator, tu rival cyborg":"Fonchi abrazado al hipopótamo, tu rival"}/>:<span className="play-rival-knight" aria-hidden="true">♞</span>}</div>{perfil==="victor"&&<span className="play-rival-scan" aria-hidden="true"/>}</div><div className="play-rival-dialogue"><span className="play-rival-style">{perfil==="matias"?"Gambito Morra · Blancas · Ataque":perfil==="victor"?"Max Level · Francesa · Ataque":perfil==="fonchi"?"Defensa Hipopótamo":"Juego libre"}</span><p className="play-rival-phrase" role="status" aria-live="polite">{fraseBot(perfil,emocion)}</p>{emocion==="pensando"&&<span className="play-rival-dots" aria-hidden="true"><i/><i/><i/></span>}</div></div>
  </section>;
}
