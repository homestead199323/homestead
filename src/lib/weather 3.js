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

import { loadWeatherCache, saveWeatherCache, loadGeoCache, saveGeoCache } from "./storage";

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

/* ─── Geocode (cached forever per city) ─── */
async function geocode(cityName) {
  const key = cityName.trim().toLowerCase();
  if (!key) return null;
  const cache = loadGeoCache();
  if (cache[key]) return cache[key];

  const url = `${GEO_URL}?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const hit = (json && Array.isArray(json.results) ? json.results[0] : null);
  if (!hit || typeof hit.latitude !== "number" || typeof hit.longitude !== "number") return null;
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
