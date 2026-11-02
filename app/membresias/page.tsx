import { PresentacionMembresias } from "@/components/PresentacionMembresias";
import { metadatosPagina } from "@/lib/seo";

export const metadata = metadatosPagina("/membresias", "Membresías · Atlántida Ajedrez", "Club $400 por mes; Club + entrenamiento $550. Torneo sin membresía $150 UYU. Conocé los planes y consultá su activación.");
export default function Page() { return <PresentacionMembresias/>; }
