import { metadatosPagina } from "@/lib/seo";
import Link from "next/link";
import { RetoCaballoClub } from "@/components/RetoCaballoClub";
export const metadata=metadatosPagina("/jugar/caballo","Desafío del caballo · Atlántida Ajedrez","Un caballo, 64 casillas. Encontrá un recorrido sin repetir, superá las marcas del club y desafiá a tus compañeros.");
export default function CaballoPage(){return <div className="knight-page"><header className="knight-heading"><div><p className="eyebrow text-amber-200">La mesa de juegos del club</p><h1>El desafío <span>del caballo.</span></h1><p>Un salto más. Una marca para superar.</p></div><Link href="/jugar" className="text-link">Jugar contra los bots →</Link></header><RetoCaballoClub/></div>;}
