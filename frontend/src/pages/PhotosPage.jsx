import React, { useCallback, useEffect, useState } from "react";
import { ArrowRight, Camera, Compass, Loader2, X } from "lucide-react";

import { api, fileUrl } from "../lib/api";
import { Chip } from "../components/Chip";
import { FACADE_FILTERS, FACADE_LABELS, displayName, formatDate, statusMeta } from "../lib/theme";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function PhotosPage() {
  const [facade, setFacade] = useState("all");
  const [fromText, setFromText] = useState("");
  const [toText, setToText] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightbox, setLightbox] = useState(null);

  const fetchPhotos = useCallback(
    async (fac, from, to) => {
      const f = from.trim();
      const t = to.trim();
      if ((f && !DATE_RE.test(f)) || (t && !DATE_RE.test(t))) {
        setError("Fechas inválidas. Usa el formato AAAA-MM-DD.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        setData(await api.getPhotos({ facade: fac, from: f, to: t }));
      } catch {
        setError("Error al cargar las fotos.");
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchPhotos(facade, fromText, toText);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facade]);

  return (
    <div className="h-full overflow-y-auto bg-white" data-testid="photos-screen">
      <div className="mx-auto w-full max-w-4xl px-4 pb-8 pt-4">
        <div className="flex items-baseline justify-between pb-2">
          <h1 className="text-2xl font-extrabold text-[#111111]">Fotos de obra</h1>
          <span className="text-xs font-medium text-[#8E8E93]" data-testid="photos-total-count">
            {loading ? "Cargando..." : `${(data?.total || 0).toLocaleString("es-ES")} fotos`}
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto py-2">
          {FACADE_FILTERS.map((f) => (
            <Chip
              key={f.key}
              testId={`photos-facade-${f.key}`}
              selected={facade === f.key}
              color="#007AFF"
              icon={f.key !== "all" ? <Compass size={13} color={facade === f.key ? "#FFFFFF" : "#007AFF"} /> : null}
              label={f.label}
              onClick={() => setFacade(f.key)}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 py-2">
          <input
            data-testid="photos-from-input"
            value={fromText}
            onChange={(e) => setFromText(e.target.value)}
            placeholder="Desde AAAA-MM-DD"
            className="h-11 flex-1 rounded-xl bg-[#F2F2F7] px-3 text-[13px] text-[#111111] outline-none placeholder:text-[#8E8E93]"
          />
          <ArrowRight size={14} className="shrink-0 text-[#8E8E93]" />
          <input
            data-testid="photos-to-input"
            value={toText}
            onChange={(e) => setToText(e.target.value)}
            placeholder="Hasta AAAA-MM-DD"
            className="h-11 flex-1 rounded-xl bg-[#F2F2F7] px-3 text-[13px] text-[#111111] outline-none placeholder:text-[#8E8E93]"
          />
          <button
            data-testid="photos-apply-button"
            onClick={() => fetchPhotos(facade, fromText, toText)}
            className="h-11 shrink-0 rounded-xl bg-[#1C1C1E] px-4 text-[13px] font-bold text-white"
          >
            Aplicar
          </button>
        </div>

        {!!error && (
          <p className="py-2 text-[13px] text-[#FF3B30]" data-testid="photos-error">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-16" data-testid="photos-loading">
            <Loader2 size={32} className="animate-spin text-[#1C1C1E]" />
          </div>
        ) : (data?.items || []).length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16" data-testid="photos-empty">
            <Camera size={40} className="text-[#C7C7CC]" />
            <p className="text-[15px] font-bold text-[#111111]">Sin fotos de obra</p>
            <p className="px-6 text-center text-xs text-[#8E8E93]">
              Adjunta fotos a las notas de las piezas desde su ficha
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-3 lg:grid-cols-4" data-testid="photos-grid">
            {data.items.map((it, i) => {
              const meta = statusMeta(it.status);
              return (
                <button
                  key={`${it.photo}-${i}`}
                  data-testid={`photo-card-${i}`}
                  onClick={() => setLightbox(it)}
                  className="overflow-hidden rounded-xl border border-[#E5E5EA] bg-white text-left transition-shadow hover:shadow-md"
                >
                  <img
                    src={fileUrl(it.photo)}
                    alt={displayName(it.name)}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  <div className="p-2.5">
                    <p className="truncate text-[13px] font-semibold text-[#111111]">{displayName(it.name)}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px]">
                      {!!it.facade && FACADE_LABELS[it.facade] && (
                        <span className="font-semibold text-[#007AFF]">{FACADE_LABELS[it.facade]}</span>
                      )}
                      {!!meta && (
                        <span className="font-semibold" style={{ color: meta.accent }}>
                          · {meta.label}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#8E8E93]">{formatDate(it.date)}</p>
                    {!!it.text && <p className="mt-1 truncate text-[11px] text-[#3A3A3C]">{it.text}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-6"
          onClick={() => setLightbox(null)}
          data-testid="photo-lightbox"
        >
          <button
            data-testid="photo-lightbox-close"
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
          >
            <X size={22} />
          </button>
          <img
            src={fileUrl(lightbox.photo)}
            alt={displayName(lightbox.name)}
            className="max-h-[75vh] max-w-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-3 text-center">
            <p className="text-sm font-bold text-white">{displayName(lightbox.name)}</p>
            <p className="mt-0.5 text-xs text-white/70">
              {lightbox.facade && FACADE_LABELS[lightbox.facade] ? `Fachada ${FACADE_LABELS[lightbox.facade]} · ` : ""}
              {formatDate(lightbox.date)}
            </p>
            {!!lightbox.text && <p className="mt-1 max-w-xl text-xs text-white/80">{lightbox.text}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
