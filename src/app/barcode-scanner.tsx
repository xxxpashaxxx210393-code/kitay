"use client";

import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { Camera, X } from "lucide-react";

export default function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (value: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Камера недоступна. Откройте сайт по HTTPS и разрешите доступ к камере.");
        }
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (!result || cancelled) return;
            const value = result.getText().trim();
            if (!value) return;
            cancelled = true;
            controlsRef.current?.stop();
            onDetected(value);
          }
        );
        if (cancelled) controls.stop();
        else controlsRef.current = controls;
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Не удалось запустить камеру");
      }
    };

    start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-white font-bold"><Camera className="w-5 h-5 text-cyan-400"/>Сканирование штрих-кода</div>
          <button type="button" onClick={onClose} aria-label="Закрыть сканер" className="p-2 rounded-lg bg-slate-800 text-slate-200"><X size={18}/></button>
        </div>
        <div className="relative overflow-hidden rounded-xl bg-black aspect-[4/3]">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <div className="pointer-events-none absolute inset-[15%] border-2 border-cyan-400 rounded-xl shadow-[0_0_0_999px_rgba(0,0,0,.2)]"/>
        </div>
        {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : <p className="mt-3 text-sm text-slate-300">Наведите камеру на штрих-код или трек-номер. После считывания товар найдётся автоматически.</p>}
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-white font-semibold">Закрыть</button>
      </div>
    </div>
  );
}
