# Historia del club

Sección pública `/historia`, solicitada por Agustín el 9 de noviembre de 2026. Accesos desde la navegación, la portada, Noticias y el pie del sitio.

## Archivo completo

Se recorrieron las tres páginas del feed público de `ajedrezenlifa.blogspot.com/feeds/posts/default?alt=json&max-results=150`, índices 1, 151 y 301. El blog declara 403 publicaciones y se verificaron 403 identificadores y enlaces únicos. Están incluidas las 20 publicaciones sin título, presentadas como «Recuerdo del club». Se preserva la fecha del calendario original del blog, aunque los posts usan distintos husos horarios.

Distribución: 2010: 26; 2011: 29; 2012: 85; 2013: 97; 2014: 52; 2015: 43; 2016: 17; 2017: 2; 2018: 10; 2019: 14; 2020: 19; 2021: 3; 2022: 3; 2023: 3. Intervalo: 16 de agosto de 2010 al 9 de junio de 2023.

`data/historia-blog.json` contiene títulos, fechas, enlaces, categorías, un índice de palabras para buscar y metadatos de las imágenes recuperadas. Las 403 entradas tienen una página propia de lectura en /historia/[slug]. data/historia-contenidos.json guarda el texto original como un árbol de elementos permitidos, sin HTML remoto, estilos, scripts ni atributos ejecutables. Las tablas se conservan con desplazamiento horizontal; los videos externos se muestran como enlaces. Las imágenes recuperadas se sirven localmente. Cada noticia incluye también el enlace a la fuente original. No se inventan resúmenes de publicaciones que eran solamente imágenes.

De 482 enlaces distintos de imagen se recuperaron 371; las otras 111 direcciones devolvían errores en el origen. Se conservan todas las entradas aunque no se haya podido recuperar su imagen. Los archivos disponibles se guardaron en WebP local y miniatura, sin reconstruir caras, generar escenas ni modificar el contenido histórico. Galería accesible con diálogo nativo, flechas, teclado y cierre con Escape.

Respaldo privado en outputs del chat: feeds JSON, contenido original completo, informe de importación, errores y script de recuperación. No se publican esos respaldos ni se ejecuta contenido obtenido del blog. Las fotos procesadas están en `public/imagenes/historia/`.

## Investigación y contexto

La crónica del 19/12/2011 recuerda los primeros encuentros hacia 2009 y la afiliación definitiva a la FUA el 18/12/2011. Se evita afirmar una fecha de fundación formal: una imagen del blog menciona 2008, por lo que ambos datos no se convierten en una certeza inventada. Pandochess también documenta la afiliación: https://pandochess.blogspot.com/2011/12/asamblea-de-la-fua.html .

Los demás hitos enlazan sus fuentes en el blog: Nacional Sub 20 de 2012, Interdepartamental de 2013, torneo en la Biblioteca Idea Vilariño en 2015, Amateur 2019, regreso del taller en 2021, ajedrez gigante en 2022 y Abierto por el aniversario de LIFA en 2023. La agenda cultural de Canelones corrobora actividad del club en el Espacio Pablo Neruda en 2016: https://www.imcanelones.gub.uy/agenda-cultural/torneo-abierto-ajedrez-atlantida .

Las convocatorias históricas se distinguen de la agenda actual. No se convierten precios, horarios, resultados externos o participantes antiguos en registros actuales de torneos, Elo o cuentas.

## Uso y verificación

Buscador sin distinguir tildes, filtros por año y tema, opción con imágenes, orden cronológico y carga de 24 entradas por tanda. El estado de los filtros está en la dirección, para poder compartir una búsqueda y volver con la navegación del navegador. Las imágenes se cargan de forma diferida y el movimiento de portada respeta `prefers-reduced-motion`.


A pedido de Agustín, el archivo usa una estética propia de papel en tonos sepia, tinta marrón y tipografía editorial. Las fotos mantienen su color: sin filtros de sepia, desaturación ni escala de grises. La cabecera general del sitio conserva la identidad azul.
