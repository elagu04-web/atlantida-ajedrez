import { PresentacionMembresias } from "@/components/PresentacionMembresias";
import { metadatosPagina } from "@/lib/seo";

export const metadata = metadatosPagina("/membresias", "Membresías · Atlántida Ajedrez", "Club $400; Club + entrenamiento $550; Recursos para docentes $200 por mes. Torneo sin membresía $150 UYU. Consultá la activación de tu plan.");
export default function Page() { return <PresentacionMembresias/>; }
