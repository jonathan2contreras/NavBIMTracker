import React, { useEffect, useRef } from "react";
import { Compass, Move3D, X } from "lucide-react";

import { FACADE_LABELS, dimParts, displayName } from "../../lib/theme";
import { usePanelScene } from "./usePanelScene";

const Stat = ({ label, value, testId }) => (
  <div className="min-w-[88px]" data-testid={testId}>
    <p className="text-[10px] font-bold uppercase tracking-wide text-[#8E8E93]">{label}</p>
    <p className="text-sm font-bold text-[#111111]">{value}</p>
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
  const facade = obj.facade && FACADE_LABELS[obj.facade];

  return (
    <div className="fixed inset-0 z-[60] bg-[#EDEEF2] animate-in fade-in duration-200" data-testid="panel-fullscreen">
      <canvas ref={canvasRef} className="block h-full w-full touch-none" data-testid="panel-fullscreen-canvas" />

      <div className="pointer-events-none absolute left-4 right-4 top-4 flex items-start justify-between gap-3">
        <div className="pointer-events-auto flex max-w-full flex-wrap items-start gap-x-6 gap-y-3 rounded-2xl bg-white/70 px-5 py-4 shadow-lg backdrop-blur-xl">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#8E8E93]">Código del panel</p>
            <p className="truncate text-lg font-extrabold text-[#111111]" data-testid="panel-fullscreen-code">
              {displayName(obj.name)}
            </p>
            {!!facade && (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-[#007AFF]" data-testid="panel-fullscreen-facade">
                <Compass size={13} /> Fachada {facade}
              </p>
            )}
          </div>
          {!!p && (
            <>
              <Stat label="Ancho" value={`${p.w.toFixed(2)} m`} testId="panel-fullscreen-width" />
              <Stat label="Alto" value={`${p.h.toFixed(2)} m`} testId="panel-fullscreen-height" />
              <Stat label="Superficie" value={`${(p.w * p.h).toFixed(2)} m²`} testId="panel-fullscreen-area" />
            </>
          )}
        </div>
        <button
          onClick={onClose}
          data-testid="panel-fullscreen-close"
          className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1C1C1E] text-white shadow-lg transition-opacity hover:opacity-85"
        >
          <X size={20} />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center">
        <div className="flex items-center gap-1.5 rounded-full bg-[#1C1C1E]/85 px-4 py-2.5" data-testid="panel-fullscreen-hint">
          <Move3D size={14} className="text-white" />
          <span className="text-[13px] font-medium text-white">Arrastra para rotar · rueda o pinza para zoom</span>
        </div>
      </div>
    </div>
  );
};
