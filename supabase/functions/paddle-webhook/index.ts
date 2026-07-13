import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Price ID -> tier. MUST match Paddle products (8.4) and Paywall.jsx PLANS.
const PRICE_TIER = {
  "pri_01kxdcntw2905t5fky81fy8cp0": "basic",
  "pri_01kxdcqpgjd5z1qrpd6hxgmxr2": "pro",
  "pri_01kxdcrgmy4jnxycc4h9fa2jsp": "lifetime",
};

const WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

async function verifySignature(rawBody: string, sigHeader: string | null): Promise<boolean> {
  if (!sigHeader || !WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(
    sigHeader.split(";").map((p) => p.split("=") as [string, string])
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signed = await crypto.subtle.sign(
    "HMAC", key, enc.encode(`${ts}:${rawBody}`)
  );
  const computed = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  if (computed.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ h1.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get("Paddle-Signature");
  const valid = await verifySignature(rawBody, sigHeader);
  if (!valid) {
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const eventType: string = event.event_type;
  const data = event.data ?? {};
  const userId: string | undefined = data.custom_data?.user_id;

  if (!userId) {
    console.log("skip: no custom_data.user_id", eventType);
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (eventType === "subscription.created" || eventType === "subscription.updated") {
      const priceId = data.items?.[0]?.price?.id;
      const tier = PRICE_TIER[priceId] ?? null;
      const status = data.status;
      const periodEnd = data.current_billing_period?.ends_at ?? null;

      const update: Record<string, unknown> = {
        paddle_customer_id: data.customer_id ?? null,
        paddle_subscription_id: data.id ?? null,
        subscription_status: status,
        current_period_end: periodEnd,
      };
      if (tier) update.tier = tier;

      const { error } = await supabase.from("profiles").update(update).eq("id", userId);
      if (error) throw error;
    } else if (eventType === "subscription.canceled") {
      const { error } = await supabase
        .from("profiles")
        .update({ subscription_status: "canceled" })
        .eq("id", userId);
      if (error) throw error;
    } else if (eventType === "transaction.completed") {
      const priceId = data.items?.[0]?.price?.id;
      const tier = PRICE_TIER[priceId];
      if (tier === "lifetime") {
        const { error } = await supabase
          .from("profiles")
          .update({
            tier: "lifetime",
            paddle_customer_id: data.customer_id ?? null,
            subscription_status: null,
            current_period_end: null,
          })
          .eq("id", userId);
        if (error) throw error;
      }
    } else {
      console.log("unhandled event type", eventType);
    }
  } catch (err) {
    console.error("webhook handler error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
