export const STATUSES = [
  { key: "fabricado", label: "Fabricado", color: "#007AFF", accent: "#007AFF", textOn: "#FFFFFF" },
  { key: "enviado", label: "Enviado", color: "#FF9500", accent: "#FF9500", textOn: "#FFFFFF" },
  { key: "instalado", label: "Instalado", color: "#34C759", accent: "#34C759", textOn: "#FFFFFF" },
  { key: "entregable", label: "Entregable", color: "#F3EAD0", accent: "#8A7A50", textOn: "#111111" },
  { key: "observaciones", label: "Observaciones", color: "#FFD60A", accent: "#D19E00", textOn: "#111111" },
];

export const NO_STATUS_COLOR = "#B4BAC6";

export const FACADE_LABELS = { norte: "Norte", sur: "Sur", este: "Este", oeste: "Oeste" };

export const FACADE_FILTERS = [
  { key: "all", label: "Todas las fachadas" },
  { key: "norte", label: "Norte" },
  { key: "sur", label: "Sur" },
  { key: "este", label: "Este" },
  { key: "oeste", label: "Oeste" },
];

export const LOGOS = [
  { key: "fiberkret", src: "/logo_fiberkret.png", ratio: 1600 / 533 },
  { key: "entrepisos", src: "/logo_entrepisos.png", ratio: 921 / 371 },
  { key: "grcontreras", src: "/logo_grcontreras.png", ratio: 921 / 372 },
];

export function statusMeta(status) {
  return STATUSES.find((s) => s.key === status) || null;
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatArea(d) {
  if (!d || d.length < 3) return "";
  let w = Math.max(d[0], d[2]);
  let h = d[1];
  if (w > 100 || h > 100) {
    w /= 1000;
    h /= 1000;
  }
  return `${(w * h).toFixed(2)} m²`;
}

export function formatDims(d) {
  if (!d || d.length < 3) return "";
  let w = Math.max(d[0], d[2]);
  let h = d[1];
  if (w > 100 || h > 100) {
    w /= 1000;
    h /= 1000;
  }
  return `${w.toFixed(2)} × ${h.toFixed(2)} m`;
}
