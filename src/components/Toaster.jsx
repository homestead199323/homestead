import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { TOAST_EVENT } from "../lib/toast";

/* One confirmation at a time, above the bottom navigation. Auto-hides after
   5 s (8 s when it offers Undo); tapping the action runs it and closes. */
export default function Toaster({ lift = false }) {
  const [t, setT] = useState(null);
  const timer = useRef(0);
  useEffect(() => {
    const on = (e) => {
      clearTimeout(timer.current);
      const next = { ...e.detail, id: Date.now() };
      setT(next);
      timer.current = setTimeout(() => setT(null), next.onAction ? 8000 : 5000);
    };
    window.addEventListener(TOAST_EVENT, on);
    return () => { window.removeEventListener(TOAST_EVENT, on); clearTimeout(timer.current); };
  }, []);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className={`mt-toast-wrap${lift ? " lift" : ""}`} aria-live="polite" role="status">
      {t && (
        <div className="mt-toast" key={t.id}>
          <span className="mt-toast-tick" aria-hidden="true"><Check size={15} strokeWidth={3} /></span>
          <span className="mt-toast-text">
            <strong>{t.message}</strong>
            {t.detail && <small>{t.detail}</small>}
          </span>
          {t.onAction && (
            <button type="button" className="mt-toast-action" onClick={() => { clearTimeout(timer.current); setT(null); t.onAction(); }}>
              {t.actionLabel || "Undo"}
            </button>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
