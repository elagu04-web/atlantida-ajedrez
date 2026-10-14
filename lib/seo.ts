import type { Metadata } from "next";
export const URL_SITIO = "https://atlantida-ajedrez.vercel.app";
export const NOMBRE_SITIO = "Atlántida Ajedrez";
export const DESCRIPCION_SITIO = "Sumate al Club Ajedrez Atlántida, en Uruguay. Anotate a torneos, resolvé el desafío diario y practicá contra los bots. Nos vemos en el tablero.";
export const IMAGEN_SITIO = "/imagenes/logo-club.png";
export function metadatosPagina(ruta:string, titulo:string, descripcion:string):Metadata {
 const url=new URL(ruta,URL_SITIO).href;
 return {title:titulo,description:descripcion,alternates:{canonical:url},openGraph:{type:"website",siteName:NOMBRE_SITIO,locale:"es_UY",title:titulo,description:descripcion,url,images:[{url:URL_SITIO+IMAGEN_SITIO,alt:NOMBRE_SITIO}]},twitter:{card:"summary",title:titulo,description:descripcion,images:[URL_SITIO+IMAGEN_SITIO]}};
}
export function serializarDatosEstructurados(datos:unknown){return JSON.stringify(datos).replace(/</g,"\\u003c");}
export const datosSitio = {
 "@context":"https://schema.org",
 "@graph":[
  {"@type":"SportsOrganization","@id":URL_SITIO+"/#club",name:NOMBRE_SITIO,alternateName:["Club Ajedrez Atlántida","Ajedrez Atlántida"],url:URL_SITIO+"/",logo:URL_SITIO+IMAGEN_SITIO,description:DESCRIPCION_SITIO,sport:"Chess",telephone:"+59899861116"},
  {"@type":"WebSite","@id":URL_SITIO+"/#sitio",name:NOMBRE_SITIO,alternateName:["Club Ajedrez Atlántida","Ajedrez Atlántida"],url:URL_SITIO+"/",description:DESCRIPCION_SITIO,inLanguage:"es-UY",publisher:{"@id":URL_SITIO+"/#club"}}
 ]
};
