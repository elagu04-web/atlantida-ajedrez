/** Only the presentation changes; game scripts, IDs and stored class data stay intact. */
export function vestirMesaClases(html:string){
 const tema='<style>html,body,body.class-audience{background:#080f1b;color:#f0f4fa;color-scheme:dark}</style><link rel="stylesheet" href="/estilos/mesa-atlantida.css?v=2">';
 return html.replace(/<meta name="theme-color" content="[^"]*">/, '<meta name="theme-color" content="#080f1b">')
  .replace('<span class="brand-icon">♞</span> Mesa de juego','<span class="brand-icon"><img src="/imagenes/logo-club.png" alt="" width="32" height="32"></span><span class="brand-copy">Atlántida Ajedrez<small>MI MESA DE CLASES</small></span>')
  .replace(/<\/head>/i,tema+'</head>');
}
