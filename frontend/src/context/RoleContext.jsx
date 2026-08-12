import React, { createContext, useCallback, useContext, useState } from "react";

const KEY = "bim_role";
const RoleContext = createContext(null);

export const RoleProvider = ({ children }) => {
  const [role, setRoleState] = useState(() => localStorage.getItem(KEY) || null);

  const setRole = useCallback((r) => {
    localStorage.setItem(KEY, r);
    setRoleState(r);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(KEY);
    setRoleState(null);
  }, []);

  return (
    <RoleContext.Provider value={{ role, isAdmin: role === "admin", setRole, logout }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
