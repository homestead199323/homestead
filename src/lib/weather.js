/* ═══════════════════════════════════════════
   WEATHER — Open-Meteo current conditions for the daily hero block

   Two endpoints, both free and key-less:
     - geocoding-api.open-meteo.com  → city name → lat/lng (cached forever per city)
     - api.open-meteo.com            → lat/lng → current weather + hourly precipitation
                                       (cached for 1 hour per city)

   Public surface: fetchWeather(cityName). Returns:
     { ok: true,  temp, code, desc, emoji, hint, location, country, fetchedAt }
     { ok: false, error: "no_city" | "geocode_failed" | "api_error" | "exception" }

   The hint string is the gardening-actionable inference for the daily walk
   ("good for transplanting", "watch for frost", etc).
   ═══════════════════════════════════════════ */

import { loadWeatherCache, saveWeatherCache, loadGeoCache, saveGeoCache, loadForecastCache, saveForecastCache } from "./storage";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const WEATHER_TTL_MS = 60 * 60 * 1000; // 1 hour

// WMO weather interpretation codes → emoji + short description
// Source: https://open-meteo.com/en/docs (Weather variable documentation)
const WEATHER_CODES = {
  0:  { emoji: "☀️", desc: "clear" },
  1:  { emoji: "🌤", desc: "mainly clear" },
  2:  { emoji: "⛅️", desc: "partly cloudy" },
  3:  { emoji: "☁️", desc: "cloudy" },
  45: { emoji: "🌫", desc: "foggy" },
  48: { emoji: "🌫", desc: "freezing fog" },
  51: { emoji: "🌦", desc: "light drizzle" },
  53: { emoji: "🌦", desc: "drizzle" },
  55: { emoji: "🌧", desc: "dense drizzle" },
  61: { emoji: "🌦", desc: "light rain" },
  63: { emoji: "🌧", desc: "rain" },
  65: { emoji: "🌧", desc: "heavy rain" },
  71: { emoji: "🌨", desc: "light snow" },
  73: { emoji: "🌨", desc: "snow" },
  75: { emoji: "❄️", desc: "heavy snow" },
  77: { emoji: "🌨", desc: "snow grains" },
  80: { emoji: "🌦", desc: "rain showers" },
  81: { emoji: "🌧", desc: "rain showers" },
  82: { emoji: "⛈", desc: "heavy rain showers" },
  85: { emoji: "🌨", desc: "snow showers" },
  86: { emoji: "🌨", desc: "heavy snow showers" },
  95: { emoji: "⛈", desc: "thunderstorm" },
  96: { emoji: "⛈", desc: "thunderstorm with hail" },
  99: { emoji: "⛈", desc: "thunderstorm with hail" },
};

export function describeWeatherCode(code) {
  return WEATHER_CODES[code] || { emoji: "🌡", desc: "weather" };
}

/* ─── Hint builder — gardening-actionable inference from temp + code ─── */
function buildHint(temp, code, hourlyPrecipProb) {
  const maxPrecip = Array.isArray(hourlyPrecipProb) && hourlyPrecipProb.length > 0
    ? Math.max(...hourlyPrecipProb.filter(v => typeof v === "number"))
    : 0;
  const isRainCode = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code);
  const isThunderCode = [95, 96, 99].includes(code);
  const isSnowCode = [71, 73, 75, 77, 85, 86].includes(code);
  const isFogCode = [45, 48].includes(code);
  const isCloudyCode = [3].includes(code);
  const isPartlyCloudyCode = [1, 2].includes(code);
  const isClearCode = code === 0;

  if (temp <= 1) return "watch for frost — protect tender plants";
  if (isThunderCode) return "storms today — stay indoors, check shelter";
  if (isSnowCode) return "snow — cover tender beds";
  if (temp >= 30) return "very hot — water early, shade what you can";
  if (temp >= 26) return "hot — water early, mulch helps";
  if (isRainCode || maxPrecip >= 70) return "rain coming — skip watering";
  if (isFogCode) return "foggy — fine for transplanting once it lifts";
  if (isCloudyCode && temp >= 8) return "cool and cloudy — good for transplanting";
  if (isCloudyCode) return "overcast — good for indoor seed-starting";
  if (isPartlyCloudyCode && temp >= 18) return "mild — great for outdoor work";
  if (isPartlyCloudyCode) return "fine for routine care";
  if (isClearCode && temp >= 22) return "bright and warm — water early";
  if (isClearCode && temp >= 12) return "clear — good for any task";
  if (isClearCode) return "clear and cool — bundle up";
  return "good day for a walk through the farm";
}

