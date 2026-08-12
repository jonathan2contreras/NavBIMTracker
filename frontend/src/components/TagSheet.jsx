import React, { useCallback, useMemo, useRef, useState } from "react";
import { Box, Camera, Compass, Eye, Loader2, MessageSquare, X, XCircle } from "lucide-react";

import { api, fileUrl } from "../lib/api";
import { useRole } from "../context/RoleContext";
import { FACADE_LABELS, NO_STATUS_COLOR, STATUSES, displayName, formatArea, formatDate, formatDims, statusMeta } from "../lib/theme";

export const TagSheet = ({ obj, onClose, onSaved }) => {
  const { isAdmin } = useRole();
  const readOnly = !isAdmin;
  const [status, setStatus] = useState(obj.status);
  const [observation, setObservation] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const fileInputRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const timeline = useMemo(() => {
    const hist = [...(obj.history || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const groups = hist.map((h) => ({ status: h.status, date: h.date, obs: [] }));
    const pre = { status: null, date: "", obs: [] };
    for (const ob of obj.observations || []) {
      let target = pre;
      for (const g of groups) {
        if ((g.date || "") <= (ob.date || "")) target = g;
        else break;
      }
      target.obs.push(ob);
    }
    const all = pre.obs.length ? [pre, ...groups] : groups;
    return all.reverse();
  }, [obj]);

  const handlePhotoPick = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }, []);

  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [photoPreview]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const newObs = observation.trim();
      let photoPath = null;
      if (photoFile) {
        const up = await api.uploadPhoto(photoFile);
        photoPath = up.path;
      }
      await api.saveTag({ object_name: obj.name, status, observation: newObs, photo: photoPath });
      const prevList = obj.observations || [];
      const latest = newObs || (prevList.length ? prevList[prevList.length - 1].text : "") || "";
      onSaved?.({ ...obj, status, observation: latest });
      onClose();
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }, [obj, status, observation, photoFile, onSaved, onClose]);

  const dims = formatDims(obj.dimensions);
  const area = formatArea(obj.dimensions);

  return (
    <div className="fixed inset-0 z-50" data-testid="tag-sheet">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} data-testid="tag-sheet-backdrop" />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl sm:rounded-l-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex items-center gap-3 p-5 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2F2F7]" data-testid="tag-sheet-mark-badge">
            <Box size={18} className="text-[#111111]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-[#111111]" data-testid="tag-sheet-object-name">
              {displayName(obj.name)}
            </p>
            {!!obj.facade && FACADE_LABELS[obj.facade] && (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-bold text-[#007AFF]" data-testid="tag-sheet-facade">
                <Compass size={13} /> Fachada {FACADE_LABELS[obj.facade]}
              </p>
            )}
            <p className="mt-0.5 text-xs text-[#8E8E93]" data-testid="tag-sheet-mark">
              Pieza: {obj.mark || obj.name.split(" ")[0]}
            </p>
            {!!dims && (
              <p className="mt-0.5 text-xs text-[#8E8E93]" data-testid="tag-sheet-dimensions">
                Dimensiones: {dims} (ancho × alto)
              </p>
            )}
            {!!area && (
              <p className="mt-0.5 text-xs text-[#8E8E93]" data-testid="tag-sheet-area">
                Superficie: {area}
              </p>
            )}
          </div>
          <button onClick={onClose} data-testid="tag-sheet-close" className="rounded-full p-1.5 hover:bg-[#F2F2F7]">
            <X size={18} className="text-[#8E8E93]" />
          </button>
        </div>

        <div className="px-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#636366]">Estado</p>
          <div className="grid grid-cols-2 gap-2">
            {STATUSES.map((s) => {
              const selected = status === s.key;
              return (
                <button
                  key={s.key}
                  data-testid={`status-pill-${s.key}`}
                  disabled={readOnly}
                  onClick={() => setStatus(selected ? null : s.key)}
                  className={`flex h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] text-sm font-semibold transition-colors ${readOnly && !selected ? "opacity-45" : ""}`}
                  style={{
                    borderColor: s.key === "entregable" ? "#C7C7CC" : s.color,
                    backgroundColor: selected ? s.color : "#FFFFFF",
                    color: selected ? s.textOn : "#111111",
                  }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selected ? s.textOn : s.accent }} />
                  {s.label}
                </button>
              );
            })}
          </div>
          {status !== null && !readOnly && (
            <button
              data-testid="status-clear-button"
              onClick={() => setStatus(null)}
              className="mt-2 flex items-center gap-1 py-1 text-[13px] font-medium text-[#8E8E93]"
            >
              <XCircle size={16} style={{ color: NO_STATUS_COLOR }} /> Quitar estado
            </button>
          )}

          {!readOnly && (
            <>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Notas</p>
              <textarea
                data-testid="observation-input"
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Añadir nueva nota..."
                className="min-h-[80px] w-full resize-y rounded-xl bg-[#F2F2F7] px-3 py-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoPick}
                data-testid="photo-file-input"
              />
              {photoPreview ? (
                <div className="mt-2 flex items-center gap-3" data-testid="photo-preview">
                  <img src={photoPreview} alt="Foto adjunta" className="h-16 w-16 rounded-lg border border-[#E5E5EA] object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#111111]">{photoFile?.name}</p>
                    <p className="text-[11px] text-[#8E8E93]">Se adjuntará al guardar</p>
                  </div>
                  <button onClick={clearPhoto} data-testid="photo-remove-button" className="rounded-full p-1.5 hover:bg-[#F2F2F7]">
                    <X size={16} className="text-[#8E8E93]" />
                  </button>
                </div>
              ) : (
                <button
                  data-testid="photo-attach-button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 flex h-9 items-center gap-1.5 rounded-full border border-[#E5E5EA] bg-white px-3.5 text-[13px] font-semibold text-[#3A3A3C] transition-colors hover:bg-[#F2F2F7]"
                >
                  <Camera size={15} /> Adjuntar foto de obra
                </button>
              )}
            </>
          )}

          {!!error && (
            <p className="mt-2 text-[13px] text-[#FF3B30]" data-testid="tag-sheet-error">
              {error}
            </p>
          )}

          {timeline.length > 0 && (
            <>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">
                Historial de estados
              </p>
              <div className="max-h-[190px] overflow-y-auto rounded-xl bg-[#F2F2F7] px-3 py-2" data-testid="tag-sheet-history">
                {timeline.map((g, gi) => {
                  const meta = statusMeta(g.status);
                  return (
                    <div key={`g-${g.date}-${gi}`} className="mb-0.5">
                      <div className="flex items-center gap-2 py-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta ? meta.accent : NO_STATUS_COLOR }} />
                        <span className="flex-1 text-[13px] font-semibold text-[#111111]">
                          {meta ? meta.label : "Sin estado"}
                        </span>
                        <span className="text-xs text-[#8E8E93]">{formatDate(g.date)}</span>
                      </div>
                      {g.obs.map((ob, i) => (
                        <div key={`ob-${ob.date}-${i}`} className="flex items-start gap-2 py-1 pl-4" data-testid={`timeline-obs-${gi}-${i}`}>
                          <MessageSquare size={13} className="mt-0.5 shrink-0 text-[#8E8E93]" />
                          <div className="min-w-0 flex-1">
                            {!!ob.text && <span className="block text-[13px] text-[#3A3A3C]">{ob.text}</span>}
                            {!!ob.photo && (
                              <a
                                href={fileUrl(ob.photo)}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-testid={`timeline-photo-${gi}-${i}`}
                                className="mt-1 inline-block"
                              >
                                <img
                                  src={fileUrl(ob.photo)}
                                  alt="Foto de obra"
                                  loading="lazy"
                                  className="h-16 w-16 rounded-lg border border-[#E5E5EA] object-cover transition-opacity hover:opacity-80"
                                />
                              </a>
                            )}
                          </div>
                          <span className="text-xs text-[#8E8E93]">{formatDate(ob.date)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="mt-auto p-5">
          {readOnly ? (
            <div className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#F2F2F7] text-[13px] font-semibold text-[#8E8E93]" data-testid="tag-sheet-readonly-note">
              <Eye size={16} /> Modo usuario — solo visualización
            </div>
          ) : (
            <button
              data-testid="tag-sheet-save-button"
              onClick={handleSave}
              disabled={saving}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1C1C1E] text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : "Guardar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
