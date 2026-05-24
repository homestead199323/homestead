/* ═══════════════════════════════════════════
   SYNC — cloud backup layer (Phase 5, document model)

   Rides ALONGSIDE storage.js, never replaces it. localStorage stays
   the authoritative local copy and the offline safety net; this module
   mirrors the farm-data blob up to the `farms` table and pulls it back
   on login. Conflict resolution is last-write-wins on the whole
   document, keyed by `updated_at` (matches Option A: one JSONB row per
   user).

   Integration points (App.jsx):
   - pullFarm(): call once when a session is detected on load / login.
       Returns { data, source } so the app can hydrate the reducer.
   - pushFarm(data): call from setData(), alongside saveFarm(). Debounced
       + offline-aware. No-op when signed out.
   - initSyncReconnect(): call once at app mount to wire the `online`
       event so a queued offline write drains when connectivity returns.

   This module does NOT run migrations — App.jsx owns that (it already
   migrates local data in initData). pullFarm returns raw cloud data and
   the caller migrates before dispatching, exactly like the local path.
   ═══════════════════════════════════════════ */
import { supabase, isSupabaseConfigured } from "./db";
import { getSession } from "./auth";

const SCHEMA_VERSION = 7;

// ── Push state (the "offline write queue" — latest-wins, not a log) ──
let _pushTimer = null;
let _pendingData = null; // latest farm-data awaiting push
let _dirty = false; // true when a push is queued but not yet confirmed

// ── PULL: fetch this user's farm row ────────────────────────────────
// Returns { data, source, updatedAt } or null when signed out / no cloud row.
//   source: "cloud" (a real saved farm) | "empty" (fresh row, data === {})
export async function pullFarm() {
  if (!isSupabaseConfigured) return null;
  const session = await getSession();
  if (!session) return null;

  const { data: row, error } = await supabase
    .from("farms")
    .select("data, schema_version, updated_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error) {
    console.warn("[sync] pullFarm failed:", error.message);
    return null;
  }
  if (!row) return null; // signup trigger should have created a row, but be safe

  const isEmpty =
    !row.data || (typeof row.data === "object" && Object.keys(row.data).length === 0);

  return {
    data: isEmpty ? null : row.data,
    source: isEmpty ? "empty" : "cloud",
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : 0,
  };
}

// ── PUSH: upsert the farm blob (debounced, offline-aware) ───────────
export function pushFarm(data) {
  if (!isSupabaseConfigured) return;
  _pendingData = data;
  _dirty = true;

  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => {
    void flushPush();
  }, 1000);
}

// Immediately attempt to push whatever is pending. Safe to call directly
// (reconnect handler, beforeunload). No-op when nothing pending or offline.
export async function flushPush() {
  if (!isSupabaseConfigured) return;
  if (!_dirty || _pendingData == null) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return; // stay queued

  const session = await getSession();
  if (!session) return; // signed out — nothing to push

  const payload = _pendingData;
  const { error } = await supabase
    .from("farms")
    .upsert(
      {
        user_id: session.user.id,
        data: payload,
        schema_version: SCHEMA_VERSION,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    // Keep _dirty true so a later flush retries. Don't clear the queue.
    console.warn("[sync] pushFarm failed (will retry on next change/reconnect):", error.message);
    return;
  }
  // Only clear dirty if no newer data arrived while the request was in flight.
  if (_pendingData === payload) _dirty = false;
}

// ── Reconnect: drain the queue when the browser comes back online ───
let _reconnectWired = false;
export function initSyncReconnect() {
  if (_reconnectWired || typeof window === "undefined") return;
  _reconnectWired = true;
  window.addEventListener("online", () => {
    void flushPush();
  });
}
