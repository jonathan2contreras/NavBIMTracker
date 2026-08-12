import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  ArrowRight,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  Grid3X3,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

import { api, BACKEND_URL } from "../lib/api";
import { Chip } from "../components/Chip";
import { FACADE_FILTERS, FACADE_LABELS, NO_STATUS_COLOR, STATUSES, displayName, formatDate, statusMeta } from "../lib/theme";

dayjs.locale("es");

const TYPES = [
  { key: "semanal", label: "Instalación semanal", Icon: Calendar },
  { key: "mensual", label: "Mensual", Icon: CalendarDays },
  { key: "personalizado", label: "Filtros", Icon: SlidersHorizontal },
];

const STATUS_FILTERS = [
  { key: "all", label: "Todos" },
  ...STATUSES.map((s) => ({ key: s.key, label: s.label, color: s.color, accent: s.accent, textOn: s.textOn })),
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function ReportsPage() {
  const navigate = useNavigate();
  const [type, setType] = useState("semanal");
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [customStatus, setCustomStatus] = useState("all");
  const [customFacade, setCustomFacade] = useState("all");
  const [fromText, setFromText] = useState(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
  const [toText, setToText] = useState(dayjs().format("YYYY-MM-DD"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState("");

  const getRange = useCallback(() => {
    if (type === "semanal") {
      const base = dayjs().add(weekOffset, "week");
      const dow = (base.day() + 6) % 7;
      const start = base.subtract(dow, "day");
      const end = start.add(6, "day");
      return { from: start.format("YYYY-MM-DD"), to: end.format("YYYY-MM-DD"), status: "instalado", facade: "all" };
    }
    if (type === "mensual") {
      const m = dayjs().add(monthOffset, "month");
      return {
        from: m.startOf("month").format("YYYY-MM-DD"),
        to: m.endOf("month").format("YYYY-MM-DD"),
        status: "all",
        facade: "all",
      };
    }
    return { from: fromText.trim(), to: toText.trim(), status: customStatus, facade: customFacade };
  }, [type, weekOffset, monthOffset, fromText, toText, customStatus, customFacade]);

  const exportReport = useCallback(
    (format) => {
      const { from, to, status, facade } = getRange();
      if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
        setError("Fechas inválidas. Usa el formato AAAA-MM-DD.");
        return;
      }
      const url = `${BACKEND_URL}/api/report/export?format=${format}&from=${from}&to=${to}&status=${status}&facade=${facade}`;
      setExporting(format);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_${from}_${to}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => setExporting(""), 800);
    },
    [getRange]
  );

  const fetchReport = useCallback(async () => {
    const { from, to, status, facade } = getRange();
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      setError("Fechas inválidas. Usa el formato AAAA-MM-DD.");
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setData(await api.getReport({ from, to, status, facade }));
    } catch {
      setError("Error al generar el reporte.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [getRange]);

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, weekOffset, monthOffset, customStatus, customFacade]);

  const rangeLabel = () => {
    if (type === "semanal") {
      const base = dayjs().add(weekOffset, "week");
      const dow = (base.day() + 6) % 7;
      const start = base.subtract(dow, "day");
      const end = start.add(6, "day");
      return `${start.format("D MMM")} – ${end.format("D MMM YYYY")}`;
    }
    if (type === "mensual") {
      const m = dayjs().add(monthOffset, "month");
      const label = m.format("MMMM YYYY");
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    return "";
  };

  const nextDisabled = type === "semanal" ? weekOffset >= 0 : monthOffset >= 0;

  return (
    <div className="flex h-screen flex-col bg-white" data-testid="reports-screen">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col pt-4">
        <div className="flex items-center justify-between px-3 pb-2">
          <button
            data-testid="reports-back-button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F2F2F7]"
          >
            <ChevronLeft size={22} className="text-[#111111]" />
          </button>
          <h1 className="text-lg font-extrabold text-[#111111]">Reportes</h1>
          <div className="w-9" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-8">
          <div className="flex gap-2 overflow-x-auto px-4 py-3">
            {TYPES.map((tp) => {
              const selected = type === tp.key;
              return (
                <button
                  key={tp.key}
                  data-testid={`report-type-${tp.key}`}
                  onClick={() => setType(tp.key)}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-semibold transition-colors"
                  style={
                    selected
                      ? { backgroundColor: "#1C1C1E", borderColor: "#1C1C1E", color: "#FFFFFF" }
                      : { backgroundColor: "#FFFFFF", borderColor: "#E5E5EA", color: "#3A3A3C" }
                  }
                >
                  <tp.Icon size={14} /> {tp.label}
                </button>
              );
            })}
          </div>

          {type !== "personalizado" && (
            <div className="mx-4 mb-3 flex items-center justify-between rounded-xl bg-[#F2F2F7] px-2 py-2">
              <button
                data-testid="period-prev"
                onClick={() => (type === "semanal" ? setWeekOffset((w) => w - 1) : setMonthOffset((m) => m - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white"
              >
                <ChevronLeft size={18} className="text-[#111111]" />
              </button>
              <div className="text-center">
                <p className="text-[15px] font-bold text-[#111111]" data-testid="period-label">
                  {rangeLabel()}
                </p>
                <p className="mt-0.5 text-[11px] text-[#8E8E93]">
                  {type === "semanal" ? "Piezas instaladas" : "Todos los estados"}
                </p>
              </div>
              <button
                data-testid="period-next"
                disabled={nextDisabled}
                onClick={() => (type === "semanal" ? setWeekOffset((w) => w + 1) : setMonthOffset((m) => m + 1))}
                className={`flex h-10 w-10 items-center justify-center rounded-full hover:bg-white ${nextDisabled ? "opacity-30" : ""}`}
              >
                <ChevronRight size={18} className="text-[#111111]" />
              </button>
            </div>
          )}

          {type === "personalizado" && (
            <div className="pb-2">
              <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Etiqueta</p>
              <div className="mb-2 flex gap-2 overflow-x-auto px-4 py-1">
                {STATUS_FILTERS.map((f) => (
                  <Chip
                    key={f.key}
                    testId={`report-status-${f.key}`}
                    selected={customStatus === f.key}
                    color={f.color}
                    accent={f.accent}
                    textOn={f.textOn}
                    borderOverride={f.key === "entregable" ? "#C7C7CC" : undefined}
                    label={f.label}
                    onClick={() => setCustomStatus(f.key)}
                  />
                ))}
              </div>
              <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Fachada</p>
              <div className="mb-2 flex gap-2 overflow-x-auto px-4 py-1">
                {FACADE_FILTERS.map((f) => (
                  <Chip
                    key={f.key}
                    testId={`report-facade-${f.key}`}
                    selected={customFacade === f.key}
                    color="#007AFF"
                    icon={
                      f.key !== "all" ? (
                        <Compass size={13} color={customFacade === f.key ? "#FFFFFF" : "#007AFF"} />
                      ) : null
                    }
                    label={f.label}
                    onClick={() => setCustomFacade(f.key)}
                  />
                ))}
              </div>
              <p className="mb-1 px-4 text-xs font-semibold uppercase tracking-wide text-[#636366]">Rango de fechas</p>
              <div className="flex items-center gap-2 px-4 pb-2">
                <input
                  data-testid="report-from-input"
                  value={fromText}
                  onChange={(e) => setFromText(e.target.value)}
                  placeholder="AAAA-MM-DD"
                  className="h-11 flex-1 rounded-xl bg-[#F2F2F7] px-3 text-[13px] text-[#111111] outline-none placeholder:text-[#8E8E93]"
                />
                <ArrowRight size={14} className="shrink-0 text-[#8E8E93]" />
                <input
                  data-testid="report-to-input"
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  placeholder="AAAA-MM-DD"
                  className="h-11 flex-1 rounded-xl bg-[#F2F2F7] px-3 text-[13px] text-[#111111] outline-none placeholder:text-[#8E8E93]"
                />
                <button
                  data-testid="report-apply-button"
                  onClick={fetchReport}
                  className="h-11 shrink-0 rounded-xl bg-[#1C1C1E] px-4 text-[13px] font-bold text-white"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}

          {!!error && (
            <p className="px-4 py-2 text-[13px] text-[#FF3B30]" data-testid="report-error">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex justify-center py-16" data-testid="report-loading">
              <Loader2 size={32} className="animate-spin text-[#1C1C1E]" />
            </div>
          ) : (
            data && (
              <>
                <div className="mx-4 mb-2 flex flex-col gap-2 rounded-xl bg-[#F2F2F7] p-3" data-testid="report-summary">
                  <p className="text-sm font-bold text-[#111111]">
                    {data.total.toLocaleString("es-ES")} {type === "semanal" ? "instalaciones" : "movimientos"} en el
                    período
                  </p>
                  {type !== "semanal" && (
                    <div className="flex flex-wrap gap-2">
                      {STATUSES.filter((s) => (data.counts[s.key] || 0) > 0).map((s) => (
                        <span
                          key={s.key}
                          data-testid={`report-count-${s.key}`}
                          className="flex h-[26px] items-center gap-1.5 rounded-full bg-white px-2.5 text-xs font-semibold text-[#3A3A3C]"
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.accent }} />
                          {s.label}: {data.counts[s.key]}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-0.5 flex gap-2">
                    <button
                      data-testid="export-pdf-button"
                      onClick={() => exportReport("pdf")}
                      disabled={!!exporting}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#C0392B] text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                    >
                      {exporting === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                      Exportar PDF
                    </button>
                    <button
                      data-testid="export-excel-button"
                      onClick={() => exportReport("xlsx")}
                      disabled={!!exporting}
                      className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#1E7145] text-[13px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-70"
                    >
                      {exporting === "xlsx" ? <Loader2 size={15} className="animate-spin" /> : <Grid3X3 size={15} />}
                      Exportar Excel
                    </button>
                  </div>
                </div>

                <div data-testid="report-list">
                  {(data.items || []).length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12" data-testid="report-empty">
                      <FileText size={36} className="text-[#C7C7CC]" />
                      <p className="text-[15px] font-bold text-[#111111]">Sin movimientos en este período</p>
                      <p className="px-6 text-center text-xs text-[#8E8E93]">
                        Las etiquetas guardan la fecha de cada cambio de estado
                      </p>
                    </div>
                  ) : (
                    data.items.map((item, i) => {
                      const meta = statusMeta(item.status);
                      return (
                        <div
                          key={`${item.name}-${item.date}-${i}`}
                          data-testid={`report-row-${item.name}-${item.date}`}
                          className="flex min-h-[56px] items-center gap-3 border-b border-[#E5E5EA] px-4 py-3"
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-[#C7C7CC]"
                            style={{ backgroundColor: meta ? meta.color : NO_STATUS_COLOR }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-[#111111]">{displayName(item.name)}</p>
                            <p className="mt-0.5 truncate text-xs font-semibold" style={{ color: meta ? meta.accent : "#8E8E93" }}>
                              {meta ? meta.label : item.status}
                              {item.facade && FACADE_LABELS[item.facade] ? `  ·  ${FACADE_LABELS[item.facade]}` : ""}
                              {item.observation ? `  ·  ${item.observation}` : ""}
                            </p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-[#8E8E93]">{formatDate(item.date)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )
          )}
        </div>
      </div>
    </div>
  );
}
