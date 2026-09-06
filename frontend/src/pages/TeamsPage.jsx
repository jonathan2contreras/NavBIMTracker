import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Pencil, Plus, Trash2, Users, X } from "lucide-react";

import { api } from "../lib/api";
import { useRole } from "../context/RoleContext";
import { FACADE_LABELS, displayName, formatDate } from "../lib/theme";

const emptyForm = { id: null, nombre: "", integrantes: [""] };

export default function TeamsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const [teams, setTeams] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ts, stats] = await Promise.all([api.getTeams(), api.getTeamsStats()]);
      setTeams(ts);
      const rows = [];
      for (const t of stats.teams) {
        for (const p of t.paneles) rows.push({ ...p, equipo: t.nombre });
      }
      for (const p of stats.sin_equipo.paneles) rows.push({ ...p, equipo: null });
      rows.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setRecords(rows);
    } catch {
      setTeams([]);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setFormError("");
    setForm({ ...emptyForm, integrantes: [""] });
  };
  const openEdit = (t) => {
    setFormError("");
    setForm({ id: t.id, nombre: t.nombre, integrantes: t.integrantes.length ? [...t.integrantes] : [""] });
  };

  const setMember = (i, v) =>
    setForm((f) => ({ ...f, integrantes: f.integrantes.map((m, idx) => (idx === i ? v : m)) }));
  const addMember = () => setForm((f) => ({ ...f, integrantes: [...f.integrantes, ""] }));
  const removeMember = (i) =>
    setForm((f) => ({ ...f, integrantes: f.integrantes.filter((_, idx) => idx !== i) }));

  const submitForm = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) {
      setFormError("Indica el número o nombre del equipo.");
      return;
    }
    setSaving(true);
    setFormError("");
    const body = { nombre, integrantes: form.integrantes.map((m) => m.trim()).filter(Boolean) };
    try {
      if (form.id) await api.updateTeam(form.id, body);
      else await api.createTeam(body);
      setForm(null);
      await load();
    } catch {
      setFormError("No se pudo guardar el equipo. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id) => {
    try {
      await api.deleteTeam(id);
      setConfirmDelete(null);
      await load();
    } catch {
      setConfirmDelete(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center bg-white px-6 text-center" data-testid="teams-forbidden">
        <div>
          <p className="text-base font-bold text-[#111111]">Acceso restringido</p>
          <p className="mt-1 text-sm text-[#8E8E93]">Solo el administrador puede gestionar equipos.</p>
          <button
            onClick={() => navigate("/progress")}
            className="mt-4 h-11 rounded-xl bg-[#1C1C1E] px-6 text-sm font-bold text-white"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white" data-testid="teams-screen">
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-4">
        <div className="flex items-center justify-between pb-2">
          <h1 className="text-2xl font-extrabold text-[#111111]">Equipos</h1>
          <button
            data-testid="teams-create-button"
            onClick={openCreate}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#1C1C1E] px-3.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
          >
            <Plus size={16} /> Crear equipo
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center" data-testid="teams-loading">
            <Loader2 size={32} className="animate-spin text-[#1C1C1E]" />
          </div>
        ) : (
          <>
            {teams.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-14" data-testid="teams-empty">
                <Users size={40} className="text-[#C7C7CC]" />
                <p className="text-[15px] font-bold text-[#111111]">Aún no hay equipos</p>
                <p className="text-xs text-[#8E8E93]">Crea el primer equipo de instalación con sus integrantes.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5" data-testid="teams-list">
                {teams.map((t) => (
                  <div
                    key={t.id}
                    data-testid={`team-row-${t.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-[#E5E5EA] bg-white p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1C1C1E]">
                      <Users size={18} className="text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-bold text-[#111111]">{t.nombre}</p>
                      <p className="truncate text-xs text-[#8E8E93]">
                        {t.integrantes?.length ? t.integrantes.join(", ") : "Sin integrantes"}
                      </p>
                    </div>
                    <button
                      data-testid={`team-edit-${t.id}`}
                      onClick={() => openEdit(t)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F2F2F7] hover:opacity-70"
                    >
                      <Pencil size={16} className="text-[#636366]" />
                    </button>
                    <button
                      data-testid={`team-delete-${t.id}`}
                      onClick={() => setConfirmDelete(t)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FDECEC] hover:opacity-70"
                    >
                      <Trash2 size={16} className="text-[#FF3B30]" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-8">
              <p className="mb-2 text-[11px] font-bold tracking-widest text-[#636366]">
                REGISTRO DE INSTALACIONES ({records.length})
              </p>
              {records.length === 0 ? (
                <p className="rounded-xl bg-[#F2F2F7] px-4 py-6 text-center text-xs text-[#8E8E93]">
                  No hay paneles instalados todavía.
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[#E5E5EA]" data-testid="install-records">
                  <div className="grid grid-cols-[1.1fr_1.3fr_0.9fr] bg-[#F2F2F7] px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-[#636366]">
                    <span>Equipo</span>
                    <span>Código panel</span>
                    <span className="text-right">Fecha</span>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    {records.map((r, i) => (
                      <div
                        key={`${r.object_name}-${i}`}
                        data-testid={`install-record-${i}`}
                        className="grid grid-cols-[1.1fr_1.3fr_0.9fr] items-center border-t border-[#F2F2F7] px-4 py-2.5 text-[13px]"
                      >
                        <span className={`truncate font-semibold ${r.equipo ? "text-[#111111]" : "text-[#C7C7CC]"}`}>
                          {r.equipo || "Sin equipo"}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[#111111]">{displayName(r.object_name)}</span>
                          {!!r.facade && FACADE_LABELS[r.facade] && (
                            <span className="text-[11px] font-semibold text-[#007AFF]">{FACADE_LABELS[r.facade]}</span>
                          )}
                        </span>
                        <span className="text-right text-[#636366]">{formatDate(r.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {form && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onClick={() => !saving && setForm(null)}
          data-testid="team-form-modal"
        >
          <div
            className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E5EA] px-5 py-4">
              <p className="text-base font-bold text-[#111111]">{form.id ? "Editar equipo" : "Crear equipo"}</p>
              <button onClick={() => !saving && setForm(null)} className="rounded-full p-1.5 hover:bg-[#F2F2F7]">
                <X size={18} className="text-[#8E8E93]" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#636366]">Número / nombre del equipo</p>
              <input
                data-testid="team-form-name"
                value={form.nombre}
                autoFocus
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: Equipo 1"
                className="h-11 w-full rounded-xl bg-[#F2F2F7] px-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
              />

              <div className="mb-2 mt-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#636366]">Integrantes</p>
                <button
                  data-testid="team-form-add-member"
                  onClick={addMember}
                  className="flex items-center gap-1 text-[13px] font-bold text-[#007AFF]"
                >
                  <Plus size={14} /> Añadir
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {form.integrantes.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      data-testid={`team-form-member-${i}`}
                      value={m}
                      onChange={(e) => setMember(i, e.target.value)}
                      placeholder={`Integrante ${i + 1}`}
                      className="h-11 flex-1 rounded-xl bg-[#F2F2F7] px-3 text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
                    />
                    {form.integrantes.length > 1 && (
                      <button
                        onClick={() => removeMember(i)}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-[#F2F2F7]"
                      >
                        <X size={16} className="text-[#8E8E93]" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!!formError && (
                <p className="mt-3 text-[13px] text-[#FF3B30]" data-testid="team-form-error">
                  {formError}
                </p>
              )}
            </div>
            <div className="border-t border-[#E5E5EA] p-4">
              <button
                data-testid="team-form-save"
                onClick={submitForm}
                disabled={saving}
                className="flex h-12 w-full items-center justify-center rounded-xl bg-[#1C1C1E] text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : form.id ? "Guardar cambios" : "Crear equipo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
          onClick={() => setConfirmDelete(null)}
          data-testid="team-delete-modal"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-bold text-[#111111]">Eliminar equipo</p>
            <p className="mt-1 text-[13px] text-[#636366]">
              ¿Seguro que quieres eliminar <span className="font-bold">{confirmDelete.nombre}</span>? Las instalaciones
              ya registradas se mostrarán como "Sin equipo".
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-11 flex-1 rounded-xl bg-[#F2F2F7] text-sm font-bold text-[#3A3A3C]"
              >
                Cancelar
              </button>
              <button
                data-testid="team-delete-confirm"
                onClick={() => doDelete(confirmDelete.id)}
                className="h-11 flex-1 rounded-xl bg-[#FF3B30] text-sm font-bold text-white"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
