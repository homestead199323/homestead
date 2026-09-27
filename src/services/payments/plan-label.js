/* Human labels for the entitlement object (see entitlements.js). No imports: unit-tested. */
/*
 * planLabel(ent) → short human label for the account's plan, e.g.
 * "Pro trial · 5 days left", "Basic plan", "Trial ended · read-only".
 * Returns "" when the plan is not known yet (offline first run, local-only
 * mode) so callers can hide the chip instead of guessing.
 */
export function planLabel(ent) {
  if (!ent) return "";
  switch (ent.state) {
    case "trial":
      return ent.trialDaysLeft === 1 ? "Pro trial · last day" : `Pro trial · ${ent.trialDaysLeft} days left`;
    case "trial_expired":
      return "Trial ended · read-only";
    case "lifetime":
      return "Lifetime Pro";
    case "active":
      return ent.plan === "pro" ? "Pro plan" : "Basic plan";
    case "past_due":
      return (ent.plan === "pro" ? "Pro" : "Basic") + " · payment issue";
    case "expired":
      return "Plan ended · read-only";
    default:
      return "";
  }
}

/*
 * trialEndsAt(ent) → Date the 7-day trial ends, or null. Used by the
 * trial banner so people see a real date, not only a countdown.
 */
export function trialEndsAt(ent) {
  return ent && ent.trialEndsAt ? new Date(ent.trialEndsAt) : null;
}

