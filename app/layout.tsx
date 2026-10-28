import type { Metadata, Viewport } from "next";
import { URL_SITIO, NOMBRE_SITIO, DESCRIPCION_SITIO, IMAGEN_SITIO } from "@/lib/seo";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JugadoresProvider } from "@/context/JugadoresContext";
import { TorneosProvider } from "@/context/TorneosContext";
import {ResultadosClubOnlineProvider} from '@/context/ResultadosClubOnlineContext';
import { ActividadProvider } from "@/context/ActividadContext";
import { AuthProvider } from "@/context/AuthContext";
import { ColegioJugadoresProvider } from "@/context/ColegioJugadoresContext";
import { ColegioTorneosProvider } from "@/context/ColegioTorneosContext";
import { EpicoJugadoresProvider } from "@/context/EpicoJugadoresContext";
import { EpicoTorneosProvider } from "@/context/EpicoTorneosContext";
import { AvisosProvider } from "@/context/AvisosContext";
import { ChromeDelSitio } from "@/components/ChromeDelSitio";
import { InstalacionProvider } from "@/context/InstalacionContext";

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
  appleWebApp: {capable:true,title:"Atlántida",statusBarStyle:"default"},
  icons: {apple:[{url:"/app-icons/apple-touch-icon.png",sizes:"180x180",type:"image/png"}]},
  title: NOMBRE_SITIO,
  description: DESCRIPCION_SITIO,
  openGraph: { type:"website",siteName:NOMBRE_SITIO,locale:"es_UY",title:NOMBRE_SITIO,description:DESCRIPCION_SITIO,images:[{url:IMAGEN_SITIO,alt:NOMBRE_SITIO}] },
  verification: {google:process.env.GOOGLE_SITE_VERIFICATION || "jE79xHEiUAKsw4MQ2Bqe8_zhs6gpsifkaeGIdr4WqGs"},
};

export const viewport:Viewport={themeColor:'#080f1b'};

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
              <ResultadosClubOnlineProvider><TorneosProvider>
                <ColegioJugadoresProvider>
                  <ColegioTorneosProvider>
                    <EpicoJugadoresProvider>
                      <EpicoTorneosProvider>
                        <InstalacionProvider><ChromeDelSitio>{children}</ChromeDelSitio></InstalacionProvider>
                      </EpicoTorneosProvider>
                    </EpicoJugadoresProvider>
                  </ColegioTorneosProvider>
                </ColegioJugadoresProvider>
              </TorneosProvider></ResultadosClubOnlineProvider>
            </JugadoresProvider>
          </ActividadProvider>
        </AuthProvider></AvisosProvider>
      </body>
    </html>
  );
}
