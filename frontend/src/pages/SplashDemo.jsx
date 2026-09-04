import React, { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";

import { SplashScreen, SPLASH_VARIANTS } from "../components/SplashScreen";

const LABELS = {
  sequence: { name: "1 · Secuencia", desc: "Los logos aparecen uno a uno con fundido (2s cada uno)." },
  stack: { name: "2 · Apilados", desc: "Los tres logos se revelan juntos, de arriba a abajo." },
  slide: { name: "3 · Deslizante", desc: "Los logos entran y salen desplazándose lateralmente." },
  zoom: { name: "4 · Zoom (fondo oscuro)", desc: "Cada logo aparece con zoom sobre una tarjeta blanca en fondo negro." },
};

export default function SplashDemo() {
  const [preview, setPreview] = useState(null);

  return (
    <div className="min-h-screen bg-white px-6 py-10" data-testid="splash-demo-screen">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-extrabold text-[#111111]">Opciones de presentación de inicio</h1>
        <p className="mt-1 text-[13px] text-[#636366]">
          Todas duran exactamente 6 segundos. Toca una opción para previsualizarla y dime cuál prefieres.
        </p>

        <div className="mt-6 grid gap-3">
          {SPLASH_VARIANTS.map((v) => (
            <button
              key={v}
              data-testid={`splash-preview-${v}`}
              onClick={() => setPreview(v)}
              className="flex items-center gap-3 rounded-2xl border border-[#E5E5EA] bg-white p-4 text-left transition-colors hover:bg-[#F2F2F7]"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1C1C1E]">
                <Play size={20} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-[#111111]">{LABELS[v].name}</p>
                <p className="mt-0.5 text-xs text-[#8E8E93]">{LABELS[v].desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {preview && <SplashScreen key={preview} variant={preview} onFinish={() => setPreview(null)} />}
      </AnimatePresence>
    </div>
  );
}
