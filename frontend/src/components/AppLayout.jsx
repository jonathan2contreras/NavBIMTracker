import React from "react";
import { Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Box, Camera, List, LogOut, PieChart, Users } from "lucide-react";

import { useRole } from "../context/RoleContext";
import { SyncToast } from "./SyncToast";

const TABS = [
  { to: "/", label: "Modelo 3D", icon: Box, end: true, testId: "tab-viewer" },
  { to: "/objects", label: "Objetos", icon: List, testId: "tab-objects" },
  { to: "/photos", label: "Fotos", icon: Camera, testId: "tab-photos" },
  { to: "/progress", label: "Progreso", icon: PieChart, testId: "tab-progress" },
  { to: "/teams", label: "Equipos", icon: Users, testId: "tab-teams", adminOnly: true },
];

export default function AppLayout() {
  const { role, logout } = useRole();
  const navigate = useNavigate();
  if (!role) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen flex-col bg-white">
      <div
        className="relative flex shrink-0 items-center bg-[#F2F2F7] px-4 py-2 sm:px-6"
        data-testid="top-bar"
      >
        <span className="mx-auto text-[12px] font-bold text-[#3A3A3C]" data-testid="top-bar-role">
          {role === "admin" ? "Administrador" : "Usuario (solo lectura)"}
        </span>
        <button
          data-testid="top-bar-logout"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="absolute right-4 flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-bold text-[#636366] shadow-sm transition-opacity hover:opacity-70 sm:right-6"
        >
          <LogOut size={15} /> Salir
        </button>
      </div>
      <nav className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-[#E5E5EA] bg-white px-4 py-2.5 sm:px-6" data-testid="main-nav">
        {TABS.filter((t) => !t.adminOnly || role === "admin").map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            data-testid={t.testId}
            className={({ isActive }) =>
              `flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                isActive ? "bg-[#1C1C1E] text-white" : "text-[#3A3A3C] hover:bg-[#F2F2F7]"
              }`
            }
          >
            {t.icon && <t.icon size={15} />}
            {t.label}
          </NavLink>
        ))}
      </nav>
      <main className="min-h-0 flex-1">
        <Outlet />
      </main>
      <SyncToast />
    </div>
  );
}
