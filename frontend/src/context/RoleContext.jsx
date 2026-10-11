import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, TOKEN_KEY } from "../lib/api";

// Everyone can view; editing controls appear only after the shared admin password is entered.
const RoleContext = createContext({ isAdmin: false, role: "viewer" });

export const RoleProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(() => !!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    const onLogout = () => setIsAdmin(false);
    window.addEventListener("admin-logout", onLogout);
    if (localStorage.getItem(TOKEN_KEY)) {
      api.me().then((r) => { if (!r.admin) { localStorage.removeItem(TOKEN_KEY); setIsAdmin(false); } }).catch(() => {});
    }
    return () => window.removeEventListener("admin-logout", onLogout);
  }, []);

  const login = useCallback(async (password) => {
    const res = await api.verifyAdmin(password);
    if (!res.ok) throw new Error(res.message || "Contraseña de administrador incorrecta.");
    setIsAdmin(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setIsAdmin(false);
  }, []);

  return (
    <RoleContext.Provider value={{ isAdmin, role: isAdmin ? "admin" : "viewer", login, logout }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
