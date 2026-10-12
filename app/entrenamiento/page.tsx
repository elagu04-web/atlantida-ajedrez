import type { Metadata } from "next";
import { EntrenamientoClub } from "@/components/EntrenamientoClub";
import { metadatosPagina } from "@/lib/seo";
export const metadata: Metadata = metadatosPagina("/entrenamiento", "Entrenamiento personal · Atlántida Ajedrez", "Revisá tus partidas, practicá tus errores y seguí un plan de entrenamiento con repasos. Abierto para socios y jugadores de fuera del club.");
export default function EntrenamientoPage() { return <EntrenamientoClub/>; }
