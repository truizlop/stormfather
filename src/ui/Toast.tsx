import { X } from "lucide-react";
import { useEffect } from "react";
import { useAtlasStore } from "../store/useAtlasStore";

export function Toast() {
  const toast = useAtlasStore((state) => state.toast);
  const dismissToast = useAtlasStore((state) => state.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(dismissToast, 5200);
    return () => window.clearTimeout(timeout);
  }, [dismissToast, toast]);

  if (!toast) return null;
  return (
    <aside className="discovery-toast panel" role="status">
      <span aria-hidden="true">✦</span>
      <div>
        <strong>{toast.title}</strong>
        <p>{toast.message}</p>
      </div>
      <button type="button" aria-label="Dismiss discovery" onClick={dismissToast}>
        <X size={14} />
      </button>
    </aside>
  );
}
