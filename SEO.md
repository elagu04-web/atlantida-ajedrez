# Búsqueda del club en Google

URL pública: https://atlantida-ajedrez.vercel.app/

La portada incluye datos WebSite y Organization y un nombre alternativo Ajedrez Atlántida. Las noticias incluyen Article y sus imágenes. El mapa /sitemap.xml se genera con las rutas públicas del club y todas las noticias de lib/noticias.ts. Las noticias nuevas se incorporan al mapa al publicarlas. No se inventan fechas de actualización del contenido.

/robots.txt permite rastrear las páginas y referencia el mapa. La portada y las páginas editoriales y de juegos llevan URL canónica propia; no se hereda una canónica de la portada a todas las rutas. Las páginas dinámicas de torneos y jugadores conservan sus metadatos anteriores.

La etiqueta pública de verificación proporcionada por el propietario se publica desde app/layout.tsx. GOOGLE_SITE_VERIFICATION permite reemplazarla desde la configuración del servidor si cambia la cuenta de Search Console.

Pasos pendientes en Search Console:
1. Agregar la propiedad de Prefijo de URL https://atlantida-ajedrez.vercel.app/.
2. Verificar con Etiqueta HTML después de que el despliegue termine.
3. En Sitemaps enviar sitemap.xml.
4. Inspeccionar la URL de la portada y solicitar indexación. También puede hacerse con una noticia importante.

La indexación y el orden de los resultados los decide Google; la verificación no garantiza una aparición inmediata. Search Console es la fuente para comprobar páginas indexadas y errores. Un dominio propio es opcional. Si cambia, actualizar URL_SITIO y las URLs absolutas existentes de las noticias y configurar redirecciones permanentes.
