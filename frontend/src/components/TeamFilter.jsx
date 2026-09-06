import React from "react";
import { Users } from "lucide-react";

import { Chip } from "./Chip";

export const TeamFilter = ({ teams, value, onChange, testPrefix = "team-filter", className = "" }) => {
  const options = [
    { key: "all", label: "Todos" },
    ...teams.map((t) => ({ key: t.id, label: t.nombre })),
    { key: "none", label: "Sin equipo" },
  ];
  return (
    <div className={`flex gap-2 overflow-x-auto py-1 ${className}`} data-testid={`${testPrefix}-row`}>
      {options.map((o) => (
        <Chip
          key={o.key}
          testId={`${testPrefix}-${o.key}`}
          selected={value === o.key}
          color="#34C759"
          icon={o.key !== "all" && o.key !== "none" ? <Users size={13} color={value === o.key ? "#FFFFFF" : "#34C759"} /> : null}
          label={o.label}
          onClick={() => onChange(o.key)}
        />
      ))}
    </div>
  );
};
