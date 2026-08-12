import React from "react";

export const Chip = ({ selected, color, accent, textOn, icon, label, onClick, testId, borderOverride }) => (
  <button
    data-testid={testId}
    onClick={onClick}
    className="flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 h-9 text-[13px] font-semibold transition-colors"
    style={
      selected
        ? {
            backgroundColor: color || "#1C1C1E",
            borderColor: borderOverride || color || "#1C1C1E",
            color: textOn || "#FFFFFF",
          }
        : { backgroundColor: "#FFFFFF", borderColor: "#E5E5EA", color: "#3A3A3C" }
    }
  >
    {icon}
    {!!color && !selected && (
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent || color }} />
    )}
    {label}
  </button>
);
