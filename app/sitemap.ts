import type { MetadataRoute } from "next";
import { noticias } from "@/lib/noticias";
import { URL_SITIO } from "@/lib/seo";
import {publicacionesHistoria,rutaHistoria} from '@/lib/historiaClub';
export default function sitemap():MetadataRoute.Sitemap {
 const rutas=["/","/torneos","/jugadores","/estadisticas","/noticias","/historia","/jugar","/reloj","/jugar/online","/jugar/caballo","/entrenamiento","/membresias","/aprender","/desafios","/transmision","/actividad","/privacidad","/instalar","/android"];
 return [...rutas.map(ruta=>({url:new URL(ruta,URL_SITIO).href})),...noticias.map(n=>({url:URL_SITIO+"/noticias/"+n.slug,images:[URL_SITIO+n.imagen]})),...publicacionesHistoria.map(p=>({url:URL_SITIO+rutaHistoria(p),images:p.fotos.map(f=>URL_SITIO+f.src)}))];
}
