export const PROFE_ID='f2c0ea67-e4e3-454e-81ee-f3175df90b3d';
export const COOKIE_CLASES='atlantida_mesa_clases';
export const RUTA_MESA='/api/clases/mesa';
export const VERSION_MESA='v1-f92404c69cf2cc3b06492a0f6e694366f330f8f7bf374d8c';
export function archivoMesa(partes:string[]):string|null{
 const ruta=partes.join('/');
 return ruta.length<=180&&partes.length>0&&partes.every(p=>/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(p)&&p!=='.'&&p!=='..')&&/\.(html|js|css|svg|txt|gz)$/.test(ruta)?ruta:null;
}
export const CABECERAS_CLASES={'Cache-Control':'private, no-store, max-age=0','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN'};
