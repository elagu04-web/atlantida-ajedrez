/** Only the presentation changes; game scripts, IDs and stored class data stay intact. */
export function vestirMesaClases(html:string,integrado=false){
 const tema='<style>html,body,body.class-audience{background:#080f1b;color:#f0f4fa;color-scheme:dark}</style><link rel="stylesheet" href="/estilos/mesa-atlantida.css?v=4">'+(integrado?'<link rel="stylesheet" href="/estilos/clases-integradas.css?v=1"><script defer src="/clases-recursos/integracion.js?v=1"></script>':'');
 return html.replace(/<meta name="theme-color" content="[^"]*">/, '<meta name="theme-color" content="#080f1b">')
  .replace('src="piezas.js"','src="/clases-recursos/piezas.js?v=1"')
  .replace('src="sonidos.js"','src="/clases-recursos/sonidos.js?v=2"')
  .replace('<span class="brand-icon">♞</span> Mesa de juego','<span class="brand-icon"><img src="/imagenes/logo-club.png" alt="" width="32" height="32"></span><span class="brand-copy">Atlántida Ajedrez<small>MI MESA DE CLASES</small></span>')
  .replace(/<\/head>/i,tema+'</head>');
}
