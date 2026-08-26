"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useJugadoresEnVivo } from "@/context/useJugadoresEnVivo";
import { useTorneos } from "@/context/TorneosContext";
import { useAuth } from "@/context/AuthContext";
import { nombreVisible } from "@/lib/players";
import { jugoRecientemente } from "@/lib/elo";
import { ultimoTorneoConResultados } from "@/lib/tournaments";

const ANCHO = 720;
const ALTO_HEADER = 150;
const ALTO_FILA = 56;
const ALTO_FOOTER = 46;
const ESCALA = 2;

function trazarRectRedondeado(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncarTexto(ctx: CanvasRenderingContext2D, texto: string, maxAncho: number): string {
  if (ctx.measureText(texto).width <= maxAncho) return texto;
  let recortado = texto;
  while (recortado.length > 1 && ctx.measureText(recortado + "…").width > maxAncho) {
    recortado = recortado.slice(0, -1);
  }
  return recortado + "…";
}

export default function CompartirElosPage() {
  const { esAdmin } = useAuth();
  const jugadoresConStats = useJugadoresEnVivo();
  const { torneos } = useTorneos();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const ultimoTorneo = useMemo(() => ultimoTorneoConResultados(torneos), [torneos]);

  const lista = useMemo(
    () =>
      jugadoresConStats
        .filter(jugoRecientemente)
        .sort((a, b) => b.eloAtlantida - a.eloAtlantida),
    [jugadoresConStats]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const alto = ALTO_HEADER + lista.length * ALTO_FILA + ALTO_FOOTER;
    canvas.width = ANCHO * ESCALA;
    canvas.height = alto * ESCALA;
    canvas.style.width = `${ANCHO}px`;
    canvas.style.height = `${alto}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ESCALA, ESCALA);

    // Fondo
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, ANCHO, alto);

    // Header
    ctx.fillStyle = "#18181b";
    ctx.fillRect(0, 0, ANCHO, ALTO_HEADER);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("♞ Atlántida Ajedrez", 28, 52);
    ctx.fillStyle = "#93c5fd";
    ctx.font = "600 17px system-ui, sans-serif";
    ctx.fillText("Ranking Elo", 28, 78);
    ctx.fillStyle = "#d4d4d8";
    ctx.font = "14px system-ui, sans-serif";
    const lineaTorneo = ultimoTorneo
      ? `Después de: ${ultimoTorneo.nombre} · ${ultimoTorneo.creadoEn.slice(0, 10)}`
      : "";
    if (lineaTorneo) ctx.fillText(lineaTorneo, 28, 102);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(
      "Solo jugadores con partidas en el último año",
      28,
      ALTO_HEADER - 16
    );

    // Filas
    lista.forEach((j, i) => {
      const y = ALTO_HEADER + i * ALTO_FILA;
      ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#fafafa";
      ctx.fillRect(0, y, ANCHO, ALTO_FILA);

      const centroY = y + ALTO_FILA / 2;

      // Puesto
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "600 16px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(i + 1), 44, centroY + 6);

      // Nombre
      ctx.fillStyle = "#18181b";
      ctx.font = "600 17px system-ui, sans-serif";
      ctx.textAlign = "left";
      const nombre = truncarTexto(ctx, nombreVisible(j), 380);
      ctx.fillText(nombre, 68, centroY + 6);

      // Elo
      ctx.fillStyle = "#18181b";
      ctx.font = "bold 18px ui-monospace, monospace";
      ctx.textAlign = "right";
      ctx.fillText(String(j.eloAtlantida), 540, centroY + 6);

      // Flecha de cambio (Elo antes vs después del último torneo)
      const diff = j.eloAtlantida - j.eloAntesUltimoTorneo;
      const pillAncho = 96;
      const pillAlto = 30;
      const pillX = 596;
      const pillY = centroY - pillAlto / 2;
      let colorFondo = "#f4f4f5";
      let colorTexto = "#71717a";
      let etiqueta = "—";
      if (diff > 0) {
        colorFondo = "#dcfce7";
        colorTexto = "#15803d";
        etiqueta = `▲ ${diff}`;
      } else if (diff < 0) {
        colorFondo = "#fee2e2";
        colorTexto = "#b91c1c";
        etiqueta = `▼ ${Math.abs(diff)}`;
      }
      ctx.fillStyle = colorFondo;
      trazarRectRedondeado(ctx, pillX, pillY, pillAncho, pillAlto, 15);
      ctx.fill();
      ctx.fillStyle = colorTexto;
      ctx.font = "bold 15px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(etiqueta, pillX + pillAncho / 2, centroY + 5);
    });

    // Footer
    const yFooter = ALTO_HEADER + lista.length * ALTO_FILA;
    ctx.fillStyle = "#f4f4f5";
    ctx.fillRect(0, yFooter, ANCHO, ALTO_FOOTER);
    ctx.fillStyle = "#a1a1aa";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    const hoy = new Date().toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" });
    ctx.fillText(`Generado el ${hoy} · atlantida-ajedrez.vercel.app`, ANCHO / 2, yFooter + ALTO_FOOTER / 2 + 4);
  }, [lista, ultimoTorneo]);

  function descargar() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const fecha = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `elo-atlantida-${fecha}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }

  if (!esAdmin) {
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-zinc-400">Esta sección es solo para administradores.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/jugadores" className="text-sm text-blue-400 hover:underline">
            ← Volver a jugadores
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Imagen para compartir</h1>
          <p className="mt-1 text-zinc-400">
            El ranking de Elo con flecha de cambio desde el último torneo, listo para mandar por
            WhatsApp — solo incluye a quien jugó en el último año.
          </p>
        </div>
        <button
          onClick={descargar}
          disabled={lista.length === 0}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ⬇️ Descargar imagen
        </button>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-zinc-400">No hay jugadores activos para mostrar.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/10 p-4">
          <canvas ref={canvasRef} className="mx-auto rounded-md shadow-sm" />
        </div>
      )}
    </div>
  );
}
