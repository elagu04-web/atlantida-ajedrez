import {TorneosOnline} from '@/components/TorneosOnline';
import type {Metadata} from 'next';
import {convocatoriaOnline as copa} from '@/lib/convocatoriaOnline';
import {URL_SITIO} from '@/lib/seo';
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;
 if(id!==copa.id)return {title:'Sala del torneo online · Atlántida Ajedrez',robots:{index:false,follow:true}};
 const description='Bruno le ganó a Fonchi y se llevó la edición anterior. Ahora toca la revancha: 5+3, 5 rondas y 3 días para coordinar. Sumate al torneo online del club.';
 return {title:copa.nombre,description,alternates:{canonical:URL_SITIO+copa.ruta},openGraph:{type:'website',title:copa.nombre,description,url:URL_SITIO+copa.ruta,images:[{url:URL_SITIO+copa.imagen,alt:'Piezas de ajedrez sobre un tablero de madera'}]},twitter:{card:'summary_large_image',title:copa.nombre,description,images:[URL_SITIO+copa.imagen]}};
}
export default async function Pagina({params}:{params:Promise<{id:string}>}){const {id}=await params;return <TorneosOnline id={id}/>;}
