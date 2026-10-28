import {TorneosOnline} from '@/components/TorneosOnline';
import {metadatosPagina} from '@/lib/seo';
export const metadata=metadatosPagina('/torneos/online','Torneos online · Atlántida Ajedrez','Anotate a los torneos online del club. Suizo y todos contra todos, horarios entre rivales y partidas en la plataforma.');
export default function Pagina(){return <TorneosOnline/>;}
