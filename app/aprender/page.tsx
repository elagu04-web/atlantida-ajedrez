import {AprenderDesdeCero} from '@/components/AprenderDesdeCero';
import {metadatosPagina} from '@/lib/seo';
export const metadata=metadatosPagina('/aprender','Aprendé ajedrez desde cero · Atlántida Ajedrez','Un recorrido gratuito desde el tablero hasta tu primer jaque mate. Explicaciones cortas, prácticas interactivas y progreso guardado en tu cuenta.');
export default function AprenderPage(){return <AprenderDesdeCero/>;}
