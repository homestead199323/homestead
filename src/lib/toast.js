/* ═══════════════════════════════════════════
   TOAST — tiny app-wide confirmation line (UX pass 2026-09-28)
   toast("Radish sown", { detail: "Next: thin in 14 days", actionLabel: "Undo", onAction })
   Rendered by <Toaster/> in App. One at a time; a new one replaces the old.
   ═══════════════════════════════════════════ */
export const TOAST_EVENT = "myterra:toast";

export function toast(message, opts) {
  if (typeof window === "undefined" || !message) return;
  try {
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: { message: String(message), ...(opts || {}) } }));
  } catch {
    /* no CustomEvent (very old browser): confirmations are optional */
  }
}
