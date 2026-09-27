/* ═══════════════════════════════════════════
   AUTH WRAPPER
   Thin wrapper over supabase.auth so UI code never touches the raw
   client. Covers email (password) + Google OAuth, sign-out, current
   session, and a subscription helper for auth-state changes.

   Design notes:
   - signUpEmail / signInEmail return { data, error } unchanged from
     Supabase so callers can show the real error message.
   - Google uses window.location.origin so the redirect auto-adapts to
     localhost (dev) and the Vercel domain (prod) with no hardcoding.
     The same origin+/app URL must be whitelisted in the Supabase
     dashboard (Authentication > URL Configuration) and Google Cloud.
   - onAuthChange returns the unsubscribe function so callers can clean
     up in a useEffect teardown.
   ═══════════════════════════════════════════ */
import { supabase } from "./db";

// Where email links (confirm sign-up, reset password) send people back to.
// If this URL is not on the Supabase redirect allow-list, Supabase falls back
// to the Site URL; the landing page forwards auth hashes to /app either way.
function appUrl() {
  return typeof window !== "undefined" ? window.location.origin + "/app" : undefined;
}

// ── Email + password ───────────────────────────────────────────────
export async function signUpEmail(email, password) {
  return supabase.auth.signUp({ email, password, options: { emailRedirectTo: appUrl() } });
}

export async function signInEmail(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

// ── Password reset ─────────────────────────────────────────────────
// Step 1: email a reset link. Step 2: the link opens /app with a recovery
// session (supabase-js emits PASSWORD_RECOVERY) and the user picks a new
// password via updatePassword.
export async function sendPasswordReset(email) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
}

export async function updatePassword(password) {
  return supabase.auth.updateUser({ password });
}

// ── Google OAuth ───────────────────────────────────────────────────
export async function signInGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/app",
    },
  });
}

// ── Session / sign-out ─────────────────────────────────────────────
export async function signOut() {
  return supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session; // null when signed out
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user; // null when signed out
}

// ── Auth-state subscription ────────────────────────────────────────
// callback receives (event, session). Returns an unsubscribe fn.
export function onAuthChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return () => data.subscription.unsubscribe();
}
