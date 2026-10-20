import type {MetadataRoute} from 'next';

export default function manifest():MetadataRoute.Manifest {
 return {
  id:'/',name:'Atlántida Ajedrez',short_name:'Atlántida',lang:'es-UY',
  description:'Tu club a un toque. Entrenamiento, partidas online, desafíos y torneos.',
  start_url:'/',scope:'/',display:'standalone',background_color:'#080f1b',theme_color:'#080f1b',
  icons:[
   {src:'/app-icons/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
   {src:'/app-icons/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
   {src:'/app-icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
  ],
  shortcuts:[
   {name:'Jugar online',url:'/jugar/online',description:'Encontrá un rival del club'},
   {name:'Mi entrenamiento',url:'/entrenamiento',description:'Volvé a tu práctica'},
   {name:'Desafío diario',url:'/desafios',description:'Un problema nuevo cada día'},
  ],
 };
}
