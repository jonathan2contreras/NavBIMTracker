import React from "react";
import { Loader2, Tag, X } from "lucide-react";

import { displayName, formatM2 } from "../lib/theme";

export function MultiSelectPanel({ names, areaMap, onRemove, onClear, onExit, canTag, onTag }) {
  const known = names.filter((n) => typeof areaMap[n] === "number");
  const total = known.reduce((acc, n) => acc + areaMap[n], 0);
  const pending = names.some((n) => areaMap[n] === undefined);
  const without = names.length - known.length;

  return (
    <div className="pointer-events-auto w-full overflow-hidden rounded-2xl bg-white shadow-2xl" data-testid="multi-panel">
      <div className="flex items-center gap-2 border-b border-[#E5E5EA] px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold tracking-wide text-[#8E8E93]">SELECCIÓN MÚLTIPLE</p>
          <p className="text-[13px] font-bold text-[#111111]" data-testid="multi-count">
            {names.length} {names.length === 1 ? "pieza" : "piezas"}
          </p>
        </div>
        <button
          data-testid="multi-clear-button"
          onClick={onClear}
          className="h-8 rounded-full bg-[#F2F2F7] px-3 text-[11px] font-bold text-[#3A3A3C]"
        >
          Limpiar
        </button>
        <button
          data-testid="multi-exit-button"
          onClick={onExit}
          title="Salir de la selección múltiple"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F2F2F7]"
        >
          <X size={16} className="text-[#3A3A3C]" />
        </button>
      </div>

      <div className="max-h-52 overflow-y-auto" data-testid="multi-list">
        {names.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-[#8E8E93]">Toca las piezas del modelo para añadirlas</p>
        ) : (
          names.map((n, i) => (
            <div key={n} className="flex items-center gap-2 border-b border-[#F2F2F7] px-4 py-2 last:border-0">
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[#111111]">{displayName(n)}</span>
              <span className="shrink-0 text-[11px] font-semibold text-[#636366]">
                {areaMap[n] === undefined ? "…" : areaMap[n] === null ? "sin área" : formatM2(areaMap[n])}
              </span>
              <button
                data-testid={`multi-remove-${i}`}
                onClick={() => onRemove(n)}
                title="Quitar de la selección"
                className="shrink-0 rounded-full p-1 hover:bg-[#F2F2F7]"
              >
                <X size={13} className="text-[#8E8E93]" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex items-end justify-between gap-3 bg-[#F2F2F7] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-wide text-[#8E8E93]">SUPERFICIE TOTAL</p>
          <p className="flex items-center gap-2 text-lg font-extrabold text-[#111111]" data-testid="multi-total">
            {pending ? <Loader2 size={16} className="animate-spin text-[#8E8E93]" /> : formatM2(total)}
          </p>
          {without > 0 && !pending && (
            <p className="text-[10px] leading-tight text-[#8E8E93]" data-testid="multi-without-area">
              {without} sin área
            </p>
          )}
        </div>
        {canTag && (
          <button
            data-testid="multi-tag-button"
            onClick={onTag}
            disabled={names.length === 0}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-[#1C1C1E] px-4 text-[13px] font-bold text-white disabled:opacity-40"
          >
            <Tag size={15} /> Etiquetar
          </button>
        )}
      </div>
    </div>
  );
}
