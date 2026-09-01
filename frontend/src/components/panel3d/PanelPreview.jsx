import React, { useEffect, useRef, useState } from "react";
import { Box, Loader2, Maximize2 } from "lucide-react";

import { api } from "../../lib/api";
import { usePanelScene } from "./usePanelScene";
import { PanelFullscreen } from "./PanelFullscreen";

const Thumb = ({ mesh }) => {
  const canvasRef = useRef(null);
  usePanelScene(canvasRef, mesh);
  return <canvas ref={canvasRef} className="h-full w-full" data-testid="panel-thumbnail-canvas" />;
};

export const PanelPreview = ({ obj }) => {
  const [mesh, setMesh] = useState(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setMesh(null);
    setFailed(false);
    api
      .getObjectMesh(obj.name)
      .then((m) => alive && setMesh(m))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [obj.name]);

  if (failed) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[#F2F2F7]" data-testid="tag-sheet-mark-badge">
        <Box size={22} className="text-[#111111]" />
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => mesh && setOpen(true)}
        disabled={!mesh}
        data-testid="panel-thumbnail-button"
        title="Ver panel a pantalla completa"
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F2F2F7] transition-transform hover:scale-[1.03] disabled:cursor-default"
      >
        {mesh ? (
          <Thumb mesh={mesh} />
        ) : (
          <div className="flex h-full w-full items-center justify-center" data-testid="panel-thumbnail-loading">
            <Loader2 size={18} className="animate-spin text-[#8E8E93]" />
          </div>
        )}
        {mesh && (
          <span className="absolute bottom-1 right-1 rounded-md bg-[#1C1C1E]/75 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 size={11} />
          </span>
        )}
      </button>
      {open && <PanelFullscreen obj={obj} mesh={mesh} onClose={() => setOpen(false)} />}
    </>
  );
};
