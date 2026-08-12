import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, ChevronRight, Compass, Loader2, Search, XCircle } from "lucide-react";

import { api } from "../lib/api";
import { TagSheet } from "../components/TagSheet";
import { Chip } from "../components/Chip";
import { FACADE_FILTERS, FACADE_LABELS, NO_STATUS_COLOR, STATUSES, statusMeta } from "../lib/theme";

const PAGE_SIZE = 50;

const FILTERS = [
  { key: "all", label: "Todos" },
  ...STATUSES.map((s) => ({ key: s.key, label: s.label, color: s.color, accent: s.accent, textOn: s.textOn })),
  { key: "none", label: "Sin estado", color: NO_STATUS_COLOR, accent: NO_STATUS_COLOR, textOn: "#FFFFFF" },
];

export default function ObjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState("all");
  const [facadeFilter, setFacadeFilter] = useState("all");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [sheetObj, setSheetObj] = useState(null);
  const requestId = useRef(0);
  const listRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (reset, currentItems) => {
      const id = ++requestId.current;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError(false);
      try {
        const res = await api.getObjects({
          search: debounced,
          status: filter,
          facade: facadeFilter,
          skip: reset ? 0 : currentItems.length,
          limit: PAGE_SIZE,
        });
        if (id !== requestId.current) return;
        setTotal(res.total);
        setItems(reset ? res.items : [...currentItems, ...res.items]);
      } catch {
        if (id === requestId.current) setError(true);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debounced, filter, facadeFilter]
  );

  useEffect(() => {
    fetchPage(true, []);
  }, [fetchPage]);

  const loadMoreRef = useRef(() => {});
  loadMoreRef.current = () => {
    if (loading || loadingMore || items.length >= total) return;
    fetchPage(false, items);
  };

  const onScroll = useCallback((e) => {
    const el = e.target;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) loadMoreRef.current();
  }, []);

  const openObject = useCallback((item) => {
    api
      .getObject(item.name)
      .then(setSheetObj)
      .catch(() => setSheetObj(item));
  }, []);

  const handleSaved = useCallback((obj) => {
    setItems((prev) =>
      prev.map((it) => (it.name === obj.name ? { ...it, status: obj.status, observation: obj.observation } : it))
    );
  }, []);

  return (
    <div className="flex h-full flex-col bg-white" data-testid="objects-screen">
      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col pt-4">
        <div className="flex items-baseline justify-between px-4">
          <h1 className="text-2xl font-extrabold text-[#111111]">Objetos</h1>
          <span className="text-xs font-medium text-[#8E8E93]" data-testid="objects-total-count">
            {loading ? "Cargando..." : `${total.toLocaleString("es-ES")} resultados`}
          </span>
        </div>

        <div className="mx-4 mt-2 flex h-11 items-center gap-2 rounded-xl bg-[#F2F2F7] px-3">
          <Search size={17} className="text-[#8E8E93]" />
          <input
            data-testid="objects-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pieza (ej. C1, Tornillo...)"
            className="h-full flex-1 bg-transparent text-sm text-[#111111] outline-none placeholder:text-[#8E8E93]"
          />
          {search.length > 0 && (
            <button onClick={() => setSearch("")} data-testid="objects-search-clear">
              <XCircle size={17} className="text-[#8E8E93]" />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {FILTERS.map((f) => (
            <Chip
              key={f.key}
              testId={`filter-chip-${f.key}`}
              selected={filter === f.key}
              color={f.color}
              accent={f.accent}
              textOn={f.textOn}
              borderOverride={f.key === "entregable" ? "#C7C7CC" : undefined}
              label={f.label}
              onClick={() => setFilter(f.key)}
            />
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          {FACADE_FILTERS.map((f) => (
            <Chip
              key={f.key}
              testId={`facade-chip-${f.key}`}
              selected={facadeFilter === f.key}
              color={f.key !== "all" || facadeFilter === "all" ? "#007AFF" : undefined}
              icon={
                f.key !== "all" ? (
                  <Compass size={13} color={facadeFilter === f.key ? "#FFFFFF" : "#007AFF"} />
                ) : null
              }
              label={f.label}
              onClick={() => setFacadeFilter(f.key)}
            />
          ))}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center" data-testid="objects-loading">
            <Loader2 size={32} className="animate-spin text-[#1C1C1E]" />
          </div>
        ) : error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4" data-testid="objects-error">
            <p className="text-[15px] font-bold text-[#111111]">Error al cargar los datos</p>
            <button
              data-testid="objects-retry-button"
              onClick={() => fetchPage(true, [])}
              className="h-11 rounded-xl bg-[#1C1C1E] px-6 text-sm font-bold text-white"
            >
              Reintentar
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center" data-testid="objects-empty">
            <Box size={40} className="text-[#C7C7CC]" />
            <p className="mt-3 text-[15px] font-bold text-[#111111]">No se encontraron objetos</p>
            <p className="mt-1 text-[13px] text-[#8E8E93]">Prueba con otra búsqueda o filtro</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto" onScroll={onScroll} ref={listRef} data-testid="objects-list">
            {items.map((item) => {
              const meta = statusMeta(item.status);
              return (
                <div
                  key={item.name}
                  data-testid={`object-row-${item.name}`}
                  onClick={() => openObject(item)}
                  className="flex min-h-[56px] cursor-pointer items-center gap-3 border-b border-[#E5E5EA] px-4 py-3 transition-colors hover:bg-[#F2F2F7]"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full border border-[#C7C7CC]"
                    style={{ backgroundColor: meta ? meta.color : NO_STATUS_COLOR }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#111111]">{item.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs">
                      <span className="font-semibold" style={{ color: meta ? meta.accent : "#8E8E93" }}>
                        {meta ? meta.label : "Sin estado"}
                      </span>
                      {!!item.facade && FACADE_LABELS[item.facade] && (
                        <span className="font-semibold text-[#007AFF]">· {FACADE_LABELS[item.facade]}</span>
                      )}
                      {!!item.observation && (
                        <span className="truncate text-[#8E8E93]">· {item.observation}</span>
                      )}
                    </p>
                  </div>
                  <button
                    data-testid={`view-3d-button-${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/?focus=${encodeURIComponent(item.name)}&t=${Date.now()}`);
                    }}
                    className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-[#E5E5EA] bg-[#F2F2F7] px-2.5 text-xs font-bold text-[#1C1C1E] transition-opacity hover:opacity-70"
                  >
                    <Box size={16} /> 3D
                  </button>
                  <ChevronRight size={16} className="shrink-0 text-[#C7C7CC]" />
                </div>
              );
            })}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 size={22} className="animate-spin text-[#8E8E93]" />
              </div>
            )}
          </div>
        )}
      </div>

      {sheetObj && <TagSheet obj={sheetObj} onClose={() => setSheetObj(null)} onSaved={handleSaved} />}
    </div>
  );
}
