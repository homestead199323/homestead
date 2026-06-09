import React, { useState, useEffect } from "react";
import { C, F } from "../../lib/theme";
import { Overlay, Card, Inp } from "../../components/ui";
import { SyncStatus } from "../../components/SyncStatus";
import { getSession } from "../../lib/auth";
import { rCR } from "../../lib/regional";
import { LDB } from "../../data/livestock";
import { Download, Upload, Moon, Sun, LogOut } from "lucide-react";

/* ═══════════════════════════════════════════
   SETTINGS — single panel bundling account, appearance,
   data backup, and sign-out. Opened from the sidebar footer
   (desktop) and the More drawer (mobile).
   ═══════════════════════════════════════════ */
export default function SettingsPanel({
  onClose, data, setData, exportData, importData, darkMode, setDarkMode, onSignOut,
}) {
  const [email, setEmail] = useState("");
  useEffect(() => {
    let mounted = true;
    getSession()
      .then((s) => { if (mounted) setEmail((s && s.user && s.user.email) || ""); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const cropCount = rCR(data && data.region).length;
  const animalCount = Object.keys(LDB).length;

  const sectionLabel = {
    fontSize: 11, fontWeight: 700, color: C.t2, textTransform: "uppercase",
    letterSpacing: "0.05em", margin: "2px 0 8px",
  };
  const rowBtn = {
    display: "flex", alignItems: "center", gap: 11, width: "100%",
    padding: "11px 13px", border: `1px solid ${C.bdr}`, background: C.card,
    color: C.text, cursor: "pointer", fontSize: 14, fontFamily: F.body,
    borderRadius: 10, textAlign: "left", marginBottom: 8, boxSizing: "border-box",
  };
  const ico = { width: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };

  return (
    <Overlay title="Settings" onClose={onClose}>
      {/* Account */}
      <div style={sectionLabel}>Account</div>
      <Card style={{ marginBottom: 18, padding: "14px 16px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 3 }}>Email</div>
        <div style={{ fontSize: 14, color: C.text, marginBottom: 12, wordBreak: "break-all" }}>{email || "Local account"}</div>
        <Inp label="Name" placeholder="My Farm" value={data.farmName || ""} onChange={(e) => setData({ ...data, farmName: e.target.value })} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <span style={{ fontSize: 13, color: C.t2 }}>Plan</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.green, background: C.gp, padding: "3px 11px", borderRadius: 12 }}>Free plan</span>
        </div>
      </Card>

      {/* Appearance */}
      <div style={sectionLabel}>Appearance</div>
      <button type="button" onClick={() => setDarkMode(!darkMode)} style={rowBtn}>
        <span style={ico}>{darkMode ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}</span>
        {darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>

      {/* Data */}
      <div style={sectionLabel}>Data</div>
      <button type="button" onClick={exportData} style={rowBtn}>
        <span style={ico}><Download size={17} strokeWidth={1.8} /></span> Export Backup
      </button>
      <label style={rowBtn}>
        <span style={ico}><Upload size={17} strokeWidth={1.8} /></span> Import Backup
        <input type="file" accept=".json" onChange={(e) => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ""; }} style={{ display: "none" }} />
      </label>

      {/* Sign out */}
      {onSignOut && (
        <button type="button" onClick={onSignOut} style={{ ...rowBtn, color: C.red }}>
          <span style={ico}><LogOut size={17} strokeWidth={1.8} /></span> Sign Out
        </button>
      )}

      {/* Footer: data scope + sync status */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.bdr}` }}>
        <span style={{ fontSize: 11, color: C.t3 }}>{cropCount} crops · {animalCount} animals</span>
        <SyncStatus />
      </div>
    </Overlay>
  );
}
