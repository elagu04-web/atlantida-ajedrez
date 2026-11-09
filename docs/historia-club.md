# Historia del club

Sección pública `/historia`, solicitada por Agustín el 9 de noviembre de 2026. Accesos desde la navegación, la portada, Noticias y el pie del sitio.

## Importación y selección pública

### Ampliación con Grupo Ajedrez Li.F.A.

Agustín aprobó incorporar las 20 entradas seleccionadas de `grupoajedrezlifa.blogspot.com`. El segundo feed tiene 49 publicaciones de abril a agosto de 2010; se conservan solamente las 20 aprobadas sobre torneos, fotos y la propuesta de ícono del grupo. La selección pública completa pasa a **288 recuerdos y 370 imágenes**, con inicio el **18 de abril de 2010** y **26 entradas de 2010**. `data/historia-grupo-lifa-origen.json` detalla los 20 identificadores, fechas y fuentes. Las 268 entradas previas se mantienen, al igual que los 135 retiros editoriales. `historia-seleccion.json` registra la ampliación separada de su selección inicial.

Se sumaron siete fotos y el ícono, procesados a WebP con miniaturas locales conservando el color. El recuerdo del segundo blitz de 2009 mantiene la publicación del 26/4/2010; no se le atribuye una fecha exacta al evento. La portada comienza ahora con una ronda del primer torneo de 2010 e incluye también la foto de premiación. La línea de tiempo destaca ese torneo: 14 participantes, siete rondas, Guillermo Carvalho 7/7 y Fabián Fuentes segundo, confirmado en las crónicas. Se añadieron los créditos del segundo blog y las 20 rutas al sitemap.

### Selección inicial

Se recorrieron las tres páginas del feed público de `ajedrezenlifa.blogspot.com/feeds/posts/default?alt=json&max-results=150`, índices 1, 151 y 301. El blog declara 403 publicaciones y se verificaron 403 identificadores y enlaces únicos. La importación original incluyó las 20 publicaciones sin título. La selección pública posterior conserva 17, presentadas como «Recuerdo del club». Se preserva la fecha del calendario original del blog, aunque los posts usan distintos husos horarios.

Distribución original: 2010: 26; 2011: 29; 2012: 85; 2013: 97; 2014: 52; 2015: 43; 2016: 17; 2017: 2; 2018: 10; 2019: 14; 2020: 19; 2021: 3; 2022: 3; 2023: 3. Intervalo original: 16 de agosto de 2010 al 9 de junio de 2023.

Agustín pidió después retirar noticias ajenas al club y empezar en 2010. Se retiraron 135 entradas: coberturas internacionales (Mario Covas, Paulista, Olimpiadas, etc.), curiosidades y comunicados generales sin vínculo concreto con la actividad del club. `data/historia-seleccion.json` registra cada retiro, su fuente y motivo. Quedan **268 recuerdos**, desde el 9/9/2010, y **362 imágenes distintas**. Se mantienen las participaciones documentadas de gente del club fuera de Atlántida, incluyendo Interclubes, Matías en UdelaR, Miguel de Souza en Florida y Fabián Fuentes en Pando. Las entradas retiradas dejan de tener ruta pública ni figuran en el sitemap. El respaldo completo de las 403 originales permanece en los outputs privados y en la revisión anterior de Git.

`data/historia-blog.json` contiene títulos, fechas, enlaces, categorías, un índice de palabras para buscar y metadatos de las imágenes recuperadas de las 268 entradas seleccionadas. Cada una tiene una página propia de lectura en /historia/[slug]. data/historia-contenidos.json guarda el texto original como un árbol de elementos permitidos, sin HTML remoto, estilos, scripts ni atributos ejecutables. Las tablas se conservan con desplazamiento horizontal; los videos externos se muestran como enlaces. Las imágenes recuperadas se sirven localmente. Cada noticia incluye también el enlace a la fuente original. No se inventan resúmenes de publicaciones que eran solamente imágenes.

De 482 enlaces distintos de imagen se recuperaron 371; las otras 111 direcciones devolvían errores en el origen. Se conservan todas las entradas aunque no se haya podido recuperar su imagen. Los archivos disponibles se guardaron en WebP local y miniatura, sin reconstruir caras, generar escenas ni modificar el contenido histórico. Galería accesible con diálogo nativo, flechas, teclado y cierre con Escape.

Respaldo privado en outputs del chat: feeds JSON, contenido original completo, informe de importación, errores y script de recuperación. No se publican esos respaldos ni se ejecuta contenido obtenido del blog. Las fotos procesadas están en `public/imagenes/historia/`.

## Investigación y contexto

La crónica del 19/12/2011 recuerda los primeros encuentros hacia 2009 y la afiliación definitiva a la FUA el 18/12/2011. Se evita afirmar una fecha de fundación formal: una imagen del blog menciona 2008, por lo que ambos datos no se convierten en una certeza inventada. Pandochess también documenta la afiliación: https://pandochess.blogspot.com/2011/12/asamblea-de-la-fua.html .

Los demás hitos enlazan sus fuentes en el blog: Nacional Sub 20 de 2012, Interdepartamental de 2013, torneo en la Biblioteca Idea Vilariño en 2015, Amateur 2019, regreso del taller en 2021, ajedrez gigante en 2022 y Abierto por el aniversario de LIFA en 2023. La agenda cultural de Canelones corrobora actividad del club en el Espacio Pablo Neruda en 2016: https://www.imcanelones.gub.uy/agenda-cultural/torneo-abierto-ajedrez-atlantida .

Las convocatorias históricas se distinguen de la agenda actual. No se convierten precios, horarios, resultados externos o participantes antiguos en registros actuales de torneos, Elo o cuentas.

## Uso y verificación

Buscador sin distinguir tildes, filtros por año y tema, opción con imágenes y carga de 24 entradas por tanda. El orden predeterminado es desde 2010 hacia adelante; se puede invertir. La línea de tiempo horizontal permite elegir año, avanzar/retroceder y desplazarla en celular. El año elegido filtra las noticias y actualiza un recuerdo destacado con contexto. El estado de los filtros está en la dirección, para poder compartir una búsqueda y volver con la navegación del navegador.

La portada empieza con una ronda del primer torneo de 2010. Cada 30 segundos elige al azar otra de diez fotos verificadas, sin repetir inmediatamente la misma. Muestra año, descripción y enlace a su noticia. Tiene pausa y avance manual; no rota con movimiento reducido del sistema ni mientras la pestaña está oculta. Las fotografías mantienen el color.


A pedido de Agustín, el archivo usa una estética propia de papel en tonos sepia, tinta marrón y tipografía editorial. Las fotos mantienen su color: sin filtros de sepia, desaturación ni escala de grises. La cabecera general del sitio conserva la identidad azul.
