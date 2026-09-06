import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Camera, Compass, Eye, Loader2, MessageSquare, Users, X, XCircle } from "lucide-react";

import { api, fileUrl } from "../lib/api";
import { PanelPreview } from "./panel3d/PanelPreview";
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

  const initialTeamId = useMemo(() => {
    const inst = (obj.history || []).filter((h) => h.status === "instalado");
    return inst.length ? inst[inst.length - 1].team_id || "" : "";
  }, [obj]);
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamId, setTeamId] = useState(initialTeamId);

  useEffect(() => {
    if (readOnly) return;
    setTeamsLoading(true);
    api
      .getTeams()
      .then(setTeams)
      .catch(() => setTeams([]))
      .finally(() => setTeamsLoading(false));
  }, [readOnly]);

  const timeline = useMemo(() => {
    const hist = [...(obj.history || [])].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const groups = hist.map((h) => ({ status: h.status, date: h.date, team: h.team_name, obs: [] }));
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
    if (status === "instalado" && !teamId) {
      setError("Selecciona el equipo que instaló el panel.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const newObs = observation.trim();
      let photoPath = null;
      if (photoFile) {
        const up = await api.uploadPhoto(photoFile);
        photoPath = up.path;
      }
      const team = status === "instalado" ? teams.find((t) => t.id === teamId) : null;
      await api.saveTag({
        object_name: obj.name,
        status,
        observation: newObs,
        photo: photoPath,
        team_id: team ? team.id : null,
        team_name: team ? team.nombre : null,
      });
      const prevList = obj.observations || [];
      const latest = newObs || (prevList.length ? prevList[prevList.length - 1].text : "") || "";
      onSaved?.({ ...obj, status, observation: latest });
      onClose();
    } catch {
      setError("No se pudo guardar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }, [obj, status, observation, photoFile, teamId, teams, onSaved, onClose]);

  const dims = formatDims(obj.dimensions);
  const area = formatArea(obj.dimensions);

  return (
    <div className="fixed inset-0 z-50" data-testid="tag-sheet">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} data-testid="tag-sheet-backdrop" />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl sm:rounded-l-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="flex items-center gap-3 p-5 pb-4">
          <PanelPreview obj={obj} />
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

          {status === "instalado" && !readOnly && (
            <div className="mt-4" data-testid="team-selector">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#636366]">
                <Users size={14} /> Equipo que instaló <span className="text-[#FF3B30]">*</span>
              </p>
              {teamsLoading ? (
                <div className="flex h-11 items-center gap-2 rounded-xl bg-[#F2F2F7] px-3 text-[13px] text-[#8E8E93]">
                  <Loader2 size={14} className="animate-spin" /> Cargando equipos...
                </div>
              ) : teams.length === 0 ? (
                <div className="rounded-xl bg-[#FFF4E5] px-3 py-3 text-[13px] text-[#8A5A00]" data-testid="team-empty-note">
                  No hay equipos creados. Crea uno en la sección <span className="font-bold">Equipos</span> (Progreso →
                  Equipos) para poder registrar la instalación.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {teams.map((t) => {
                    const selected = teamId === t.id;
                    return (
                      <button
                        key={t.id}
                        data-testid={`team-option-${t.id}`}
                        onClick={() => {
                          setTeamId(t.id);
                          if (error) setError("");
                        }}
                        className={`flex flex-col items-start rounded-xl border-[1.5px] px-3 py-2.5 text-left transition-colors ${
                          selected ? "border-[#34C759] bg-[#E8F8EE]" : "border-[#E5E5EA] bg-white hover:bg-[#F2F2F7]"
                        }`}
                      >
                        <span className="text-[13px] font-bold text-[#111111]">{t.nombre}</span>
                        {t.integrantes?.length > 0 && (
                          <span className="mt-0.5 line-clamp-1 text-[11px] text-[#8E8E93]">
                            {t.integrantes.join(", ")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
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
                          {!!g.team && (
                            <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#34C759]">
                              · <Users size={11} /> {g.team}
                            </span>
                          )}
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
