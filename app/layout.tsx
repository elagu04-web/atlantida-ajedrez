import type { Metadata } from "next";
import { URL_SITIO, NOMBRE_SITIO, DESCRIPCION_SITIO, IMAGEN_SITIO } from "@/lib/seo";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JugadoresProvider } from "@/context/JugadoresContext";
import { TorneosProvider } from "@/context/TorneosContext";
import { ActividadProvider } from "@/context/ActividadContext";
import { AuthProvider } from "@/context/AuthContext";
import { ColegioJugadoresProvider } from "@/context/ColegioJugadoresContext";
import { ColegioTorneosProvider } from "@/context/ColegioTorneosContext";
import { EpicoJugadoresProvider } from "@/context/EpicoJugadoresContext";
import { EpicoTorneosProvider } from "@/context/EpicoTorneosContext";
import { AvisosProvider } from "@/context/AvisosContext";
import { ChromeDelSitio } from "@/components/ChromeDelSitio";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  applicationName: NOMBRE_SITIO,
  title: NOMBRE_SITIO,
  description: DESCRIPCION_SITIO,
  openGraph: { type:"website",siteName:NOMBRE_SITIO,locale:"es_UY",title:NOMBRE_SITIO,description:DESCRIPCION_SITIO,images:[{url:IMAGEN_SITIO,alt:NOMBRE_SITIO}] },
  verification: {google:process.env.GOOGLE_SITE_VERIFICATION || "jE79xHEiUAKsw4MQ2Bqe8_zhs6gpsifkaeGIdr4WqGs"},
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es" data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans">
        <AvisosProvider><AuthProvider>
          <ActividadProvider>
            <JugadoresProvider>
              <TorneosProvider>
                <ColegioJugadoresProvider>
                  <ColegioTorneosProvider>
                    <EpicoJugadoresProvider>
                      <EpicoTorneosProvider>
                        <ChromeDelSitio>{children}</ChromeDelSitio>
                      </EpicoTorneosProvider>
                    </EpicoJugadoresProvider>
                  </ColegioTorneosProvider>
                </ColegioJugadoresProvider>
              </TorneosProvider>
            </JugadoresProvider>
          </ActividadProvider>
        </AuthProvider></AvisosProvider>
      </body>
    </html>
  );
}
