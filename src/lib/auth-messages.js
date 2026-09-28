/* ═══════════════════════════════════════════
   AUTH MESSAGES — which form to open first, and error text a person can act on.
   Pure helpers used by AuthScreen (kept here so they can be unit-tested).
   ═══════════════════════════════════════════ */
export function initialAuthMode(search) {
  const q = new URLSearchParams(search || "");
  if (q.has("signup") || q.get("mode") === "signup") return "signup";
  if (q.has("reset") || q.get("mode") === "forgot") return "forgot";
  return "signin";
}

// Supabase's raw messages are written for developers. Say what to do next instead.
export function friendlyAuthError(message, mode) {
  const m = String(message || "");
  if (/invalid login credentials/i.test(m)) return "That email and password don't match. Check for typos, or tap “Forgot password?”.";
  if (/already registered|already exists/i.test(m)) return "There is already an account with this email. Sign in instead.";
  if (/email not confirmed/i.test(m)) return "Please confirm your email first. The link is in your inbox (check spam too).";
  if (/rate limit|too many/i.test(m)) return "Too many attempts. Wait a minute and try again.";
  if (/should be different/i.test(m)) return "That's your current password. Pick a new one.";
  if (/password should be|weak password/i.test(m)) return "Pick a longer password: at least 6 characters.";
  if (/reauthenticat/i.test(m)) return "For your safety, sign out and back in, then change your password.";
  if (/unable to validate email|invalid email/i.test(m)) return "That doesn't look like a valid email address.";
  if (/failed to fetch|network/i.test(m)) return "Can't reach MyTerra right now. Check your connection and try again.";
  if (/auth session missing|expired/i.test(m) && mode === "reset") return "This reset link has expired. Request a new one.";
  return m || "Something went wrong. Try again.";
}

// Which ways an account signs in: a password (email provider) and/or Google.
// Unknown (no identity info) counts as password, the app's main method.
export function signInMethods(user) {
  const ids = user && Array.isArray(user.identities) ? user.identities.map(function (i) { return i && i.provider; }) : [];
  const meta = user && user.app_metadata
    ? (Array.isArray(user.app_metadata.providers) ? user.app_metadata.providers : [user.app_metadata.provider])
    : [];
  const all = new Set(ids.concat(meta).filter(Boolean));
  return { password: all.has("email") || all.size === 0, google: all.has("google") };
}

export const SUPPORT_EMAIL = "dervis.kanina@gmail.com";

// What to tell someone whose account deletion didn't go through. contact → show an email link.
export function deleteAccountError(result) {
  const code = result && result.code;
  const status = result && result.status;
  if (code === "subscription_active") {
    return { text: "Your subscription is still running and we couldn't cancel it automatically, so nothing was deleted. Email us and we'll cancel it and delete your account.", contact: true };
  }
  if (code === "not_signed_in" || status === 401) {
    return { text: "Your sign-in has expired, so nothing was deleted. Sign out, sign back in, then try again.", contact: false };
  }
  return { text: "We couldn't delete your account just now. Check your connection and try again. If it keeps failing, email us and we'll do it for you.", contact: true };
}
