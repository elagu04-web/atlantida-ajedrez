import type { BloqueNoticia } from "@/lib/noticias";

// El contenido admite negritas y enlaces HTTPS, sin interpretar HTML.
function TextoEnLinea({texto}:{texto:string}) {
  return texto.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(https:\/\/[^)\s]+\))/gu).map((parte,indice)=>{
    if(parte.startsWith("**")&&parte.endsWith("**"))return <strong key={indice}>{parte.slice(2,-2)}</strong>;
    const enlace=parte.match(/^\[([^\]]+)\]\((https:\/\/[^)\s]+)\)$/u);
    if(enlace)return <a key={indice} href={enlace[2]} target="_blank" rel="noopener noreferrer">{enlace[1]}</a>;
    return <span key={indice}>{parte}</span>;
  });
}

export function ContenidoNoticia({bloques}:{bloques:BloqueNoticia[]}) {
  return bloques.map((bloque,indice)=>{
    if(bloque.tipo==="subtitulo")return <h2 key={indice}>{bloque.texto}</h2>;
    if(bloque.tipo==="lista")return <ol key={indice}>{bloque.items.map((item,i)=><li key={i}><TextoEnLinea texto={item}/></li>)}</ol>;
    if(bloque.tipo==="jugadas")return <p key={indice} className="news-moves" aria-label="Secuencia ilustrativa de jugadas">{bloque.texto}</p>;
    return <p key={indice}><TextoEnLinea texto={bloque.texto}/></p>;
  });
}