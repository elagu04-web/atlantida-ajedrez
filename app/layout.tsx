import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JugadoresProvider } from "@/context/JugadoresContext";
import { TorneosProvider } from "@/context/TorneosContext";
import { ActividadProvider } from "@/context/ActividadContext";
import { AuthProvider } from "@/context/AuthContext";
import { HeaderNav } from "@/components/HeaderNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlántida Ajedrez",
  description: "Torneos, jugadores y estadísticas del club de ajedrez Atlántida",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <AuthProvider>
          <header className="border-b border-zinc-200 bg-white">
            <HeaderNav />
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <ActividadProvider>
              <JugadoresProvider>
                <TorneosProvider>{children}</TorneosProvider>
              </JugadoresProvider>
            </ActividadProvider>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
