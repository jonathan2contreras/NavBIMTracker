import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircle, Compass, Hand, Loader2, Tag, X } from "lucide-react";

import { api, VIEWER_URL } from "../lib/api";
import { TagSheet } from "../components/TagSheet";
import { LOGOS, NO_STATUS_COLOR, STATUSES, displayName } from "../lib/theme";
const ISO_FILTERS = [
  { key: "all", label: "Todas" },
  ...STATUSES.map((s) => ({ key: s.key, label: s.label, color: s.color, accent: s.accent, textOn: s.textOn })),
  { key: "none", label: "Sin estado", color: NO_STATUS_COLOR, accent: NO_STATUS_COLOR, textOn: "#FFFFFF" },
];

export default function ViewerPage() {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [hintVisible, setHintVisible] = useState(true);
  const [viewerKey, setViewerKey] = useState(0);
  const [isoFilter, setIsoFilter] = useState("all");
  const [compassOpen, setCompassOpen] = useState(false);
  const [focusedName, setFocusedName] = useState(null);
  const [sheetObj, setSheetObj] = useState(null);
  const [hover, setHover] = useState(null);
  const loadedRef = useRef(false);
  const pendingFocusRef = useRef(null);
  const [searchParams] = useSearchParams();
  const focus = searchParams.get("focus");
  const t = searchParams.get("t");

  const sendCmd = useCallback((cmd, args = []) => {
    const payload = JSON.stringify({ __viewerCmd: true, cmd, args });
    iframeRef.current?.contentWindow?.postMessage(payload, "*");
  }, []);

  useEffect(() => {
    if (!focus) return;
    setHintVisible(false);
    setFocusedName(focus);
    if (loadedRef.current) sendCmd("focusObject", [focus]);
    else pendingFocusRef.current = focus;
  }, [focus, t, sendCmd]);

  const lastMapRef = useRef("");
  const loadTags = useCallback(async () => {
    try {
      const tags = await api.getTags();
      const map = {};
      for (const [name, tg] of Object.entries(tags)) {
        if (tg.status) map[name] = tg.status;
      }
      const key = JSON.stringify(map);
      if (key === lastMapRef.current) return;
      lastMapRef.current = key;
      sendCmd("applyTags", [map]);
    } catch {}
  }, [sendCmd]);

  // Sincronización multiusuario: refresca los estados del modelo cada 5s.
  useEffect(() => {
    const id = setInterval(() => {
      if (loadedRef.current && !error && document.visibilityState === "visible") loadTags();
    }, 5000);
    return () => clearInterval(id);
  }, [loadTags, error]);

  const openObject = useCallback((name) => {
    api
      .getObject(name)
      .then(setSheetObj)
      .catch(() => setSheetObj({ name, mark: name.split(" ")[0], status: null, observation: "" }));
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (typeof e.data !== "string") return;
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      if (!msg || !msg.type) return;
      if (msg.type === "progress") setProgress(msg.pct);
      else if (msg.type === "loaded") {
        setLoading(false);
        loadedRef.current = true;
        loadTags();
        if (pendingFocusRef.current) {
          const f = pendingFocusRef.current;
          pendingFocusRef.current = null;
          sendCmd("focusObject", [f]);
        }
      } else if (msg.type === "error") {
        setLoading(false);
        setError(msg.message || "Error al cargar el modelo");
      } else if (msg.type === "select") {
        setHintVisible(false);
        setHover(null);
        openObject(msg.name);
      } else if (msg.type === "hover") {
        setHover(msg.name ? { name: msg.name, x: msg.x, y: msg.y } : null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [loadTags, sendCmd, openObject]);

  const handleIsolate = (key) => {
    setIsoFilter((prev) => {
      const next = prev === key ? "all" : key;
      sendCmd("isolate", [next]);
      return next;
    });
  };

  const orientTo = useCallback(
    (facade) => {
      sendCmd("orientTo", [facade]);
      setCompassOpen(false);
    },
    [sendCmd]
  );

  const handleSaved = useCallback(
    (obj) => sendCmd("setTag", [obj.name, obj.status]),
    [sendCmd]
  );

  const closeSheet = useCallback(() => {
    setSheetObj(null);
    if (!focusedName) sendCmd("clearSelection");
  }, [sendCmd, focusedName]);

  const closeFocused = () => {
    setFocusedName(null);
    sendCmd("clearSelection");
  };

  const retry = () => {
    setError("");
    setLoading(true);
    setProgress(0);
    loadedRef.current = false;
    setViewerKey((k) => k + 1);
  };

  return (
    <div className="relative h-full w-full bg-[#EDEEF2]" data-testid="viewer-screen">
      <iframe
        key={viewerKey}
        ref={iframeRef}
        src={VIEWER_URL}
        title="Visor 3D"
        className="block h-full w-full border-0"
        data-testid="model-viewer-iframe"
      />

      {hover && !sheetObj && (
        <div
          className="pointer-events-none absolute z-20 flex items-center gap-1.5 rounded-full bg-[#1C1C1E]/90 px-3 py-1.5 shadow-lg backdrop-blur"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
          data-testid="hover-tooltip"
        >
          <span className="h-2 w-2 rounded-full bg-[#007AFF]" />
          <span className="whitespace-nowrap text-[12px] font-bold text-white">{displayName(hover.name)}</span>
        </div>
      )}

      <div className="pointer-events-none absolute left-4 right-4 top-3">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white/55 px-4 py-3 backdrop-blur-xl">
          <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5" data-testid="status-legend">
            {ISO_FILTERS.map((f) => {
              const selected = isoFilter === f.key;
              return (
                <button
                  key={f.key}
                  data-testid={`legend-${f.key}`}
                  onClick={() => handleIsolate(f.key)}
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors"
                  style={
                    selected
                      ? {
                          backgroundColor: f.color || "#1C1C1E",
                          borderColor: f.key === "entregable" ? "#C7C7CC" : f.color || "#1C1C1E",
                          color: f.textOn || "#FFFFFF",
                        }
                      : { backgroundColor: "rgba(255,255,255,0.7)", borderColor: "#C7C7CC", color: "#3A3A3C" }
                  }
                >
                  {!!f.color && !selected && (
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: f.accent || f.color }} />
                  )}
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="relative shrink-0">
            <button
              data-testid="compass-button"
              onClick={() => setCompassOpen((v) => !v)}
              title="Orientar hacia una fachada"
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                compassOpen ? "border-[#1C1C1E] bg-[#1C1C1E] text-white" : "border-[#C7C7CC] bg-white/70 text-[#1C1C1E]"
              }`}
            >
              <Compass size={16} />
            </button>
            {compassOpen && (
              <div
                className="absolute right-0 top-10 z-10 grid grid-cols-3 gap-1 rounded-2xl bg-white p-2 shadow-xl"
                data-testid="compass-panel"
              >
                <span />
                <button
                  data-testid="compass-norte"
                  onClick={() => orientTo("norte")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7] text-sm font-extrabold text-[#111111] hover:bg-[#1C1C1E] hover:text-white"
                >
                  N
                </button>
                <span />
                <button
                  data-testid="compass-oeste"
                  onClick={() => orientTo("oeste")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7] text-sm font-extrabold text-[#111111] hover:bg-[#1C1C1E] hover:text-white"
                >
                  O
                </button>
                <div className="flex h-9 w-9 items-center justify-center">
                  <Compass size={18} className="text-[#8E8E93]" />
                </div>
                <button
                  data-testid="compass-este"
                  onClick={() => orientTo("este")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7] text-sm font-extrabold text-[#111111] hover:bg-[#1C1C1E] hover:text-white"
                >
                  E
                </button>
                <span />
                <button
                  data-testid="compass-sur"
                  onClick={() => orientTo("sur")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7] text-sm font-extrabold text-[#111111] hover:bg-[#1C1C1E] hover:text-white"
                >
                  S
                </button>
                <span />
              </div>
            )}
          </div>
        </div>
      </div>

      {!loading && !error && focusedName && (
        <div className="absolute bottom-6 left-4 right-4 flex justify-center">
          <div className="flex w-full max-w-xl items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg" data-testid="focused-piece-banner">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold tracking-wide text-[#8E8E93]">PIEZA ENFOCADA</p>
              <p className="truncate text-[13px] font-bold text-[#111111]">{displayName(focusedName)}</p>
            </div>
            <button
              data-testid="focused-tag-button"
              onClick={() => openObject(focusedName)}
              className="flex h-[34px] items-center gap-1.5 rounded-full bg-[#1C1C1E] px-3 text-xs font-bold text-white"
            >
              <Tag size={14} /> Etiquetar
            </button>
            <button onClick={closeFocused} data-testid="focused-close-button">
              <X size={20} className="text-[#8E8E93]" />
            </button>
          </div>
        </div>
      )}

      {!loading && !error && hintVisible && !focusedName && (
        <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-1.5 rounded-full bg-[#1C1C1E]/85 px-4 py-2.5" data-testid="tap-hint">
            <Hand size={14} className="text-white" />
            <span className="text-[13px] font-medium text-white">Toca una pieza para etiquetarla</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex flex-col items-center bg-white px-8 pt-[8vh]" data-testid="viewer-loading">
          <div className="mb-10 flex flex-col items-center gap-7" data-testid="viewer-loading-logos">
            {LOGOS.map((l) => (
              <img
                key={l.key}
                src={l.src}
                alt={l.key}
                data-testid={`viewer-loading-logo-${l.key}`}
                className="h-16 w-56 max-w-[80%] object-contain sm:h-20 sm:w-64"
              />
            ))}
          </div>
          <Loader2 size={36} className="animate-spin text-[#1C1C1E]" />
          <p className="mt-4 text-base font-bold text-[#111111]">Cargando modelo BIM...</p>
          <p className="mt-1 text-[13px] text-[#8E8E93]">{progress > 0 ? `${progress}%` : "Conectando..."}</p>
          <div className="mt-4 h-1.5 w-4/5 max-w-md overflow-hidden rounded-full bg-[#E5E5EA]">
            <div className="h-full rounded-full bg-[#1C1C1E] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-3 text-xs text-[#8E8E93]">El modelo pesa 57 MB, puede tardar un momento</p>
        </div>
      )}

      {!!error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-8" data-testid="viewer-error">
          <AlertCircle size={40} className="text-[#FF3B30]" />
          <p className="mt-4 text-base font-bold text-[#111111]">Error al cargar el modelo</p>
          <button
            data-testid="viewer-retry-button"
            onClick={retry}
            className="mt-4 h-11 rounded-xl bg-[#1C1C1E] px-6 text-sm font-bold text-white"
          >
            Reintentar
          </button>
        </div>
      )}

      {sheetObj && <TagSheet obj={sheetObj} onClose={closeSheet} onSaved={handleSaved} />}
    </div>
  );
}
