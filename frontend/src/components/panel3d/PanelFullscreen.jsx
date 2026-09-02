import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

import { FACADE_LABELS, NO_STATUS_COLOR, dimParts, displayName, statusMeta } from "../../lib/theme";
import { usePanelScene } from "./usePanelScene";

const Row = ({ label, value, testId }) => (
  <div className="border-t border-[#E5E5EA] py-3" data-testid={testId}>
    <p className="text-[10px] font-bold uppercase tracking-wide text-[#8E8E93]">{label}</p>
    <p className="mt-0.5 text-sm font-bold text-[#111111]">{value}</p>
  </div>
);

export const PanelFullscreen = ({ obj, mesh, onClose }) => {
  const canvasRef = useRef(null);
  usePanelScene(canvasRef, mesh, { interactive: true });

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const p = dimParts(obj.dimensions) || dimParts(mesh?.size);
  const facade = (obj.facade && FACADE_LABELS[obj.facade]) || "—";
  const meta = statusMeta(obj.status);

  return (
    <div className="fixed inset-0 z-[60] bg-[#EDEEF2] animate-in fade-in duration-200" data-testid="panel-fullscreen">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" data-testid="panel-fullscreen-canvas" />

      <aside
        className="absolute left-4 top-4 w-[210px] rounded-2xl bg-white/80 px-4 pb-1 pt-4 shadow-lg backdrop-blur-xl"
        data-testid="panel-fullscreen-info"
      >
        <p className="text-[10px] font-bold uppercase tracking-wide text-[#8E8E93]">Ficha técnica</p>
        <div className="mb-3 mt-1 flex items-start gap-2">
          <span
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: meta ? meta.accent : NO_STATUS_COLOR }}
            title={meta ? meta.label : "Sin estado"}
            data-testid="panel-fullscreen-status-dot"
          />
          <div className="min-w-0">
            <p className="break-words text-base font-extrabold leading-tight text-[#111111]" data-testid="panel-fullscreen-code">
              {displayName(obj.name)}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-[#8E8E93]" data-testid="panel-fullscreen-status">
              {meta ? meta.label : "Sin estado"}
            </p>
          </div>
        </div>
        <Row label="Fachada" value={facade} testId="panel-fullscreen-facade" />
        <Row label="Ancho" value={p ? `${p.w.toFixed(2)} m` : "—"} testId="panel-fullscreen-width" />
        <Row label="Alto" value={p ? `${p.h.toFixed(2)} m` : "—"} testId="panel-fullscreen-height" />
        <Row label="Superficie" value={p ? `${(p.w * p.h).toFixed(2)} m²` : "—"} testId="panel-fullscreen-area" />
      </aside>

      <button
        onClick={onClose}
        data-testid="panel-fullscreen-close"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#1C1C1E] text-white shadow-lg transition-opacity hover:opacity-85"
      >
        <X size={20} />
      </button>
    </div>
  );
};