/* ─── Geocode (cached forever per city) ───
   Cities are saved as "London, UK" (Farm → city search) or free text from
   onboarding. Open-Meteo's search matches place names only, and "London, UK"
   returns nothing — so search the name part and use the country part to pick
   the right town (UK/England/… map to GB). Only successful lookups are cached. */
const COUNTRY_ALIASES = {
  uk: "GB", "united kingdom": "GB", england: "GB", scotland: "GB", wales: "GB", "northern ireland": "GB",
  usa: "US", us: "US", "united states": "US", america: "US", canada: "CA",
  albania: "AL", greece: "GR", italy: "IT", spain: "ES", portugal: "PT", croatia: "HR", turkey: "TR", "türkiye": "TR",
  france: "FR", ireland: "IE", netherlands: "NL", "the netherlands": "NL", belgium: "BE", luxembourg: "LU", germany: "DE",
  denmark: "DK", sweden: "SE", norway: "NO", finland: "FI", estonia: "EE", latvia: "LV", lithuania: "LT", poland: "PL",
  czechia: "CZ", "czech republic": "CZ", austria: "AT", switzerland: "CH", hungary: "HU", slovakia: "SK",
};
// City-list entries that are counties/provinces, or named differently in the place search.
const PLACE_ALIASES = {
  cornwall: "Truro", devon: "Exeter", kent: "Maidstone", surrey: "Guildford", "washington dc": "Washington",
  "quebec city": "Québec", "british columbia": "Vancouver", "new brunswick": "Fredericton",
  "newfoundland and labrador": "St. John's", nunavut: "Iqaluit",
  patras: "Pátra", arizona: "Phoenix", alberta: "Calgary", ontario: "Toronto", yukon: "Whitehorse",
};

export function pickPlace(results, countryHint) {
  const list = Array.isArray(results) ? results.filter((r) => r && typeof r.latitude === "number" && typeof r.longitude === "number") : [];
  if (!list.length) return null;
  const hint = String(countryHint || "").trim().toLowerCase();
  if (!hint) return list[0];
  const code = COUNTRY_ALIASES[hint] || (hint.length === 2 ? hint.toUpperCase() : "");
  // A named country that matches nothing → no guess (weather from the wrong continent is worse than none).
  return list.find((r) => (code && r.country_code === code) || String(r.country || "").toLowerCase() === hint || String(r.admin1 || "").toLowerCase() === hint) || null;
}

async function searchPlace(name, count) {
  const url = `${GEO_URL}?name=${encodeURIComponent(name)}&count=${count}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return (json && Array.isArray(json.results)) ? json.results : [];
}

async function geocode(cityName) {
  const key = cityName.trim().toLowerCase();
  if (!key) return null;
  const cache = loadGeoCache();
  if (cache[key]) return cache[key];

  const parts = cityName.split(",").map((x) => x.trim()).filter(Boolean);
  const country = parts.length > 1 ? parts[parts.length - 1] : "";
  const place = PLACE_ALIASES[(parts[0] || "").toLowerCase()] || parts[0] || cityName.trim();
  // Name part first, checked against the country; the full text only when no country is given.
  let hit = pickPlace(await searchPlace(place, 10), country);
  if (!hit && !country) hit = pickPlace(await searchPlace(cityName.trim(), 1), "");
  if (!hit) return null;
  const entry = {
    lat: hit.latitude,
    lng: hit.longitude,
    name: hit.name || cityName,
    country: hit.country || "",
  };
  cache[key] = entry;
  saveGeoCache(cache);
  return entry;
}

/* ─── Cache read/write for weather ─── */
function readFreshCache(cityName) {
  const cache = loadWeatherCache();
  const entry = cache[cityName.trim().toLowerCase()];
  if (!entry) return null;
  if (Date.now() - (entry.fetchedAt || 0) > WEATHER_TTL_MS) return null;
  return entry;
}

function writeCache(cityName, entry) {
  const cache = loadWeatherCache();
  cache[cityName.trim().toLowerCase()] = entry;
  saveWeatherCache(cache);
}

/* ─── Public: fetch current weather for a city ─── */
export async function fetchWeather(cityName) {
  if (!cityName || !cityName.trim()) return { ok: false, error: "no_city" };
  const fresh = readFreshCache(cityName);
  if (fresh) return fresh;

  try {
    const geo = await geocode(cityName);
    if (!geo) return { ok: false, error: "geocode_failed" };

    const url = `${FORECAST_URL}?latitude=${geo.lat}&longitude=${geo.lng}`
      + `&current_weather=true&hourly=precipitation_probability&forecast_days=1&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return { ok: false, error: "api_error" };
    const json = await res.json();
    const cw = (json && json.current_weather) || null;
    if (!cw || typeof cw.temperature !== "number") return { ok: false, error: "api_error" };

    const codeInfo = describeWeatherCode(cw.weathercode);
    const hourlyPrecip = (json.hourly && json.hourly.precipitation_probability) || [];
    const result = {
      ok: true,
      temp: Math.round(cw.temperature),
      code: cw.weathercode,
      desc: codeInfo.desc,
      emoji: codeInfo.emoji,
      hint: buildHint(cw.temperature, cw.weathercode, hourlyPrecip),
      location: geo.name,
      country: geo.country,
      fetchedAt: Date.now(),
    };
    writeCache(cityName, result);
    return result;
  } catch (e) {
    return { ok: false, error: "exception", message: String(e && e.message || e) };
  }
}

