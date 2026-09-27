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
  if (/password should be|weak password/i.test(m)) return "Pick a longer password: at least 6 characters.";
  if (/unable to validate email|invalid email/i.test(m)) return "That doesn't look like a valid email address.";
  if (/failed to fetch|network/i.test(m)) return "Can't reach MyTerra right now. Check your connection and try again.";
  if (/auth session missing|expired/i.test(m) && mode === "reset") return "This reset link has expired. Request a new one.";
  return m || "Something went wrong. Try again.";
}

