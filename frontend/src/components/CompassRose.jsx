import React from "react";

// Brújula que marca el norte: la rosa gira con `angle` (grados) para que la
// aguja roja (N) apunte siempre al norte real del modelo 3D.
export function CompassRose({ angle = 0, size = 20, showLabels = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" data-testid="compass-rose">
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: "50px 50px", transition: "transform 0.15s linear" }}>
        <polygon points="50,8 40,50 60,50" fill="#FF3B30" />
        <polygon points="50,92 40,50 60,50" fill="#8E8E93" />
        {showLabels && (
          <>
            <text x="50" y="26" textAnchor="middle" fontSize="20" fontWeight="800" fill="#FF3B30">N</text>
            <text x="50" y="88" textAnchor="middle" fontSize="16" fontWeight="700" fill="#8E8E93">S</text>
            <text x="84" y="56" textAnchor="middle" fontSize="16" fontWeight="700" fill="#3A3A3C">E</text>
            <text x="16" y="56" textAnchor="middle" fontSize="16" fontWeight="700" fill="#3A3A3C">O</text>
          </>
        )}
      </g>
      <circle cx="50" cy="50" r="6" fill="#1C1C1E" />
    </svg>
  );
}
