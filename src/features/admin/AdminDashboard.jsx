import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ExternalLink, ShieldCheck } from "lucide-react";
import { C, F } from "../../lib/theme";
import { Card, Stat } from "../../components/ui";
import { fetchAdminDashboard } from "../../lib/admin";

/* ═══════════════════════════════════════════
   ADMIN DASHBOARD — owner overview
   Everything here comes from one server-gated RPC (admin_dashboard).
   Non-owners who reach this page get the RPC's `forbidden` error and
   see the error state — the nav item is hidden for them anyway.
   ═══════════════════════════════════════════ */

const DAY = 86400000;

function fmtD(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "2-digit" });
}
function ago(ts) {
  if (!ts) return "never";
  const ms = Date.now() - new Date(ts).getTime();
  if (ms < 0) return "now";
  const days = Math.floor(ms / DAY);
  if (days === 0) return "today";
  if (days < 30) return days + "d ago";
  const mo = Math.floor(days / 30);
  if (mo < 12) return mo + "mo ago";
  return Math.floor(mo / 12) + "y ago";
}
function kb(b) {
  if (!b) return "0 KB";
  if (b < 1024) return b + " B";
  if (b < 1048576) return (b / 1024).toFixed(1) + " KB";
  return (b / 1048576).toFixed(2) + " MB";
}
const REGION_LABELS = {
  western_europe: "Western Europe",
  northern_europe: "Northern Europe",
  us_warm: "US/Canada Warm",
  us_cold: "US/Canada Cold",
  mediterranean: "Mediterranean",
};
function regionLabel(r) {
  if (!r) return "Not set";
  return REGION_LABELS[r] || r;
}
const TIER_COLORS = { trial: "#f59e0b", basic: "#3b82f6", pro: "#16a34a", lifetime: "#8b5cf6" };

/* Small labelled section heading inside cards */
function CardTitle({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>{children}</div>;
}

/* Label + count row with a proportional mini bar */
function BarRow({ label, n, max, sub }) {
  const pct = max > 0 ? Math.max(4, Math.round((n / max) * 100)) : 4;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
        <span style={{ color: C.text, fontWeight: 500 }}>{label}</span>
        <span style={{ color: C.t2, fontVariantNumeric: "tabular-nums" }}>{n}{sub ? " " + sub : ""}</span>
      </div>
      <div style={{ height: 6, background: C.soft, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: C.green, borderRadius: 3 }} />
      </div>
    </div>
  );
}

const OWNER_LINKS = [
  { l: "Supabase (database & auth)", url: "https://supabase.com/dashboard/project/fosqnppqcsoowqvrlkul" },
  { l: "Vercel (deployments)", url: "https://vercel.com/derviskanina-5360s-projects/myterra" },
  { l: "Umami (web analytics)", url: "https://cloud.umami.is" },
  { l: "GitHub (source)", url: "https://github.com/homestead199323/homestead" },
];

