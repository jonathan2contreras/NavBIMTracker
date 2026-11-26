import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, Loader2, Tag, Users, X } from "lucide-react";

import { api } from "../lib/api";
import { STATUSES, displayName } from "../lib/theme";

export function BulkTagDialog({ names, onApplied, onClose }) {
  const [status, setStatus] = useState(null);
  const [observation, setObservation] = useState("");
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.getTeams().then(setTeams).catch(() => setTeams([]));
  }, []);

  const handleApply = useCallback(async () => {
    if (!status) {
      setError("Selecciona el estado a aplicar.");
      return;
    }
    if (status === "instalado" && !teamId) {
      setError("Selecciona el equipo que instaló los paneles.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const team = status === "instalado" ? teams.find((t) => t.id === teamId) : null;
      const res = await api.bulkTag({
        names,
        status,
        observation: observation.trim(),
        team_id: team ? team.id : null,
        team_name: team ? team.nombre : null,
      });
      const updated = res.names || [];
      onApplied(updated, status);
      if ((res.blocked || []).length) {
        setResult({ updated: updated.length, blocked: res.blocked });
        setSaving(false);
      } else {
        onClose();
      }
    } catch (err) {
      setError(err?.detail || "No se pudo etiquetar. Inténtalo de nuevo.");
      setSaving(false);
    }
  }, [names, status, teamId, teams, observation, onApplied, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" data-testid="bulk-tag-dialog">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} data-testid="bulk-tag-backdrop" />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-[#111111]" data-testid="bulk-tag-title">
              Etiquetar {names.length} {names.length === 1 ? "pieza" : "piezas"}
            </p>
            <p className="mt-0.5 text-xs text-[#8E8E93]">Se aplica el mismo estado a toda la selección.</p>
          </div>
          <button onClick={onClose} data-testid="bulk-tag-close" className="rounded-full p-1.5 hover:bg-[#F2F2F7]">
            <X size={18} className="text-[#8E8E93]" />
          </button>
        </div>

        {result ? (
          <div className="mt-4">
            <div
              className="flex items-center gap-2 rounded-xl bg-[#EAF8EE] px-3 py-2.5 text-[13px] font-bold text-[#1B7F3B]"
              data-testid="bulk-tag-summary"
            >
              <Check size={16} /> {result.updated} {result.updated === 1 ? "pieza etiquetada" : "piezas etiquetadas"}
            </div>
            {result.blocked.length > 0 && (
              <div className="mt-3 rounded-xl bg-[#FFF4E5] p-3" data-testid="bulk-tag-blocked">
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#8A5A00]">
                  <AlertTriangle size={14} /> {result.blocked.length} sin cambios: faltan pasos previos
                </p>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {result.blocked.map((b) => (
                    <p key={b.name} className="truncate text-[11px] text-[#8A5A00]">
                      {displayName(b.name)}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              data-testid="bulk-tag-done"
              className="mt-4 h-11 w-full rounded-xl bg-[#1C1C1E] text-sm font-bold text-white"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Estado</p>
            <div className="grid grid-cols-2 gap-2">
              {STATUSES.map((s) => {
                const selected = status === s.key;
                return (
                  <button
                    key={s.key}
                    data-testid={`bulk-status-${s.key}`}
                    onClick={() => {
                      setStatus(s.key);
                      if (error) setError("");
                    }}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] text-sm font-semibold transition-colors"
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

            {status === "instalado" && (
              <div className="mt-4" data-testid="bulk-team-selector">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#636366]">
                  <Users size={14} /> Equipo que instaló <span className="text-[#FF3B30]">*</span>
                </p>
                {teams.length === 0 ? (
                  <div className="rounded-xl bg-[#FFF4E5] px-3 py-3 text-[13px] text-[#8A5A00]" data-testid="bulk-team-empty">
                    No hay equipos creados. Crea uno en Progreso → Equipos.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        data-testid={`bulk-team-${t.id}`}
                        onClick={() => {
                          setTeamId(t.id);
                          if (error) setError("");
                        }}
                        className={`h-11 truncate rounded-xl border-[1.5px] px-2 text-[13px] font-semibold ${
                          teamId === t.id ? "border-[#1C1C1E] bg-[#1C1C1E] text-white" : "border-[#E5E5EA] text-[#111111]"
                        }`}
                      >
                        {t.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#636366]">Observación (opcional)</p>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                rows={3}
                placeholder="Se añade al historial de cada pieza"
                data-testid="bulk-tag-observation"
                className="w-full rounded-xl border border-[#E5E5EA] px-3 py-2 text-[13px] text-[#111111] outline-none focus:border-[#1C1C1E]"
              />
            </div>

            {!!error && (
              <p className="mt-3 rounded-xl bg-[#FFECEB] px-3 py-2 text-[13px] text-[#C4271B]" data-testid="bulk-tag-error">
                {error}
              </p>
            )}

            <button
              onClick={handleApply}
              disabled={saving}
              data-testid="bulk-tag-apply"
              className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1C1C1E] text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Tag size={16} />}
              {saving ? "Etiquetando..." : "Aplicar a la selección"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
