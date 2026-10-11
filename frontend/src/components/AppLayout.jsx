import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Box, Camera, List, PieChart, Users } from "lucide-react";

import { useRole } from "../context/RoleContext";
import AdminLogin from "./AdminLogin";
import { SyncToast } from "./SyncToast";

const TABS = [
  { to: "/", label: "Modelo 3D", icon: Box, end: true, testId: "tab-viewer" },
  { to: "/objects", label: "Objetos", icon: List, testId: "tab-objects" },
  { to: "/photos", label: "Fotos", icon: Camera, testId: "tab-photos" },
  { to: "/progress", label: "Progreso", icon: PieChart, testId: "tab-progress" },
  { to: "/teams", label: "Equipos", icon: Users, testId: "tab-teams", adminOnly: true },
];

export default function AppLayout() {
  const { isAdmin } = useRole();

  return (
    <div className="flex h-dvh min-w-0 flex-col bg-white">
      <p className="shrink-0 px-2 pt-3 text-center text-sm font-black tracking-[0.2em] text-[#1C1C1E] sm:px-6" data-testid="app-title">NaBIMTracker</p>
      <nav aria-label="Navegación principal" className="flex min-w-0 shrink-0 flex-nowrap items-center gap-1 overflow-x-auto border-b border-[#E5E5EA] bg-white px-2 py-2 sm:px-6" data-testid="main-nav">
        {TABS.filter((t) => !t.adminOnly || isAdmin).map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            data-testid={t.testId}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2.5 text-xs font-semibold transition-colors sm:px-3.5 sm:text-[13px] ${
                isActive ? "bg-[#1C1C1E] text-white" : "text-[#3A3A3C] hover:bg-[#F2F2F7]"
              }`
            }
          >
            {t.icon && <t.icon size={15} />}
            {t.label}
          </NavLink>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-1 border-l border-[#E5E5EA] pl-2 sm:pl-3">
          <AdminLogin />
        </div>
      </nav>
      <main className="min-h-0 min-w-0 flex-1">
        <React.Suspense fallback={<p className="p-6 text-sm text-[#8E8E93]" data-testid="page-loading">Cargando…</p>}><Outlet /></React.Suspense>
      </main>
      <SyncToast />
    </div>
  );
}
