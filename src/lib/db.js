/* ═══════════════════════════════════════════
   SUPABASE CLIENT
   Single source of the Supabase client for the whole app. UI and
   lib code import { supabase } from here — never construct a client
   elsewhere (multiple GoTrueClient instances on the same storage key
   cause auth races and console warnings).

   Env vars are Vite-style (VITE_ prefix, read via import.meta.env).
   The publishable/anon key is safe in the client bundle — Row-Level
   Security on the `farms` + `profiles` tables is the real boundary.
   ═══════════════════════════════════════════ */
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Fail loud at module load if the build was configured without env vars,
// rather than silently producing a client that 401s on every call.
if (!url || !key) {
  console.error(
    "[db] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. " +
      "Auth and cloud sync will not work. Check .env (local) or Vercel env vars (deploy)."
  );
}

export const supabase = createClient(url, key, {
  auth: {
    // Persist the session in localStorage so a returning user stays signed in.
    // Matches the app's existing localStorage persistence model.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true, // needed for the OAuth redirect callback (Google)
    storageKey: "hfm_auth", // namespaced alongside hfm_data_v7 / hfm_theme
  },
});

// True only when both env vars are present — callers can branch on this
// to degrade gracefully to local-only mode if Supabase is unconfigured.
export const isSupabaseConfigured = Boolean(url && key);
