import type {IdentidadFamilia} from '@/lib/familiasAperturas';

/** Grabado vectorial propio para las cubiertas del álbum; no revela cartas. */
export function ArteFamiliaApertura({identidad}:{identidad:IdentidadFamilia}){
 return <svg viewBox="0 0 360 260" fill="none" aria-hidden="true" focusable="false">
  <path d="M18 30V18H78M282 18H342V30M18 218V240H78M282 240H342V218" stroke="currentColor" strokeWidth="1" opacity=".6"/>
  <path d="M36 222 180 142 324 222M60 209 300 209M84 196 276 196M108 183 252 183M132 170 228 170M84 222 180 142M132 222 180 142M180 222V142M228 222 180 142M276 222 180 142" stroke="currentColor" opacity=".24"/>
  {identidad.motivo==='arcos'&&<g stroke="currentColor"><path d="M48 200V110a132 132 0 0 1 264 0V200M72 198V110a108 108 0 0 1 216 0V198M96 194V110a84 84 0 0 1 168 0V194" opacity=".32"/><path d="M36 201H324M60 80H300M88 45H272" opacity=".16"/></g>}
  {identidad.motivo==='olas'&&<g stroke="currentColor" opacity=".3"><path d="M-20 98Q70 38 160 98T380 98M-20 115Q70 55 160 115T380 115M-20 132Q70 72 160 132T380 132M-20 149Q70 89 160 149T380 149"/><circle cx="270" cy="62" r="24"/><circle cx="270" cy="62" r="32" opacity=".5"/></g>}
  {identidad.motivo==='torres'&&<g stroke="currentColor" opacity=".3"><path d="M50 205V80H42V51H58V65H73V51H89V65H104V51H120V80H112V176M248 176V80H240V51H256V65H271V51H287V65H302V51H318V80H310V205M66 194V100H96V182M264 182V100H294V194"/><path d="M112 124Q180 40 248 124M112 145Q180 61 248 145" opacity=".5"/></g>}
  {identidad.motivo==='diagonales'&&<g stroke="currentColor" opacity=".3"><path d="M15 160 150 25M35 180 190 25M55 200 230 25M75 220 270 25M95 240 310 25M185 240 345 80"/><path d="m225 56 27 5-5 27M115 163l-27-5 5-27" strokeWidth="2"/></g>}
  {identidad.motivo==='rombos'&&<g stroke="currentColor" opacity=".25"><path d="m180 25 145 106L180 237 35 131 180 25Z"/><path d="m180 47 117 84-117 84-117-84 117-84Z"/><path d="m180 72 83 59-83 59-83-59 83-59ZM35 131h290M180 25v212"/></g>}
  <circle cx="180" cy="126" r="55" fill="#101e2c" fillOpacity=".92" stroke="currentColor" strokeOpacity=".6"/><circle cx="180" cy="126" r="65" stroke="currentColor" strokeOpacity=".16"/>
  <text x="180" y="160" textAnchor="middle" fill="currentColor" fontSize="100" fontFamily="Georgia,serif">{identidad.simbolo}</text>
  <path d="m177 28 3-5 3 5-3 5-3-5ZM50 224h25M285 224h25" fill="currentColor" stroke="currentColor"/>
 </svg>;
}
