import {SalaOnline} from '@/components/SalaOnline';
import {Suspense} from 'react';
import {metadatosPagina} from '@/lib/seo';
export const metadata=metadatosPagina('/jugar/online','Jugar online con el club · Atlántida Ajedrez','Jugá con otros usuarios de Atlántida. Partidas amistosas a 3+2, 5+3 o 10+3, con reloj y tus partidas guardadas para analizar.');
export default function OnlinePage(){return <Suspense fallback={<p role="status">Cargando la sala…</p>}><SalaOnline/></Suspense>;}
