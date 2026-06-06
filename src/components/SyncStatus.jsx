import React, { useEffect, useState } from "react";
import { subscribeSyncStatus } from "../lib/sync";
import { C, F } from "../lib/theme";

/* ═══════════════════════════════════════════
   SYNC STATUS (Phase 6) — small cloud-sync indicator

   Subscribes to the sync status machine in src/lib/sync.js and renders a
   colored dot + label. Hidden entirely in "local" status (Supabase not
   configured / signed out — there is no cloud target to report on).

   compact: dot only (for the narrow tablet icon rail); label moves to a
   native title tooltip.
   ═══════════════════════════════════════════ */
const META = {
  synced:  { dot: C.green,   label: "Synced" },
  syncing: { dot: C.t2,      label: "Syncing…" },
  offline: { dot: C.orange,  label: "Offline · saved on device" },
  error:   { dot: "#ef4444", label: "Not synced · saved locally" },
};

export function SyncStatus({ compact = false }) {
  const [status, setStatus] = useState("synced");
  useEffect(() => subscribeSyncStatus(setStatus), []);

  const meta = META[status];
  if (!meta) return null; // "local" or any unknown status renders nothing

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={"Sync status: " + meta.label}
      title={compact ? meta.label : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        fontSize: 11, fontWeight: 500, color: C.t2,
        fontFamily: F.body, justifyContent: compact ? "center" : "flex-start",
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: 4, flexShrink: 0,
        background: meta.dot,
        boxShadow: status === "syncing" ? "none" : `0 0 0 2px ${meta.dot}22`,
      }}/>
      {!compact && <span>{meta.label}</span>}
    </div>
  );
}