/* ─── 7-day forecast (weather alerts that know the plan) ───
   One call: daily min/max, rain, rain chance, gusts, weather code, plus
   hourly humidity + temperature for the blight check (Hutton criteria).
   Cached 3 h per city. Pure parsing lives in parseForecast (tested). */
const FORECAST_TTL_MS = 3 * 60 * 60 * 1000;
const DAILY_VARS = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max";

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Open-Meteo JSON → { days: [{ date, tMin, tMax, rainMm, rainProb, gustKmh, code, humidHours }] } */
export function parseForecast(json) {
  const d = json && json.daily;
  if (!d || !Array.isArray(d.time) || d.time.length === 0) return null;
  // Hours per local day with relative humidity ≥ 90 % (hourly times are local: timezone=auto).
  const humid = {};
  const h = json.hourly || {};
  if (Array.isArray(h.time) && Array.isArray(h.relative_humidity_2m)) {
    h.time.forEach((t, i) => {
      const day = String(t).slice(0, 10);
      if (num(h.relative_humidity_2m[i]) != null && h.relative_humidity_2m[i] >= 90) humid[day] = (humid[day] || 0) + 1;
    });
  }
  const days = d.time.map((date, i) => ({
    date,
    tMin: num(d.temperature_2m_min?.[i]),
    tMax: num(d.temperature_2m_max?.[i]),
    rainMm: num(d.precipitation_sum?.[i]) ?? 0,
    rainProb: num(d.precipitation_probability_max?.[i]),
    gustKmh: num(d.wind_gusts_10m_max?.[i]),
    code: num(d.weather_code?.[i]),
    humidHours: humid[date] || 0,
  }));
  return { days };
}

export async function fetchForecast(cityName) {
  if (!cityName || !cityName.trim()) return { ok: false, error: "no_city" };
  const key = cityName.trim().toLowerCase();
  const cache = loadForecastCache();
  const hit = cache[key];
  if (hit && hit.ok && Date.now() - (hit.fetchedAt || 0) < FORECAST_TTL_MS) return hit;
  try {
    const geo = await geocode(cityName);
    if (!geo) return { ok: false, error: "geocode_failed" };
    const url = `${FORECAST_URL}?latitude=${geo.lat}&longitude=${geo.lng}`
      + `&daily=${DAILY_VARS}&hourly=relative_humidity_2m&forecast_days=7&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) return hit && hit.ok ? hit : { ok: false, error: "api_error" };
    const parsed = parseForecast(await res.json());
    if (!parsed) return hit && hit.ok ? hit : { ok: false, error: "api_error" };
    const result = { ok: true, ...parsed, location: geo.name, fetchedAt: Date.now() };
    saveForecastCache({ [key]: result }); // one city at a time — keeps storage small
    return result;
  } catch (e) {
    // Offline: an older forecast is still better than nothing.
    if (hit && hit.ok) return hit;
    return { ok: false, error: "exception", message: String(e && e.message || e) };
  }
}
