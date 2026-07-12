/* ═══════════════════════════════════════════
   PAYWALL — Phase 8.2 (payments UI layer)

   Three pieces, all driven by the entitlement object from
   src/services/payments/entitlements.js:

   - TrialBanner        — slim status strip above page content: trial
                          countdown, read-only notice after expiry,
                          payment-issue notice during Paddle dunning.
   - UpgradeSheet       — plan picker modal. Checkout buttons are
                          disabled until Paddle goes live (Phase 8.5) —
                          flip PADDLE_ENABLED when the webhook ships.
   - LockedAssistantFab — replaces the AI assistant FAB when the plan
                          lacks the 'ai' feature; opens the sheet.

   These are UX only. The write block is enforced by farms RLS
   (public.has_write_access) — see entitlements.js header.
   ═══════════════════════════════════════════ */
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Lock, MessageCircle, Sparkles, X } from "lucide-react";
import { C, F } from "../../lib/theme";

// Flip to true in Phase 8.5 when Paddle checkout + webhook are live.
export const PADDLE_ENABLED = false;

// Pricing — MUST match public/landing.html (canonical) and the Paddle
// products created in Phase 8.4.
const PLANS = [
  { id: "basic", name: "Basic", price: "$4.99", per: "/month", blurb: "Everything you need to run one farm: tasks, crops, animals, pantry, financials, manuals." },
  { id: "pro", name: "Pro", price: "$9.99", per: "/month", blurb: "Basic plus the AI farm assistant, multi-zone planning, and analytics.", highlight: true },
  { id: "lifetime", name: "Lifetime", price: "$190", per: "one-time", blurb: "All Pro features forever. Early-adopter deal, limited availability." },
];

/* ── TrialBanner ─────────────────────────────────────────────────────
   Renders nothing for lifetime / active states. */
export function TrialBanner({ ent, onUpgrade }) {
  if (!ent) return null;

  let bg = null;
  let text = null;
  let cta = "Upgrade";

  if (ent.state === "trial") {
    bg = C.gp;
    text = ent.trialDaysLeft === 1
      ? "Free trial — last day. Pick a plan to keep full access."
      : `Free trial — ${ent.trialDaysLeft} days left.`;
  } else if (ent.state === "trial_expired") {
    bg = "color-mix(in srgb, #f59e0b 14%, transparent)";
    text = "Your free trial has ended. The farm is read-only — your data is safe.";
  } else if (ent.state === "expired") {
    bg = "color-mix(in srgb, #f59e0b 14%, transparent)";
    text = "Your subscription has ended. The farm is read-only — your data is safe.";
    cta = "Renew";
  } else if (ent.state === "past_due") {
    bg = "color-mix(in srgb, #ef4444 12%, transparent)";
    text = "There is a payment issue with your subscription. Access continues while we retry.";
    cta = "Fix payment";
  } else {
    return null;
  }

  return (
    <div role="status" style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      background: bg, border: `1px solid ${C.bdr}`, borderRadius: 12,
      padding: "8px 12px", marginBottom: 14, fontFamily: F.body,
    }}>
      <span style={{ fontSize: 12.5, color: C.text, fontWeight: 500, flex: 1, minWidth: 180 }}>{text}</span>
      <button onClick={onUpgrade} style={{
        border: "none", background: C.green, color: "#fff", cursor: "pointer",
        fontSize: 12, fontWeight: 700, fontFamily: F.body,
        padding: "6px 14px", borderRadius: 9, whiteSpace: "nowrap",
      }}>
        {cta}
      </button>
    </div>
  );
}

