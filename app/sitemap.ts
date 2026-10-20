import type { MetadataRoute } from "next";
import { noticias } from "@/lib/noticias";
import { URL_SITIO } from "@/lib/seo";
export default function sitemap():MetadataRoute.Sitemap {
 const rutas=["/","/torneos","/jugadores","/estadisticas","/noticias","/jugar","/jugar/online","/jugar/caballo","/entrenamiento","/desafios","/transmision","/actividad","/privacidad","/instalar"];
 return [...rutas.map(ruta=>({url:new URL(ruta,URL_SITIO).href})),...noticias.map(n=>({url:URL_SITIO+"/noticias/"+n.slug,images:[URL_SITIO+n.imagen]}))];
}
