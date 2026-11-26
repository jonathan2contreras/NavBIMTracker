import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ViewerPage from "@/pages/ViewerPage";

export default function PersistentViewer() {
  const { pathname } = useLocation();
  const active = pathname === "/";
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (active) setHasOpened(true);
  }, [active]);

  // Keep the same iframe, scene and loading state across the layout's routes.
  // Visibility (not display:none) preserves the WebGL viewport dimensions.
  if (!hasOpened && !active) return null;

  return (
    <div
      className={`absolute inset-0 ${active ? "" : "invisible pointer-events-none"}`}
      aria-hidden={!active}
      inert={!active}
      data-testid="persistent-viewer"
    >
      <ViewerPage />
    </div>
  );
}
