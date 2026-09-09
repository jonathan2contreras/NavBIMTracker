import React, { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

// Aviso flotante que aparece cuando el sondeo detecta un cambio hecho por otro usuario.
export function notifySync(message = "Actualizado por otro usuario") {
  window.dispatchEvent(new CustomEvent("bim-sync", { detail: { message } }));
}

export function SyncToast() {
  const [toast, setToast] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      setToast({ message: e.detail?.message || "Actualizado por otro usuario", id: Date.now() });
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setToast(null), 3200);
    };
    window.addEventListener("bim-sync", handler);
    return () => {
      window.removeEventListener("bim-sync", handler);
      clearTimeout(timerRef.current);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      data-testid="sync-toast"
      className="pointer-events-none fixed left-1/2 top-16 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#E5E5EA] bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur-sm animate-[syncIn_0.25s_ease-out]"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E8F0FE]">
        <RefreshCw size={13} className="text-[#007AFF]" />
      </span>
      <span className="text-[13px] font-semibold text-[#111111]">{toast.message}</span>
    </div>
  );
}