/* ── UpgradeSheet ──────────────────────────────────────────────────── */
export function UpgradeSheet({ open, onClose, ent }) {
  // Escape closes — matches the app's other overlays.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const locked = ent ? !ent.canWrite : false;

  return createPortal(
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "rgba(15,23,20,.45)", backdropFilter: "blur(2px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={function(e){ e.stopPropagation(); }} role="dialog" aria-modal="true" aria-label="Choose a plan" style={{
        background: C.card, borderRadius: 18, maxWidth: 520, width: "100%",
        maxHeight: "88vh", overflowY: "auto", padding: "22px 20px",
        boxShadow: C.shL, fontFamily: F.body, position: "relative",
      }}>
        <button onClick={onClose} aria-label="Close" style={{
          position: "absolute", top: 12, right: 12, border: "none",
          background: C.soft, color: C.t2, cursor: "pointer",
          width: 30, height: 30, borderRadius: 15,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={16} strokeWidth={2.2}/>
        </button>

        <div style={{ fontFamily: F.head, fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 4 }}>
          {locked ? "Keep farming" : "Upgrade your farm"}
        </div>
        <p style={{ fontSize: 13, color: C.t2, margin: "0 0 16px" }}>
          {locked
            ? "Your farm and all its data are saved. Pick a plan to unlock editing again."
            : "Pick the plan that fits how you farm."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PLANS.map(function(plan) {
            return (
              <div key={plan.id} style={{
                border: plan.highlight ? `2px solid ${C.green}` : `1.5px solid ${C.bdr}`,
                borderRadius: 14, padding: "14px 16px",
                background: plan.highlight ? C.gp : C.card,
                position: "relative",
              }}>
                {plan.highlight && (
                  <span style={{
                    position: "absolute", top: -9, right: 14,
                    background: C.green, color: "#fff", fontSize: 10, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 8, letterSpacing: "0.04em",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    <Sparkles size={10} strokeWidth={2.4}/> MOST POPULAR
                  </span>
                )}
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: F.head, fontSize: 16, fontWeight: 800, color: C.text }}>{plan.name}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{plan.price}</span>
                  <span style={{ fontSize: 11.5, color: C.t2 }}>{plan.per}</span>
                </div>
                <p style={{ fontSize: 12, color: C.t2, margin: "6px 0 10px", lineHeight: 1.5 }}>{plan.blurb}</p>
                <button
                  disabled={!PADDLE_ENABLED}
                  onClick={function(){ /* Phase 8.5: openPaddleCheckout(plan.id) */ }}
                  style={{
                    width: "100%", border: "none", borderRadius: 10,
                    padding: "9px 0", fontSize: 13, fontWeight: 700, fontFamily: F.body,
                    background: PADDLE_ENABLED ? C.green : C.soft,
                    color: PADDLE_ENABLED ? "#fff" : C.t2,
                    cursor: PADDLE_ENABLED ? "pointer" : "not-allowed",
                  }}
                >
                  {PADDLE_ENABLED ? `Choose ${plan.name}` : "Checkout coming soon"}
                </button>
              </div>
            );
          })}
        </div>

        {!PADDLE_ENABLED && (
          <p style={{ fontSize: 11.5, color: C.t2, margin: "14px 0 0", textAlign: "center", lineHeight: 1.5 }}>
            Payments are launching shortly. Nothing is charged today, and your farm data stays safe either way.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ── LockedAssistantFab ──────────────────────────────────────────────
   Stand-in for the AI assistant button when the plan lacks 'ai'.
   Mirrors AIAssistant's FAB geometry (56px, bottom-right, lifts above
   the mobile dock) so the layout doesn't jump between plans. */
export function LockedAssistantFab({ lift, onClick }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <button
      onClick={onClick}
      aria-label="Farm assistant — available on the Pro plan"
      title="Farm Assistant (Pro)"
      style={{
        position: "fixed",
        bottom: isMobile ? (lift ? "calc(210px + env(safe-area-inset-bottom))" : "calc(72px + env(safe-area-inset-bottom))") : 24,
        right: 24,
        zIndex: 2000,
        width: 56, height: 56, borderRadius: 28,
        background: C.soft,
        border: `1.5px solid ${C.bdr}`, cursor: "pointer",
        boxShadow: "0 4px 16px rgba(0,0,0,.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: C.t2,
        transition: "transform .2s, bottom .2s",
      }}
    >
      <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <MessageCircle size={26} strokeWidth={2}/>
        <span aria-hidden="true" style={{
          position: "absolute", top: -7, right: -9,
          background: C.green, color: "#fff",
          width: 17, height: 17, borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Lock size={10} strokeWidth={2.6}/>
        </span>
      </span>
    </button>
  );
}
