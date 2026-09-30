import React, { useState } from "react";
import { describeWeatherCode } from "../../lib/weather";
import { todayLocalKey } from "../../lib/utils";
import { searchCity } from "../../data/cities";

/* ═══════════════════════════════════════════
   WEATHER WEEK — Home card: next 7 days + what the weather means for this
   farm (lib/weather-alerts.js). Never silently missing: with no town it asks
   for one; when the forecast can't be fetched it says so.
   ═══════════════════════════════════════════ */

function TownPicker({ data, setData, label }) {
  const [q, setQ] = useState("");
  const hits = q.trim().length >= 2 ? searchCity(q).slice(0, 5) : [];
  function pick(city) {
    const c = String(city || "").trim();
    if (c.length < 2) return;
    setData({ ...data, city: c });
    setQ("");
  }
  return (
    <div className="mt-wx-town">
      <label htmlFor="wx-town">{label}</label>
      <div className="mt-wx-town-row">
        <input id="wx-town" type="text" value={q} placeholder="Your nearest town, e.g. Bristol" autoComplete="address-level2"
          onChange={function (e) { setQ(e.target.value); }}
          onKeyDown={function (e) { if (e.key === "Enter") pick(hits[0] ? `${hits[0].city}, ${hits[0].country}` : q); }} />
        <button type="button" className="q-button" disabled={q.trim().length < 2} onClick={function () { pick(hits[0] ? `${hits[0].city}, ${hits[0].country}` : q); }}>Save</button>
      </div>
      {hits.length > 0 && (
        <div className="mt-wx-town-hits">
          {hits.map(function (c) {
            const v = `${c.city}, ${c.country}`;
            return <button key={v} type="button" className="mt-plan-chip" onClick={function () { pick(v); }}>{v}</button>;
          })}
        </div>
      )}
    </div>
  );
}

export default function WeatherWeek({ data, setData, forecast, forecastState, alerts, onOpenTasks }) {
  const [changing, setChanging] = useState(false);
  const today = todayLocalKey();

  if (!data.city || changing) {
    return (
      <section className="mt-wx" aria-label="Weather warnings">
        <div className="q-row q-between"><h2>Frost and storm warnings</h2>{changing && <button type="button" className="q-text-button" onClick={function () { setChanging(false); }}>Cancel</button>}</div>
        <p className="mt-wx-calm">Add your town and MyTerra checks the 7-day forecast against what you grow: frost, heat, gales, heavy rain and blight weather, and moves jobs to suit.</p>
        <TownPicker data={data} setData={function (d) { setData(d); setChanging(false); }} label={changing ? "New town" : "Your town"} />
      </section>
    );
  }

  const days = (forecast?.days || []).filter(function (d) { return d.date >= today; }).slice(0, 7);
  if (!days.length) {
    const failed = forecastState && forecastState.ok === false;
    return (
      <section className="mt-wx" aria-label="Weather this week">
        <div className="q-row q-between"><h2>Next 7 days</h2><button type="button" className="q-text-button" onClick={function () { setChanging(true); }}>Change town</button></div>
        <p className="mt-wx-calm">
          {!failed ? "Getting the forecast…"
            : forecastState.error === "geocode_failed" ? `Couldn't find “${data.city}” on the map. Try the nearest bigger town.`
            : "The forecast isn't reachable right now (offline?). Weather warnings come back when it is."}
        </p>
      </section>
    );
  }

  const alertDays = new Set((alerts || []).map(function (a) { return a.date; }));
  const round = function (n) { return n == null ? "–" : Math.round(n); };
  return (
    <section className="mt-wx" aria-label="Weather this week">
      <div className="q-row q-between"><h2>Next 7 days</h2><button type="button" className="q-eyebrow mt-wx-place" onClick={function () { setChanging(true); }} title="Change town">{forecast.location || data.city}</button></div>
      {(alerts || []).length > 0
        ? <ul className="mt-wx-alerts">{alerts.map(function (a) {
            return <li key={a.kind + a.date}><button type="button" className={`mt-wx-alert ${a.severity || "warn"}`} onClick={onOpenTasks}><span aria-hidden="true">{a.emoji}</span><span>{a.short || a.title}</span></button></li>;
          })}</ul>
        : <p className="mt-wx-calm">No frost, storms or heat ahead for what you grow.</p>}
      <div className="mt-wx-days" role="list">{days.map(function (d) {
        const w = describeWeatherCode(d.code);
        return (
          <div role="listitem" key={d.date} className={`mt-wx-day${alertDays.has(d.date) ? " flag" : ""}`} title={w.desc}>
            <small>{d.date === today ? "Today" : new Date(d.date + "T12:00").toLocaleDateString(undefined, { weekday: "short" })}</small>
            <span aria-hidden="true">{w.emoji}</span>
            <b>{round(d.tMax)}°</b><small>{round(d.tMin)}°</small>
          </div>
        );
      })}</div>
    </section>
  );
}
