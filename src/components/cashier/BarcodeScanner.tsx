"use client";
import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";

interface Props {
  onScanned: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScanned, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualValue, setManualValue] = useState("");

  const onScannedRef = useRef(onScanned);
  useEffect(() => {
    onScannedRef.current = onScanned;
  });

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader
      .decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
        if (result) {
          navigator.vibrate?.(100);
          onScannedRef.current(result.getText());
          reader.reset();
        }
        if (err) {
          // Ignore transient scan errors (NotFoundException fires on every empty frame)
          const errName = (err as Error).name;
          if (
            errName !== "NotFoundException" &&
            errName !== "ChecksumException" &&
            errName !== "FormatException"
          ) {
            setCameraError(
              "No se pudo acceder a la cámara. Verificá que el navegador tenga permiso.",
            );
          }
        }
      })
      .catch((e: unknown) => {
        const message =
          e instanceof Error ? e.message : "Error al iniciar la cámara.";
        if (
          message.toLowerCase().includes("permission") ||
          message.toLowerCase().includes("denied")
        ) {
          setCameraError(
            "Permiso de cámara denegado. Habilitalo en la configuración del navegador y recargá la página.",
          );
        } else {
          setCameraError(`No se pudo iniciar la cámara: ${message}`);
        }
      });

    return () => {
      readerRef.current?.reset();
    };
  }, []);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = manualValue.trim();
    if (!value) return;
    onScanned(value);
    setManualValue("");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md rounded-2xl bg-gray-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Escanear código de barras</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            Cerrar
          </button>
        </div>

        {/* Camera feed */}
        {!cameraError ? (
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className="h-56 w-full object-cover"
              playsInline
              muted
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-32 w-48 rounded-lg border-2 border-white/60" />
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-gray-800 p-4">
            <p className="text-sm text-red-400">{cameraError}</p>
            {navigator.userAgent.includes("Chrome") && (
              <p className="mt-2 text-xs text-gray-400">
                En Chrome: Configuración → Privacidad → Configuración del sitio → Cámara → Permitir.
              </p>
            )}
            {navigator.userAgent.includes("Firefox") && !navigator.userAgent.includes("Chrome") && (
              <p className="mt-2 text-xs text-gray-400">
                En Firefox: hacé clic en el ícono de candado en la barra de direcciones y permitir la cámara.
              </p>
            )}
          </div>
        )}

        {/* Manual fallback — always visible */}
        <form onSubmit={handleManualSubmit} className="mt-4 flex gap-2">
          <input
            type="text"
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder="Código de barras manual"
            className="flex-1 rounded-xl bg-gray-800 px-4 py-2 text-sm text-white placeholder-gray-400 outline-none ring-1 ring-gray-700 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!manualValue.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            Buscar
          </button>
        </form>
      </div>
    </div>
  );
}
