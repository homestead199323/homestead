import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/* ═══════════════════════════════════════════
   DELETE ACCOUNT — Settings → "Delete account" (GDPR art. 17, App Store 5.1.1(v))

   Called by the signed-in user through supabase.functions.invoke with
   { confirm: "DELETE" }. Deletes ONLY the caller's own account:
   1. A live Basic/Pro subscription is cancelled first (Paddle API, if a
      PADDLE_API_KEY secret is set). If it can't be cancelled, nothing is
      deleted and the app asks the user to email support — an account must
      never disappear while its card keeps being charged.
   2. Their farm row, then their profile row (in case the foreign keys to
      auth.users don't cascade), then the login itself.
   verify_jwt stays ON: the platform rejects calls without a valid user JWT.
   ═══════════════════════════════════════════ */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY") ?? "";
const PADDLE_API = Deno.env.get("PADDLE_API_BASE") ?? "https://api.paddle.com"; // live client token (live_…) → live API

const ALLOWED_ORIGINS = new Set([
  "https://www.myterra.farm",
  "https://myterra.farm",
  "https://myterra-sigma.vercel.app",
  "http://localhost:5173",
  "http://localhost:4173",
  "capacitor://localhost",
  "https://localhost",
]);
const PREVIEW_ORIGIN = /^https:\/\/myterra-[a-z0-9-]+-derviskanina-5360s-projects\.vercel\.app$/;

// A subscription in these states can still charge (or resume charging) the card.
const LIVE_SUBSCRIPTION = new Set(["active", "trialing", "past_due", "paused"]);

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED_ORIGINS.has(origin) || PREVIEW_ORIGIN.test(origin) ? origin : "https://www.myterra.farm";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function reply(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return reply(req, 405, { error: "method_not_allowed" });

  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return reply(req, 401, { error: "not_signed_in" });

  let body: { confirm?: string } = {};
  try { body = await req.json(); } catch { /* empty or invalid body */ }
  if (body.confirm !== "DELETE") return reply(req, 400, { error: "confirmation_required" });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Who is asking? Only ever the owner of this JWT is deleted.
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) return reply(req, 401, { error: "not_signed_in" });

  // 1. Never leave a paying subscription behind.
  const { data: profile, error: profileErr } = await admin
    .from("profiles")
    .select("tier, subscription_status, paddle_subscription_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileErr) {
    console.error("delete-account: profile read failed", profileErr.message);
    return reply(req, 500, { error: "delete_failed", step: "profile_read" });
  }
  const recurring = !!profile &&
    (profile.tier === "basic" || profile.tier === "pro") &&
    LIVE_SUBSCRIPTION.has(profile.subscription_status ?? "") &&
    !!profile.paddle_subscription_id;
  if (recurring) {
    if (!PADDLE_API_KEY) return reply(req, 409, { error: "subscription_active" });
    const res = await fetch(
      `${PADDLE_API}/subscriptions/${encodeURIComponent(String(profile.paddle_subscription_id))}/cancel`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${PADDLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ effective_from: "immediately" }),
      },
    );
    if (!res.ok) {
      console.error("delete-account: Paddle cancel failed", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return reply(req, 409, { error: "subscription_active" });
    }
  }

  // 2. Data first, then the login.
  const farm = await admin.from("farms").delete().eq("user_id", user.id);
  if (farm.error) {
    console.error("delete-account: farm delete failed", farm.error.message);
    return reply(req, 500, { error: "delete_failed", step: "farm" });
  }
  const prof = await admin.from("profiles").delete().eq("id", user.id);
  if (prof.error) {
    console.error("delete-account: profile delete failed", prof.error.message);
    return reply(req, 500, { error: "delete_failed", step: "profile" });
  }
  const gone = await admin.auth.admin.deleteUser(user.id);
  if (gone.error) {
    console.error("delete-account: auth user delete failed", gone.error.message);
    return reply(req, 500, { error: "delete_failed", step: "user" });
  }

  console.log("delete-account: deleted", user.id, recurring ? "(subscription cancelled)" : "");
  return reply(req, 200, { ok: true, subscriptionCancelled: recurring });
});
