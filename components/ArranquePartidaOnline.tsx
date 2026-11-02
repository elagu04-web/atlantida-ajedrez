import {inicioPausadoOnline,type EstadoOnline} from '@/lib/partidaOnline';
import s from './SalaOnline.module.css';

export function ArranquePartidaOnline({estado,color,margen,bloqueado,confirmar}:{estado:EstadoOnline;color:'w'|'b'|null;margen:number|null;bloqueado:boolean;confirmar:()=>void}){
 const pausado=inicioPausadoOnline(estado)||margen===0;
 if(!pausado&&margen===null)return null;
 const listo=pausado&&estado.inicioPausado&&color?estado.listosInicio?.[color]===true:false;
 const segundos=Math.ceil((margen??0)/1000);
 return <div className={s.inicioLibre} data-pausa={pausado}>
  {pausado?<><strong>Arranque en pausa. Nadie perdió.</strong><span>Se agotó el margen para empezar. La posición y el tiempo se conservan. Los dos deben confirmar para retomar esta misma mesa.</span><div className={s.confirmacionInicio}><span>{estado.inicioPausado&&estado.listosInicio?.w?'✓':'○'} {estado.blancas}</span><span>{estado.inicioPausado&&estado.listosInicio?.b?'✓':'○'} {estado.negras}</span></div>{color&&<button className="button-primary" disabled={bloqueado||listo} onClick={confirmar}>{listo?'Ya estás listo · esperando a tu rival':'Estoy listo para retomar'}</button>}</>:
  <><strong>Arranque sin descontar tiempo · {Math.floor(segundos/60)}:{String(segundos%60).padStart(2,'0')}</strong><span>Dos jugadas por jugador. {estado.turno===color?'Te toca':'Le toca a tu rival'}. Si pasan dos minutos, pausamos para que ambos vuelvan a confirmar. No se pierde por este margen.</span></>}
 </div>;
}