export default function AdminDashboard() {
  const [dash, setDash] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(function () {
    setLoading(true);
    setErr(null);
    fetchAdminDashboard()
      .then(function (d) { setDash(d); setLoading(false); })
      .catch(function (e) { setErr(String(e.message || e)); setLoading(false); });
  }, []);

  useEffect(function () { load(); }, [load]);

  if (loading && !dash) {
    return <div style={{ padding: 40, textAlign: "center", color: C.t2, fontFamily: F.body }}>Loading owner dashboard…</div>;
  }

  if (err && !dash) {
    return (
      <div style={{ maxWidth: 520, margin: "60px auto", fontFamily: F.body }}>
        <Card>
          <div style={{ textAlign: "center", padding: 12 }}>
            <ShieldCheck size={32} color={C.t2} style={{ marginBottom: 10 }} />
            <div style={{ fontFamily: F.head, fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Owner dashboard unavailable</div>
            <div style={{ fontSize: 13, color: C.t2, marginBottom: 16 }}>
              {err === "forbidden" ? "This account is not authorized to view owner data." : "Could not load: " + err}
            </div>
            <button onClick={load} style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: C.green, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              Retry
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const totals = dash.totals || {};
  const activity = dash.activity || {};
  const trials = dash.trials || {};
  const tiers = dash.tiers || [];
  const signups = dash.signups_30d || [];
  const regions = dash.regions || [];
  const crops = dash.top_crops || [];
  const animals = dash.top_animals || [];
  const usage = dash.usage || {};
  const users = dash.users || [];

  const maxSignup = Math.max(1, ...signups.map(function (s) { return s.n; }));
  const signupTotal30 = signups.reduce(function (a, s) { return a + s.n; }, 0);
  const maxRegion = Math.max(1, ...regions.map(function (r) { return r.n; }));
  const maxCrop = Math.max(1, ...crops.map(function (c) { return c.n; }));
  const maxAnimal = Math.max(1, ...animals.map(function (a) { return a.head; }));
  const activationPct = totals.users > 0 ? Math.round((activity.activated / totals.users) * 100) : 0;

  const thS = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: `1px solid ${C.bdr}`, whiteSpace: "nowrap" };
  const tdS = { padding: "9px 10px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.bdr}`, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", fontFamily: F.body }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: F.head, fontSize: 26, fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={24} color={C.green} /> Admin
          </h1>
          <div style={{ fontSize: 12.5, color: C.t2, marginTop: 3 }}>
            Owner overview · updated {dash.generated_at ? new Date(dash.generated_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "—"}
          </div>
        </div>
        <button onClick={load} disabled={loading} aria-label="Refresh"
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 10, border: `1.5px solid ${C.bdr}`, background: C.card, color: C.text, cursor: loading ? "default" : "pointer", fontSize: 13, fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={15} strokeWidth={2} /> {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      {err && dash && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>Refresh failed: {err} — showing last loaded data.</div>}

      {/* Top stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, margin: "14px 0 16px" }}>
        <Stat label="Total users" value={totals.users ?? 0} sub={"+" + (totals.new_7d ?? 0) + " this week · +" + (totals.new_30d ?? 0) + " this month"} />
        <Stat label="Active (7d)" value={activity.active_7d ?? 0} sub={(activity.active_30d ?? 0) + " active in 30d"} color={C.blue} />
        <Stat label="Setup completed" value={activity.activated ?? 0} sub={activationPct + "% activation"} />
        <Stat label="Cloud data" value={kb(activity.db_bytes)} sub={(activity.farm_rows ?? 0) + " farm rows"} color={C.t2} />
      </div>

      {/* Trials & tiers */}
      <Card style={{ marginBottom: 16 }}>
        <CardTitle>Plans & trials</CardTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {tiers.map(function (t) {
            const col = TIER_COLORS[t.tier] || C.t2;
            return (
              <span key={t.tier} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: C.soft, fontSize: 13, fontWeight: 600, color: C.text }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: col, display: "inline-block" }} />
                {t.tier} · {t.n}
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 13, color: C.t2, flexWrap: "wrap" }}>
          <span>Trials in 7-day window: <b style={{ color: C.text }}>{trials.active ?? 0}</b></span>
          <span>Trials expired: <b style={{ color: C.text }}>{trials.expired ?? 0}</b></span>
        </div>
        <div style={{ fontSize: 12, color: C.t3, marginTop: 10, lineHeight: 1.5 }}>
          Payment gating is not built yet (Phase 8) — expired trials currently keep full access. Every paying-customer count here will stay 0 until gating ships.
        </div>
      </Card>

      {/* Signups chart */}
      <Card style={{ marginBottom: 16 }}>
        <CardTitle>Signups — last 30 days ({signupTotal30} total)</CardTitle>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 90 }}>
          {signups.map(function (s) {
            const h = s.n > 0 ? Math.max(8, Math.round((s.n / maxSignup) * 82)) : 3;
            return (
              <div key={s.d} title={s.d + ": " + s.n} style={{ flex: 1, height: h, background: s.n > 0 ? C.green : C.bdr, borderRadius: 2, minWidth: 3 }} />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.t3, marginTop: 6 }}>
          <span>{signups.length > 0 ? fmtD(signups[0].d) : ""}</span>
          <span>{signups.length > 0 ? fmtD(signups[signups.length - 1].d) : ""}</span>
        </div>
      </Card>

      {/* Breakdown grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Card>
          <CardTitle>Regions</CardTitle>
          {regions.length === 0 && <div style={{ fontSize: 13, color: C.t2 }}>No farm data yet.</div>}
          {regions.map(function (r) {
            return <BarRow key={r.region} label={regionLabel(r.region)} n={r.n} max={maxRegion} sub={r.n === 1 ? "farm" : "farms"} />;
          })}
        </Card>
        <Card>
          <CardTitle>Top crops (by plots)</CardTitle>
          {crops.length === 0 && <div style={{ fontSize: 13, color: C.t2 }}>No crops planted yet.</div>}
          {crops.slice(0, 7).map(function (c) {
            return <BarRow key={c.crop} label={c.crop} n={c.n} max={maxCrop} sub={"· " + Math.round(c.plants) + " plants"} />;
          })}
        </Card>
        <Card>
          <CardTitle>Livestock (by head)</CardTitle>
          {animals.length === 0 && <div style={{ fontSize: 13, color: C.t2 }}>No animals yet.</div>}
          {animals.slice(0, 7).map(function (a) {
            return <BarRow key={a.type} label={a.type} n={a.head} max={maxAnimal} sub={"· " + a.n + (a.n === 1 ? " keeper" : " keepers")} />;
          })}
        </Card>
        <Card>
          <CardTitle>Usage totals (all users)</CardTitle>
          {[
            ["Crop plots", usage.plots],
            ["Animal entries", usage.animals],
            ["Pantry items", usage.pantry_items],
            ["Finance entries", usage.cost_items],
            ["Activity log entries", usage.log_entries],
            ["Harvests logged", usage.harvests],
          ].map(function (row) {
            return (
              <div key={row[0]} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", borderBottom: `1px solid ${C.bdr}` }}>
                <span style={{ color: C.t2 }}>{row[0]}</span>
                <b style={{ fontVariantNumeric: "tabular-nums" }}>{row[1] ?? 0}</b>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Users table */}
      <Card p={false} style={{ marginBottom: 16 }}>
        <div style={{ padding: "18px 18px 6px" }}>
          <CardTitle>Users ({users.length}{users.length === 200 ? " — capped at 200 newest" : ""})</CardTitle>
        </div>
        <div style={{ overflowX: "auto", paddingBottom: 6 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 900 }}>
            <thead>
              <tr>
                <th style={thS}>Email</th><th style={thS}>Plan</th><th style={thS}>Joined</th>
                <th style={thS}>Last sign-in</th><th style={thS}>Last synced</th><th style={thS}>Region</th>
                <th style={thS}>Setup</th><th style={thS}>Plots</th><th style={thS}>Animals</th>
                <th style={thS}>Pantry</th><th style={thS}>Streak</th><th style={thS}>Data</th>
              </tr>
            </thead>
            <tbody>
              {users.map(function (u) {
                const tierCol = TIER_COLORS[u.tier] || C.t2;
                return (
                  <tr key={u.email}>
                    <td style={tdS}>{u.email}</td>
                    <td style={tdS}><span style={{ color: tierCol, fontWeight: 600 }}>{u.tier || "—"}</span></td>
                    <td style={tdS}>{fmtD(u.joined)}</td>
                    <td style={tdS}>{ago(u.last_sign_in)}</td>
                    <td style={tdS}>{ago(u.last_synced)}</td>
                    <td style={tdS}>{regionLabel(u.region)}</td>
                    <td style={tdS}>{u.setup ? "✓" : "—"}</td>
                    <td style={tdS}>{u.plots ?? 0}</td>
                    <td style={tdS}>{u.animals ?? 0}</td>
                    <td style={tdS}>{u.pantry ?? 0}</td>
                    <td style={tdS}>{u.streak ?? 0}</td>
                    <td style={tdS}>{kb(u.bytes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Owner links */}
      <Card style={{ marginBottom: 24 }}>
        <CardTitle>Owner tools</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
          {OWNER_LINKS.map(function (lnk) {
            return (
              <a key={lnk.url} href={lnk.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "11px 14px", borderRadius: 10, background: C.soft, color: C.text, textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
                {lnk.l} <ExternalLink size={14} color={C.t2} />
              </a>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
