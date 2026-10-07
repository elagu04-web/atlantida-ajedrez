import type { PieceSymbol } from "chess.js";
export function PiezaAjedrez({tipo,color}:{tipo:PieceSymbol;color:"w"|"b"}) {
  return <svg viewBox="0 0 40 40" aria-hidden="true" className="chess-piece" fill={color==="w"?"#fffaf0":"#142431"} stroke={color==="w"?"#283748":"#c6d3cd"} strokeWidth="1.35" strokeLinejoin="round">
    {tipo==="q"&&<><path d="m8 12 5 5 3-7 4 7 4-7 3 7 5-5-4 13H12Z" /><circle cx="8" cy="10" r="2" /><circle cx="16" cy="8" r="2" /><circle cx="24" cy="8" r="2" /><circle cx="32" cy="10" r="2" /></>}
    {tipo==="k"&&<><path d="M20 3v10m-4-6h8" fill="none" strokeWidth="2.5" /><path d="M12 23c-7-5-5-12 0-12 3 0 5 2 8 5 3-3 5-5 8-5 5 0 7 7 0 12Z" /></>}
    {tipo==="r"&&<path d="M10 8h5v5h3V8h4v5h3V8h5v10l-4 3v4H14v-4l-4-3Z" />}
    {tipo==="b"&&<><path d="M20 6c-1 2-9 8-9 12 0 4 4 7 9 7s9-3 9-7c0-4-8-10-9-12Z" /><path d="m20 9 4 7" fill="none" /><circle cx="20" cy="5" r="2" /></>}
    {tipo==="n"&&<><path d="M12 25c0-6 4-8 8-10l-7 2-3-4 8-7 8 1c5 4 6 9 2 18Z" /><path d="m18 6-2-3 7 4" /><circle cx="20" cy="11" r="1" stroke="none" fill={color==="w"?"#283748":"#c6d3cd"} /></>}
    {tipo==="p"&&<><circle cx="20" cy="11" r="5" /><path d="M16 17h8l-1 4 5 4H12l5-4Z" /></>}
    <path d="M12 25h16l-2 5 5 3v3H9v-3l5-3Z" /><path d="M12 25h16M14 30h12M10 33h20" fill="none" />
  </svg>;
}
