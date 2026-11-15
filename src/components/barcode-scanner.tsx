"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { toast } from "sonner";

/**
 * Lector de códigos de barras con la cámara (html5-qrcode).
 * Evita lecturas repetidas del mismo código en menos de 2 segundos.
 */
export function BarcodeScanner({ onScan }: { onScan: (codigo: string) => void }) {
  const idRef = useRef("lector-" + Math.random().toString(36).slice(2));
  const ultimo = useRef<{ codigo: string; t: number }>({ codigo: "", t: 0 });
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let scanner: Html5Qrcode | null = null;
    let activo = true;

    (async () => {
      try {
        scanner = new Html5Qrcode(idRef.current, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
        });
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 120 } },
          (texto) => {
            const ahora = Date.now();
            if (texto === ultimo.current.codigo && ahora - ultimo.current.t < 2000) return;
            ultimo.current = { codigo: texto, t: ahora };
            onScanRef.current(texto);
          },
          () => {} // errores de lectura frame a frame: se ignoran
        );
      } catch (e) {
        if (!activo) return;
        const msg = String(e);
        if (/Permission|NotAllowed/i.test(msg)) {
          toast.error("Permiso de cámara denegado. Habilítalo en el navegador o ingresa el código manualmente.");
        } else if (/NotFound|Requested device/i.test(msg)) {
          toast.error("No se encontró ninguna cámara. Ingresa el código manualmente.");
        } else {
          toast.error("No se pudo iniciar la cámara. Ingresa el código manualmente.");
        }
      }
    })();

    return () => {
      activo = false;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner?.clear())
          .catch(() => {});
      }
    };
  }, []);

  return <div id={idRef.current} className="mx-auto w-full max-w-sm overflow-hidden rounded-md border bg-black/5" />;
}
