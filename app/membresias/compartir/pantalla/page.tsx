import type { Metadata } from "next";
import { PosterMembresias } from "@/components/PosterMembresias";
export const metadata: Metadata = { title: "Membresías para compartir · Atlántida Ajedrez", robots: { index: false, follow: false } };
export default function Page() { return <PosterMembresias/>; }
