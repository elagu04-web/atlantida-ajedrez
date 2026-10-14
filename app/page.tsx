import { PaginaInicio } from "@/components/PaginaInicio";
import { datosSitio, DESCRIPCION_SITIO, metadatosPagina, serializarDatosEstructurados } from "@/lib/seo";
export const metadata = metadatosPagina("/", "Club Ajedrez Atlántida | Jugá, aprendé y competí", DESCRIPCION_SITIO);
export default function Home(){return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializarDatosEstructurados(datosSitio)}}/><PaginaInicio/></>;}
