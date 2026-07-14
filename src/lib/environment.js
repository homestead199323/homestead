/* ═══════════════════════════════════════════
   ENVIRONMENT — Launch Stage 4 (brief §6–7)
   Resolves the user's map environment from the
   onboarding profile (Stage 2/3). Existing users
   are classified as "farm" by migrateProfile, and
   null/unknown values fall back to "farm" so no
   render path ever sees an undefined environment.
   MARKER: ENV_RESOLVE_V1
   ═══════════════════════════════════════════ */

export const ENVIRONMENTS = ["balcony", "backyard", "farm"];

export function resolveEnvironment(data) {
  const e = data && data.profile ? data.profile.environment : null;
  return e === "balcony" || e === "backyard" ? e : "farm";
}
