import {InstalarApp} from '@/components/InstalarApp';
import {metadatosPagina} from '@/lib/seo';
export const metadata=metadatosPagina('/instalar','Instalá Atlántida en tu celular · Atlántida Ajedrez','Agregá Atlántida Ajedrez a tu pantalla de inicio. Entrá desde un ícono a tus partidas, entrenamiento, desafíos y torneos.');
export default function InstalarPage(){return <InstalarApp/>;}
