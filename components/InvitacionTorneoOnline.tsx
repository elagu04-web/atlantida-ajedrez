import Image from 'next/image';
import Link from 'next/link';
import {convocatoriaOnline as copa} from '@/lib/convocatoriaOnline';
import {CompartirInvitacion} from './CompartirInvitacion';
import s from './InvitacionTorneoOnline.module.css';

export function InvitacionTorneoOnline({compacta=false,enSala=false}:{compacta?:boolean;enSala?:boolean}){
 return <section className={`${s.invitacion} ${compacta?s.compacta:''}`} aria-labelledby={compacta?'copa-revancha-inicio':'copa-revancha-titulo'}>
  <div className={s.foto} aria-hidden="true"><Image src={copa.imagen} alt="" fill sizes="(max-width: 760px) 100vw, 50vw" style={{objectFit:'cover',objectPosition:'60% 50%'}}/></div>
  <div className={s.contenido}>
   <p className={s.ceja}><span/>ATLÁNTIDA · COPA ONLINE</p>
   <p className={s.anticipo}>¿Te quedó una revancha pendiente?</p>
   <h2 id={compacta?'copa-revancha-inicio':'copa-revancha-titulo'}>Copa <em>Revancha.</em></h2>
   <p className={s.bajada}>Una partida con el club. Un horario que acuerdan ustedes.</p>
   <dl className={s.datos}><div><dt>Ritmo</dt><dd>{copa.ritmo}<small>5 min + 3 s por jugada</small></dd></div><div><dt>Sistema suizo</dt><dd>{copa.rondas}<small>rondas · sin eliminación</small></dd></div><div><dt>Para coordinar</dt><dd>{copa.dias} días<small>por cada ronda</small></dd></div></dl>
   {!compacta&&<><p className={s.beneficios}>Jugás en esta página, sumás al mismo <strong>Elo Atlántida</strong> y después podés repasar tus partidas. Si es tu primer torneo, también hay lugar para vos.</p><ol className={s.pasos}><li><span>01</span> Entrá con tu cuenta y anotate.</li><li><span>02</span> Cuando salga la ronda, coordiná con tu rival.</li><li><span>03</span> Entren los dos a su mesa y jueguen acá.</li></ol><p className={s.nota}>Primero nos anotamos. La primera ronda se publicará cuando la organización cierre la inscripción. Hay lugar para hasta 32 jugadores.</p></>}
   <div className={s.acciones}><Link className="button-primary" href={enSala?'#acceso-torneo':copa.ruta}>{enSala?'Entrar con mi cuenta':'Conocer la Copa Revancha'} <span aria-hidden="true">→</span></Link><CompartirInvitacion titulo={copa.nombre} texto={copa.invitacion} ruta={copa.ruta} etiqueta="Copiar invitación para WhatsApp"/></div>
  </div>
 </section>;
}
