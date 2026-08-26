"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CAMARA_BUCKET, CAMARA_ARCHIVO_EN_VIVO, CAMARA_CARPETA_DESAJUSTES } from "@/lib/camaraTablero";

const INTERVALO_MS = 1500;

export type CamaraTableroHandle = {
  /** Sube ya mismo el cuadro actual de la cámara como foto de un desajuste. No hace nada si la cámara está apagada. */
  capturarDesajuste: () => void;
};

export const CamaraTablero = forwardRef<CamaraTableroHandle, { onCambiaActiva?: (activa: boolean) => void }>(
  function CamaraTablero({ onCambiaActiva }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [activa, setActiva] = useState(false);
    const [activando, setActivando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function capturarBlob(): Promise<Blob | null> {
      return new Promise((resolve) => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.videoWidth === 0) {
          resolve(null);
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.7);
      });
    }

    async function subirFrame(ruta: string) {
      const blob = await capturarBlob();
      if (!blob) return;
      const { error: errorSubida } = await supabase.storage.from(CAMARA_BUCKET).upload(ruta, blob, {
        upsert: true,
        contentType: "image/jpeg",
      });
      if (errorSubida) {
        setError(`No se pudo subir la foto a la transmisión: ${errorSubida.message}`);
      } else {
        setError(null);
      }
    }

    useImperativeHandle(ref, () => ({
      capturarDesajuste: () => {
        if (!streamRef.current) return;
        subirFrame(`${CAMARA_CARPETA_DESAJUSTES}/${Date.now()}.jpg`);
      },
    }));

    async function activarCamara() {
      setError(null);
      setActivando(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        intervaloRef.current = setInterval(() => subirFrame(CAMARA_ARCHIVO_EN_VIVO), INTERVALO_MS);
        setActiva(true);
        onCambiaActiva?.(true);
      } catch (err) {
        setError(
          err instanceof Error
            ? `No se pudo acceder a la cámara: ${err.message}`
            : "No se pudo acceder a la cámara."
        );
      }
      setActivando(false);
    }

    function desactivarCamara() {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
      intervaloRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setActiva(false);
      onCambiaActiva?.(false);
    }

    // Si se sale de la página con la cámara prendida, apagarla prolijamente.
    useEffect(() => {
      return () => {
        if (intervaloRef.current) clearInterval(intervaloRef.current);
        streamRef.current?.getTracks().forEach((t) => t.stop());
      };
    }, []);

    return (
      <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">📷 Cámara del tablero</h3>
          <button
            onClick={activa ? desactivarCamara : activarCamara}
            disabled={activando}
            className={`rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
              activa
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-white/20 hover:bg-white/10"
            }`}
          >
            {activa ? "Apagar cámara" : activando ? "Activando..." : "Activar cámara"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {activa && (
          <p className="text-xs text-zinc-400">
            Subiendo una foto del tablero cada {INTERVALO_MS / 1000}s para que se vea en la
            transmisión pública. Apuntá la cámara al tablero real.
          </p>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full max-w-xs rounded-md border border-white/10 ${activa ? "" : "hidden"}`}
        />
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }
);
