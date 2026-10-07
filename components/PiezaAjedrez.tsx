export function PiezaAjedrez({tipo,color}:{tipo:"k"|"q";color:"w"|"b"}) {
  return <svg viewBox="0 0 40 40" aria-hidden="true" className="chess-piece" fill={color==="w"?"#fffaf0":"#142431"} stroke={color==="w"?"#283748":"#c6d3cd"} strokeWidth="1.35" strokeLinejoin="round">
    {tipo==="q"?<><path d="m8 12 5 5 3-7 4 7 4-7 3 7 5-5-4 13H12Z" /><circle cx="8" cy="10" r="2" /><circle cx="16" cy="8" r="2" /><circle cx="24" cy="8" r="2" /><circle cx="32" cy="10" r="2" /></>:<><path d="M20 3v10m-4-6h8" fill="none" strokeWidth="2.5" /><path d="M12 23c-7-5-5-12 0-12 3 0 5 2 8 5 3-3 5-5 8-5 5 0 7 7 0 12Z" /></>}
    <path d="M12 25h16l-2 5 5 3v3H9v-3l5-3Z" /><path d="M12 25h16M14 30h12M10 33h20" fill="none" />
  </svg>;
}
