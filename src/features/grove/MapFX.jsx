/* ═══════════════════════════════════════════
   MAP FX — Launch Stage 4b (brief §6–7)
   Shared weather + sun-direction overlays for both map
   engines (GroveScene, LivingFarmMap). Rain/snow comes
   from the same cached Open-Meteo fetch the Today hero
   uses (1h TTL, key-less). Sun glow reads
   profile.sunDirection from onboarding.
   All overlays are pointer-events:none and respect
   prefers-reduced-motion + [data-anim-paused].
   MARKER: MAP_FX_V1
   ═══════════════════════════════════════════ */

import { useState, useEffect, useMemo } from "react";
import { fetchWeather } from "../../lib/weather";
import { srand } from "./sceneMath";

const RAIN_CODES = new Set([51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

/* Poll the cached weather for the user's city. fetchWeather caches per
   city for 1h, so this is one network hit per hour at most. */
// eslint-disable-next-line react-refresh/only-export-components -- shared hook + FX components live together intentionally
export function useWeatherNow(city) {
  const [wx, setWx] = useState(null);
  useEffect(() => {
    let dead = false;
    if (!city) { setWx(null); return undefined; }
    function pull() {
      fetchWeather(city).then(function(r) {
        if (!dead) setWx(r && r.ok ? r : null);
      }).catch(function() { if (!dead) setWx(null); });
    }
    pull();
    const id = setInterval(pull, 30 * 60 * 1000);
    return function() { dead = true; clearInterval(id); };
  }, [city]);
  return useMemo(() => {
    if (!wx) return { raining: false, snowing: false };
    return { raining: RAIN_CODES.has(wx.code), snowing: SNOW_CODES.has(wx.code) };
  }, [wx]);
}

/* ── Rain / snow particle overlay ── */
function Precip({ snow }) {
  const drops = useMemo(() => {
    const n = snow ? 14 : 18;
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({
        i,
        left: (srand(i * 17 + (snow ? 3 : 7)) * 98 + 1).toFixed(1),
        dur: (snow ? 3.2 : 0.9) + srand(i * 31 + 5) * (snow ? 2.4 : 0.7),
        delay: -srand(i * 13 + 9) * 4,
      });
    }
    return out;
  }, [snow]);
  return (
    <div className="grove-rainfx" data-map-fx={snow ? "snow" : "rain"} style={{
      position: "absolute", inset: 0, overflow: "hidden",
      pointerEvents: "none", zIndex: 21,
      background: snow ? "rgba(200,215,230,.10)" : "rgba(80,110,145,.10)",
    }}>
      {drops.map(d => (
        <span key={d.i}
          className={snow ? "grove-snow-flake" : "grove-rain-drop"}
          style={{
            left: d.left + "%",
            animationDuration: d.dur.toFixed(2) + "s",
            animationDelay: d.delay.toFixed(2) + "s",
          }}/>
      ))}
    </div>
  );
}

/* ── Sun-direction glow (brief §6: balcony sun-direction overlay) ──
   morning  → warm glow from the left edge
   afternoon → warm glow from the right edge
   allday   → soft glow across the top */
const SUN_GRADS = {
  morning: "linear-gradient(90deg, rgba(255,206,110,.20), rgba(255,206,110,.07) 34%, transparent 55%)",
  afternoon: "linear-gradient(270deg, rgba(255,186,95,.20), rgba(255,186,95,.07) 34%, transparent 55%)",
  allday: "linear-gradient(180deg, rgba(255,214,120,.16), rgba(255,214,120,.05) 30%, transparent 50%)",
};
const SUN_LABELS = { morning: "Morning sun", afternoon: "Afternoon sun", allday: "Sun all day" };

function SunGlow({ sunDirection }) {
  const grad = SUN_GRADS[sunDirection];
  if (!grad) return null;
  const badgeSide = sunDirection === "afternoon"
    ? { right: 8, left: "auto" }
    : { left: 8, right: "auto" };
  return (
    <div data-map-fx="sun" style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5,
      background: grad,
    }}>
      <span style={{
        position: "absolute", bottom: 8, ...badgeSide,
        background: "rgba(255,255,255,.82)", backdropFilter: "blur(4px)",
        borderRadius: 99, padding: "2px 8px",
        font: "700 9px Inter, sans-serif", color: "#7a5a1e",
        boxShadow: "0 1px 4px rgba(20,36,24,.18)",
      }}>☀️ {SUN_LABELS[sunDirection]}</span>
    </div>
  );
}

/* ── One drop-in component for both map engines ──
   Renders the sun-direction glow plus rain/snow when the
   cached forecast says so. Hidden entirely in edit mode by
   the callers (brief §7: effects must not hinder editing). */
export default function MapWeatherFX({ data }) {
  const city = data ? data.city : null;
  const sunDirection = data && data.profile ? data.profile.sunDirection : null;
  const { raining, snowing } = useWeatherNow(city);
  return (
    <>
      <SunGlow sunDirection={sunDirection}/>
      {(raining || snowing) && <Precip snow={snowing}/>}
    </>
  );
}
