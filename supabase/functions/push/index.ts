import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

/* ═══════════════════════════════════════════
   PUSH — morning digest notifications (top-10 #2, 2026-09-30)

   The app computes the next 7 days of jobs itself (same task engine, same
   forecast) and stores one short digest per day in public.push_digests.
   This function only delivers: every hour pg_cron calls {action:"send"}
   and each device whose local time has reached its chosen hour (and hasn't
   had today's digest yet) gets that day's digest.

   Actions (POST JSON, or GET ?action=public-key):
     public-key → { publicKey }            no auth (the VAPID public key is public)
     test       → sends "it works" to the caller's own devices   user JWT
     send       → hourly digest run                              x-cron-secret header
   VAPID keys are generated here on first use and kept in Supabase Vault
   (push_vapid_public / push_vapid_private); the private key never leaves
   the server. verify_jwt is OFF because the cron call has no user JWT —
   every action checks its own auth as listed above.
   ═══════════════════════════════════════════ */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CONTACT = "mailto:support@myterra.farm";
const SEND_WINDOW_H = 3; // a missed cron hour still delivers later that morning
const MAX_FAILS = 5;

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

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allow = ALLOWED_ORIGINS.has(origin) || PREVIEW_ORIGIN.test(origin) ? origin : "https://www.myterra.farm";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}
function reply(req: Request, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function secret(name: string): Promise<string | null> {
  const { data, error } = await admin.rpc("push_secret", { p_name: name });
  if (error) throw new Error("vault: " + error.message);
  return (data as string | null) || null;
}

let vapidCache: { publicKey: string; privateKey: string } | null = null;
async function vapid(): Promise<{ publicKey: string; privateKey: string }> {
  if (vapidCache) return vapidCache;
  let publicKey = await secret("push_vapid_public");
  let privateKey = await secret("push_vapid_private");
  if (!publicKey || !privateKey) {
    const k = webpush.generateVAPIDKeys();
    // Private first: if two cold starts race, only one pair is ever stored (store refuses duplicates).
    await admin.rpc("push_store_secret", { p_name: "push_vapid_private", p_value: k.privateKey });
    await admin.rpc("push_store_secret", { p_name: "push_vapid_public", p_value: k.publicKey });
    publicKey = await secret("push_vapid_public");
    privateKey = await secret("push_vapid_private");
    if (!publicKey || !privateKey) throw new Error("vapid keys missing after create");
  }
  vapidCache = { publicKey, privateKey };
  return vapidCache;
}

type Sub = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string; tz: string; hour: number; last_sent_on: string | null; fail_count: number };

async function deliver(sub: Sub, payload: Record<string, unknown>, ttl: number): Promise<{ ok: boolean; gone?: boolean; status?: number; error?: string }> {
  const keys = await vapid();
  try {
    const res = await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { vapidDetails: { subject: CONTACT, publicKey: keys.publicKey, privateKey: keys.privateKey }, TTL: ttl, urgency: "normal" },
    );
    return { ok: true, status: res.statusCode };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return { ok: false, gone: status === 404 || status === 410, status, error: String((e as Error).message || e).slice(0, 300) };
  }
}

async function recordFailure(sub: Sub, r: { gone?: boolean; error?: string; status?: number }) {
  if (r.gone || sub.fail_count + 1 >= MAX_FAILS) {
    await admin.from("push_subscriptions").delete().eq("id", sub.id);
  } else {
    await admin.from("push_subscriptions").update({ fail_count: sub.fail_count + 1, last_error: `${r.status ?? ""} ${r.error ?? ""}`.trim() }).eq("id", sub.id);
  }
}

/** Local date + hour for a device's time zone (bad zone → UTC). */
export function localNow(tz: string, now = new Date()): { date: string; hour: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
}

async function runDigest(): Promise<Record<string, number>> {
  const stats = { devices: 0, due: 0, sent: 0, noDigest: 0, failed: 0 };
  const { data: subs, error } = await admin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth,tz,hour,last_sent_on,fail_count");
  if (error) throw new Error(error.message);
  stats.devices = subs?.length ?? 0;
  const due = (subs as Sub[] || []).map((s) => ({ s, t: localNow(s.tz) }))
    .filter(({ s, t }) => t.hour >= s.hour && t.hour < s.hour + SEND_WINDOW_H && s.last_sent_on !== t.date);
  stats.due = due.length;
  if (!due.length) return stats;
  const users = [...new Set(due.map((d) => d.s.user_id))];
  const { data: digests } = await admin.from("push_digests").select("user_id,days").in("user_id", users);
  const byUser = new Map((digests || []).map((d: { user_id: string; days: Record<string, { title?: string; body?: string; count?: number }> }) => [d.user_id, d.days || {}]));
  for (const { s, t } of due) {
    const d = byUser.get(s.user_id)?.[t.date];
    if (!d || !d.title) { stats.noDigest++; continue; } // app not opened for a week: nothing honest to say
    const r = await deliver(s, { title: d.title, body: d.body || "", tag: `digest-${t.date}`, url: "/app" }, 6 * 3600);
    if (r.ok) {
      stats.sent++;
      await admin.from("push_subscriptions").update({ last_sent_on: t.date, fail_count: 0, last_error: null }).eq("id", s.id);
    } else {
      stats.failed++;
      await recordFailure(s, r);
    }
  }
  return stats;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  const url = new URL(req.url);
  let body: { action?: string } = {};
  if (req.method === "POST") { try { body = await req.json(); } catch { /* empty */ } }
  const action = body.action || url.searchParams.get("action") || "";

  try {
    if (action === "public-key") {
      return reply(req, 200, { publicKey: (await vapid()).publicKey });
    }

    if (action === "send") {
      const expected = await secret("push_cron_secret");
      const got = req.headers.get("x-cron-secret") ?? "";
      if (!expected || got.length !== expected.length || got !== expected) return reply(req, 401, { error: "unauthorized" });
      return reply(req, 200, { ok: true, ...(await runDigest()) });
    }

    if (action === "test") {
      if (req.method !== "POST") return reply(req, 405, { error: "method_not_allowed" });
      const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
      const { data: u, error: ue } = jwt ? await admin.auth.getUser(jwt) : { data: null, error: true };
      const user = u?.user;
      if (ue || !user) return reply(req, 401, { error: "not_signed_in" });
      const { data: subs } = await admin.from("push_subscriptions").select("id,user_id,endpoint,p256dh,auth,tz,hour,last_sent_on,fail_count").eq("user_id", user.id);
      if (!subs?.length) return reply(req, 404, { error: "no_devices" });
      let sent = 0;
      const errors: string[] = [];
      for (const s of subs as Sub[]) {
        const r = await deliver(s, { title: "MyTerra reminders are on 🌱", body: "Your morning jobs will arrive here each day.", tag: "test", url: "/app" }, 600);
        if (r.ok) sent++; else { errors.push(String(r.status ?? r.error)); await recordFailure(s, r); }
      }
      return reply(req, sent ? 200 : 502, { ok: sent > 0, sent, devices: subs.length, errors });
    }

    return reply(req, 400, { error: "unknown_action" });
  } catch (e) {
    console.error("push error", e);
    return reply(req, 500, { error: "server_error" });
  }
});
