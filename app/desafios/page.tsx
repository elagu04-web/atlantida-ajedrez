import type { Metadata } from "next";
import { DesafioAjedrez } from "@/components/DesafioAjedrez";
import { TablaRachas } from "@/components/TablaRachas";
export const metadata:Metadata={title:"Desafío diario y rachas · Atlántida Ajedrez",description:"Un problema táctico nuevo cada día. La dificultad crece con las rachas del club."};
export default function DesafiosPage(){return <div className="play-page desafio-page"><header className="play-heading"><div><p className="eyebrow text-amber-200">Tu táctica, día a día</p><h1>Una idea.<br/><span>Tu mejor jugada.</span></h1></div><p>Un desafío para todo el club. Encontrá la secuencia, sumá a tu racha y volvé mañana por otra buena jugada.</p></header><DesafioAjedrez ampliado/><div className="puzzle-leaderboard"><TablaRachas/></div></div>;}
