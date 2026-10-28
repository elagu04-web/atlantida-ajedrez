import {TorneosOnline} from '@/components/TorneosOnline';
export const metadata={title:'Sala del torneo online · Atlántida Ajedrez',robots:{index:false,follow:true}};
export default async function Pagina({params}:{params:Promise<{id:string}>}){const {id}=await params;return <TorneosOnline id={id}/>;}
