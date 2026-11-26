import { useEffect } from "react";

export function useViewerStartup(loading, viewerKey, setLoading, setError) {
  useEffect(() => {
    if (!loading) return undefined;
    const timeout = setTimeout(() => {
      setLoading(false);
      setError("El visor no ha terminado de arrancar en dos minutos. Pulsa Reintentar para volver a cargarlo.");
    }, 120000);
    return () => clearTimeout(timeout);
  }, [loading, viewerKey, setLoading, setError]);
}
