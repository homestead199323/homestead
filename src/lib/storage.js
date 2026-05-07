/* ═══════════════════════════════════════════
   STORAGE — localStorage with debounced saves
   Extracted from App.jsx (Phase A.1, 2026-05-07)

   Uses a 500ms debounced write to avoid hammering localStorage on every
   small state change. saveImmediate flushes synchronously (used by
   beforeunload to guarantee the latest state is persisted on tab close).
   ═══════════════════════════════════════════ */

let _saveTimer = null;
let _latestData = null; // Track latest data for beforeunload flush

export const DB = {
  KEY: "hfm_data_v7",
  load() {
    try {
      const raw = localStorage.getItem(DB.KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn("Load failed:", e); }
    return null;
  },
  save(data) {
    _latestData = data;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      try { localStorage.setItem(DB.KEY, JSON.stringify(data)); }
      catch (e) { console.warn("Save failed:", e); }
    }, 500);
  },
  saveImmediate(data) {
    if (_saveTimer) clearTimeout(_saveTimer);
    try { localStorage.setItem(DB.KEY, JSON.stringify(data)); return true; }
    catch (e) { console.warn("Save failed:", e); return false; }
  },
  flush() {
    if (_latestData) DB.saveImmediate(_latestData);
  }
};

export const uid = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
