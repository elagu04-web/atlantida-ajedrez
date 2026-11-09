import archivo from '@/data/historia-blog.json';

export type FotoHistoria={src:string;mini:string;ancho:number;alto:number;original:string};
export type PublicacionHistoria={id:string;titulo:string;sinTitulo:boolean;fecha:string;anio:number;fuente:string;categoria:string;palabras:string;fotos:FotoHistoria[]};
export const publicacionesHistoria=archivo as PublicacionHistoria[];
export function slugHistoria(p:PublicacionHistoria){return new URL(p.fuente).pathname.replace(/^\//,'').replace(/\.html$/,'').replace(/\//g,'-');}
export const rutaHistoria=(p:PublicacionHistoria)=>'/historia/'+slugHistoria(p);
export const categoriasHistoria=['Vida del club','Torneos y resultados','Aprender y compartir','Jugadores del club'];
export const aniosHistoria=[...new Set(publicacionesHistoria.map(p=>p.anio))].sort((a,b)=>a-b);
export const imagenesHistoria=new Set(publicacionesHistoria.flatMap(p=>p.fotos.map(f=>f.src))).size;
export const normalizarHistoria=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
export function filtrarHistoria({anio='',categoria='',buscar='',fotos=false,orden='antiguas'}:{anio?:string;categoria?:string;buscar?:string;fotos?:boolean;orden?:string}={}){
 const terminos=normalizarHistoria(buscar).split(' ').filter(Boolean);
 const lista=publicacionesHistoria.filter(p=>(!anio||String(p.anio)===anio)&&(!categoria||p.categoria===categoria)&&(!fotos||p.fotos.length>0)&&terminos.every(t=>normalizarHistoria(p.titulo+' '+p.palabras).includes(t)));
 return orden==='antiguas'?[...lista].reverse():lista;
}
export function fechaHistoria(fecha:string){return new Intl.DateTimeFormat('es-UY',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(fecha+'T12:00:00Z'));}
export const hitosHistoria=[
 {anio:'2009',titulo:'Los primeros encuentros',texto:'Un grupo de apasionados empezó a reunirse y encontró un lugar en la Liga de Fomento de Atlántida. En la crónica de 2011, el club recordaba esos primeros pasos.',fuente:'https://ajedrezenlifa.blogspot.com/2011/12/uruguayos-que-festejan-por-adelantado.html'},
 {anio:'2011',titulo:'«¡Somos club!»',texto:'El 18 de diciembre llegó la afiliación definitiva a la Federación Uruguaya de Ajedrez. El blog lo festejó como un regalo de fin de año.',fuente:'https://ajedrezenlifa.blogspot.com/2011/12/uruguayos-que-festejan-por-adelantado.html'},
 {anio:'2012',titulo:'Un Nacional en casa',texto:'Atlántida fue sede del Campeonato Nacional Sub 20 Absoluto y Femenino. El Country Club recibió las partidas del 6 al 8 de julio.',fuente:'https://ajedrezenlifa.blogspot.com/2012/06/campeonato-sub-20-y-absoluto-femenino.html'},
 {anio:'2013',titulo:'El país frente a nuestros tableros',texto:'Del 15 al 17 de noviembre, el Torneo Interdepartamental por Equipos reunió a las delegaciones en Atlántida. Las fotos y los resultados quedaron en el archivo.',fuente:'https://ajedrezenlifa.blogspot.com/2013/11/finalizo-el-torneo-interdepartamental.html'},
 {anio:'2015',titulo:'Aprender, jugar y encontrarse',texto:'La Biblioteca Idea Vilariño también fue escenario de la actividad del club, incluido el torneo rápido de invierno. Las reuniones siguieron creciendo en distintos espacios de la zona.',fuente:'https://ajedrezenlifa.blogspot.com/2015/06/torneo-de-ajedrez-rapido-invierno.html'},
 {anio:'2019',titulo:'Atlántida recibe al Amateur',texto:'El club y la Federación Uruguaya de Ajedrez organizaron el Campeonato Uruguayo Amateur en LIFA, con categorías Sub 2300, Sub 2000 y Sub 1700.',fuente:'https://ajedrezenlifa.blogspot.com/2019/09/se-viene-el-torneo-nacional-amateur-en.html'},
 {anio:'2021',titulo:'Volver a compartir el tablero',texto:'El blog anunció el regreso del taller abierto en la Biblioteca Idea Vilariño de Villa Argentina. Una invitación a volver a juntarse y jugar.',fuente:'https://ajedrezenlifa.blogspot.com/2021/06/ajedrez-atlantida-taller-sera-los-lunes.html'},
 {anio:'2022',titulo:'El ajedrez sale a la plaza',texto:'Las piezas gigantes llegaron a la Plaza Varela. Otra manera de invitar a los vecinos a acercarse al ajedrez, a lo grande.',fuente:'https://ajedrezenlifa.blogspot.com/2022/05/ajedrez-gigante-el-la-plaza-varela-de.html'},
 {anio:'2023',titulo:'Otra fecha para celebrar',texto:'El blog anunció el primer Abierto por el 75.º aniversario de la Liga de Fomento de Atlántida. El vínculo con LIFA siguió presente en la vida del club.',fuente:'https://ajedrezenlifa.blogspot.com/2023/03/1-abierto-de-ajedrez-75-aniversario.html'},
];
