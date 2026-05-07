import React, { useState, useEffect, useCallback, useMemo, useRef, useReducer } from "react";
import { createPortal } from "react-dom";
import {
  Home, ClipboardList, Map as MapIcon, Sprout, Rabbit, CalendarDays, Package,
  TrendingUp, BookOpen, MessageSquare, MoreHorizontal, PawPrint,
  Settings, ChevronLeft, ChevronRight, X, Send, Search, Plus,
  Check, AlertTriangle, Info, Download, Upload, Leaf, Moon, Sun
} from "lucide-react";

import { DB, uid } from "./lib/storage";
import { C, F, SX } from "./lib/theme";
import { ZT, ZT_MAP } from "./data/zones";
import { COMP } from "./data/companions";
import { BREEDS } from "./data/breeds";
import { VARIETIES, VAR_RO } from "./data/varieties";
import { CROPS, CROP_MAP, CROP_COLORS } from "./data/crops";
import { REGIONS, REGION_MAP } from "./data/regions";
import { RO, LDB_RO } from "./data/regional-overrides";
// Append an entry to the activity log, capped at 200 entries to prevent localStorage overflow.
const appendLog = (logArr, entry) => [...(logArr || []), entry].slice(-200);

// Local-time YYYY-MM-DD key. Replaces .toISOString().slice(0,10) which is UTC
// and can be off by one day in non-UTC timezones (e.g. Albania UTC+1/+2).
const toLocalDateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// Append a task key to today's completions list (no-op if already present).
// Returns a new data object — does NOT mutate.
const markTaskDone = (data, taskKey) => {
  if (!taskKey) return data;
  const todayKey = toLocalDateKey(new Date());
  const existing = (data.completions && data.completions[todayKey]) || [];
  if (existing.includes(taskKey)) return data;
  return {
    ...data,
    completions: {
      ...(data.completions || {}),
      [todayKey]: [...existing, taskKey],
    },
  };
};


/* ═══════════════════════════════════════════
   CITY DATABASE — maps cities to climate regions
   ═══════════════════════════════════════════ */
const CITY_DB = [
  // Mediterranean
  {city:"Tirana",country:"Albania",region:"mediterranean"},{city:"Durres",country:"Albania",region:"mediterranean"},{city:"Vlore",country:"Albania",region:"mediterranean"},{city:"Sarande",country:"Albania",region:"mediterranean"},{city:"Berat",country:"Albania",region:"mediterranean"},{city:"Korce",country:"Albania",region:"mediterranean"},{city:"Shkoder",country:"Albania",region:"mediterranean"},{city:"Elbasan",country:"Albania",region:"mediterranean"},
  {city:"Athens",country:"Greece",region:"mediterranean"},{city:"Thessaloniki",country:"Greece",region:"mediterranean"},{city:"Crete",country:"Greece",region:"mediterranean"},{city:"Patras",country:"Greece",region:"mediterranean"},
  {city:"Rome",country:"Italy",region:"mediterranean"},{city:"Naples",country:"Italy",region:"mediterranean"},{city:"Palermo",country:"Italy",region:"mediterranean"},{city:"Florence",country:"Italy",region:"mediterranean"},{city:"Bari",country:"Italy",region:"mediterranean"},{city:"Catania",country:"Italy",region:"mediterranean"},
  {city:"Barcelona",country:"Spain",region:"mediterranean"},{city:"Valencia",country:"Spain",region:"mediterranean"},{city:"Malaga",country:"Spain",region:"mediterranean"},{city:"Seville",country:"Spain",region:"mediterranean"},{city:"Madrid",country:"Spain",region:"mediterranean"},{city:"Alicante",country:"Spain",region:"mediterranean"},
  {city:"Lisbon",country:"Portugal",region:"mediterranean"},{city:"Porto",country:"Portugal",region:"mediterranean"},{city:"Faro",country:"Portugal",region:"mediterranean"},
  {city:"Dubrovnik",country:"Croatia",region:"mediterranean"},{city:"Split",country:"Croatia",region:"mediterranean"},{city:"Antalya",country:"Turkey",region:"mediterranean"},{city:"Izmir",country:"Turkey",region:"mediterranean"},{city:"Marseille",country:"France",region:"mediterranean"},{city:"Nice",country:"France",region:"mediterranean"},{city:"Montpellier",country:"France",region:"mediterranean"},
  // Western Europe
  {city:"London",country:"UK",region:"western_europe"},{city:"Manchester",country:"UK",region:"western_europe"},{city:"Birmingham",country:"UK",region:"western_europe"},{city:"Edinburgh",country:"UK",region:"western_europe"},{city:"Bristol",country:"UK",region:"western_europe"},{city:"Cardiff",country:"UK",region:"western_europe"},{city:"Leeds",country:"UK",region:"western_europe"},{city:"Liverpool",country:"UK",region:"western_europe"},{city:"Glasgow",country:"UK",region:"western_europe"},{city:"Belfast",country:"UK",region:"western_europe"},{city:"Cornwall",country:"UK",region:"western_europe"},{city:"Devon",country:"UK",region:"western_europe"},{city:"Kent",country:"UK",region:"western_europe"},{city:"Surrey",country:"UK",region:"western_europe"},
  {city:"Dublin",country:"Ireland",region:"western_europe"},{city:"Cork",country:"Ireland",region:"western_europe"},{city:"Galway",country:"Ireland",region:"western_europe"},
  {city:"Amsterdam",country:"Netherlands",region:"western_europe"},{city:"Rotterdam",country:"Netherlands",region:"western_europe"},{city:"Utrecht",country:"Netherlands",region:"western_europe"},{city:"The Hague",country:"Netherlands",region:"western_europe"},{city:"Eindhoven",country:"Netherlands",region:"western_europe"},{city:"Groningen",country:"Netherlands",region:"western_europe"},
  {city:"Brussels",country:"Belgium",region:"western_europe"},{city:"Antwerp",country:"Belgium",region:"western_europe"},{city:"Ghent",country:"Belgium",region:"western_europe"},{city:"Bruges",country:"Belgium",region:"western_europe"},
  {city:"Paris",country:"France",region:"western_europe"},{city:"Lyon",country:"France",region:"western_europe"},{city:"Bordeaux",country:"France",region:"western_europe"},{city:"Nantes",country:"France",region:"western_europe"},{city:"Rennes",country:"France",region:"western_europe"},{city:"Lille",country:"France",region:"western_europe"},
  {city:"Luxembourg",country:"Luxembourg",region:"western_europe"},
  // Northern Europe
  {city:"Berlin",country:"Germany",region:"northern_europe"},{city:"Munich",country:"Germany",region:"northern_europe"},{city:"Hamburg",country:"Germany",region:"northern_europe"},{city:"Frankfurt",country:"Germany",region:"northern_europe"},{city:"Cologne",country:"Germany",region:"northern_europe"},{city:"Stuttgart",country:"Germany",region:"northern_europe"},{city:"Dresden",country:"Germany",region:"northern_europe"},{city:"Leipzig",country:"Germany",region:"northern_europe"},{city:"Dusseldorf",country:"Germany",region:"northern_europe"},{city:"Hannover",country:"Germany",region:"northern_europe"},
  {city:"Copenhagen",country:"Denmark",region:"northern_europe"},{city:"Aarhus",country:"Denmark",region:"northern_europe"},
  {city:"Stockholm",country:"Sweden",region:"northern_europe"},{city:"Gothenburg",country:"Sweden",region:"northern_europe"},{city:"Malmo",country:"Sweden",region:"northern_europe"},
  {city:"Oslo",country:"Norway",region:"northern_europe"},{city:"Bergen",country:"Norway",region:"northern_europe"},
  {city:"Helsinki",country:"Finland",region:"northern_europe"},
  {city:"Tallinn",country:"Estonia",region:"northern_europe"},{city:"Riga",country:"Latvia",region:"northern_europe"},{city:"Vilnius",country:"Lithuania",region:"northern_europe"},{city:"Kaunas",country:"Lithuania",region:"northern_europe"},
  {city:"Warsaw",country:"Poland",region:"northern_europe"},{city:"Krakow",country:"Poland",region:"northern_europe"},{city:"Gdansk",country:"Poland",region:"northern_europe"},{city:"Wroclaw",country:"Poland",region:"northern_europe"},{city:"Poznan",country:"Poland",region:"northern_europe"},
  {city:"Prague",country:"Czechia",region:"northern_europe"},{city:"Brno",country:"Czechia",region:"northern_europe"},
  {city:"Vienna",country:"Austria",region:"northern_europe"},{city:"Zurich",country:"Switzerland",region:"northern_europe"},{city:"Bern",country:"Switzerland",region:"northern_europe"},{city:"Geneva",country:"Switzerland",region:"northern_europe"},
  {city:"Budapest",country:"Hungary",region:"northern_europe"},{city:"Bratislava",country:"Slovakia",region:"northern_europe"},
  // US/Canada Warm
  {city:"Los Angeles",country:"US",region:"us_warm"},{city:"San Francisco",country:"US",region:"us_warm"},{city:"San Diego",country:"US",region:"us_warm"},{city:"Sacramento",country:"US",region:"us_warm"},{city:"Portland",country:"US",region:"us_warm"},{city:"Seattle",country:"US",region:"us_warm"},
  {city:"Houston",country:"US",region:"us_warm"},{city:"Dallas",country:"US",region:"us_warm"},{city:"Austin",country:"US",region:"us_warm"},{city:"San Antonio",country:"US",region:"us_warm"},
  {city:"Miami",country:"US",region:"us_warm"},{city:"Tampa",country:"US",region:"us_warm"},{city:"Orlando",country:"US",region:"us_warm"},{city:"Jacksonville",country:"US",region:"us_warm"},
  {city:"Atlanta",country:"US",region:"us_warm"},{city:"Nashville",country:"US",region:"us_warm"},{city:"Charlotte",country:"US",region:"us_warm"},{city:"Raleigh",country:"US",region:"us_warm"},
  {city:"Phoenix",country:"US",region:"us_warm"},{city:"Tucson",country:"US",region:"us_warm"},{city:"Las Vegas",country:"US",region:"us_warm"},{city:"Albuquerque",country:"US",region:"us_warm"},
  {city:"New Orleans",country:"US",region:"us_warm"},{city:"Memphis",country:"US",region:"us_warm"},{city:"Charleston",country:"US",region:"us_warm"},{city:"Savannah",country:"US",region:"us_warm"},
  {city:"Vancouver",country:"Canada",region:"us_warm"},{city:"Victoria",country:"Canada",region:"us_warm"},
  // US/Canada Cold
  {city:"New York",country:"US",region:"us_cold"},{city:"Boston",country:"US",region:"us_cold"},{city:"Philadelphia",country:"US",region:"us_cold"},{city:"Washington DC",country:"US",region:"us_cold"},{city:"Baltimore",country:"US",region:"us_cold"},{city:"Pittsburgh",country:"US",region:"us_cold"},
  {city:"Chicago",country:"US",region:"us_cold"},{city:"Detroit",country:"US",region:"us_cold"},{city:"Milwaukee",country:"US",region:"us_cold"},{city:"Minneapolis",country:"US",region:"us_cold"},{city:"Indianapolis",country:"US",region:"us_cold"},{city:"Columbus",country:"US",region:"us_cold"},{city:"Cleveland",country:"US",region:"us_cold"},{city:"St Louis",country:"US",region:"us_cold"},{city:"Kansas City",country:"US",region:"us_cold"},
  {city:"Denver",country:"US",region:"us_cold"},{city:"Salt Lake City",country:"US",region:"us_cold"},{city:"Boise",country:"US",region:"us_cold"},
  {city:"Toronto",country:"Canada",region:"us_cold"},{city:"Montreal",country:"Canada",region:"us_cold"},{city:"Ottawa",country:"Canada",region:"us_cold"},{city:"Calgary",country:"Canada",region:"us_cold"},{city:"Edmonton",country:"Canada",region:"us_cold"},{city:"Winnipeg",country:"Canada",region:"us_cold"},{city:"Halifax",country:"Canada",region:"us_cold"},{city:"Quebec City",country:"Canada",region:"us_cold"},

  // ── US states / Canadian provinces (state-level region detection) ──
  // us_warm states (USDA 7-10)
  {city:"Alabama",country:"US",region:"us_warm",abbr:"AL"},
  {city:"Arizona",country:"US",region:"us_warm",abbr:"AZ"},
  {city:"Arkansas",country:"US",region:"us_warm",abbr:"AR"},
  {city:"California",country:"US",region:"us_warm",abbr:"CA"},
  {city:"Delaware",country:"US",region:"us_warm",abbr:"DE"},
  {city:"Florida",country:"US",region:"us_warm",abbr:"FL"},
  {city:"Georgia",country:"US",region:"us_warm",abbr:"GA"},
  {city:"Hawaii",country:"US",region:"us_warm",abbr:"HI"},
  {city:"Kentucky",country:"US",region:"us_warm",abbr:"KY"},
  {city:"Louisiana",country:"US",region:"us_warm",abbr:"LA"},
  {city:"Maryland",country:"US",region:"us_warm",abbr:"MD"},
  {city:"Mississippi",country:"US",region:"us_warm",abbr:"MS"},
  {city:"Nevada",country:"US",region:"us_warm",abbr:"NV"},
  {city:"New Mexico",country:"US",region:"us_warm",abbr:"NM"},
  {city:"North Carolina",country:"US",region:"us_warm",abbr:"NC"},
  {city:"Oklahoma",country:"US",region:"us_warm",abbr:"OK"},
  {city:"Oregon",country:"US",region:"us_warm",abbr:"OR"},
  {city:"South Carolina",country:"US",region:"us_warm",abbr:"SC"},
  {city:"Tennessee",country:"US",region:"us_warm",abbr:"TN"},
  {city:"Texas",country:"US",region:"us_warm",abbr:"TX"},
  {city:"Virginia",country:"US",region:"us_warm",abbr:"VA"},
  {city:"Washington",country:"US",region:"us_warm",abbr:"WA"},
  {city:"Washington DC",country:"US",region:"us_warm",abbr:"DC"},
  // us_cold states (USDA 3-6)
  {city:"Alaska",country:"US",region:"us_cold",abbr:"AK"},
  {city:"Colorado",country:"US",region:"us_cold",abbr:"CO"},
  {city:"Connecticut",country:"US",region:"us_cold",abbr:"CT"},
  {city:"Idaho",country:"US",region:"us_cold",abbr:"ID"},
  {city:"Illinois",country:"US",region:"us_cold",abbr:"IL"},
  {city:"Indiana",country:"US",region:"us_cold",abbr:"IN"},
  {city:"Iowa",country:"US",region:"us_cold",abbr:"IA"},
  {city:"Kansas",country:"US",region:"us_cold",abbr:"KS"},
  {city:"Maine",country:"US",region:"us_cold",abbr:"ME"},
  {city:"Massachusetts",country:"US",region:"us_cold",abbr:"MA"},
  {city:"Michigan",country:"US",region:"us_cold",abbr:"MI"},
  {city:"Minnesota",country:"US",region:"us_cold",abbr:"MN"},
  {city:"Missouri",country:"US",region:"us_cold",abbr:"MO"},
  {city:"Montana",country:"US",region:"us_cold",abbr:"MT"},
  {city:"Nebraska",country:"US",region:"us_cold",abbr:"NE"},
  {city:"New Hampshire",country:"US",region:"us_cold",abbr:"NH"},
  {city:"New Jersey",country:"US",region:"us_cold",abbr:"NJ"},
  {city:"New York",country:"US",region:"us_cold",abbr:"NY"},
  {city:"North Dakota",country:"US",region:"us_cold",abbr:"ND"},
  {city:"Ohio",country:"US",region:"us_cold",abbr:"OH"},
  {city:"Pennsylvania",country:"US",region:"us_cold",abbr:"PA"},
  {city:"Rhode Island",country:"US",region:"us_cold",abbr:"RI"},
  {city:"South Dakota",country:"US",region:"us_cold",abbr:"SD"},
  {city:"Utah",country:"US",region:"us_cold",abbr:"UT"},
  {city:"Vermont",country:"US",region:"us_cold",abbr:"VT"},
  {city:"West Virginia",country:"US",region:"us_cold",abbr:"WV"},
  {city:"Wisconsin",country:"US",region:"us_cold",abbr:"WI"},
  {city:"Wyoming",country:"US",region:"us_cold",abbr:"WY"},
  // Canadian provinces - us_warm (coastal BC)
  {city:"British Columbia",country:"Canada",region:"us_warm",abbr:"BC"},
  // Canadian provinces - us_cold
  {city:"Alberta",country:"Canada",region:"us_cold",abbr:"AB"},
  {city:"Saskatchewan",country:"Canada",region:"us_cold",abbr:"SK"},
  {city:"Manitoba",country:"Canada",region:"us_cold",abbr:"MB"},
  {city:"Ontario",country:"Canada",region:"us_cold",abbr:"ON"},
  {city:"Quebec",country:"Canada",region:"us_cold",abbr:"QC"},
  {city:"New Brunswick",country:"Canada",region:"us_cold",abbr:"NB"},
  {city:"Nova Scotia",country:"Canada",region:"us_cold",abbr:"NS"},
  {city:"Prince Edward Island",country:"Canada",region:"us_cold",abbr:"PE"},
  {city:"Newfoundland and Labrador",country:"Canada",region:"us_cold",abbr:"NL"},
  {city:"Yukon",country:"Canada",region:"us_cold",abbr:"YT"},
  {city:"Northwest Territories",country:"Canada",region:"us_cold",abbr:"NT"},
  {city:"Nunavut",country:"Canada",region:"us_cold",abbr:"NU"},
];

function searchCity(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  const exact = [];
  const starts = [];
  const contains = [];
  for (let i = 0; i < CITY_DB.length; i++) {
    const c = CITY_DB[i];
    const cn = c.city.toLowerCase();
    const co = c.country.toLowerCase();
    const ab = c.abbr ? c.abbr.toLowerCase() : "";
    if (cn === q || co === q || ab === q) exact.push(c);
    else if (cn.startsWith(q) || co.startsWith(q) || (ab && ab.startsWith(q))) starts.push(c);
    else if (cn.includes(q) || co.includes(q)) contains.push(c);
  }
  return exact.concat(starts, contains).slice(0, 8);
}

/* ═══════════════════════════════════════════
   REGION-AWARE CROP FUNCTIONS
   ═══════════════════════════════════════════ */
function getRegionalCrop(baseCrop, region) {
  if (!region || region === "western_europe") return baseCrop;
  const regionOverrides = RO[region];
  if (!regionOverrides) return baseCrop;
  const ov = regionOverrides[baseCrop.name];
  if (!ov) return baseCrop;
  if (ov._na) return null;
  const merged = {};
  const keys = Object.keys(baseCrop);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    merged[k] = ov[k] !== undefined ? ov[k] : baseCrop[k];
  }
  if (ov.regionNote) merged.regionNote = ov.regionNote;
  if (ov.pests) merged.pests = ov.pests;
  return merged;
}

function getRegionalCrops(region) {
  if (!region || region === "western_europe") return CROPS;
  const result = [];
  for (let i = 0; i < CROPS.length; i++) {
    const rc = getRegionalCrop(CROPS[i], region);
    if (rc) result.push(rc);
  }
  return result;
}

function getRegionalCropMap(region) {
  if (!region || region === "western_europe") return CROP_MAP;
  return new Map(getRegionalCrops(region).map(function(c) { return [c.name, c]; }));
}
// Cached region helpers — cheap way to avoid recomputing on every render
let _rCacheId = null, _rCacheMap = null, _rCacheCrops = null;
function rCM(region) {
  const r = region || "western_europe";
  if (r !== _rCacheId) { _rCacheId = r; _rCacheMap = getRegionalCropMap(r); _rCacheCrops = getRegionalCrops(r); }
  return _rCacheMap;
}
function rCR(region) {
  const r = region || "western_europe";
  if (r !== _rCacheId) { _rCacheId = r; _rCacheMap = getRegionalCropMap(r); _rCacheCrops = getRegionalCrops(r); }
  return _rCacheCrops;
}

/* ═══════════════════════════════════════════
   LIVESTOCK
   ═══════════════════════════════════════════ */
const LDB = {
  Chicken:{e:"🐔",prod:["Eggs","Meat"],feed:"120-150g/day feed. Scraps, greens, grit, calcium.",house:"0.4sqm/bird + 1-2sqm run. Nesting box/3-4 hens.",sleep:"Perches 60-120cm. Straw 10cm.",inj:[{n:"Bumblefoot",t:"Soak, drain, antiseptic, bandage."},{n:"Mites",t:"Diatomaceous earth. Clean coop."},{n:"Respiratory",t:"Isolate. Warm. Garlic water."}],breed:"Hen:rooster 8-12:1. 21d incubation.",out:{Eggs:{p:0.7,u:"eggs/day",s:"Unwashed 2-3wk. Water glass 12+mo."},Meat:{p:2,u:"kg/bird",s:"Freeze 6-12mo."}}},
  Goat:{e:"🐐",prod:["Milk","Meat"],feed:"Hay 2-4kg + grain 0.5-1kg dairy. Mineral block.",house:"2-3sqm. Strong fence 1.2m+.",sleep:"Raised platforms. Hate rain.",inj:[{n:"Bloat",t:"EMERGENCY. Massage left. Walk. Oil 60ml."},{n:"Hoof rot",t:"Trim. Zinc sulfate soak."}],breed:"21d cycle Sep-Feb. 150d gestation.",out:{Milk:{p:2.5,u:"L/day",s:"Feta in brine months."},Meat:{p:15,u:"kg",s:"Hang 3-5d. Freeze 6-12mo."}}},
  Sheep:{e:"🐑",prod:["Milk","Meat","Wool"],feed:"Pasture 2-4kg/day. Hay winter.",house:"1.5-2sqm. 1m fence.",sleep:"Flock on straw.",inj:[{n:"Foot rot",t:"Trim. Zinc footbath."},{n:"Fly strike",t:"URGENT. Clip, remove maggots."}],breed:"17d cycle autumn. 147d gestation.",out:{Milk:{p:1.5,u:"L/day",s:"Cheese months."},Meat:{p:20,u:"kg",s:"Hang 5-7d. Freeze."},Wool:{p:3,u:"kg/yr",s:"Clean, card, spin."}}},
  Cow:{e:"🐄",prod:["Milk","Meat"],feed:"Pasture 50-70kg or hay 10-15kg. Water 50-100L.",house:"6-8sqm. Shade in summer.",sleep:"Straw. 4hr sleep.",inj:[{n:"Bloat",t:"EMERGENCY. Trocar/tube."},{n:"Mastitis",t:"Strip. Hot compress."}],breed:"21d cycle. 283d gestation.",out:{Milk:{p:15,u:"L/day",s:"Butter, cheese, yogurt."},Meat:{p:200,u:"kg",s:"Hang 7-14d. Freeze."}}},
  Pig:{e:"🐖",prod:["Meat"],feed:"Grain, veg, scraps 2-4kg/day.",house:"2-3sqm + outdoor. Mud wallow.",sleep:"Straw. Separate sow.",inj:[{n:"Sunburn",t:"Mud access. Shade."},{n:"Worms",t:"Deworm. Rotate."}],breed:"21d cycle. 114d gestation. 8-12 piglets.",out:{Meat:{p:80,u:"kg",s:"Smoke, cure, freeze."}}},
  Rabbit:{e:"🐇",prod:["Meat"],feed:"Hay unlimited. Greens 1-2 cups. Pellets 30-60g.",house:"0.5-0.7sqm.",sleep:"Hay bedding.",inj:[{n:"GI stasis",t:"EMERGENCY. Massage. Electrolytes."},{n:"Snuffles",t:"Warm dry. Vet."}],breed:"31d gestation. 6-8 kits.",out:{Meat:{p:1.5,u:"kg",s:"Lean. Freeze 6-12mo."}}},
  Bee:{e:"🐝",prod:["Honey"],feed:"Forage: thyme, sage, lavender.",house:"Langstroth/top-bar. South-facing.",sleep:"Cluster in hive.",inj:[{n:"Varroa",t:"Oxalic/formic acid."},{n:"Foulbrood",t:"BURN frames."}],breed:"Split hives to prevent swarm.",out:{Honey:{p:15,u:"kg/hive/yr",s:"Never spoils if <18% moisture."}}},
  Duck:{e:"🦆",prod:["Eggs","Meat"],feed:"150-200g pellets. Slug patrol.",house:"0.5sqm. Ground sleepers.",sleep:"Straw. Lock at night.",inj:[{n:"Bumblefoot",t:"Soak, clean."},{n:"Eye",t:"Saline wash."}],breed:"Drake:duck 1:4-6. 28d incubation.",out:{Eggs:{p:0.6,u:"eggs/day",s:"Same as chicken eggs."},Meat:{p:2.5,u:"kg",s:"Render fat for cooking."}}},
  Turkey:{e:"🦃",prod:["Meat","Eggs"],feed:"200-300g/day feed. Free-range on pasture for bugs. High protein for poults.",house:"1sqm/bird + outdoor range. Roost high — 1.5m+ perches.",sleep:"High perches. Will roost in trees if allowed.",inj:[{n:"Blackhead",t:"FATAL in turkeys. Never house with chickens on same ground. Worming critical."},{n:"Heat stress",t:"Shade, water, ventilation. Less prone than chickens but still vulnerable."}],breed:"1 tom per 8-10 hens. 28d incubation. Heritage breeds can mate naturally; commercial cannot.",out:{Meat:{p:8,u:"kg (heritage)",s:"Freeze 6-12mo. Smoke whole."},Eggs:{p:0.3,u:"eggs/day (seasonal)",s:"Larger than chicken. Rich."}}},
  Goose:{e:"🪿",prod:["Eggs","Meat","Down"],feed:"Primarily grass! 80% pasture. Supplement 100-150g grain. Excellent weeders.",house:"0.5sqm shelter + pasture. Need swimming water (even a tub).",sleep:"Ground. Straw bedding. Hardy outdoors.",inj:[{n:"Angel wing",t:"Reduce protein in goslings. Splint wing if caught early."},{n:"Leg problems",t:"Niacin supplement (brewer's yeast) for growing goslings."}],breed:"Pair-bond for life. 1 gander per 2-4 geese. 30d incubation. 40-60 eggs/season.",out:{Eggs:{p:0.2,u:"eggs/day (spring)",s:"Huge. Rich. Excellent baking."},Meat:{p:5,u:"kg",s:"Render fat (liquid gold for cooking). Confit legs."},Down:{p:0.2,u:"kg/yr",s:"Harvest post-molt."}}},
  Quail:{e:"🐦",prod:["Eggs","Meat"],feed:"25-35g/day game bird feed. 24% protein for layers.",house:"0.1sqm/bird. Wire cages or ground pens. Can raise on balcony/terrace.",sleep:"Ground. Sand/shavings. No perches needed.",inj:[{n:"Scalping",t:"Overcrowding or startled flight. Pad cage tops. Reduce density."},{n:"Respiratory",t:"Ammonia from dirty cages. Clean twice weekly minimum."}],breed:"1 male per 3-5 females. 17-18d incubation — fastest poultry. Mature at 6-8 weeks.",out:{Eggs:{p:0.85,u:"eggs/day",s:"Tiny but 300+/yr. Pickle. Delicacy."},Meat:{p:0.15,u:"kg/bird",s:"Delicate. 8wk to table."}}},
  "Guinea Fowl":{e:"🐓",prod:["Meat","Eggs","Pest Control"],feed:"Free range + 100g grain supplement. Eat ticks, scorpions, snakes, grasshoppers.",house:"Roost high. Basic shelter for night. Free range all day.",sleep:"High roosts — will choose trees if available.",inj:[{n:"Predation",t:"Lock up at night. Hawks and foxes. They're fast but not smart."},{n:"Keet mortality",t:"Keets fragile like turkey poults. Keep warm, dry, high protein first 6wk."}],breed:"1 male per 4-5 females. Seasonal layers (spring-summer). 26-28d incubation.",out:{Meat:{p:1.2,u:"kg",s:"Lean, gamey. Process like chicken."},Eggs:{p:0.3,u:"eggs/day (seasonal)",s:"Small. Rich yolk. Hard shell."}}},
  Donkey:{e:"🫏",prod:["Guardian","Draft"],feed:"Hay/straw. VERY little grain — easy keepers. Laminitis from overfeeding is #1 killer. Grass hay, not alfalfa.",house:"Simple three-sided shelter. Hardstanding area — hate mud. 0.5ha minimum per donkey.",sleep:"Standing or lying. Straw bedding in shelter.",inj:[{n:"Laminitis",t:"EMERGENCY. Restrict ALL feed. Cold water on hooves. Vet immediately. Caused by rich grass/grain."},{n:"Rain scald",t:"Shelter from prolonged rain. Donkeys lack waterproof coat oil that horses have."}],breed:"11-12 month gestation. Foals 1 every 2-3 years. Jenny:jack 1:1. Very long-lived: 25-40 years.",out:{Guardian:{p:1,u:"animal",s:"Protects goats/sheep from dogs, foxes. Bonds with flock."},Draft:{p:1,u:"animal",s:"Pack animal. Light cart. Mowing by grazing."}}},
  Horse:{e:"🐴",prod:["Draft","Riding","Manure"],feed:"Hay 10-15kg/day. Grain 2-4kg if working. Pasture when available. Salt block. Fresh water 30-50L/day (60-80L in Med summer heat).",house:"Stable 3.5×3.5m minimum or run-in shelter. 0.5-1ha pasture per horse.",sleep:"Standing (doze) or lying (deep sleep). Straw or shavings bedding.",inj:[{n:"Colic",t:"EMERGENCY. Walk horse. No rolling. Vet immediately. Remove feed. Caused by sand ingestion, sudden feed change."},{n:"Laminitis",t:"Restrict pasture. Cold hosing. Vet. Triggered by rich spring grass."}],breed:"11 month gestation. 1 foal/year. Stallion:mares 1:15-20. Foals wean at 5-6 months.",out:{Draft:{p:1,u:"animal",s:"Plowing, harrowing, logging, cart. Haflinger and Fjord for small farms."},Manure:{p:20,u:"kg/day",s:"Compost 6 months before use. High carbon."}}},
};

// Species classification for task generation
const POULTRY_SPECIES = new Set(["Chicken","Duck","Turkey","Goose","Quail","Guinea Fowl"]);
const HOOFED_SPECIES  = new Set(["Goat","Sheep","Cow","Pig","Donkey","Horse"]);
const GRAZER_SPECIES  = new Set(["Goat","Sheep","Cow","Donkey","Horse"]);

// Pluralize species names with head count prefix. Used in grouped task titles.
// "Feed 1 Chicken" / "Feed 2 Chickens" / "Feed 3 Sheep" / "Feed 5 Geese"
const ANIMAL_PLURALS = {
  Chicken: "Chickens", Goat: "Goats", Sheep: "Sheep", Cow: "Cows",
  Pig: "Pigs", Rabbit: "Rabbits", Duck: "Ducks", Turkey: "Turkeys",
  Goose: "Geese", Quail: "Quails", "Guinea Fowl": "Guinea Fowl",
  Donkey: "Donkeys", Horse: "Horses", Bee: "Bees",
};
function animalPlural(type, count) {
  if (count <= 1) return `1 ${type}`;
  const plural = ANIMAL_PLURALS[type] || (type + "s");
  return `${count} ${plural}`;
}

/* ═══════════════════════════════════════════
   CROP KNOWLEDGE DATABASE
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════
   HOMESTEAD APP — CROP KNOWLEDGE SUPPLEMENT
   Fills crop data gapsied in cross-reference audit.
   Structured to match existing app data formats exactly.
   ═══════════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════
   PRESERVATION MANUAL
   ═══════════════════════════════════════════ */
const PRESERVATION = {
  lacto_fermented: {
    name: "Lacto-Fermented Vegetables",
    cat: "Fermentation",
    icon: "🥒",
    shelf: "12–24 months",
    difficulty: "Easy",
    ratio: "20–50g sea salt per 1L water (2–5% brine). Standard: 30g/L (3%).",
    overview: "Lacto-fermentation uses naturally occurring Lactobacillus bacteria to convert sugars into lactic acid — the same process behind sauerkraut, kimchi, and traditional pickles. No vinegar, no canning, no heat. Just salt, vegetables, and time. The result is shelf-stable, probiotic-rich food that gets more complex with age.",
    what_you_need: "Wide-mouth glass jars or ceramic crock. Non-iodized salt (iodine kills bacteria). Clean filtered or boiled-cooled water. A weight to keep veg submerged. Cloth or airlock lid.",
    method: "1. Dissolve salt in water to make brine. 2. Chop or slice vegetables. Pack TIGHTLY into jar — the more tightly packed, the less brine you need. 3. Pour brine over, ensuring vegetables are fully submerged. Leave 2–3cm headspace. 4. Weight vegetables down (use a zip-lock bag filled with brine, or a small jar). 5. Cover loosely — fermentation produces CO2 that must escape. 6. Ferment at 18–22°C (room temperature). Taste from day 3. Ready when pleasantly sour, usually 5–14 days. 7. Seal and move to cold storage (cellar, fridge) to slow fermentation.",
    storage: "Room temperature while actively fermenting. Once done: cool cellar (<15°C) or refrigerator. Lasts 12–24 months submerged. Gets increasingly sour over time — this is normal and desirable.",
    best_for: "Cabbage (sauerkraut/kimchi), cucumbers, carrots, peppers, green tomatoes, cauliflower, beets, garlic, radish, turnip.",
    troubleshooting: "White film on top (kahm yeast) = harmless, skim it off. Cloudy brine = normal lactic acid bacteria. Pink/red/slimy/foul smell = discard immediately. Never use iodized salt. Vegetables exposed to air will mold — keep submerged.",
    science: "Salt draws water out of vegetables through osmosis, creating natural brine. Salt also selects for salt-tolerant Lactobacillus bacteria while suppressing harmful microbes. These bacteria consume sugars and produce lactic acid, which preserves the food and creates the sour flavor. The process is entirely anaerobic — oxygen is the enemy.",
    tip: "Add a grape leaf, oak leaf, or horseradish leaf — the tannins keep vegetables crunchy. Temperature matters: warmer = faster, more acidic; cooler = slower, milder, more complex. Start with 3% brine (30g salt per litre) as your baseline."
  },

  vinegar_pickling: {
    name: "Vinegar Pickling",
    cat: "Pickling",
    icon: "🫙",
    shelf: "12–18 months sealed",
    difficulty: "Easy",
    ratio: "1:1 vinegar to water for mild pickles. Straight vinegar for long shelf life. Add 1–2 tbsp sugar and 1 tbsp salt per 500ml liquid.",
    overview: "Vinegar pickling uses acetic acid to create an inhospitable environment for bacteria. Unlike lacto-fermentation, there are no live cultures — it is preserved by acidity, not microbiology. The result is crisp, tangy, and shelf-stable without refrigeration when properly processed. This is the method behind commercial gherkins, pickled onions, and relishes.",
    what_you_need: "Sterilized mason jars with new lids. White wine vinegar or cider vinegar (minimum 5% acidity — check the label). Salt. Sugar. Spices. Large pot for water-bath canning.",
    method: "1. Sterilize jars: wash well and keep hot in oven at 120°C until needed. 2. Make pickling liquid: combine vinegar, water, salt, sugar. Bring to full boil. 3. Pack prepared vegetables tightly into hot jars. Add spices (dill, mustard seed, peppercorns, bay leaf, garlic). 4. Pour hot liquid over vegetables, leaving 1cm headspace. Remove air bubbles. 5. Wipe jar rims, apply lids finger-tight. 6. Water-bath process: submerge jars in boiling water for 10–15 min. 7. Cool on rack overnight. Lids should pop down (sealed). Any that do not seal — refrigerate and use within 2 weeks.",
    storage: "Sealed jars: 12–18 months in cool, dark pantry. Refrigerate after opening. Best flavor develops after 2–4 weeks of resting.",
    best_for: "Cucumbers, peppers (sweet and hot), onions, green beans, cauliflower, carrots, beets, jalapeños, cornichons, cherry tomatoes.",
    troubleshooting: "Soft pickles = vegetable too ripe, or liquid not hot enough, or over-processed. Discolored pickles = iodized salt used (switch to pickling salt). Lids that don't seal = rim contaminated or lid worn — refrigerate those jars. Never reduce the vinegar quantity in a tested recipe — it affects safety.",
    science: "Acetic acid (vinegar) at 4–6% concentration denatures bacterial enzymes and proteins, preventing spoilage. The lower the pH (more acidic), the safer the product. Target pH below 4.6, which is the threshold below which Clostridium botulinum cannot grow.",
    tip: "For extra-crispy pickles: add 1/4 tsp Pickle Crisp (calcium chloride) per jar, or add a small piece of horseradish root. Always use fresh, firm vegetables — not soft or bruised. Add a dried chili or garlic clove for complexity."
  },

  hot_water_bath_canning: {
    name: "Water-Bath Canning (High Acid)",
    cat: "Canning",
    icon: "🫕",
    shelf: "12–24 months",
    difficulty: "Intermediate",
    ratio: "Varies by recipe. Critical: pH must be below 4.6. Add lemon juice or citric acid to low-acid fruits.",
    overview: "Water-bath canning uses boiling water (100°C) to destroy microorganisms and create a vacuum seal. Safe ONLY for high-acid foods (fruits, tomatoes, pickles, jams, jellies). This is the method for fruit preserves, tomato sauce, jams, and vinegar-based condiments. Do NOT use for vegetables, meat, or low-acid foods — those require pressure canning.",
    what_you_need: "Large pot with rack (at least 15cm taller than your tallest jar). Mason jars. New two-piece lids (rings and flat lids). Jar lifter. Bubble remover tool. Timer.",
    method: "1. Inspect jars — discard any with chips or cracks. Wash in hot soapy water, keep warm. Use NEW flat lids every time — rings can be reused. 2. Prepare food by tested recipe. Do not improvise quantities. 3. Fill jars leaving correct headspace (usually 0.5–1cm). Wipe rims clean. Apply lids finger-tight. 4. Lower into canning pot with rack, water must cover jars by at least 3cm. 5. Bring to full boil, then start timing. Process time depends on jar size and recipe (typically 10–40 minutes). Adjust for altitude. 6. Remove and cool on rack 12–24 hours. Do NOT press on lids while cooling. 7. Check seals: center of lid should be concave and not flex. Label and store.",
    storage: "Cool, dark pantry up to 24 months. Quality degrades after 1 year but remains safe if sealed. Refrigerate after opening — use within weeks.",
    best_for: "Tomato sauce and paste, jams and jellies, fruit in syrup, applesauce, pickles, relishes, chutneys, lemon curd.",
    troubleshooting: "Lids that flex up and down (not sealed) = reprocess within 24hr or refrigerate. Liquid siphoned out = overfilled or temperature change too sudden. Floating fruit = air in fruit cells, normal. Spoilage signs: spurting liquid when opened, off smell, mold — discard without tasting.",
    science: "Botulism (Clostridium botulinum) is the critical risk in canning. It cannot grow below pH 4.6 or above 116°C. Water-bath reaches only 100°C, which is why it is safe ONLY for high-acid foods. Low-acid foods require pressure canning to reach 116°C.",
    tip: "Always use tested, published recipes from trusted sources (Ball, USDA, National Center for Home Food Preservation). Do not double recipes — it changes heat penetration. Altitude matters: add 1 minute per 300m above sea level."
  },

  pressure_canning: {
    name: "Pressure Canning (Low Acid)",
    cat: "Canning",
    icon: "🥘",
    shelf: "12–24 months",
    difficulty: "Advanced",
    ratio: "Varies. No acid additions needed — pressure destroys all pathogens including botulism spores.",
    overview: "Pressure canning is the ONLY safe method for low-acid foods: vegetables, meat, poultry, fish, beans, soups. A pressure canner reaches 116°C (240°F) — the temperature required to destroy botulism spores. This is not optional — using water-bath for low-acid foods risks botulism, which is odourless, tasteless, and potentially fatal.",
    what_you_need: "Dedicated pressure canner (not a pressure cooker — different tool). Weighted or dial gauge. Mason jars. New lids. Jar lifter. Tested recipes.",
    method: "1. Inspect gasket and overpressure plug — replace if worn. 2. Add 5–7cm water to canner. 3. Fill jars using tested recipe. Wipe rims, apply lids. 4. Load jars on rack. Lock lid. Heat on high. 5. Vent steam for 10 minutes before adding weight or closing petcock. This purges air (air creates hot spots that underprocess). 6. Add weight or close petcock. Bring to required pressure (usually 10–15 PSI depending on altitude and food). 7. Process at steady pressure for full time in recipe — do not let pressure drop. 8. Turn off heat. Let pressure drop naturally — do NOT rush. 9. Remove weight or open petcock, wait 10 more minutes. Open lid away from you.",
    storage: "Cool, dark pantry 12–24 months. Refrigerate after opening.",
    best_for: "Green beans, corn, peas, carrots, beets, potatoes, all meats, poultry, fish, soups, stews, dried beans, mixed vegetables.",
    troubleshooting: "Liquid loss during processing = normal if less than 50%. Jars that do not seal = reprocess within 24hr or freeze. Pressure gauge inaccurate = have it tested annually at extension office. NEVER open a pressurized canner.",
    science: "Botulinum toxin is destroyed at 80°C, but the spores survive boiling (100°C) and require 116°C for 3+ minutes to destroy. Pressure increases the boiling point of water above 100°C. At 10 PSI, water boils at 115°C; at 15 PSI, at 121°C.",
    tip: "Have your gauge tested annually by your local extension office (dial gauges drift). Weighted gauges are more reliable long-term. Always follow published recipes — do not change densities, jar sizes, or pack methods."
  },

  jams_jellies: {
    name: "Jams, Jellies & Preserves",
    cat: "Canning",
    icon: "🍓",
    shelf: "12–18 months",
    difficulty: "Easy–Intermediate",
    ratio: "Classic: 1kg fruit : 750g–1kg sugar. Low-sugar (with pectin): 1kg fruit : 200–400g sugar. Jelly: strained juice only.",
    overview: "Jams, jellies, marmalades, and preserves are the most forgiving form of home preservation. High sugar concentration (65%+ in the finished product) inhibits microbial growth. Pectin — either naturally present in fruit or added as powder/liquid — creates the gel structure. The difference: jam uses crushed fruit; jelly uses strained juice; preserves keep fruit pieces whole; marmalade uses citrus peel.",
    what_you_need: "Heavy-bottomed wide pot (jam sets faster in wider pans). Thermometer (setting point = 104–105°C). Sterilized jars. Wooden spoon. Skimmer for foam. Ladle.",
    method: "1. Prepare fruit. High-pectin fruits (apples, citrus, quince, gooseberries, plums) need no added pectin. Low-pectin fruits (strawberries, peaches, cherries, figs) need commercial pectin or added lemon juice. 2. Combine fruit and sugar. Heat slowly to dissolve sugar. 3. Bring to a rolling boil that cannot be stirred down. Boil until setting point (104°C on thermometer, or wrinkle test: chill a plate, drop jam on it, push with finger — if it wrinkles, it is set). 4. Skim foam. Ladle into hot sterilized jars. Seal. Water-bath 10 minutes for long shelf life, or simply invert jars 5 minutes (seals by heat).",
    storage: "Sealed: 12–18 months cool dark pantry. Refrigerate after opening: 4–6 weeks.",
    best_for: "Strawberry, apricot, peach, plum, cherry, fig, quince, apple, citrus marmalade, mixed berry, grape, tomato jam.",
    troubleshooting: "Runny jam = undercooked (insufficient pectin or sugar). Reprocess: pour back into pan, bring back to boil, test again. Crystallized jam = too much sugar or cooked too long. Moldy jam = improper seal or contaminated spoon during storage. Discard any moldy jar — mold in high-sugar products can produce toxins.",
    science: "Sugar binds water molecules, making them unavailable to microbes (water activity reduction). At 65%+ dissolved solids, most bacteria and yeasts cannot grow. Pectin forms a gel when sugar concentration is high and pH is low (acids help pectin set).",
    tip: "The wrinkle test is more reliable than thermometers for jam. Macerate fruit with sugar overnight — it draws out juices, making it easier to dissolve and reducing cooking time. Lemon juice adds pectin AND acid which improves set and flavor."
  },

  drying_dehydrating: {
    name: "Drying & Dehydrating",
    cat: "Drying",
    icon: "☀️",
    shelf: "6 months–3 years depending on storage",
    difficulty: "Easy",
    ratio: "Most produce loses 80–95% of weight when dried. 5kg fresh = ~500g dried. Herbs: 6:1 ratio. Fruit: 7:1. Vegetables: 8:1.",
    overview: "Drying is humanity's oldest preservation method. By removing water (reducing water activity below 0.6), microbial growth becomes impossible. Drying concentrates flavor dramatically and creates products worth 5–10x their fresh value. Methods range from traditional sun drying to electric dehydrators and oven drying.",
    what_you_need: "Sun drying: wire racks, fine mesh (insect protection), sun exposure. Electric dehydrator: most controllable, best results. Oven: works but uses more energy. All need: good airflow.",
    method: "SUN DRYING: Slice uniformly thin (3–6mm). Pretreat light-colored fruits with lemon juice dip (prevents browning). Arrange on wire racks, not touching. Cover with fine mesh. Place in full sun. Bring inside at night (moisture re-absorption). Turn daily. Done in 3–7 days when leathery and pliable. DEHYDRATOR: Set temperature by food type. Vegetables: 55–60°C. Fruit: 55–65°C. Herbs: 35–40°C (higher destroys volatile oils). Time: 4–12 hours. OVEN: Lowest setting with door slightly ajar. BLANCHING: Most vegetables must be blanched (2–4 min boiling water, then ice bath) before drying to stop enzyme activity that causes off-flavors during storage.",
    storage: "Store in airtight containers (glass jars ideal) away from light and heat. Silica gel packets extend life. Check periodically — any moisture condensation inside = not dry enough, redry immediately. Freeze-dried or vacuum-sealed extends life dramatically.",
    best_for: "Tomatoes, peppers, mushrooms, zucchini, green beans, apples, apricots, plums (prunes), figs, mangoes, herbs (all), hot peppers, garlic, onions, citrus zest.",
    troubleshooting: "Mold during storage = product not dry enough before storing. Brittle (should be leathery) = over-dried. Case hardening (hard outside, moist inside) = dried too fast at too high temperature. Off-flavors in vegetables = forgot to blanch.",
    science: "Water activity (Aw) is the key concept. Fresh produce has Aw 0.95–0.99 (very hospitable to microbes). Dried to Aw below 0.6 becomes inhospitable to bacteria; below 0.7 for yeasts; below 0.8 for most molds. Blanching deactivates enzymes (peroxidase, catalase) that would otherwise cause color and flavor degradation even in dried state.",
    tip: "Conditioning: after drying, put product in a sealed container for 7–10 days, shaking daily. If any condensation appears, the batch is not uniformly dry — put back in dehydrator. This step prevents mold in stored product. Herbs: always harvest at bud stage (before flowers open) for maximum essential oil content."
  },

  freezing: {
    name: "Freezing",
    cat: "Freezing",
    icon: "❄️",
    shelf: "3–18 months depending on product",
    difficulty: "Easy",
    ratio: "Blanch most vegetables: 2–4 minutes in boiling water, then immediate ice bath for same duration. No blanching needed for peppers, onions, herbs, or fully cooked dishes.",
    overview: "Freezing is the most accessible preservation method and retains the highest nutritional quality of any preservation technique. At -18°C, microbial growth completely stops and enzyme activity is dramatically slowed. The main enemy is not safety but quality — ice crystal formation, freezer burn, and oxidation gradually degrade texture and flavor. Proper technique minimizes these.",
    what_you_need: "Freezer holding -18°C or colder. Heavy freezer bags or rigid containers. Vacuum sealer (significantly extends quality). Marker and labels. Ice bath for blanching.",
    method: "1. BLANCH vegetables (DO NOT skip this step for green vegetables): bring large pot to rolling boil, add vegetables, time exactly (peas: 90sec, green beans: 3min, broccoli: 3min, corn: 4min, carrots: 2min). Immediately plunge into ice water for same duration. Drain and dry thoroughly. 2. DRY FREEZE first: spread blanched vegetables or fruit in single layer on baking sheet. Freeze 2 hours until individually frozen. 3. TRANSFER to bags, remove all air, seal, label with date and contents. 4. Store at -18°C or colder. Never refreeze thawed produce.",
    storage: "Green vegetables (blanched): 12 months. Fruit: 12 months. Meat: 4–12 months (fatty fish shortest). Cooked dishes: 3–6 months. Bread and baked goods: 3 months. Dairy (butter, hard cheese): 6 months. Raw eggs (cracked into containers): 12 months.",
    best_for: "All berries, stone fruits, green vegetables, peppers, corn, herbs (in oil ice cubes), blanched tomatoes, cooked soups/stews, bread.",
    troubleshooting: "Freezer burn (white patches, dry texture) = air contact. Prevent with tight packaging and vacuum sealing. Mushy texture on thaw = not blanched, or too many ice crystals (slow freezing). Always thaw in refrigerator overnight, never on counter. Clumped-together = did not pre-freeze on tray first.",
    science: "Blanching deactivates enzymes (particularly peroxidase and lipase) that continue working even at freezer temperatures, causing off-flavors and color loss. Rapid freezing produces smaller ice crystals that do less cellular damage. Large ice crystals (from slow freezing) rupture cell walls — causing mushiness on thaw.",
    tip: "Herb ice cubes: blend fresh herbs with olive oil, pour into ice cube trays, freeze. Perfect single-use portions for cooking all winter. Freeze tomatoes whole (no prep) — they slip their skins when thawed and are perfect for sauce. Vacuum seal everything — it is the single biggest quality improvement you can make."
  },

  root_cellaring: {
    name: "Root Cellar & Cold Storage",
    cat: "Cold Storage",
    icon: "🏚️",
    shelf: "1–9 months depending on crop",
    difficulty: "Easy (once set up)",
    ratio: "Ideal conditions: 0–4°C, 85–95% humidity for root vegetables. 10–15°C, 60–70% humidity for cured alliums and squash. Check weekly.",
    overview: "Root cellaring exploits the natural cold and humidity of underground or insulated spaces to extend the life of fresh produce without any processing. It is the most energy-efficient preservation method — the goal is to keep produce alive, respiring slowly, rather than killing or preserving it. Different crops need different conditions, and this is where most beginners go wrong.",
    what_you_need: "A space that stays 0–15°C naturally (basement, garage corner, unheated room, buried container). Thermometer and hygrometer. Wooden crates or slatted shelves. Sand or damp newspaper for root vegetables. Good ventilation.",
    method: "POTATOES: Cure first at 15–18°C for 2 weeks (skin hardens, cuts heal). Then store in dark at 4–7°C in wooden crates. Darkness is critical — light causes solanine production (green skin, toxic). Keep away from apples (ethylene gas causes sprouting). CARROTS & BEETS: Pack in slightly damp sand or sawdust in crates. Do not wash before storage — just brush off dirt. Remove tops (they draw moisture). ONIONS & GARLIC: Must be fully cured (2–3 weeks in warm, dry, airy spot) before storage. Hang braided or in mesh bags in cool, DRY location. High humidity causes rot. CABBAGE: Wrap each head individually in newspaper. Store on shelves or hang by roots at 0–2°C. Remove outer leaves that rot. SQUASH & PUMPKIN: Cure at 27–30°C for 10–14 days (hardens skin). Then store at 10–15°C in dry conditions. Do not store on concrete. APPLES: Wrap individually in newspaper — one rotten apple genuinely does spoil the barrel (ethylene gas). Store at 0–4°C away from vegetables.",
    storage: "Potatoes: 4–6 months. Carrots in sand: 4–5 months. Onions (cured): 4–8 months. Garlic: 6–9 months. Cabbage: 3–5 months. Beets in sand: 4–5 months. Butternut squash: 4–6 months. Apples: 3–5 months.",
    best_for: "Potatoes, carrots, beets, turnips, parsnips, celeriac, onions, garlic, shallots, winter squash, pumpkin, apples, pears, cabbage, kohlrabi.",
    troubleshooting: "Rot spreading fast = check weekly and remove any soft items immediately. Sprouting = too warm or near ethylene-producing fruit. Shriveling = too dry, increase humidity with damp burlap. Soft spots on squash = curing insufficient or skin damaged at harvest. Garlic going moldy = humidity too high (needs dry conditions unlike roots).",
    science: "Fresh produce is still alive — it respires, consuming sugars and producing CO2, heat, and water vapor. Cold slows respiration dramatically, extending storage life. Humidity prevents moisture loss (wilting) but must be balanced: too high causes mold, too low causes shriveling. Ethylene gas produced by fruits accelerates ripening in nearby produce.",
    tip: "Build a simple cold room in a corner of your basement: insulate three interior walls and the ceiling heavily, leave the exterior wall uninsulated. Add a vent to outside for cold air intake. Costs very little and provides year-round cold storage. Install a min/max thermometer and check it weekly."
  },

  oil_preservation: {
    name: "Preservation in Oil",
    cat: "Oil Preservation",
    icon: "🫙",
    shelf: "1–3 months refrigerated (safety critical)",
    difficulty: "Intermediate — safety awareness required",
    ratio: "Completely submerge in high-quality olive oil. Cover by minimum 2cm. All items must be bone dry.",
    overview: "Preserving in oil creates an anaerobic (oxygen-free) environment that prevents oxidation and mold. However, this same anaerobic environment can support Clostridium botulinum growth — this is the critical safety issue with oil preservation. The rules are straightforward but non-negotiable: acidify or dry all items first, and always refrigerate. This technique produces premium-quality preserved foods and flavored oils simultaneously.",
    what_you_need: "Sterilized glass jars. Extra virgin olive oil. Items to preserve. Thermometer. Refrigerator space. Understanding of the safety rules below.",
    method: "SAFE ITEMS for oil preservation: Sun-dried tomatoes, roasted peppers, dried herbs (rosemary, thyme, sage), roasted garlic, marinated cheese (semi-hard only), dried mushrooms, artichoke hearts (cooked and acidified). ACIDIFY perishable items first: marinate in vinegar or lemon juice for 24 hours, OR acidify with citric acid (1g per 100g food). ROASTED GARLIC: must be roasted until fully cooked through — raw garlic in oil is a serious botulism risk. Pack into sterilized jar. Pour oil to completely cover. Seal. Refrigerate immediately. UNSAFE AT ROOM TEMPERATURE: Raw garlic, fresh herbs with moisture, fresh vegetables, raw onion — these must either be acidified, dried, or stored in refrigerator.",
    storage: "ALWAYS refrigerate — no exceptions. Sun-dried tomatoes in oil: 2–3 months refrigerated. Roasted peppers in oil: 2 weeks. Roasted garlic in oil: 1 week. Dried herbs in oil: 2–3 weeks. Use clean utensils every time — do not double-dip.",
    best_for: "Sun-dried tomatoes, roasted bell peppers, marinated semi-hard cheese, dried mushrooms, cooked artichoke hearts, roasted garlic, herb-infused oils (rosemary, thyme, bay).",
    troubleshooting: "SAFETY: If oil becomes cloudy (when not from refrigerator cold) or develops any off-smell — discard. Cloudiness when cold is normal and clears at room temperature. Mold on surface = discard entire jar. Never store at room temperature.",
    science: "Botulinum toxin is produced when C. botulinum spores germinate in anaerobic (oxygen-free), moist, low-acid, low-salt, warm environments. Oil ticks most of these boxes. Refrigeration inhibits spore germination. Acidity below pH 4.6 prevents growth. Drying removes moisture required for growth.",
    tip: "The infused oil itself is a valuable product — strain it after a few weeks and use as a premium cooking oil. Never use raw garlic in oil at room temperature — this is the most common cause of home botulism. When in doubt, refrigerate or don't do it."
  },

  cheese_making: {
    name: "Farmhouse Cheese Making",
    cat: "Dairy & Fermentation",
    icon: "🧀",
    shelf: "Fresh: 1–2 weeks. Aged: months to years",
    difficulty: "Intermediate–Advanced",
    ratio: "10L milk → approximately 1kg fresh cheese (yield varies by type). Rennet: 1/4 tsp liquid per 10L. Brine for fresh eating: 70–80g salt per litre (7–8%). Brine for long-term traditional preservation: up to 200g per litre (20%) — saltier but stores months.",
    overview: "Cheese is simply milk with most of its moisture removed and controlled fermentation applied. Every cheese style — from fresh ricotta to aged parmesan — uses the same basic principles: acidify milk, add coagulant (rennet), cut and drain curds, salt, and optionally age. Cheese is one of the most efficient preservation methods: 10L of milk (perishable, days) becomes 1kg of cheese (shelf-stable, months or years).",
    what_you_need: "Large heavy pot. Thermometer (accuracy to 1°C). Cheesecloth/muslin. Colander. Cheese mold. Rennet (liquid or tablet). Cultures (optional for aged cheeses). Cheese salt (non-iodized).",
    method: "FRESH WHITE CHEESE (Feta style): 1. Heat milk to exactly 32°C — no higher. 2. Add rennet: dissolve 1/4 tsp in 30ml cool water, add to milk, stir gently exactly 1 minute. 3. Cover and do NOT disturb for 45–60 minutes. 4. Test curd: insert knife at 45°, lift — clean break means it is ready. 5. Cut curd into 2cm cubes with long knife. Rest 10 minutes. 6. Raise temperature to 38°C over 20 minutes, stirring gently. 7. Ladle curds into cheesecloth-lined mold. Press gently 6–8 hours. 8. Cut into blocks. For fresh eating: brine in 7–8% salt solution (70–80g/L) for 24 hours. For long-term preservation (months): use stronger 15–20% brine — cheese will be very salty and may need a quick rinse before eating. RICOTTA: Heat whey (leftover from cheese) to 85°C. Add 2 tbsp white vinegar. Stir once. Wait 10 minutes. Ladle floating curds into cheesecloth.",
    storage: "Fresh cheese: refrigerate in brine, 2–4 weeks. In 20% brine, refrigerated: 6–12 months (gets tangier). Semi-hard aged: wax-coat or vacuum seal, 3–6 months. Hard aged: cool cave conditions, months to years.",
    best_for: "Goat milk (tangier, crumblier, lower lactose). Sheep milk (richest, most complex). Cow milk (mildest, highest yield). Mixed milk (traditional in many cultures). Never use ultra-pasteurized (UHT) milk — rennet will not work.",
    troubleshooting: "Curd does not form = milk too hot (kills rennet) or UHT milk used. Rubbery texture = too much rennet or curd cut too fine. Too soft = not pressed enough time. Too acidic = culture too warm too long. Mold during aging = normal on rind (scrub with brine-dipped cloth) or problematic inside (discard).",
    science: "Rennet contains proteases (chymosin and pepsin) that cleave kappa-casein proteins, causing them to lose their electrical charge and aggregate into a gel (the curd). Acid (from starter cultures or direct acidification) helps this process. Salt draws out moisture and inhibits unwanted bacteria during aging.",
    tip: "The single most important variable is milk temperature. Get an accurate thermometer. Fresh local, non-UHT milk produces far superior cheese. Keep all equipment scrupulously clean but avoid antibacterial soap — rinse with boiling water instead."
  },

  smoking_curing: {
    name: "Smoking & Dry Curing",
    cat: "Curing & Smoking",
    icon: "🥩",
    shelf: "Cured: 1–6 months. Smoked: 3–6 months. Vacuum-sealed: 12 months",
    difficulty: "Advanced",
    ratio: "Equilibrium cure: 2.5% salt by weight of meat (25g salt per 1kg). Add 0.25% Prague Powder #1 (curing salt) for safety if smoking above 30°C. Optional: 0.5% sugar, 0.1% black pepper.",
    overview: "Curing uses salt (and optionally nitrates/nitrites) to draw moisture from meat, reducing water activity to levels inhospitable to bacteria. Smoking adds a physical barrier of anti-microbial compounds (phenols, aldehydes) from wood smoke and further reduces surface moisture. Together, they create products that were shelf-stable before refrigeration existed — bacon, ham, prosciutto, pastırma, bresaola.",
    what_you_need: "Accurate kitchen scale (grams). Non-iodized curing salt or pink curing salt (Prague Powder). Zip-lock bags or vacuum sealer. Refrigerator. Cold smoker (for cold-smoked products). Thermometer.",
    method: "EQUILIBRIUM CURING: 1. Weigh meat precisely. Calculate cure: 2.5g salt per 100g meat, 0.25g Prague Powder per 100g (for warm smoking). Mix cure. 2. Rub entire surface thoroughly — no bare spots. 3. Vacuum seal or place in zip-lock, removing all air. 4. Refrigerate at 4°C. Time = 1 day per 5mm thickness of thickest part, minimum 7 days. Turn daily. 5. Rinse thoroughly. Air dry on rack in refrigerator 24–48 hours until surface is tacky (pellicle forms — critical for smoke adhesion). COLD SMOKING (below 30°C): 6. Smoke at 15–25°C for 6–12 hours. Rest 24 hours. Smoke again 1–2 more sessions. REST: 7. Hang in cool, airy, dark location (10–15°C, 65–75% humidity) for 1–8 weeks to further dry and develop flavor.",
    storage: "Whole muscle (hanging): 1–6 months in cool conditions. Vacuum-sealed in refrigerator: 6–12 months. Sliced: consume within 1 week or freeze.",
    best_for: "Pork belly (bacon), pork leg (ham), beef round (bresaola/pastırma style), duck breast (prosciutto style), fish (salmon, trout), poultry.",
    troubleshooting: "Surface slime = too humid or not cured long enough. Case hardening (hard outside, still wet inside) = dried too fast or temperature too high. Off smell = cure did not penetrate fully, discard. White powder on surface = salt crystallization (harmless) or mold (check — blue/black mold, discard; white mold on rind is usually harmless penicillium).",
    science: "Nitrites (from Prague Powder/curing salt) convert to nitric oxide which binds myoglobin (giving cured meat its pink color) and inhibits C. botulinum growth specifically. This is why curing salt is essential for any product that will be smoked or stored at room temperature — without it, botulism risk is real.",
    tip: "Never guess cure amounts — always calculate precisely by weight. Prague Powder #1 (pink salt) is for products cured and consumed within days to weeks. Prague Powder #2 is for long-cured products (months). They are NOT interchangeable. Keep a logbook of every batch — date, weight, cure %, smoking time, temperature."
  },

  fermented_beverages: {
    name: "Fermented Beverages — Wine, Cider & Vinegar",
    cat: "Fermentation & Distilling",
    icon: "🍇",
    shelf: "Wine: 1–5 years. Cider: 1–2 years. Vinegar: indefinitely",
    difficulty: "Intermediate",
    ratio: "Wine: 10kg grapes → ~7L finished wine (12–14% ABV). Cider: 10L apple juice → ~9L dry cider (5–7% ABV). Vinegar: start with 5–8% ABV liquid, acetification takes 4–8 weeks.",
    overview: "Fermented beverages transform surplus fruit into products worth many times their fresh value. Wine and cider are anaerobic fermentations (yeast converts sugars to alcohol). Vinegar is a second fermentation (acetobacter bacteria convert alcohol to acetic acid). All three use the same starting produce, require minimal equipment, and the skills compound on each other.",
    what_you_need: "Demijohns or fermentation vessels. Airlocks. Siphon tube. Hydrometer (measures sugar/alcohol). Potassium metabisulfite (sanitizer and preservative). Wine/cider yeast. For vinegar: wide-mouth vessel, vinegar mother or raw unpasteurized cider vinegar as starter.",
    method: "WINE: 1. Crush grapes (leave skins for red; press immediately for white). 2. Add potassium metabisulfite (1 Campden tablet per 4.5L). Wait 24 hours. 3. Pitch wine yeast. Ferment in open vessel 5–7 days (red) with daily punching down of cap. 4. Press off skins. Transfer to sealed demijohn with airlock. Ferment at 18–22°C until bubbling stops (2–4 weeks). 5. Rack (siphon) off sediment into clean vessel. Repeat after 2 months. 6. Age minimum 6 months. Bottle. VINEGAR: 1. Pour wine or cider into wide-mouth container to 1/3 full. 2. Add vinegar mother (or 20% unpasteurized cider vinegar). 3. Cover with cloth — needs oxygen. Keep at 25–30°C. 4. Stir weekly. Ready in 4–8 weeks. Strain, bottle.",
    storage: "Wine: bottle after aging, store horizontally in cool dark cellar. Good wine: 2–5 years improving. Cider: bottle conditioned (add 3g sugar per litre before sealing), serve cold. Vinegar: indefinitely at room temperature in sealed bottles.",
    best_for: "Wine: grapes, elderberries, blackberries, plums. Cider: apples, pears (perry). Vinegar: any wine, cider, or fruit beer can be made into vinegar.",
    troubleshooting: "Fermentation stuck = temperature too cold, yeast stressed, or insufficient nutrients. Add yeast nutrient, warm to 20°C. Vinegar smells bad = contamination. Discard and sanitize. Wine tastes like vinegar = exposed to oxygen during fermentation. Always keep airlocks filled with water. Haze in finished wine = pectin (add pectic enzyme) or yeast (rack again and fine with bentonite).",
    science: "Yeast (Saccharomyces cerevisiae) converts glucose to ethanol and CO2 anaerobically. Alcohol acts as preservative above ~12% ABV. Acetobacter oxidizes ethanol to acetic acid aerobically — this is why wine goes to vinegar when exposed to air, and why making vinegar intentionally requires airflow.",
    tip: "Always sanitize everything that touches your wine or cider — a small contamination ruins a whole batch. Potassium metabisulfite (Campden tablets) is your best friend: it kills wild yeasts and bacteria without harming your pitched yeast when used correctly. Start with a hydrometer reading to know your starting sugar and final alcohol content."
  },

  honey_storage: {
    name: "Honey Harvesting & Long-Term Storage",
    cat: "Apiary",
    icon: "🍯",
    shelf: "Indefinitely when properly stored",
    difficulty: "Easy (with hive access)",
    ratio: "Harvest only when frames are 80%+ capped (sealed with wax). Leave minimum 15–20kg per hive for winter survival. A productive hive yields 15–50kg surplus annually.",
    overview: "Honey is nature's most shelf-stable food — archaeologists have found 3,000-year-old honey in Egyptian tombs that was still edible. Its preservation comes from extremely low water content (below 18%), high acidity (pH 3.2–4.5), hydrogen peroxide production by glucose oxidase enzyme, and osmotic pressure that destroys microbes. The only threats to honey are moisture absorption and heat.",
    what_you_need: "Honey extractor (centrifugal). Uncapping knife or fork. Double-mesh strainer. Food-grade buckets. Refractometer (measures moisture content). Glass jars for final storage.",
    method: "1. TIMING: Harvest when frames are at least 80% capped. Uncapped honey has too high moisture content and will ferment. Test with refractometer — must read below 18.0% moisture. 2. EXTRACT: Uncap cells with heated knife or uncapping fork. Load frames into extractor. Spin — slow first (30 seconds each side), then faster. 3. STRAIN: Pour through double-mesh strainer (600 then 200 micron) into settling bucket. 4. REST: Leave 24–48 hours for wax and air bubbles to rise. Skim. 5. BOTTLE: Pour into clean, dry glass jars. Fill completely — headspace invites moisture. Seal. 6. LABELING: Date, floral source, moisture %. CREAMED HONEY: Start with small amount of finely crystallized honey (seed), add to liquid honey at 1:10 ratio. Store at 14°C with daily gentle stirring for 1–2 weeks until set.",
    storage: "Sealed at below 18% moisture: indefinitely at room temperature. Never refrigerate — accelerates crystallization (harmless but changes texture). Never heat above 40°C — destroys enzymes, destroys antimicrobial properties, changes flavor. Store away from strong smells (honey absorbs odors through lids). Do not use metal containers — acids react.",
    best_for: "Harvesting from thyme, lavender, clover, linden (lime), acacia, wildflower, chestnut, heather — each produces distinctly different honey with different culinary properties.",
    troubleshooting: "Fermented honey = moisture too high (above 18%). Prevent with refractometer. Can still use for mead or cooking. Crystallization = natural process, not spoilage. All honey except acacia crystallizes eventually. Dissolve by placing jar in warm water (max 40°C). Granulation speed depends on glucose/fructose ratio — high glucose varieties (rapeseed, clover) crystallize fast.",
    science: "Honey's water activity (Aw) is 0.5–0.6 — far too low for any microbe to grow. Glucose oxidase enzyme produces hydrogen peroxide, providing additional antimicrobial action. Low pH (3.2–4.5) from organic acids creates further hostile conditions. The combination makes spoilage essentially impossible when moisture is below 18%.",
    tip: "A refractometer is a non-negotiable tool — it costs very little and tells you everything you need to know about honey quality and safety. Invest in one. Thyme honey, heather honey, and chestnut honey command 2–3x price premiums over generic wildflower honey — plant accordingly."
  },
};
;


/* ═══════════════════════════════════════════
   9. LIVESTOCK CALENDAR
   ═══════════════════════════════════════════ */

const LIVESTOCK_CALENDAR = {
  Chicken: {
    Jan: "Reduced laying. Ensure water doesn't freeze. Supplement light to 14hr for laying.",
    Feb: "Egg production increasing. Order/hatch chicks for spring flock. Check for mites.",
    Mar: "Set broody hens or start incubator. Chicks hatch (21d). Deep clean coop.",
    Apr: "Chicks to outdoor brooder at 4-6wk. Hens laying well. Start free-ranging.",
    May: "Peak laying season begins. Process excess cockerels at 12-16wk.",
    Jun: "Peak laying. Watch for heat in warm spells (>28°C): shade, cold water, electrolytes.",
    Jul: "Heat management if needed. Collect eggs 2x daily if warm. Parasites peak.",
    Aug: "Continue parasite management. Dust bath area (diatomaceous earth for mites).",
    Sep: "Molt begins — laying drops. Increase protein (feather regrowth). Deworm.",
    Oct: "Molt continues. Clean and prepare coop for winter. Check ventilation.",
    Nov: "Reduced laying. Supplement calcium. Plan breeding for spring chicks.",
    Dec: "Shortest days = lowest laying. Wet maritime winter — keep shelter dry, draught-free.",
  },
  Goat: {
    Jan: "Late pregnancy. Increase grain. Selenium/vitamin E supplement 1 month before kidding.",
    Feb: "Pre-kidding prep. Supplies ready: towels, iodine, molasses water. Heat lamp tested.",
    Mar: "KIDDING SEASON begins. Colostrum within 1hr. Dam milking begins. Disbud kids at 3-7 days.",
    Apr: "Kidding continues. Spring grass arriving — restrict lush pasture to prevent founder.",
    May: "Full pasture. Hoof trim. Fecal egg count — targeted deworming only.",
    Jun: "Peak milk production. Watch for heat in warm spells (>28°C). Shade and water. Fly management.",
    Jul: "Summer parasites peak. FAMACHA scoring (barberpole worm). Rotate paddocks weekly.",
    Aug: "Continue parasite management. Dry off late-lactation does (stop milking 2mo before breeding).",
    Sep: "BREEDING SEASON begins. Introduce buck. Buck in rut — strong smell, aggressive.",
    Oct: "Breeding continues. Mark bred does with marking harness on buck.",
    Nov: "Remove buck. Fecal egg count. Hoof trim. Check body condition before winter.",
    Dec: "Early pregnancy. Maintain nutrition. Wet maritime winter — keep shelter dry, draughts out.",
  },
  Bee: {
    Jan: "Leave alone. Don't open hive if <10°C. Check weight (hefting) — feed fondant if light.",
    Feb: "Queen starts laying. Monitor stores. First cleansing flights. Oxalic acid treatment (if not done Dec).",
    Mar: "Spring inspection when >15°C: queen present? Brood pattern? Food? Disease? Add super if strong.",
    Apr: "Main spring buildup. SWARM WATCH begins. Check weekly. Split strong hives to prevent swarming.",
    May: "Peak swarming period. Inspect every 7 days. Add supers. Wildflowers, sage, thyme begin.",
    Jun: "Honey flow from wildflowers. Add supers as needed. Continue swarm management.",
    Jul: "Late honey flow. Monitor varroa (sugar roll test >3% = treat). Ensure water source.",
    Aug: "HARVEST HONEY. Leave 18-20kg minimum for wet WE winter. Remove supers.",
    Sep: "Varroa treatment (Apivar strips or formic acid). Feed 2:1 sugar syrup if stores low.",
    Oct: "Reduce entrance (mouse guard). Final feeding. Combine weak colonies with strong.",
    Nov: "Wrap/insulate hives if needed. Monitor weight monthly. Wet winter prep.",
    Dec: "Oxalic acid treatment (broodless period). Don't disturb. Check weight monthly.",
  },
  Sheep: {
    Jan: "Late pregnancy care. Increase nutrition. Vaccinate ewes 4wk before lambing (CDT).",
    Feb: "Pre-lambing prep. Supplies ready for Mar lambing. Body condition scoring.",
    Mar: "LAMBING begins. Colostrum within 1hr. Iodine navels. Tag/record. Heat lamp if cold.",
    Apr: "Lambing continues. Process lambs: dock tails (if wool breed), castrate, vaccinate.",
    May: "SHEARING. Full pasture begins. Footbath monthly (zinc sulfate 10%). Wean early lambs.",
    Jun: "Peak grazing. Monitor for fly strike (dagging — keep rear clean). Wean remaining lambs.",
    Jul: "Manage parasites. FAMACHA scoring. Targeted deworming only.",
    Aug: "Flush ewes (increase nutrition 2-3wk before breeding to boost ovulation).",
    Sep: "BREEDING SEASON. Ram goes in (1 ram per 30-40 ewes). Marking harness.",
    Oct: "Remove ram after 2 cycles (34 days). Fecal test. Hoof trim.",
    Nov: "Pregnancy scanning available (day 40-90). Winter feeding begins if pasture poor.",
    Dec: "Feed hay if snow/poor pasture. Wet maritime winter — ensure good shelter.",
  },
  Turkey: {
    Jan: "Low activity. Maintain weight. Shelter from rain — turkeys hate wet. Supplement grain.",
    Feb: "Breeding prep. Increase protein. Check tom condition. Toms start displaying.",
    Mar: "BREEDING begins. 1 tom per 8-10 hens. Collect eggs for incubation or let hens brood.",
    Apr: "Incubation 28 days. Poults extremely fragile — warm, dry, no drafts. Medicated starter feed.",
    May: "Poults to outdoor shelter at 6-8wk. Pasture access. Start bug foraging — natural pest control.",
    Jun: "Free range on pasture. Turkeys eat ticks, grasshoppers, scorpions. Shade needed in warm weather.",
    Jul: "Heat management — turkeys tolerate heat better than chickens. Ensure shade and water. Dust baths.",
    Aug: "Growing birds on pasture. Heritage breeds ready at 6-7 months. Broad-breasted at 4-5 months.",
    Sep: "Continue pasture rotation. Supplemental grain increases as forage quality drops.",
    Oct: "Processing season for meat birds. Heritage breeds at peak weight 6-8kg.",
    Nov: "Process remaining meat birds. Select breeders for next year — keep best toms and hens.",
    Dec: "Breeding stock maintenance. Shelter from cold rain. Turkeys roost in trees if allowed.",
  },
  Goose: {
    Jan: "Breeding condition. Increase grain. Geese pair-bond — don't separate bonded pairs.",
    Feb: "Pre-laying preparation. Increase nutrition for upcoming laying season.",
    Mar: "LAYING begins. Collect eggs daily — 40-60 eggs per season. 30d incubation.",
    Apr: "Peak laying. Set eggs under broody goose or incubator. Goslings at 30 days.",
    May: "Goslings to grass at 2-3wk. Geese are excellent mothers — let them raise their own.",
    Jun: "Pasture weeding — geese eat grass and weeds but leave most crops alone. Orchard weeding.",
    Jul: "Full pasture. Geese need swimming water (even a tub). Shade in warm weather.",
    Aug: "Heat management. Always access to water for bathing. Fresh drinking water twice daily.",
    Sep: "Meat birds ready at 4-5 months. Down harvest from live birds (post-molt, humane).",
    Oct: "Pasture quality dropping. Supplement with grain. Molt begins.",
    Nov: "Feather molt complete. Guardian duty — geese are aggressive to foxes, dogs, strangers.",
    Dec: "Reduce flock to breeding pairs. Geese live 20+ years — plan long-term.",
  },
  Quail: {
    Jan: "Indoor housing in Med climate. 14hr light for laying. Coturnix lay year-round with light.",
    Feb: "Breeding. 1 male per 3-5 females. Eggs hatch in 17-18 days (shortest of all poultry).",
    Mar: "Peak laying begins. Coturnix: 300+ eggs/year. Collect twice daily.",
    Apr: "Chicks mature at 6-8 weeks — already laying. Fastest poultry cycle possible.",
    May: "Full production. Process excess males at 8wk for meat (tiny but delicious).",
    Jun: "Heat watch. Quail are small — heat kills fast above 35°C. Ventilation critical.",
    Jul: "Heat management priority. Frozen water bottles in cage. Mist if possible.",
    Aug: "Continue production. Clean cages weekly — ammonia in small spaces is deadly.",
    Sep: "Steady production with light supplement. Quail don't need outdoor space.",
    Oct: "Good production continues. Ideal Med climate — not too hot, not too cold.",
    Nov: "Maintain 14hr light for continuous laying. No light = no eggs.",
    Dec: "Indoor maintenance. Quail handle Med winters fine. Ensure ventilation without drafts.",
  },
  "Guinea Fowl": {
    Jan: "Free range. Hardy. Minimal care needed. Supplement grain in poor foraging weather.",
    Feb: "Flock bonding. Guineas are seasonal layers — won't start until spring warmth.",
    Mar: "LAYING begins. Guineas hide nests — follow hens to find them. Collect eggs or they'll go broody.",
    Apr: "Incubation 26-28 days. Keets are delicate — raise like turkey poults. Warm, dry, high protein.",
    May: "Keets to outdoor brooder at 6wk. Adults: full free-range tick and pest control begins.",
    Jun: "Peak insect season = peak guinea value. They eat ticks, scorpions, snakes, grasshoppers.",
    Jul: "Free range all day. They return to roost at dusk. Lock up at night — foxes and owls.",
    Aug: "Continue free range. Guineas cover huge territory — they'll patrol several hectares.",
    Sep: "Laying drops as days shorten. Guineas are seasonal, not year-round layers.",
    Oct: "Meat birds ready at 14-16wk. Gamey, lean meat. Process like chicken.",
    Nov: "Flock consolidation. Reduce to breeding numbers. Keep 1 male per 4-5 females.",
    Dec: "Hardy through Med winter. Roost high. They're noisy — warn neighbours. Best alarm system on the farm.",
  },
  Donkey: {
    Jan: "Hay + straw. Check hooves — trim every 8-10wk year-round. Shelter from driving rain.",
    Feb: "Dental check annually. Donkeys hide pain — subtle signs only. Worming if needed.",
    Mar: "Pasture improving. Restrict lush grass — donkeys founder (laminitis) on rich pasture.",
    Apr: "CRITICAL: muzzle or restrict grazing on spring flush. Obesity is donkey killer #1.",
    May: "Strip grazing with electric fence. Companion with goats or sheep — guardian instinct kicks in.",
    Jun: "Summer coat. Fly masks if bothered. Shade essential. Fresh water always.",
    Jul: "Med heat: fine. Donkeys are desert animals. Shade + water is enough. Less grass is better.",
    Aug: "Continue restricted grazing. Hoof trim. Donkeys should be lean, not fat.",
    Sep: "Pasture slowing. Can increase grazing area now. Guardian duty for sheep/goats breeding season.",
    Oct: "Autumn worming. Hoof check. Ensure shelter for winter rains.",
    Nov: "Good hay. Straw bedding. Donkeys hate mud — provide hardstanding area.",
    Dec: "Winter coat. Hardy. Main risk: laminitis from overfeeding. Keep lean. Near-zero vet bills if managed well.",
  },
  Horse: {
    Jan: "Hay 10-15kg/day. Stable or shelter. Hoof pick daily, farrier every 6-8wk.",
    Feb: "Spring prep. Dental float annually. Vaccinate (tetanus, flu). Increase work gradually.",
    Mar: "Transition to pasture slowly — 1hr/day increase to prevent laminitis. Spring grass is rich.",
    Apr: "Full turnout possible. Begin training/work season. Draft horses: plowing, harrowing.",
    May: "Peak work season. Fly management starts — masks, sprays, fans in stable. Regular hoof care.",
    Jun: "Work early morning in Med heat. Electrolytes in water after heavy work. Shade mandatory.",
    Jul: "Reduce workload in extreme heat. Early morning only. Cool down properly after work.",
    Aug: "Continue heat management. Night turnout can work in Med summers. Stable during hot days.",
    Sep: "Good working weather returns. Autumn plowing. Pasture management — harrow and rest paddocks.",
    Oct: "Worming. Farrier. Reduce grain as workload drops. Pasture still good in Med climate.",
    Nov: "Maintain condition. Shelter from winter storms. Begin hay supplementation.",
    Dec: "Rest period. Maintenance only. Check rugs/blankets if used. Hoof care continues year-round.",
  },
  Cow: {
    Jan: "Winter feeding. Hay 10-15kg/day. Check water troughs for ice. Monitor body condition.",
    Feb: "Late pregnancy care for spring calvers. Increase nutrition. Vaccinate 4wk before calving.",
    Mar: "CALVING season begins. Colostrum within 2hr. Tag and record. Watch for dystocia.",
    Apr: "Calves to pasture with dams. Begin rotational grazing. Fecal egg count.",
    May: "Full pasture. Peak milk production. Flies begin — management starts. Mineral supplements.",
    Jun: "Heat management critical. Shade mandatory. Fresh water 50-100L/day. Early morning milking.",
    Jul: "Peak heat stress. Reduce handling. Ensure shade and ventilation. Parasites peak.",
    Aug: "Continue heat management. Dry off late-lactation cows 60d before next calving.",
    Sep: "BREEDING season for spring calvers. Bull goes in. Pasture quality still good in Med.",
    Oct: "Remove bull after 2 cycles. Pregnancy check. Hoof trim. Deworm if needed.",
    Nov: "Pregnancy scanning available. Begin supplementary feeding if pasture drops.",
    Dec: "Winter management. Good hay. Body condition score 3/5 minimum. Prepare for spring calving.",
  },
  Pig: {
    Jan: "Winter housing. Deep straw bedding. Maintain feed 2-4kg/day. Check shelter is dry.",
    Feb: "Breeding prep. Condition sows. Boar check. First litters due if autumn-bred.",
    Mar: "FARROWING begins. Separate sow 1wk before. Heat lamp for piglets. Creep feed at 2wk.",
    Apr: "Piglets weaning at 6-8wk. Spring pasture access. Begin outdoor rotation.",
    May: "Growing pigs on pasture. Supplement grain. Wallow access — pigs sunburn without mud.",
    Jun: "Heat management. Mud wallow essential. Shade. Fresh water. Pigs cannot sweat.",
    Jul: "Peak heat. Misting or wallow mandatory. Feed early morning and evening.",
    Aug: "Growing pigs reaching market weight. Process or sell. Autumn breeding prep.",
    Sep: "BREEDING for spring litters. Boar with sows. 3wk cycle. Flush feed sows before breeding.",
    Oct: "Confirm pregnancy. Increase feed gradually. Deworm. Last outdoor rotation before winter.",
    Nov: "Move to winter housing. Deep bedding. Maintain condition for pregnant sows.",
    Dec: "Winter maintenance. Keep dry and well-bedded. Monitor pregnant sows.",
  },
  Rabbit: {
    Jan: "Winter care. Extra hay. Protect from drafts but ensure ventilation. Check water for freezing.",
    Feb: "Breeding season starts. Doe to buck. 31d gestation. Nest box 3d before kindling.",
    Mar: "First litters born. Doe pulls fur for nest. Leave alone 24hr. Kits grow fast.",
    Apr: "Kits growing. Weaning at 6-8wk. Sex and separate males before 12wk.",
    May: "Growing rabbits. Unlimited hay. Fresh greens daily. Second breeding cycle possible.",
    Jun: "Heat watch. Rabbits very heat-sensitive above 30°C. Frozen bottles in cage. Shade.",
    Jul: "STOP breeding in extreme heat. Bucks sterile above 30°C for 6wk. Cool housing priority.",
    Aug: "Continue heat management. Marble tiles in cage for cooling. Fresh water 2x daily.",
    Sep: "Breeding resumes as temps drop. Process excess for meat.",
    Oct: "Autumn litters. Good growing weather. Stock up hay for winter.",
    Nov: "Last litters of year. Prepare winter housing. Insulate hutches, maintain ventilation.",
    Dec: "Winter maintenance. Extra hay for warmth. Monitor water. Check for snuffles.",
  },
  Duck: {
    Jan: "Winter laying reduced. Ensure water access for head-dipping. Extra feed.",
    Feb: "Laying increases with day length. Pair up breeders. Drake:duck 1:4-6.",
    Mar: "Peak laying begins. Collect eggs daily. Set for incubation. 28d incubation.",
    Apr: "Ducklings hatch. Brooder 2wk then outdoor. No swimming until feathered (3wk).",
    May: "Ducklings to pasture. Slug patrol season — ducks are best organic slug control.",
    Jun: "Full free-range. Ducks on garden pest duty. Lock up at night — foxes.",
    Jul: "Heat management. Ducks need water access always. Paddling pool minimum.",
    Aug: "Meat birds ready at 8-10wk (Pekin). Process or keep for laying.",
    Sep: "Laying drops. Molt begins. Increase protein for feather regrowth.",
    Oct: "Molt continues. Prepare winter housing. Ground sleepers need dry bedding.",
    Nov: "Reduced laying. Supplement calcium. Plan breeding pairs for spring.",
    Dec: "Winter maintenance. Dry housing critical. Bumblefoot check.",
  },
};

/* ═══════════════════════════════════════════
   DEFAULT STATE
   ═══════════════════════════════════════════ */
const DEF = {schemaVersion:7,zones:[],garden:{plots:[]},livestock:{animals:[]},pantry:{items:[]},costs:{items:[]},log:[],setupDone:false,region:"western_europe",city:"",
  // Daily task completions — keyed by local YYYY-MM-DD, value is array of task keys
  // completed on that day. Auto-pruned to last 30 days on migration.
  completions: {},
  // Gamification state
  gamify: {
    streak: 0,               // Current consecutive-day streak
    bestStreak: 0,           // All-time best streak
    lastActiveDate: null,    // ISO date string "YYYY-MM-DD" of last logged activity
    badges: [],              // Array of { id, unlockedAt } for earned badges
    totalHarvests: 0,        // Lifetime harvest count
    totalPlants: 0,          // Lifetime plant count
    totalLogEntries: 0,      // Lifetime activity log entries
  },
};

/* ═══════════════════════════════════════════
   BADGE DEFINITIONS — real farming milestones
   ═══════════════════════════════════════════ */
const BADGES = [
  { id: "first_harvest",     emoji: "🧺", name: "First Harvest",       desc: "Complete your first full crop cycle and harvest it.", check: (d) => d.gamify.totalHarvests >= 1 },
  { id: "green_thumb",       emoji: "🌱", name: "Green Thumb",         desc: "Plant 10 different crops on your homestead.",        check: (d) => { const unique = new Set(d.garden.plots.map(p=>p.crop)); return unique.size >= 10; } },
  { id: "companion_planner", emoji: "🤝", name: "Companion Planner",   desc: "Plant 3+ companion crops in the same zone.",         check: (d) => {
    return d.zones.some(z => {
      const zCrops = d.garden.plots.filter(p=>p.zone===z.id && p.status!=="harvested").map(p=>p.crop);
      if (zCrops.length < 3) return false;
      return zCrops.some(c => { const comp = COMP[c]; return comp && zCrops.filter(oc => oc!==c && comp.good.includes(oc)).length >= 2; });
    });
  }},
  { id: "week_warrior",      emoji: "🔥", name: "Week Warrior",        desc: "Maintain a 7-day activity streak.",                  check: (d) => d.gamify.streak >= 7 || d.gamify.bestStreak >= 7 },
  { id: "zone_master",       emoji: "🌍", name: "Zone Master",         desc: "Set up 5 or more zones on your farm map.",           check: (d) => d.zones.length >= 5 },
  { id: "record_keeper",     emoji: "📝", name: "Record Keeper",       desc: "Log 50 activities on your homestead.",               check: (d) => d.gamify.totalLogEntries >= 50 },
];


/* ═══════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════ */
const Btn = React.memo(function Btn({children,onClick,v="primary",sm,dis,style:s}) {
  const st={
    primary:{bg:C.grd,c:"#fff",shadow:"0 2px 8px rgba(45,106,79,.25)"},
    secondary:{bg:"transparent",c:C.green,border:`1.5px solid ${C.bdr}`,shadow:"none"},
    danger:{bg:"linear-gradient(135deg, #ef4444, #dc2626)",c:"#fff",shadow:"0 2px 8px rgba(239,68,68,.25)"},
    ghost:{bg:"transparent",c:C.t2,shadow:"none"},
    success:{bg:"linear-gradient(135deg, #22c55e, #16a34a)",c:"#fff",shadow:"0 2px 8px rgba(34,197,94,.25)"},
    orange:{bg:"linear-gradient(135deg, #f59e0b, #d97706)",c:"#fff",shadow:"0 2px 8px rgba(245,158,11,.25)"}
  };
  const b=st[v]||st.primary;
  return <button onClick={dis?undefined:onClick} style={{background:b.bg,color:b.c,border:b.border||"none",borderRadius:C.rs,fontFamily:F.body,fontWeight:600,fontSize:sm?12:13,padding:sm?"7px 14px":"11px 22px",cursor:dis?"not-allowed":"pointer",opacity:dis?0.4:1,display:"inline-flex",alignItems:"center",gap:7,transition:"all .2s cubic-bezier(.25,.46,.45,.94)",boxShadow:dis?"none":b.shadow,letterSpacing:"0.01em",...s}}>{children}</button>;
});

const Card = React.memo(function Card({children,onClick,active,style:s,p=true,className=""}) {
  return <div onClick={onClick} className={`${onClick?"card-hover":""} ${className}`} style={{background:C.card,borderRadius:C.r,boxShadow:active?`0 0 0 2px ${C.green}, ${C.sh}`:C.sh,padding:p?"18px":0,cursor:onClick?"pointer":"default",transition:"all .25s cubic-bezier(.25,.46,.45,.94)",border:`1px solid ${active?C.green:"rgba(0,0,0,.04)"}`,...s}}>{children}</div>;
});

const Inp = React.memo(function Inp({label,...p}) {
  return <div style={SX.mb12}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <input {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box",...p.style}}/>
  </div>;
});

const Sel = React.memo(function Sel({label,options,...p}) {
  return <div style={SX.mb12}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <select {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box"}}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>
  </div>;
});

const Txt = React.memo(function Txt({label,...p}) {
  return <div style={SX.mb12}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <textarea {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",resize:"vertical",minHeight:60,boxSizing:"border-box"}}/>
  </div>;
});

const Overlay = React.memo(function Overlay({title,onClose,children,wide}) {
  return createPortal(
    <div className="overlay-backdrop" style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16,boxSizing:"border-box"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="overlay-sheet page-enter" style={{background:C.card,borderRadius:C.r+4,maxWidth:wide?720:520,width:"100%",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2), 0 8px 20px rgba(0,0,0,.1)"}}>
        <div className="overlay-handle-row" style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px 0",position:"sticky",top:0,background:C.card,zIndex:1,borderRadius:`${C.r+4}px ${C.r+4}px 0 0`}}>
          <h3 style={{margin:0,fontSize:20,fontFamily:F.head,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:C.t2,width:44,height:44,borderRadius:22,display:"flex",alignItems:"center",justifyContent:"center"}}><X size={18} strokeWidth={2}/></button>
        </div>
        <div style={{padding:"16px 24px 24px"}}>{children}</div>
      </div>
    </div>,
    document.body
  );
});

const Pill = React.memo(function Pill({children,c=C.green,bg=C.gp}) {
  return <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:bg,color:c,fontWeight:600,fontFamily:F.body,whiteSpace:"nowrap"}}>{children}</span>;
});

// Hover tooltip — shows a floating info card on mouse enter, hides on leave
const Tooltip = React.memo(function Tooltip({children, content, width=220}) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({x:0, y:0});
  const ref = useRef(null);
  const handleEnter = (e) => {
    const rect = (ref.current || e.currentTarget).getBoundingClientRect();
    setPos({ x: rect.left + rect.width/2, y: rect.top });
    setShow(true);
  };
  return (
    <div ref={ref} onMouseEnter={handleEnter} onMouseLeave={()=>setShow(false)} style={{position:"relative",display:"inline-block"}}>
      {children}
      {show && (
        <div style={{
          position:"fixed", left: Math.min(pos.x - width/2, window.innerWidth - width - 12), top: Math.max(8, pos.y - 8),
          transform:"translateY(-100%)", width, zIndex:9999, pointerEvents:"none",
        }}>
          <div style={{
            background:"#1d1d1f", color:"#fff", borderRadius:10, padding:"10px 14px",
            fontSize:12, lineHeight:1.5, fontFamily:F.body, boxShadow:"0 8px 24px rgba(0,0,0,.25)",
          }}>
            {content}
          </div>
          <div style={{width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1d1d1f",margin:"0 auto"}}/>
        </div>
      )}
    </div>
  );
});

const Ring = React.memo(function Ring({pct,size=44,sw=3.5,color=C.green,children}) {
  const r=(size-sw)/2,ci=2*Math.PI*r,off=ci*(1-Math.min(1,pct));
  return <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.bdr} strokeWidth={sw}/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={ci} strokeDashoffset={off} strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/></svg>
    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*.32}}>{children}</div>
  </div>;
});

const Stat = React.memo(function Stat({label,value,sub,color=C.green}) {
  return <Card><div style={{fontSize:11,fontWeight:600,color:C.t2,textTransform:"uppercase",letterSpacing:".03em"}}>{label}</div><div style={{fontSize:26,fontWeight:700,fontFamily:F.head,marginTop:4,lineHeight:1}}>{value}</div>{sub&&<div style={{fontSize:12,color,marginTop:4,fontWeight:500}}>{sub}</div>}</Card>;
});

/* ═══════════════════════════════════════════
   SHARED CROP DETAIL COMPONENTS
   Used in both FarmMap zoomed view & Farming overlay
   ═══════════════════════════════════════════ */
const StepChecklist = React.memo(function StepChecklist({steps, plantDate, onToggle, plotId}) {
  if (!steps || steps.length === 0) return null;
  return (
    <div style={SX.mb12}>
      <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:8}}>Growing Steps</div>
      {steps.map((s, i) => {
        const sd = plantDate ? new Date(new Date(plantDate).getTime() + s.d * 864e5).toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "";
        return (
          <div key={i} onClick={e => {e.stopPropagation(); onToggle?.(plotId, i);}} style={{display:"flex",gap:10,padding:"10px 12px",background:s.done?"#f0faf0":C.card,border:`1px solid ${s.done?C.gm:C.bdr}`,borderRadius:C.rs,marginBottom:4,cursor:"pointer"}}>
            <div style={{width:22,height:22,borderRadius:22,border:`2px solid ${s.done?C.green:C.bdr}`,background:s.done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,flexShrink:0}}>{s.done?"✓":""}</div>
            <div style={SX.flex1}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <strong style={{fontSize:13,textDecoration:s.done?"line-through":"none"}}>{s.l}</strong>
                <span style={{fontSize:10,color:C.t2,fontFamily:F.mono}}>Day {s.d}{sd ? ` (${sd})` : ""}</span>
              </div>
              <div style={SX.t2_12mt2}>{s.t}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

const WaterCard = React.memo(function WaterCard({waterNote}) {
  if (!waterNote) return null;
  return <Card style={{marginBottom:12,background:"#e3f2fd"}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>💧 Watering</div><div style={SX.s13mt4}>{waterNote}</div></Card>;
});

const StorageCard = React.memo(function StorageCard({storage}) {
  if (!storage) return null;
  return <Card style={{marginBottom:12,background:"#fffde7"}}><div style={{fontSize:12,fontWeight:700,color:"#f57f17"}}>📦 Storage</div><div style={SX.s13mt4}>{storage}</div></Card>;
});

/* ═══════════════════════════════════════════
   TASK QUEUE ENGINE — sorted by urgency
   ═══════════════════════════════════════════ */
function buildTaskQueue(data) {
  const now = new Date(); now.setHours(0,0,0,0);
  const todayKey = toLocalDateKey(now);
  const doneToday = new Set((data.completions && data.completions[todayKey]) || []);
  const tasks = [];

  // O(1) zone lookup — built once per call instead of linear .find per plot
  const zoneById = new Map((data.zones || []).map(z => [z.id, z]));

  data.garden.plots.forEach(p => {
    if (!p.plantDate || p.status === "harvested") return;
    const crop = rCM(data.region).get(p.crop);
    if (!crop || !crop.days) return;
    const dSince = Math.floor((now - new Date(p.plantDate)) / 864e5);
    const zone = zoneById.get(p.zone);
    const loc = zone ? zone.name : "Farm";
    const dLeft = crop.days - dSince;

    // Harvest ready
    if (dSince >= crop.days) {
      tasks.push({ key: `plot-${p.id}-harvest`, pri: 0, type: "harvest", emoji: crop.emoji, title: `Harvest ${p.name || p.crop}`, desc: `Ready! Est. yield available.`, loc, plotId: p.id, daysOut: 0 });
    }

    // Steps due — tracked via p.steps[i].done (persistent), NOT completions map
    if (p.steps) p.steps.forEach((s, i) => {
      if (s.done) return;
      const due = dSince - s.d;
      if (due >= 0 && due <= 3) {
        tasks.push({ key: `plot-${p.id}-step-${i}`, pri: 1, type: "step", emoji: crop.emoji, title: `${p.name || p.crop}: ${s.l}`, desc: s.t, loc, plotId: p.id, stepIdx: i, daysOut: 0 });
      } else if (due >= -3 && due < 0) {
        tasks.push({ key: `plot-${p.id}-step-${i}`, pri: 3, type: "upcoming", emoji: crop.emoji, title: `${p.name || p.crop}: ${s.l}`, desc: s.t, loc, plotId: p.id, stepIdx: i, daysOut: Math.abs(due) });
      }
    });

    // Watering
    if (crop.waterFreq) {
      const m = crop.waterFreq.match(/(\d+)/);
      if (m && dSince > 0 && dSince % parseInt(m[1]) === 0) {
        tasks.push({ key: `plot-${p.id}-water`, pri: 2, type: "water", emoji: "💧", title: `Water ${p.name || p.crop}`, desc: crop.waterNote, loc, plotId: p.id, daysOut: 0, routine: true });
      }
    }

    // Harvest forecast (upcoming) — info-only, no Done button
    if (dLeft > 0 && dLeft <= 14) {
      const hDate = new Date(new Date(p.plantDate).getTime() + crop.days * 864e5);
      const estYld = p.expectedYieldKg || crop.yld || 3;
      tasks.push({ key: `plot-${p.id}-forecast`, pri: 4, type: "forecast", emoji: "📅", title: `${p.name || p.crop} harvest in ${dLeft}d`, desc: `Expected: ${hDate.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}. ~${estYld}kg yield.`, loc, plotId: p.id, daysOut: dLeft });
    }
  });

  // ─── Animal tasks ───
  // Species-grouped: feed, water, eggs, clean, bedding, paddock (one task per species)
  // Per-animal:      health, hoof, hive inspection (one task per individual)
  const dayNum = Math.floor(now.getTime() / 864e5);
  const curMonth = now.getMonth() + 1; // 1-12
  const animalZone = data.zones.find(z => ["barn","pasture"].includes(z.type));
  const animalLoc = animalZone ? animalZone.name : "Farm";

  // Build species summary: count, total head, first animal-id (stable hash seed), db ref
  const speciesMap = new Map();
  (data.livestock?.animals || []).forEach(a => {
    const db = LDB[a.type];
    if (!db) return;
    if (!speciesMap.has(a.type)) {
      speciesMap.set(a.type, { type: a.type, db, groupCount: 0, headCount: 0, firstId: a.id });
    }
    const s = speciesMap.get(a.type);
    s.groupCount += 1;
    s.headCount += (a.count || 1);
  });

  // Hash a string deterministically (used for species-level stagger)
  const hashStr = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  };

  // Species-grouped tasks
  speciesMap.forEach(s => {
    const { type, db, headCount } = s;
    const e = db.e;
    const speciesLabel = animalPlural(type, headCount);
    const sHash = hashStr(type);

    if (type !== "Bee") {
      tasks.push({ key: `species-${type}-feed`,  pri: 1, type: "feed",  emoji: e,    title: `Feed ${speciesLabel}`,  desc: db.feed, loc: animalLoc, speciesType: type, headCount, daysOut: 0, routine: true });
      tasks.push({ key: `species-${type}-water`, pri: 1, type: "water", emoji: "💧", title: `Water ${speciesLabel}`, desc: `Fresh water — refill and clean trough.`, loc: animalLoc, speciesType: type, headCount, daysOut: 0, routine: true });
    }
    if (POULTRY_SPECIES.has(type)) {
      const eggNote = db.out?.Eggs?.s || "";
      tasks.push({ key: `species-${type}-eggs`, pri: 1, type: "eggs", emoji: "🥚", title: `Collect eggs — ${speciesLabel}`, desc: `Check nests daily. ${eggNote}`, loc: animalLoc, speciesType: type, headCount, daysOut: 0, routine: true });
    }
    if (type !== "Bee" && (dayNum + sHash) % 7 === 0) {
      tasks.push({ key: `species-${type}-clean`, pri: 2, type: "clean", emoji: "🧹", title: `Clean housing — ${speciesLabel}`, desc: `Remove soiled bedding, refresh straw, check for damp.`, loc: animalLoc, speciesType: type, headCount, daysOut: 0 });
    }
    if (type !== "Bee" && (dayNum + sHash) % 30 === 0) {
      tasks.push({ key: `species-${type}-bedding`, pri: 2, type: "bedding", emoji: "🛏️", title: `Full bedding change — ${speciesLabel}`, desc: `Strip everything, disinfect surfaces, fresh straw or shavings.`, loc: animalLoc, speciesType: type, headCount, daysOut: 0 });
    }
    if (GRAZER_SPECIES.has(type) && (dayNum + sHash) % 21 === 0) {
      tasks.push({ key: `species-${type}-paddock`, pri: 2, type: "paddock", emoji: "🔄", title: `Rotate paddock — ${speciesLabel}`, desc: `Move to fresh pasture. Rest current section 21+ days to break parasite cycle.`, loc: animalLoc, speciesType: type, headCount, daysOut: 0 });
    }
  });

  // Per-animal tasks (health, hoof, hive)
  (data.livestock?.animals || []).forEach(a => {
    const db = LDB[a.type];
    if (!db) return;
    const e = db.e;
    // For per-animal tasks: use the animal's own name if given, else "Chicken #3"
    const label = a.name ? `${a.name} (${a.type})` : a.type;
    const aHash = hashStr(a.id);

    // Weekly: health check (per animal, offset 3d from cleaning cycle)
    if (a.type !== "Bee" && (dayNum + aHash + 3) % 7 === 0) {
      const commonIssue = db.inj?.[0]?.n || "injury or parasites";
      tasks.push({ key: `animal-${a.id}-health`, pri: 2, type: "health", emoji: "🩺", title: `Health check — ${label}`, desc: `Inspect body condition, eyes, coat. Watch for: ${commonIssue}.`, loc: animalLoc, animalId: a.id, daysOut: 0 });
    }
    // Bi-weekly: hoof check (per animal, hoofed species only)
    if (HOOFED_SPECIES.has(a.type) && (dayNum + aHash) % 14 === 0) {
      tasks.push({ key: `animal-${a.id}-hoof`, pri: 2, type: "hoof", emoji: "🦶", title: `Hoof check — ${label}`, desc: `Trim overgrowth, check for rot, stones, cracks.`, loc: animalLoc, animalId: a.id, daysOut: 0 });
    }
    // 10d: hive inspection (per hive, March–September only)
    if (a.type === "Bee" && curMonth >= 3 && curMonth <= 9 && (dayNum + aHash) % 10 === 0) {
      tasks.push({ key: `animal-${a.id}-hive`, pri: 2, type: "hive", emoji: "🐝", title: `Hive inspection — ${label}`, desc: `Check brood pattern, honey stores, queen presence. Look for varroa mites.`, loc: animalLoc, animalId: a.id, daysOut: 0 });
    }
  });

  // Filter out tasks that have been marked done today via the completions map.
  // Step tasks are filtered by p.steps[i].done above (persistent), not here.
  // Forecast tasks are info-only, no Done button exposed.
  const filtered = tasks.filter(t => {
    if (t.type === "step" || t.type === "upcoming" || t.type === "forecast") return true;
    return !doneToday.has(t.key);
  });

  filtered.sort((a, b) => a.pri - b.pri || a.daysOut - b.daysOut);
  return filtered;
}

/* ═══════════════════════════════════════════
   (FarmMap component removed — replaced by div-based farm map in Setup)
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   WEATHER DASHBOARD CARD — full card for dashboard
   ═══════════════════════════════════════════ */


/* ═══════════════════════════════════════════
   PLOT OVERLAY — shared popup used from Farming, TaskQueue, Dashboard
   ═══════════════════════════════════════════ */
function PlotOverlay({plot, data, setData, onClose}) {
  const crop = rCM(data.region).get(plot.crop);
  const zone = plot.zone ? data.zones.find(z => z.id === plot.zone) : null;
  const zoneSpace = useMemo(
    () => buildZoneSpaceMap(data.zones, data.garden.plots, data.farmW||100, data.farmH||60, data.region),
    [data.zones, data.garden.plots, data.farmW, data.farmH, data.region]
  );
  const zoneStats = plot.zone ? zoneSpace[plot.zone] : null;
  const zoneMyArea = plotAreaM2(plot, data.region);
  const zoneFill = zoneStats ? (zoneStats.pct >= 0.95 ? C.red : zoneStats.pct >= 0.7 ? C.orange : C.green) : C.green;

  const compZonePlots = plot.zone
    ? data.garden.plots.filter(p => p.zone === plot.zone && p.status !== "harvested" && p.id !== plot.id).map(p => p.crop)
    : [];
  const compObj = COMP[plot.crop];
  const compGood = compObj ? compZonePlots.filter(n => compObj.good.includes(n)) : [];
  const compBad  = compObj ? compZonePlots.filter(n => compObj.bad.includes(n)) : [];
  const showComp = plot.zone && compObj && compZonePlots.length > 0 && (compGood.length > 0 || compBad.length > 0);

  const togStep = (pid, si) => {
    const plots = data.garden.plots.map(p => {
      if (p.id === pid) { const st = [...p.steps]; st[si] = {...st[si], done: !st[si].done}; return {...p, steps: st}; }
      return p;
    });
    setData({...data, garden: {plots}});
  };
  const del = id => {
    setData({...data, garden: {plots: data.garden.plots.filter(p => p.id !== id)}});
    onClose();
  };
  const harv = (p) => {
    const c = rCM(data.region).get(p.crop);
    const qty = p.expectedYieldKg || (p.plantCount && c ? p.plantCount * (c.yld || 3) : c?.cat === "Herb" ? 0.5 : c?.cat === "Grain" ? 5 : c?.yld || 3);
    const item = {id: uid(), name: p.crop, category: "Fresh Produce", qty, unit: "kg", source: "farm", addedDate: toLocalDateKey(new Date()), storageNote: c?.storage || ""};
    setData({
      ...data,
      garden: {plots: data.garden.plots.map(x => x.id === p.id ? {...x, status: "harvested"} : x)},
      pantry: {items: [...data.pantry.items, item]},
      log: appendLog(data.log, {text: `🧺 Harvested ${qty}kg ${p.crop}`}),
    });
    onClose();
  };

  if (!crop) {
    return (
      <Overlay title={`${plot.name || plot.crop}`} onClose={onClose} wide>
        <div style={{padding:"24px 12px",color:C.t2,fontSize:13}}>Crop data not found for this plot.</div>
      </Overlay>
    );
  }

  return (
    <Overlay title={`${crop.emoji} ${plot.name || plot.crop}`} onClose={onClose} wide>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        <Pill>{plot.status}</Pill>
        <Pill>☀ {crop.sun}</Pill>
        <Pill>💧 {crop.waterFreq}</Pill>
        {zone && <Pill c={C.blue} bg="#e3f2fd">📍 {zone.name}</Pill>}
      </div>

      {(plot.plantCount || plot.qty || plot.expectedYieldKg) && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:14}}>
          {plot.plantCount && <Card style={{background:"#e8f5e9",padding:"10px 14px"}}><div style={SX.capHeaderT2}>Plants</div><div style={{fontSize:20,fontWeight:700,color:C.green}}>{plot.plantCount}</div><div style={SX.t2_10}>estimated</div></Card>}
          {plot.qty && plot.measureType === "area" && <Card style={{background:"#e3f2fd",padding:"10px 14px"}}><div style={SX.capHeaderT2}>Area</div><div style={{fontSize:20,fontWeight:700,color:C.blue}}>{plot.qty}m²</div><div style={SX.t2_10}>bed size</div></Card>}
          {plot.qty && plot.measureType === "plants" && <Card style={{background:"#e3f2fd",padding:"10px 14px"}}><div style={SX.capHeaderT2}>Count</div><div style={{fontSize:20,fontWeight:700,color:C.blue}}>{plot.qty}</div><div style={SX.t2_10}>plants</div></Card>}
          {plot.expectedYieldKg && <Card style={{background:"#fff3e0",padding:"10px 14px"}}><div style={SX.capHeaderT2}>Est. Yield</div><div style={{fontSize:20,fontWeight:700,color:C.orange}}>~{plot.expectedYieldKg}kg</div><div style={SX.t2_10}>at harvest</div></Card>}
          {plot.plantCount && crop.spacing ? <Card style={{background:"#f3e5f5",padding:"10px 14px"}}><div style={SX.capHeaderT2}>Spacing</div><div style={{fontSize:20,fontWeight:700,color:"#7b1fa2"}}>{crop.spacing}cm</div><div style={SX.t2_10}>between plants</div></Card> : null}
        </div>
      )}

      {plot.zone && zone && zoneStats && zoneStats.totalM2 > 0 && (
        <Card style={{marginBottom:12, background: zoneStats.pct >= 0.95 ? "#fff5f5" : zoneStats.pct >= 0.7 ? "#fffde7" : "#f0faf0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:12,fontWeight:700,color:zoneFill}}>
              {zoneStats.pct >= 0.95 ? "🔴 Zone Full" : zoneStats.pct >= 0.7 ? "🟡 Zone Getting Full" : "🟢 Zone Space"}
            </div>
            <div style={{fontSize:11,color:C.t2,fontFamily:F.mono}}>{zone.name}</div>
          </div>
          <div style={{height:8,borderRadius:4,background:C.bdr,overflow:"hidden",marginBottom:6}}>
            <div style={{height:"100%",width:`${Math.min(100,zoneStats.pct*100).toFixed(0)}%`,background:zoneFill,borderRadius:4,transition:"width .4s"}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t2}}>
            <span>Used: <strong style={{color:C.text}}>{zoneStats.usedM2}m²</strong></span>
            {zoneMyArea > 0 && <span>This crop: <strong style={{color:zoneFill}}>{Math.round(zoneMyArea*10)/10}m²</strong></span>}
            <span>Free: <strong style={{color:zoneFill}}>{zoneStats.freeM2}m²</strong> of {zoneStats.totalM2.toFixed(0)}m²</span>
          </div>
        </Card>
      )}

      {showComp && (
        <Card style={{marginBottom:12,background:compBad.length > 0 ? "#fff5f5" : "#f0faf0"}}>
          <div style={SX.lblGreen}>🌱 Companions in zone</div>
          {compGood.length > 0 && <div style={{fontSize:12,color:C.green,marginTop:4}}>✓ Good: {compGood.join(", ")}</div>}
          {compBad.length  > 0 && <div style={{fontSize:12,color:C.red,marginTop:4}}>✕ Bad: {compBad.join(", ")}</div>}
        </Card>
      )}

      <WaterCard waterNote={crop.waterNote}/>
      <div className="g2" style={{gap:8,marginBottom:16}}>
        <Card><div style={SX.t2_11b}>PLANTED</div><div style={{fontSize:15,fontWeight:700}}>{plot.plantDate || "—"}</div></Card>
        <Card><div style={SX.t2_11b}>HARVEST</div><div style={{fontSize:15,fontWeight:700}}>{plot.harvestDate || "—"}</div></Card>
      </div>

      <Card style={{marginBottom:12,background:"#f0f7f4",border:"1px solid #c8e6c9"}}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}><span style={{fontSize:13,fontWeight:700,color:C.green}}>🌱 Crop Data</span>{crop.pH && <Pill c="#6d4c41" bg="#efebe9">pH {crop.pH}</Pill>}</div></Card>
      {crop.fert && <Card style={{marginBottom:12,background:"#e8f5e9"}}><div style={SX.lblGreen}>🧪 Fertilizer Schedule</div><div style={{fontSize:12,marginTop:4,lineHeight:1.5}}>{crop.fert}</div></Card>}
      {crop.pests && crop.pests.length > 0 && <Card style={{marginBottom:12,background:"#fff3e0"}}><div style={{fontSize:12,fontWeight:700,color:C.orange}}>🐛 Pests & Solutions</div>{crop.pests.slice(0,3).map(function(pst,i){return <div key={i} style={{marginTop:4}}><strong style={{fontSize:11}}>{pst.n}</strong>{pst.t && <div style={SX.t2_11}>→ {pst.t}</div>}</div>;})}</Card>}

      <StepChecklist steps={plot.steps} plantDate={plot.plantDate} onToggle={togStep} plotId={plot.id}/>
      <StorageCard storage={crop.storage}/>
      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(crop.name + " growing guide complete")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#ff0000",textDecoration:"none",fontWeight:600,padding:"8px 14px",background:"#fff5f5",borderRadius:C.rs,border:"1px solid #ffcdd2",marginBottom:12}}>▶ Watch: Complete {crop.name} Growing Guide</a>

      <div style={SX.btnRowEnd}>
        <Btn v="danger" sm onClick={()=>del(plot.id)}>Delete</Btn>
        {plot.status !== "harvested" && plot.harvestDate && new Date(plot.harvestDate) <= new Date() && <Btn v="success" onClick={()=>harv(plot)}>🧺 Harvest</Btn>}
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════
   ANIMAL OVERLAY — shared popup used from Livestock, TaskQueue, Dashboard
   ═══════════════════════════════════════════ */
function AnimalOverlay({animal, data, setData, onClose}) {
  const db = LDB[animal.type];
  if (!db) {
    return (
      <Overlay title={`${animal.name || animal.type}`} onClose={onClose} wide>
        <div style={{padding:"24px 12px",color:C.t2,fontSize:13}}>No livestock data for this species.</div>
      </Overlay>
    );
  }
  const del = id => {
    setData({...data, livestock: {animals: data.livestock.animals.filter(a => a.id !== id)}});
    onClose();
  };
  const breedInfo = animal.breed ? (BREEDS[animal.type] || []).find(b => b.name === animal.breed) : null;

  return (
    <Overlay title={`${db.e} ${animal.name || animal.type} Care Guide`} onClose={onClose} wide>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        <Pill>×{animal.count} head</Pill>
        {animal.breed && <Pill c={C.blue} bg="#e3f2fd">{animal.breed}</Pill>}
        {db.prod.map(p => <Pill key={p} c={C.green} bg={C.gp}>{p}</Pill>)}
      </div>
      {breedInfo && (
        <Card style={{marginBottom:8,background:"#e3f2fd"}}>
          <div style={{fontSize:12,fontWeight:700,color:C.blue}}>🧬 Breed: {breedInfo.name}</div>
          <div style={SX.s13mt4}>{breedInfo.note}</div>
          {breedInfo.eggs && <div style={{fontSize:12,color:C.green,marginTop:2}}>Egg production: ~{breedInfo.eggs} eggs/day per hen</div>}
        </Card>
      )}
      {[
        {i:"🍽",t:"Feeding",v:db.feed},
        {i:"🏠",t:"Housing",v:db.house},
        {i:"😴",t:"Sleeping",v:db.sleep},
        {i:"💕",t:"Breeding",v:db.breed},
      ].map(s => (
        <Card key={s.t} style={{marginBottom:8}}>
          <div style={SX.lblGreen}>{s.i} {s.t}</div>
          <div style={{fontSize:13,lineHeight:1.7,marginTop:4}}>{s.v}</div>
        </Card>
      ))}
      <Card style={{background:"#fce4ec",marginBottom:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.red}}>🩹 Injuries & Treatment</div>
        {db.inj.map((j,i) => (
          <div key={i} style={{marginTop:8}}>
            <strong style={SX.s13}>{j.n}</strong>
            <div style={SX.t2_12mt2}>{j.t}</div>
          </div>
        ))}
      </Card>
      <Card style={{marginBottom:8,background:"#e8f5e9"}}>
        <div style={SX.lblGreen}>📦 Produce & Storage</div>
        {Object.entries(db.out).map(([k,v]) => (
          <div key={k} style={{marginTop:6}}>
            <strong style={{fontSize:12}}>{k}</strong>: ~{v.p} {v.u}
            <div style={SX.t2_11}>{v.s}</div>
          </div>
        ))}
      </Card>
      <Btn v="danger" sm onClick={()=>del(animal.id)}>Remove</Btn>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════
   TASK ROW — extracted outside TaskQueue to prevent remount on every render
   ═══════════════════════════════════════════ */
const TaskRow = React.memo(function TaskRow({t, onOpen, onToggleStep, onMarkDone, onGoToFarm}) {
  const borderC = t.pri === 0 ? C.red : t.pri === 1 ? "#ff6b35" : t.pri === 2 ? C.orange : C.blue;
  const bg = t.pri === 0 ? "#fff5f5" : t.pri === 1 ? "#fffaf0" : t.pri === 2 ? "#fffde7" : "#f0f7ff";
  const clickable = !!(t.plotId || t.animalId);
  const dateLabel = t.dueDate
    ? (t.daysOut === 0 ? "Today" : t.dueDate.toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"}))
    : (t.daysOut === 0 ? "Today" : t.daysOut > 0 ? `In ${t.daysOut}d` : null);
  const canMarkDone = t.type !== "step" && t.type !== "upcoming" && t.type !== "forecast" && t.type !== "harvest";
  return (
    <div
      onClick={clickable && onOpen ? onOpen : undefined}
      style={{
        display:"flex",alignItems:"center",gap:12,
        padding:"12px 14px",
        background:bg,borderRadius:C.rs,
        marginBottom:6,
        borderLeft:`4px solid ${borderC}`,
        cursor:clickable && onOpen ? "pointer" : "default",
        transition:"all .15s",
      }}
    >
      <span style={{fontSize:22,flexShrink:0,lineHeight:1}}>{t.emoji}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:700,color:C.text,lineHeight:1.3,marginBottom:4}}>{t.title}</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",fontSize:11.5,color:C.t2,fontWeight:500}}>
          <span>📍 {t.loc}</span>
          {dateLabel && <span style={{color:t.daysOut === 0 ? C.red : C.t2,fontWeight:t.daysOut === 0 ? 700 : 500}}>🕑 {dateLabel}</span>}
        </div>
      </div>
      <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
        {t.stepIdx != null && onToggleStep && (
          <button onClick={()=>onToggleStep(t.plotId, t.stepIdx)} style={{background:C.green,color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Done</button>
        )}
        {canMarkDone && onMarkDone && (
          <button onClick={()=>onMarkDone(t.key)} style={{background:C.green,color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>✓ Done</button>
        )}
        {t.type === "harvest" && onGoToFarm && (
          <button onClick={onGoToFarm} style={{background:C.orange,color:"#fff",border:"none",borderRadius:7,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🧺 Harvest</button>
        )}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════
   TASK QUEUE — Calendar + Urgency + Timeline
   ═══════════════════════════════════════════ */
function TaskQueue({data, setData, setPage, tasks}) {
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD" or null
  const [openPlotId, setOpenPlotId] = useState(null);
  const [openAnimalId, setOpenAnimalId] = useState(null);
  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const [farmWeekCollapsed, setFarmWeekCollapsed] = useState(true);
  const [animalsWeekCollapsed, setAnimalsWeekCollapsed] = useState(true);

  const togStep = (pid, si) => {
    const plots = data.garden.plots.map(p => {
      if (p.id === pid) { const st = [...p.steps]; st[si] = {...st[si], done: !st[si].done}; return {...p, steps: st}; }
      return p;
    });
    setData({...data, garden: {plots}});
  };

  const markDone = (key) => setData(markTaskDone(data, key));

  const openTask = (t) => {
    if (t.plotId) setOpenPlotId(t.plotId);
    else if (t.animalId) setOpenAnimalId(t.animalId);
  };

  const openPlot = openPlotId ? data.garden.plots.find(p => p.id === openPlotId) : null;
  const openAnimal = openAnimalId ? (data.livestock?.animals || []).find(a => a.id === openAnimalId) : null;

  // O(1) zone lookups — used inside memoized calendarEvents/byTime + render path
  const zoneById = useMemo(() => new Map((data.zones || []).map(z => [z.id, z])), [data.zones]);
  const zoneByName = useMemo(() => new Map((data.zones || []).map(z => [z.name, z])), [data.zones]);
  const animalZone = useMemo(() => (data.zones || []).find(z => ["barn","pasture"].includes(z.type)) || null, [data.zones]);
  const animalLocName = animalZone ? animalZone.name : "Farm";

  // ── CONSOLIDATED: compute calendar events AND by-time list in ONE pass over plots ──
  const { calendarEvents, byTime } = useMemo(() => {
    const evts = {};
    const timeline = [];
    const now = new Date(); now.setHours(0,0,0,0);
    const todayKey = toLocalDateKey(now);
    const doneToday = new Set((data.completions && data.completions[todayKey]) || []);

    data.garden.plots.forEach(p => {
      if (!p.plantDate || p.status === "harvested") return;
      const crop = rCM(data.region).get(p.crop);
      if (!crop) return;
      const plantMs = new Date(p.plantDate).getTime();
      const loc = zoneById.get(p.zone)?.name || "Farm";

      // Harvest date
      const hDate = new Date(plantMs + crop.days * 864e5);
      const hKey = toLocalDateKey(hDate);
      if (!evts[hKey]) evts[hKey] = [];
      evts[hKey].push({type:"harvest", emoji:crop.emoji, label:`Harvest ${p.name||p.crop}`, plotId:p.id, key:`plot-${p.id}-harvest`});
      const dLeft = Math.ceil((hDate - now) / 864e5);
      if (dLeft >= 0 && dLeft <= 60) {
        timeline.push({daysOut: dLeft, dueDate: hDate, type:"harvest", emoji:crop.emoji, title:`Harvest ${p.name||p.crop}`, loc, plotId:p.id, key:`plot-${p.id}-harvest`});
      }

      // Step dates
      if (p.steps) p.steps.forEach((s, i) => {
        if (s.done) return;
        const sDate = new Date(plantMs + s.d * 864e5);
        const sKey = toLocalDateKey(sDate);
        if (!evts[sKey]) evts[sKey] = [];
        evts[sKey].push({type:"step", emoji:crop.emoji, label:`${p.name||p.crop}: ${s.l}`, plotId:p.id, stepIdx:i, key:`plot-${p.id}-step-${i}`});
        const sLeft = Math.ceil((sDate - now) / 864e5);
        if (sLeft >= -1 && sLeft <= 30) {
          timeline.push({daysOut: Math.max(0,sLeft), dueDate: sDate, type:"step", emoji:crop.emoji, title:`${p.name||p.crop}: ${s.l}`, loc, plotId:p.id, stepIdx:i, key:`plot-${p.id}-step-${i}`});
        }
      });
    });

    // ─── Animal tasks projected forward (species-grouped + per-animal) ───
    const today0 = Math.floor(now.getTime() / 864e5);
    const aLoc = animalLocName;

    // Hash helper (local — matches buildTaskQueue)
    const hashStr2 = (str) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
      return h;
    };

    // Build species summary for grouped projections
    const speciesMap2 = new Map();
    (data.livestock?.animals || []).forEach(a => {
      const db = LDB[a.type];
      if (!db) return;
      if (!speciesMap2.has(a.type)) speciesMap2.set(a.type, { type: a.type, db, headCount: 0 });
      speciesMap2.get(a.type).headCount += (a.count || 1);
    });

    // Species-grouped tasks (feed/water/eggs/clean/bedding/paddock)
    speciesMap2.forEach(s => {
      const { type, db, headCount } = s;
      const e = db.e;
      const speciesLabel = animalPlural(type, headCount);
      const sHash = hashStr2(type);

      // Daily tasks
      const dailies = [];
      if (type !== "Bee") {
        dailies.push({type: "feed",  emoji: e,    title: `Feed ${speciesLabel}`,  keySuffix: "feed"});
        dailies.push({type: "water", emoji: "💧", title: `Water ${speciesLabel}`, keySuffix: "water"});
      }
      if (POULTRY_SPECIES.has(type)) {
        dailies.push({type: "eggs", emoji: "🥚", title: `Collect eggs — ${speciesLabel}`, keySuffix: "eggs"});
      }
      dailies.forEach(dt => {
        for (let d = 0; d <= 60; d++) {
          const dueDate = new Date(now.getTime() + d * 864e5);
          const key = toLocalDateKey(dueDate);
          const taskKey = `species-${type}-${dt.keySuffix}`;
          if (!evts[key]) evts[key] = [];
          evts[key].push({type: dt.type, emoji: dt.emoji, label: dt.title, speciesType: type, key: taskKey, routine: true});
          if (d <= 30) timeline.push({daysOut: d, dueDate, type: dt.type, emoji: dt.emoji, title: dt.title, loc: aLoc, speciesType: type, key: taskKey, routine: true});
        }
      });

      // Periodic species-grouped tasks
      const periodics = [];
      if (type !== "Bee") {
        periodics.push({period: 7,  offset: 0, type: "clean",   emoji: "🧹", title: `Clean housing — ${speciesLabel}`,      keySuffix: "clean"});
        periodics.push({period: 30, offset: 0, type: "bedding", emoji: "🛏️", title: `Full bedding change — ${speciesLabel}`, keySuffix: "bedding"});
      }
      if (GRAZER_SPECIES.has(type)) {
        periodics.push({period: 21, offset: 0, type: "paddock", emoji: "🔄", title: `Rotate paddock — ${speciesLabel}`, keySuffix: "paddock"});
      }
      periodics.forEach(pt => {
        for (let d = 0; d <= 60; d++) {
          if ((today0 + d + sHash + pt.offset) % pt.period !== 0) continue;
          const dueDate = new Date(now.getTime() + d * 864e5);
          const key = toLocalDateKey(dueDate);
          const taskKey = `species-${type}-${pt.keySuffix}`;
          if (!evts[key]) evts[key] = [];
          evts[key].push({type: pt.type, emoji: pt.emoji, label: pt.title, speciesType: type, key: taskKey});
          if (d <= 30) timeline.push({daysOut: d, dueDate, type: pt.type, emoji: pt.emoji, title: pt.title, loc: aLoc, speciesType: type, key: taskKey});
        }
      });
    });

    // Per-animal tasks (health, hoof, hive) — genuinely per-individual
    (data.livestock?.animals || []).forEach(a => {
      const db = LDB[a.type];
      if (!db) return;
      const label = a.name ? `${a.name} (${a.type})` : a.type;
      const aHash = hashStr2(a.id);

      // Weekly health check (per animal)
      if (a.type !== "Bee") {
        for (let d = 0; d <= 60; d++) {
          if ((today0 + d + aHash + 3) % 7 !== 0) continue;
          const dueDate = new Date(now.getTime() + d * 864e5);
          const key = toLocalDateKey(dueDate);
          const taskKey = `animal-${a.id}-health`;
          if (!evts[key]) evts[key] = [];
          evts[key].push({type: "health", emoji: "🩺", label: `Health check — ${label}`, animalId: a.id, key: taskKey});
          if (d <= 30) timeline.push({daysOut: d, dueDate, type: "health", emoji: "🩺", title: `Health check — ${label}`, loc: aLoc, animalId: a.id, key: taskKey});
        }
      }

      // Bi-weekly hoof check (per hoofed animal)
      if (HOOFED_SPECIES.has(a.type)) {
        for (let d = 0; d <= 60; d++) {
          if ((today0 + d + aHash) % 14 !== 0) continue;
          const dueDate = new Date(now.getTime() + d * 864e5);
          const key = toLocalDateKey(dueDate);
          const taskKey = `animal-${a.id}-hoof`;
          if (!evts[key]) evts[key] = [];
          evts[key].push({type: "hoof", emoji: "🦶", label: `Hoof check — ${label}`, animalId: a.id, key: taskKey});
          if (d <= 30) timeline.push({daysOut: d, dueDate, type: "hoof", emoji: "🦶", title: `Hoof check — ${label}`, loc: aLoc, animalId: a.id, key: taskKey});
        }
      }

      // Bee hive inspections — 10d cycle, Mar–Sep only, per hive
      if (a.type === "Bee") {
        for (let d = 0; d <= 60; d++) {
          const due = new Date(now.getTime() + d * 864e5);
          const m = due.getMonth() + 1;
          if (m < 3 || m > 9) continue;
          if ((today0 + d + aHash) % 10 !== 0) continue;
          const key = toLocalDateKey(due);
          const taskKey = `animal-${a.id}-hive`;
          if (!evts[key]) evts[key] = [];
          evts[key].push({type: "hive", emoji: "🐝", label: `Hive inspection — ${label}`, animalId: a.id, key: taskKey});
          if (d <= 30) timeline.push({daysOut: d, dueDate: due, type: "hive", emoji: "🐝", title: `Hive inspection — ${label}`, loc: aLoc, animalId: a.id, key: taskKey});
        }
      }
    });

    // Hide today's completed tasks from both calendar (today only) and timeline (today only)
    Object.keys(evts).forEach(k => {
      if (k !== todayKey) return;
      evts[k] = evts[k].filter(ev => !ev.key || !doneToday.has(ev.key));
    });
    const filteredTimeline = timeline.filter(t => !(t.daysOut === 0 && t.key && doneToday.has(t.key)));

    filteredTimeline.sort((a,b) => a.daysOut - b.daysOut);
    return { calendarEvents: evts, byTime: filteredTimeline };
  }, [data]);

  // ─── Group today's tasks by location (Option D: location-batched with attention banner) ───
  const todayStr = toLocalDateKey(new Date());
  const doneTodayKeys = new Set((data.completions && data.completions[todayStr]) || []);

  // ─── Two-bucket model ───
  // ROUTINE: plot water, animal feed/water/eggs. Daily ritual. Grouped by location.
  //          Never appears in attention banner, coming-up, or calendar.
  // IMPORTANT: everything else. Harvests, growing steps (pinch, transplant, fertilize, prune),
  //            weekly+ animal care (clean, health, hoof, paddock, bedding, hive inspection).
  //            Drives the attention banner, "Coming Up This Week", and calendar.
  const routineTasks = tasks.filter(t => t.routine === true);
  const importantTasks = tasks.filter(t => t.routine !== true);

  // Attention = important tasks due today or overdue (step with negative due, harvest ready)
  // For steps, an "upcoming" row has daysOut > 0 (was computed from due-days-in-future, not overdue).
  // buildTaskQueue uses pri: 1 for "step" (due 0..3 days back, i.e. overdue or today)
  //                  pri: 3 for "upcoming" (will-be-due in 1..3 days)
  //                  pri: 0 for "harvest" (ready)
  //                  pri: 2 for periodic animal (due today — hash-based, already pruned to today)
  const attentionTasks = importantTasks.filter(t =>
    t.type === "harvest" ||            // harvest ready
    t.type === "step" ||               // growing step due today or overdue
    (t.daysOut === 0 && !["upcoming","forecast"].includes(t.type))  // periodic animal care due today
  );

  // Group routine by location (for the daily walking lists)
  const routineByLoc = {};
  routineTasks.forEach(t => {
    const key = t.loc || "Farm";
    if (!routineByLoc[key]) routineByLoc[key] = [];
    routineByLoc[key].push(t);
  });
  const routineLocations = Object.keys(routineByLoc).sort();

  // Pick a location icon based on zone type; falls back to 📍
  const locIcon = (locName) => {
    const z = zoneByName.get(locName);
    if (!z) return "📍";
    const zt = ZT_MAP.get(z.type);
    return zt?.icon || "📍";
  };

  // Coming up this week = important tasks, tomorrow..+7, excluding routine
  const thisWeek = byTime.filter(t => t.daysOut >= 1 && t.daysOut <= 7 && t.routine !== true);
  // Split coming-up into Farm (plots — harvests, growing steps) vs Animals (periodic care)
  const thisWeekFarm    = thisWeek.filter(t => !!t.plotId);
  const thisWeekAnimals = thisWeek.filter(t => !!t.animalId);

  // Done today: reconstruct from completion keys by parsing each key and finding the referenced
  // plot or animal in data. We don't read today's calendar events because they're already
  // filtered (completed items are hidden from evts).
  const doneTodayList = [];
  const seenKeys = new Set();
  doneTodayKeys.forEach(k => {
    if (seenKeys.has(k)) return;
    seenKeys.add(k);
    // Try to find a matching task-shape from any source (tasks array won't have it since filtered)
    // Parse the key to reconstruct a minimal display shape
    // keys look like: plot-{id}-{type}, animal-{id}-{type}, or species-{Type}-{type}
    const [kind, id, ...rest] = k.split("-");
    const typeSuffix = rest.join("-");
    if (kind === "plot") {
      const p = data.garden.plots.find(x => x.id === id);
      if (!p) return;
      const crop = rCM(data.region).get(p.crop);
      const zone = data.zones.find(z => z.id === p.zone);
      const loc = zone ? zone.name : "Farm";
      let title = `${p.name || p.crop}`;
      let emoji = crop?.emoji || "🌱";
      if (typeSuffix === "harvest") title = `Harvest ${p.name || p.crop}`;
      else if (typeSuffix === "water") { title = `Water ${p.name || p.crop}`; emoji = "💧"; }
      doneTodayList.push({ key: k, emoji, title, loc });
    } else if (kind === "species") {
      // Grouped species task — id is the species type name (e.g. "Chicken")
      const speciesType = id;
      const animals = (data.livestock?.animals || []).filter(x => x.type === speciesType);
      if (animals.length === 0) return;
      const headCount = animals.reduce((sum, x) => sum + (x.count || 1), 0);
      const db = LDB[speciesType];
      const speciesLabel = animalPlural(speciesType, headCount);
      const loc = animalLocName;
      let emoji = db?.e || "🐾";
      let title = speciesLabel;
      if (typeSuffix === "feed")       title = `Feed ${speciesLabel}`;
      else if (typeSuffix === "water"){ title = `Water ${speciesLabel}`; emoji = "💧"; }
      else if (typeSuffix === "eggs") { title = `Collect eggs — ${speciesLabel}`; emoji = "🥚"; }
      else if (typeSuffix === "clean"){ title = `Clean housing — ${speciesLabel}`; emoji = "🧹"; }
      else if (typeSuffix === "bedding"){title = `Full bedding change — ${speciesLabel}`; emoji = "🛏️"; }
      else if (typeSuffix === "paddock"){title = `Rotate paddock — ${speciesLabel}`; emoji = "🔄"; }
      doneTodayList.push({ key: k, emoji, title, loc });
    } else if (kind === "animal") {
      const a = (data.livestock?.animals || []).find(x => x.id === id);
      if (!a) return;
      const db = LDB[a.type];
      // Per-animal keys are now only health/hoof/hive — use animal's individual label
      const label = a.name ? `${a.name} (${a.type})` : a.type;
      const loc = animalLocName;
      let emoji = db?.e || "🐾";
      let title = label;
      if (typeSuffix === "health"){title = `Health check — ${label}`; emoji = "🩺"; }
      else if (typeSuffix === "hoof") { title = `Hoof check — ${label}`; emoji = "🦶"; }
      else if (typeSuffix === "hive") { title = `Hive inspection — ${label}`; emoji = "🐝"; }
      doneTodayList.push({ key: k, emoji, title, loc });
    }
  });

  // Un-mark helper: remove a key from today's completions (lets user undo a done tick)
  const undoDone = (key) => {
    const existing = (data.completions && data.completions[todayStr]) || [];
    if (!existing.includes(key)) return;
    setData({
      ...data,
      completions: {
        ...(data.completions || {}),
        [todayStr]: existing.filter(k => k !== key),
      },
    });
  };

  const MN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const today = new Date(); today.setHours(0,0,0,0);

  // Calendar grid
  const calStart = new Date(viewYear, viewMonth, 1);
  const calEnd = new Date(viewYear, viewMonth+1, 0);
  const firstDow = calStart.getDay();
  const daysInMonth = calEnd.getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // todayStr already computed at top of function (for completions); reused for calendar grid below

  const goToFarm = useCallback(() => setPage("farm"), [setPage]);

  return (
    <div className="page-enter" style={{maxWidth:1100}}>
      <h2 style={{fontFamily:F.head,fontSize:30,margin:"0 0 4px",letterSpacing:"-0.03em",fontWeight:800}}>📋 Task Calendar</h2>
      <p style={{color:C.t2,fontSize:13,margin:"0 0 16px",fontWeight:500}}>Today's work first, then the week, then the month</p>

      {/* ── Section 1: TODAY — attention banner + location-grouped routine + done-today ── */}
      {/* ── Section 1: NEEDS ATTENTION — harvests, steps, periodic animal care ── */}
      {attentionTasks.length > 0 && (
        <Card p={false} style={{overflow:"hidden",marginBottom:16,border:`1px solid #fecaca`}}>
          <div style={{padding:"14px 18px 10px",borderBottom:`1px solid ${C.bdr}`,background:"#fff5f5"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>⚠️</span>
                <div style={{fontSize:16,fontWeight:800,fontFamily:F.head,color:C.red,letterSpacing:"-0.01em"}}>Needs Attention</div>
              </div>
              <span style={{background:C.red,color:"#fff",fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:12}}>{attentionTasks.length}</span>
            </div>
            <div style={{fontSize:12,color:C.t2,marginTop:3}}>Do these today — miss the window and plants bolt, fail, or spoil</div>
          </div>
          <div style={{padding:"12px 14px"}}>
            {attentionTasks.map((t,i) => (
              <TaskRow
                key={t.key || `att-${i}`}
                t={t}
                onOpen={()=>openTask(t)}
                onToggleStep={togStep}
                onMarkDone={markDone}
                onGoToFarm={goToFarm}
              />
            ))}
          </div>
        </Card>
      )}

      {/* ── Section 2a: COMING UP — FARM (plot harvests + growing steps, next 7 days) ── */}
      <Card p={false} style={{overflow:"hidden",marginBottom:12}}>
        <button
          onClick={()=>setFarmWeekCollapsed(v=>!v)}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",background:"#f0faf0",border:"none",cursor:"pointer",borderBottom: farmWeekCollapsed ? "none" : `1px solid ${C.bdr}`}}
        >
          <div style={{textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>🌱</span>
              <div style={{fontSize:16,fontWeight:800,fontFamily:F.head,color:C.text,letterSpacing:"-0.01em"}}>Farm — This Week</div>
            </div>
            <div style={{fontSize:12,color:C.t2,marginTop:3}}>
              {thisWeekFarm.length === 0 ? "Nothing this week" : `${thisWeekFarm.length} task${thisWeekFarm.length === 1 ? "" : "s"} · harvests, transplants, pinching, pruning`}
            </div>
          </div>
          <span style={{fontSize:12,color:C.t2,fontWeight:600,fontFamily:F.mono}}>{farmWeekCollapsed ? "Show ▾" : "Hide ▴"}</span>
        </button>
        {!farmWeekCollapsed && (
          thisWeekFarm.length > 0 ? (
            <div style={{padding:"12px 14px"}}>
              {thisWeekFarm.map((t,i) => (
                <TaskRow
                  key={t.key || `farm-${i}`}
                  t={t}
                  onOpen={()=>openTask(t)}
                  onToggleStep={togStep}
                  onMarkDone={markDone}
                  onGoToFarm={goToFarm}
                />
              ))}
            </div>
          ) : (
            <div style={{textAlign:"center",padding:"20px 16px",color:C.t2,fontSize:12}}>🌱 Nothing growing step or harvest in the next 7 days</div>
          )
        )}
      </Card>

      {/* ── Section 2b: COMING UP — ANIMALS (weekly+ periodic care, next 7 days) ── */}
      <Card p={false} style={{overflow:"hidden",marginBottom:16}}>
        <button
          onClick={()=>setAnimalsWeekCollapsed(v=>!v)}
          style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",background:"#fff7eb",border:"none",cursor:"pointer",borderBottom: animalsWeekCollapsed ? "none" : `1px solid ${C.bdr}`}}
        >
          <div style={{textAlign:"left"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:16}}>🐄</span>
              <div style={{fontSize:16,fontWeight:800,fontFamily:F.head,color:C.text,letterSpacing:"-0.01em"}}>Animals — This Week</div>
            </div>
            <div style={{fontSize:12,color:C.t2,marginTop:3}}>
              {thisWeekAnimals.length === 0 ? "Nothing this week" : `${thisWeekAnimals.length} task${thisWeekAnimals.length === 1 ? "" : "s"} · cleaning, health, bedding, paddock rotation`}
            </div>
          </div>
          <span style={{fontSize:12,color:C.t2,fontWeight:600,fontFamily:F.mono}}>{animalsWeekCollapsed ? "Show ▾" : "Hide ▴"}</span>
        </button>
        {!animalsWeekCollapsed && (
          thisWeekAnimals.length > 0 ? (
            <div style={{padding:"12px 14px"}}>
              {thisWeekAnimals.map((t,i) => (
                <TaskRow
                  key={t.key || `animals-${i}`}
                  t={t}
                  onOpen={()=>openTask(t)}
                  onToggleStep={togStep}
                  onMarkDone={markDone}
                  onGoToFarm={goToFarm}
                />
              ))}
            </div>
          ) : (
            <div style={{textAlign:"center",padding:"20px 16px",color:C.t2,fontSize:12}}>🐄 No scheduled animal care this week</div>
          )
        )}
      </Card>

      {/* ── Section 3: DAILY ROUTINE — grouped by location, same every day ── */}
      <Card p={false} style={{overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"14px 18px 10px",borderBottom:`1px solid ${C.bdr}`,background:"linear-gradient(180deg, #f0faf0, #fff)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18}}>☀️</span>
              <div style={{fontSize:16,fontWeight:800,fontFamily:F.head,color:C.text,letterSpacing:"-0.01em"}}>Daily Routine</div>
            </div>
            <div style={{fontSize:12,color:C.t2,fontFamily:F.mono,fontWeight:600}}>
              {new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short"})}
            </div>
          </div>
          <div style={{fontSize:12,color:C.t2,marginTop:3}}>
            {routineTasks.length === 0
              ? "No routine tasks set up yet"
              : `${routineTasks.length} task${routineTasks.length === 1 ? "" : "s"} · your daily walk`}
          </div>
        </div>

        {routineLocations.length > 0 ? (
          <div style={{padding:"14px"}}>
            {routineLocations.map(loc => (
              <div key={loc} style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,paddingLeft:2}}>
                  <span style={{fontSize:16}}>{locIcon(loc)}</span>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,textTransform:"uppercase",letterSpacing:"0.04em"}}>At the {loc}</div>
                  <div style={{marginLeft:"auto",fontSize:11,color:C.t2,fontWeight:600,fontFamily:F.mono}}>
                    {routineByLoc[loc].length}
                  </div>
                </div>
                {routineByLoc[loc].map((t,i) => (
                  <TaskRow
                    key={t.key || `${loc}-${i}`}
                    t={t}
                    onOpen={()=>openTask(t)}
                    onToggleStep={togStep}
                    onMarkDone={markDone}
                    onGoToFarm={goToFarm}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div style={{textAlign:"center",padding:"28px 20px",color:C.t2,fontSize:13}}>
            ✨ All routine done for today
          </div>
        )}
      </Card>

      {/* ── Done today — collapsible, stands on its own ── */}
      {doneTodayList.length > 0 && (
        <Card p={false} style={{overflow:"hidden",marginBottom:16,background:"#fafcfa"}}>
          <button
            onClick={()=>setDoneCollapsed(v=>!v)}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:C.green,letterSpacing:"0.02em"}}
          >
            <span>✓ Done today · {doneTodayList.length}</span>
            <span style={{fontSize:11,color:C.t2,fontWeight:500,fontFamily:F.mono}}>{doneCollapsed ? "Show ▾" : "Hide ▴"}</span>
          </button>
          {!doneCollapsed && (
            <div style={{padding:"0 14px 14px"}}>
              {doneTodayList.map((d,i) => (
                <div key={d.key || i} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",marginBottom:4,background:"#fff",borderRadius:C.rs,border:`1px solid ${C.bdr}`,opacity:0.65}}>
                  <span style={{fontSize:20,flexShrink:0}}>{d.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:C.t2,textDecoration:"line-through"}}>{d.title}</div>
                    <div style={{fontSize:11,color:C.t2,marginTop:2}}>📍 {d.loc}</div>
                  </div>
                  <button onClick={()=>undoDone(d.key)} style={{background:"none",border:`1px solid ${C.bdr}`,color:C.t2,borderRadius:6,padding:"5px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}}>Undo</button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Section 4: Calendar — full width ── */}
      <Card p={false} style={SX.overflowHidden}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${C.bdr}`}}>
          <button onClick={()=>{let m=viewMonth-1,y=viewYear;if(m<0){m=11;y--;}setViewMonth(m);setViewYear(y);}} style={{background:"none",border:"none",cursor:"pointer",color:C.t2,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronLeft size={20} strokeWidth={2}/></button>
          <div style={{fontFamily:F.head,fontSize:17,fontWeight:700}}>{MN[viewMonth]} {viewYear}</div>
          <button onClick={()=>{let m=viewMonth+1,y=viewYear;if(m>11){m=0;y++;}setViewMonth(m);setViewYear(y);}} style={{background:"none",border:"none",cursor:"pointer",color:C.t2,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}><ChevronRight size={20} strokeWidth={2}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"10px 16px 4px",gap:2}}>
          {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.t2,fontFamily:F.mono}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"4px 16px 16px",gap:4}}>
          {cells.map((d,i) => {
            if (!d) return <div key={i}/>;
            const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const evts = (calendarEvents[dateStr] || []).filter(ev => ev.routine !== true);
            const isToday = dateStr === todayStr;
            const isSel = dateStr === selectedDate;
            const hasHarvest = evts.some(e=>e.type==="harvest");
            const hasStep = evts.some(e=>e.type==="step");
            return (
              <div key={i} onClick={()=>setSelectedDate(isSel?null:dateStr)} style={{textAlign:"center",padding:"6px 2px",borderRadius:10,background:isSel?"#1a5c2e":isToday?C.green:evts.length>0?"#f0f7f4":"transparent",minHeight:52,cursor:"pointer",border:isSel?"2px solid #145224":"2px solid transparent",transition:"all 0.15s ease"}}>
                <div style={{fontSize:13,fontWeight:(isToday||isSel)?700:400,color:(isToday||isSel)?"#fff":C.text}}>{d}</div>
                {evts.length > 0 && (
                  <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:3,flexWrap:"wrap"}}>
                    {hasHarvest && <div style={{width:7,height:7,borderRadius:4,background:isSel?"#ffb347":C.orange}} title="Harvest"/>}
                    {hasStep && <div style={{width:7,height:7,borderRadius:4,background:isSel?"#87ceeb":C.blue}} title="Step due"/>}
                  </div>
                )}
                {evts.length > 0 && (
                  <div style={{fontSize:10,color:(isToday||isSel)?"rgba(255,255,255,.8)":C.t2,marginTop:2,lineHeight:1.1}}>
                    {evts.slice(0,1).map(e=>e.emoji).join("")}{evts.length>1?`+${evts.length-1}`:""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:14,padding:"8px 18px 14px",borderTop:`1px solid ${C.bdr}`,flexWrap:"wrap"}}>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.t2}}><div style={{width:8,height:8,borderRadius:4,background:C.orange}}/> Harvest</span>
          <span style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.t2}}><div style={{width:8,height:8,borderRadius:4,background:C.blue}}/> Growing step</span>
          <span style={{fontSize:10,color:C.t2,marginLeft:"auto"}}>Tap a day to see tasks</span>
        </div>

        {/* ── Selected Day Task List ── */}
        {selectedDate && (() => {
          const selEvts = (calendarEvents[selectedDate] || []).filter(ev => ev.routine !== true);
          const selDateObj = new Date(selectedDate + "T00:00:00");
          const dayLabel = selDateObj.toLocaleDateString("en-GB", {weekday:"long", day:"numeric", month:"long", year:"numeric"});
          const isSelToday = selectedDate === todayStr;
          return (
            <div style={{borderTop:`2px solid ${C.green}`,padding:"14px 18px 16px",background:"#f8fdf9"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,color:C.text}}>
                    {isSelToday ? "📌 Today" : "📅"} {dayLabel}
                  </div>
                  <div style={SX.t2_11mt2}>
                    {selEvts.length === 0 ? "No tasks scheduled" : `${selEvts.length} task${selEvts.length>1?"s":""} scheduled`}
                  </div>
                </div>
                <button onClick={()=>setSelectedDate(null)} style={{background:"none",border:`1px solid ${C.bdr}`,borderRadius:8,padding:"4px 10px",fontSize:11,color:C.t2,cursor:"pointer",fontWeight:600}}>✕ Close</button>
              </div>
              {selEvts.length === 0
                ? <div style={{textAlign:"center",padding:"20px 0",color:C.t2,fontSize:12}}>🌱 Nothing to do — enjoy the day!</div>
                : <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {selEvts.map((evt,idx) => {
                      // Synthesize a task-shape object so we can reuse TaskRow
                      const loc = evt.plotId
                        ? (data.zones.find(z => z.id === (data.garden.plots.find(p => p.id === evt.plotId)?.zone))?.name || "Farm")
                        : (data.zones.find(z => ["barn","pasture"].includes(z.type))?.name || "Farm");
                      const pri = evt.type === "harvest" ? 0 : evt.type === "step" ? 1 : evt.type === "feed" || evt.type === "water" || evt.type === "eggs" ? 1 : 2;
                      const daysOut = Math.max(0, Math.ceil((selDateObj - today) / 864e5));
                      const tAsTask = {
                        key: evt.key,
                        pri,
                        type: evt.type,
                        emoji: evt.emoji,
                        title: evt.label,
                        loc,
                        plotId: evt.plotId,
                        animalId: evt.animalId,
                        stepIdx: evt.stepIdx,
                        daysOut,
                        dueDate: selDateObj,
                      };
                      return (
                        <TaskRow
                          key={evt.key || idx}
                          t={tAsTask}
                          onOpen={()=>openTask(tAsTask)}
                          onToggleStep={togStep}
                          onMarkDone={isSelToday ? markDone : undefined}
                          onGoToFarm={goToFarm}
                        />
                      );
                    })}
                  </div>
              }
            </div>
          );
        })()}
      </Card>

      {openPlot && <PlotOverlay plot={openPlot} data={data} setData={setData} onClose={()=>setOpenPlotId(null)}/>}
      {openAnimal && <AnimalOverlay animal={openAnimal} data={data} setData={setData} onClose={()=>setOpenAnimalId(null)}/>}
    </div>
  );
}


/* ═══════════════════════════════════════════
   FARM SETUP — simplified editing
   ═══════════════════════════════════════════ */
function Setup({data, setData}) {
  const [showAdd, setShowAdd] = useState(false);
  const [sel, setSel] = useState(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({name:"", type:"veg", wM:"10", hM:"8"});
  const [farmW, setFarmW] = useState(data.farmW || 100); // total farm width in meters
  const [farmH, setFarmH] = useState(data.farmH || 60);  // total farm height in meters
  const [dragging, setDragging] = useState(null); // {id, startX, startY, origXM, origYM}
  const [zoneResize, setZoneResize] = useState(null); // {id, edge, startX, startY, origXM, origYM, origWM, origHM}
  const [cropDrag, setCropDrag] = useState(null); // {plotId, zoneId, startX, startY, origPx, origPy}
  const [cropResize, setCropResize] = useState(null); // {plotId, zoneId, startX, startY, origPw, origPh, frac}
  const [hoverInfo, setHoverInfo] = useState(null); // zone hover tooltip
  const svgRef = useRef(null);
  const [cityQuery, setCityQuery] = useState(data.city || "");
  const [cityResults, setCityResults] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityRef = useRef(null);
  const curRegion = REGION_MAP.get(data.region || "western_europe");
  const regionCropCount = getRegionalCrops(data.region || "western_europe").length;

  // Zones already migrated to meter coords on load (see migrateZones)
  const zones = data.zones;

  const upZ = (id, u) => setData({...data, zones: data.zones.map(z => z.id===id ? {...z,...u} : z)});
  const delZ = id => { setData({...data, zones: data.zones.filter(z => z.id !== id)}); setSel(null); };
  const upPlot = (plotId, u) => setData({...data, garden:{...data.garden, plots: data.garden.plots.map(p => p.id===plotId ? {...p,...u} : p)}});
  const sz = zones.find(z => z.id === sel);

  const doSave = () => {
    setData({...data, setupDone:true, farmW, farmH,
      zones: zones // save with meter coords
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const addZ = () => {
    if (!form.name) return;
    const wM = Math.max(1, +form.wM || 10);
    const hM = Math.max(1, +form.hM || 8);
    setData({...data, zones:[...data.zones, {
      id:uid(), name:form.name, type:form.type,
      xM:2, yM:2, wM, hM,
      // keep legacy fields for compatibility
      x:2/farmW*100, y:2/farmH*100, w:wM/farmW*100, h:hM/farmH*100
    }]});
    setForm({name:"", type:"veg", wM:"10", hM:"8"});
    setShowAdd(false);
  };

  // Drag is handled inline on the map container div

  return (
    <div className="page-enter" style={{maxWidth:860}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={SX.headerH2}>🗺 Farm Designer</h2>
          <p style={{color:C.t2,fontSize:13,margin:"4px 0",fontWeight:500}}>Drag zones to position · Enter real measurements in metres</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Btn v="secondary" onClick={()=>setShowAdd(true)}>+ Zone</Btn>
          {data.zones.length>0 && <Btn onClick={doSave}>{saved?"✓ Saved!":"Save Layout"}</Btn>}
        </div>
      </div>

      {/* Climate Region — city input */}
      <Card style={{marginBottom:12,padding:"14px 18px",background:"linear-gradient(135deg,#f0f7f0,#e8f5e9)",border:`1.5px solid ${C.gm}`}}>
        <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
          <span style={{fontSize:18}}>{curRegion ? curRegion.emoji : "🌍"}</span>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:C.green}}>Climate Region{curRegion ? `: ${curRegion.name}` : ""}</div>
            <div style={SX.t2_11}>{curRegion ? curRegion.desc : "Type your city below to set your growing region"}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div style={{position:"relative",flex:"1 1 200px",minWidth:180}} ref={cityRef}>
            <label style={{fontSize:11,fontWeight:600,color:C.t2,display:"block",marginBottom:3}}>Your City</label>
            <input type="text" placeholder="Type your city (e.g. London, Berlin, Chicago...)" value={cityQuery}
              onChange={function(e) {
                const v = e.target.value;
                setCityQuery(v);
                if (v.length < 2) { setCityResults([]); setShowCityDropdown(false); return; }
                const res = searchCity(v);
                setCityResults(res);
                setShowCityDropdown(res.length > 0);
              }}
              onFocus={function() { if (cityResults.length > 0) setShowCityDropdown(true); }}
              onBlur={function() { setTimeout(function() { setShowCityDropdown(false); }, 200); }}
              style={{width:"100%",padding:"8px 12px",border:`1.5px solid ${C.bdr}`,borderRadius:10,fontSize:14,fontFamily:F.body,background:"#fff",outline:"none",boxSizing:"border-box"}}/>
            {showCityDropdown && cityResults.length > 0 && (
              <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#fff",border:`1px solid ${C.bdr}`,borderRadius:10,boxShadow:C.shL,zIndex:50,maxHeight:220,overflowY:"auto",marginTop:4}}>
                {cityResults.map(function(c, idx) {
                  const rInfo = REGION_MAP.get(c.region);
                  return (
                    <div key={c.city + "-" + c.country + "-" + idx}
                      onMouseDown={function() {
                        setCityQuery(c.city + ", " + c.country);
                        setData({...data, city: c.city + ", " + c.country, region: c.region});
                        setShowCityDropdown(false);
                      }}
                      style={{padding:"8px 14px",cursor:"pointer",borderBottom:`1px solid ${C.bdr}`,fontSize:13,display:"flex",justifyContent:"space-between",alignItems:"center"}}
                      onMouseOver={function(e) { e.currentTarget.style.background = C.gp; }}
                      onMouseOut={function(e) { e.currentTarget.style.background = "transparent"; }}>
                      <span style={{fontWeight:600}}>{c.city}, {c.country}</span>
                      <span style={SX.t2_11}>{rInfo ? rInfo.emoji + " " + rInfo.name : c.region}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{flex:"1 1 200px",minWidth:180}}>
            <label style={{fontSize:11,fontWeight:600,color:C.t2,display:"block",marginBottom:3}}>Or pick a region</label>
            <select value={data.region || "western_europe"}
              onChange={function(e) { setData({...data, region: e.target.value}); }}
              style={{width:"100%",padding:"8px 12px",border:`1.5px solid ${C.bdr}`,borderRadius:10,fontSize:13,fontFamily:F.body,background:"#fff",cursor:"pointer",boxSizing:"border-box"}}>
              {REGIONS.map(function(r) {
                return <option key={r.id} value={r.id}>{r.emoji} {r.name} — {r.examples}</option>;
              })}
            </select>
          </div>
        </div>
        {curRegion && <div style={{marginTop:8,fontSize:11,color:C.t2,fontStyle:"italic"}}>{regionCropCount} crops available for {curRegion.name} climate</div>}
      </Card>

      {/* Farm size config */}
      <Card style={{marginBottom:12,padding:"10px 16px"}}>
        <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:C.t2}}>🗺 Total Farm Size:</span>
          <div style={SX.rowCenterG6}>
            <label style={SX.t2_12}>Width</label>
            <input type="number" min="10" max="2000" value={farmW}
              onChange={e => { const v = +e.target.value||100; setFarmW(v); setData({...data, farmW:v}); }}
              style={{width:70,padding:"4px 8px",border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:13,fontFamily:F.mono}}/>
            <span style={SX.t2_12}>m</span>
          </div>
          <div style={SX.rowCenterG6}>
            <label style={SX.t2_12}>Height</label>
            <input type="number" min="10" max="2000" value={farmH}
              onChange={e => { const v = +e.target.value||60; setFarmH(v); setData({...data, farmH:v}); }}
              style={{width:70,padding:"4px 8px",border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:13,fontFamily:F.mono}}/>
            <span style={SX.t2_12}>m</span>
          </div>
          <span style={{fontSize:11,color:C.t3,fontFamily:F.mono}}>{farmW}m × {farmH}m = {(farmW*farmH).toLocaleString()} m²</span>
        </div>
      </Card>

      {/* Draggable Farm Map — clean light style (matches Dashboard) */}
      <div ref={svgRef} style={{
        position:"relative",
        background:"linear-gradient(180deg,#f7faf5,#edf4e8)",
        border:`1px solid ${C.bdr}`,borderRadius:16,overflow:"hidden",
        minHeight:440,userSelect:"none",
        cursor:dragging?"grabbing":"default",
      }}
        onClick={e => { if (e.target === svgRef.current) setSel(null); }}
        onMouseMove={e => {
          const rect = svgRef.current.getBoundingClientRect();
          const curX = e.clientX - rect.left;
          const curY = e.clientY - rect.top;
          // Crop patch resize — adjust width/height while keeping same area fraction
          if (cropResize) {
            const zoneEl = document.getElementById(`zone-${cropResize.zoneId}`);
            if (zoneEl) {
              const zr = zoneEl.getBoundingClientRect();
              const dx = (curX - (zr.left - rect.left) - cropResize.startX) / zr.width;
              const dy = (curY - (zr.top - rect.top) - cropResize.startY) / zr.height;
              let newPw = Math.max(0.15, Math.min(1, cropResize.origPw + dx));
              let newPh = Math.max(0.08, Math.min(1, cropResize.frac / newPw)); // keep area constant
              newPh = Math.min(1, newPh);
              upPlot(cropResize.plotId, {patchW: newPw, patchH: newPh});
            }
            return;
          }
          // Crop patch drag — move within zone
          if (cropDrag) {
            const zoneEl = document.getElementById(`zone-${cropDrag.zoneId}`);
            if (zoneEl) {
              const zr = zoneEl.getBoundingClientRect();
              const dx = (curX - (zr.left - rect.left) - cropDrag.startX) / zr.width;
              const dy = (curY - (zr.top - rect.top) - cropDrag.startY) / zr.height;
              const newPx = Math.max(0, Math.min(1, cropDrag.origPx + dx));
              const newPy = Math.max(0, Math.min(1, cropDrag.origPy + dy));
              upPlot(cropDrag.plotId, {patchX: newPx, patchY: newPy});
            }
            return;
          }
          // Zone resize — drag edges/corners to change size
          if (zoneResize) {
            const dxM = ((curX - zoneResize.startX) / rect.width) * farmW;
            const dyM = ((curY - zoneResize.startY) / rect.height) * farmH;
            const e2 = zoneResize.edge;
            let {origXM, origYM, origWM, origHM} = zoneResize;
            let newXM = origXM, newYM = origYM, newWM = origWM, newHM = origHM;
            if (e2.includes("r")) newWM = Math.max(3, origWM + dxM);
            if (e2.includes("b")) newHM = Math.max(3, origHM + dyM);
            if (e2.includes("l")) { newXM = Math.max(0, origXM + dxM); newWM = Math.max(3, origWM - dxM); }
            if (e2.includes("t")) { newYM = Math.max(0, origYM + dyM); newHM = Math.max(3, origHM - dyM); }
            upZ(zoneResize.id, {xM:newXM, yM:newYM, wM:newWM, hM:newHM, x:newXM/farmW*100, y:newYM/farmH*100, w:newWM/farmW*100, h:newHM/farmH*100});
            return;
          }
          // Zone drag
          if (!dragging) return;
          const dxPct = ((curX - dragging.startX) / rect.width) * 100;
          const dyPct = ((curY - dragging.startY) / rect.height) * 100;
          const dxM = dxPct / 100 * farmW;
          const dyM = dyPct / 100 * farmH;
          const z = zones.find(z => z.id === dragging.id);
          const newXM = Math.max(0, Math.min(farmW - (z.wM||10), dragging.origXM + dxM));
          const newYM = Math.max(0, Math.min(farmH - (z.hM||8), dragging.origYM + dyM));
          upZ(dragging.id, {xM: newXM, yM: newYM, x: newXM/farmW*100, y: newYM/farmH*100});
        }}
        onMouseUp={() => { setDragging(null); setZoneResize(null); setCropDrag(null); setCropResize(null); }}
        onMouseLeave={() => { setDragging(null); setZoneResize(null); setCropDrag(null); setCropResize(null); setHoverInfo(null); }}>

        {/* Grid overlay */}
        <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(to right, rgba(80,95,80,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(80,95,80,.06) 1px, transparent 1px)",backgroundSize:"24px 24px",pointerEvents:"none"}}/>

        {/* Grid labels — X axis (every 10m) */}
        <div style={{position:"absolute",bottom:2,left:0,right:0,display:"flex",pointerEvents:"none"}}>
          {Array.from({length: Math.floor(farmW/10)+1}).map((_,i) => (
            <span key={i} style={{position:"absolute",left:`${(i*10/farmW)*100}%`,transform:"translateX(-50%)",fontSize:8,fontFamily:F.mono,color:"rgba(80,95,80,.35)"}}>{i*10}m</span>
          ))}
        </div>
        {/* Grid labels — Y axis (every 10m) */}
        <div style={{position:"absolute",top:0,left:2,bottom:0,pointerEvents:"none"}}>
          {Array.from({length: Math.floor(farmH/10)+1}).map((_,i) => (
            <span key={i} style={{position:"absolute",top:`${(i*10/farmH)*100}%`,fontSize:8,fontFamily:F.mono,color:"rgba(80,95,80,.35)"}}>{i*10}m</span>
          ))}
        </div>

        {/* North indicator */}
        <div style={{position:"absolute",top:8,left:12,fontSize:10,fontFamily:F.mono,fontWeight:700,color:"rgba(80,95,80,.35)",pointerEvents:"none"}}>N↑</div>

        {/* Zone hover tooltip */}
        {!dragging && hoverInfo && (
          <div style={{
            position:"absolute", left: hoverInfo.x, top: hoverInfo.y - 8,
            transform:"translate(-50%, -100%)", zIndex:50, pointerEvents:"none",
            minWidth:180, maxWidth:240,
          }}>
            <div style={{
              background:"#1d1d1f", color:"#fff", borderRadius:10, padding:"10px 14px",
              fontSize:12, lineHeight:1.5, fontFamily:F.body, boxShadow:"0 8px 24px rgba(0,0,0,.25)",
            }}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{hoverInfo.icon} {hoverInfo.name}</div>
              <div style={{opacity:.7,fontSize:11,marginBottom:2}}>{hoverInfo.typeLabel}</div>
              <div style={{opacity:.7,fontSize:11}}>{hoverInfo.wM}×{hoverInfo.hM}m · {hoverInfo.area} m²</div>
              {hoverInfo.cropCount > 0 && <div style={{marginTop:4,fontSize:11,color:"#95d5b2"}}>{hoverInfo.cropCount} crop{hoverInfo.cropCount>1?"s":""} planted</div>}
              {hoverInfo.animalCount > 0 && <div style={{fontSize:11,color:"#ffcc00"}}>{hoverInfo.animalCount} animal{hoverInfo.animalCount>1?"s":""}</div>}
            </div>
            <div style={{width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1d1d1f",margin:"0 auto"}}/>
          </div>
        )}

        {/* Zone blocks — with crop color patches (same as Dashboard) */}
        {(()=>{
          const SETUP_CC = CROP_COLORS;
          const setupColorMap = new Map(); let sci=0;
          data.garden.plots.forEach(p=>{ if(p.status!=="harvested"&&!setupColorMap.has(p.crop)){setupColorMap.set(p.crop,SETUP_CC[sci%SETUP_CC.length]);sci++;} });
          return zones.map(z => {
            const zt = ZT_MAP.get(z.type);
            const xPct = ((z.xM||0) / farmW * 100).toFixed(2);
            const yPct = ((z.yM||0) / farmH * 100).toFixed(2);
            const wPct = ((z.wM||10) / farmW * 100).toFixed(2);
            const hPct = ((z.hM||8) / farmH * 100).toFixed(2);
            const isSel = sel === z.id;
            const isDraggingThis = dragging?.id === z.id;
            const isPlant = ["veg","orchard","herbs","greenhouse"].includes(z.type);
            const zPlots = data.garden.plots.filter(p => p.zone === z.id && p.status !== "harvested");
            const isAnimalZone = ["barn","pasture"].includes(z.type);
            const zAnimals = isAnimalZone ? data.livestock.animals.filter(a => LDB[a.type]) : [];
            const animalCount = zAnimals.reduce((s,a) => s + a.count, 0);

            // Build crop patches — use saved positions if available, otherwise auto-layout
            const zoneTotalM2 = (z.wM||10)*(z.hM||8);
            const cropPatches = [];
            if (isPlant && zPlots.length > 0 && zoneTotalM2 > 0) {
              let autoFillY = 1;
              zPlots.forEach(p => {
                let area = 0;
                if (p.measureType==="area"&&p.qty) area=+p.qty;
                else if (p.plantCount) { const cr=rCM(data.region).get(p.crop); if(cr){const sp=cr.spacing/100;area=p.plantCount*sp*sp;} }
                if (area>0) {
                  const frac=Math.min(0.98,area/zoneTotalM2);
                  const cc=setupColorMap.get(p.crop)||{r:100,g:140,b:60};
                  // Use saved patch position/size if the plot has them, else auto-layout
                  let pw, ph, px, py;
                  if (p.patchW !== undefined && p.patchH !== undefined) {
                    pw = p.patchW; ph = p.patchH;
                    px = p.patchX || 0.03; py = p.patchY || 0;
                  } else {
                    const side = Math.sqrt(frac);
                    pw = Math.min(1, side * 1.2);
                    ph = Math.min(1, frac / pw);
                    px = 0.03;
                    py = Math.max(0, autoFillY - ph);
                    autoFillY -= ph + 0.02;
                  }
                  cropPatches.push({plotId:p.id,crop:p.crop,name:p.name||p.crop,frac,pctLabel:Math.round(frac*100),cc,pw,ph,px,py});
                }
              });
              cropPatches.sort((a,b)=>b.frac-a.frac);
            }

            return (
              <div key={z.id} id={`zone-${z.id}`}
                onMouseDown={e => {
                  // Only start zone drag if not clicking a crop patch
                  if (e.target.closest('[data-crop-patch]')) return;
                  e.stopPropagation();
                  const rect = svgRef.current.getBoundingClientRect();
                  const z2 = zones.find(zz => zz.id === z.id);
                  setDragging({id:z.id,startX:e.clientX-rect.left,startY:e.clientY-rect.top,origXM:z2.xM||0,origYM:z2.yM||0,rect});
                  setSel(z.id);
                }}
                onMouseMove={e => {
                  if (!dragging && !cropDrag && !cropResize) {
                    const rect = svgRef.current.getBoundingClientRect();
                    setHoverInfo({x:e.clientX-rect.left,y:e.clientY-rect.top,name:z.name,icon:zt?.icon||"",typeLabel:zt?.label||z.type,wM:(z.wM||10).toFixed(0),hM:(z.hM||8).toFixed(0),area:((z.wM||10)*(z.hM||8)).toFixed(0),cropCount:zPlots.length,animalCount});
                  }
                }}
                onMouseLeave={() => setHoverInfo(null)}
                onClick={e => { if (!dragging && !cropDrag && !cropResize) setSel(z.id); }}
                style={{
                  position:"absolute",
                  left:`${xPct}%`,top:`${yPct}%`,width:`${wPct}%`,height:`${hPct}%`,
                  borderRadius:10,
                  border:`2px solid ${isSel ? C.green : "rgba(35,50,35,.12)"}`,
                  boxShadow: isSel ? `0 0 0 3px rgba(45,106,79,.25), 0 0 16px rgba(45,106,79,.15), inset 0 0 20px rgba(45,106,79,.08)` : "0 2px 8px rgba(0,0,0,.06)",
                  background: zt?.fill ? `${zt.fill}${isSel ? "bb" : "88"}` : "#ddd8",
                  cursor: isDraggingThis ? "grabbing" : "pointer",
                  opacity: isDraggingThis ? 0.75 : 1,
                  transition: dragging ? "none" : "all .2s ease",
                  transform: isSel && !isDraggingThis ? "scale(1.02)" : "scale(1)",
                  overflow:"hidden",
                }}>
                {/* Zone name */}
                <div style={{position:"absolute",top:0,left:0,right:0,padding:"2px 4px",fontSize:10,fontWeight:700,color:"#213321",textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",zIndex:3,pointerEvents:"none"}}>{z.name}</div>
                {/* Crop patches — draggable + resizable */}
                {cropPatches.map((cb,i) => {
                  const isDragThis = cropDrag?.plotId === cb.plotId;
                  const isResizeThis = cropResize?.plotId === cb.plotId;
                  return (
                    <div key={cb.plotId} data-crop-patch="true"
                      onMouseDown={e => {
                        e.stopPropagation();
                        const zoneEl = document.getElementById(`zone-${z.id}`);
                        if (!zoneEl) return;
                        const zr = zoneEl.getBoundingClientRect();
                        setCropDrag({plotId:cb.plotId, zoneId:z.id,
                          startX: e.clientX - zr.left, startY: e.clientY - zr.top,
                          origPx: cb.px, origPy: cb.py});
                      }}
                      style={{
                        position:"absolute",
                        left:`${(cb.px*100).toFixed(1)}%`,top:`${(cb.py*100).toFixed(1)}%`,
                        width:`${(cb.pw*100).toFixed(1)}%`,height:`${(cb.ph*100).toFixed(1)}%`,
                        background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.38)`,
                        borderRadius:6,overflow:"visible",
                        display:"flex",alignItems:"center",justifyContent:"center",zIndex:1,
                        cursor: isDragThis ? "grabbing" : "grab",
                        border: (isDragThis||isResizeThis) ? `1.5px dashed rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.7)` : "1px solid transparent",
                        transition: (cropDrag||cropResize) ? "none" : "all .15s",
                      }}>
                      <div style={{position:"absolute",inset:"10%",borderRadius:"50%",background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.25)`,filter:"blur(8px)",zIndex:0,pointerEvents:"none"}}/>
                      <div style={{position:"relative",zIndex:1,textAlign:"center",lineHeight:1.2,pointerEvents:"none"}}>
                        <div style={{fontSize:10,fontWeight:900,color:"#fff",textShadow:"0 1px 4px rgba(0,0,0,.55)"}}>{cb.pctLabel}%</div>
                        <div style={{fontSize:7,fontWeight:700,color:"rgba(255,255,255,.9)",textShadow:"0 1px 2px rgba(0,0,0,.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%",padding:"0 2px"}}>{cb.name}</div>
                      </div>
                      {/* Resize handle — bottom-right corner */}
                      <div data-crop-patch="true"
                        onMouseDown={e => {
                          e.stopPropagation();
                          const zoneEl = document.getElementById(`zone-${z.id}`);
                          if (!zoneEl) return;
                          const zr = zoneEl.getBoundingClientRect();
                          setCropResize({plotId:cb.plotId, zoneId:z.id,
                            startX: e.clientX - zr.left, startY: e.clientY - zr.top,
                            origPw: cb.pw, origPh: cb.ph, frac: cb.frac});
                          setCropDrag(null); // don't drag while resizing
                        }}
                        style={{
                          position:"absolute",bottom:-3,right:-3,width:10,height:10,
                          background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.7)`,
                          borderRadius:"0 6px 0 4px",cursor:"nwse-resize",zIndex:5,
                          border:"1.5px solid rgba(255,255,255,.6)",
                        }}/>
                    </div>
                  );
                })}
                {/* Size label */}
                <span style={{position:"absolute",bottom:2,left:"50%",transform:"translateX(-50%)",fontSize:8,fontFamily:F.mono,color:"rgba(35,50,35,.4)",whiteSpace:"nowrap",pointerEvents:"none",zIndex:2}}>{(z.wM||0).toFixed(0)}×{(z.hM||0).toFixed(0)}m</span>
                {/* Resize handles — show when selected, like Paint */}
                {isSel && ["r","b","l","t","rb","lb","rt","lt"].map(edge => {
                  const isCorner = edge.length === 2;
                  const sz3 = isCorner ? 10 : 6;
                  const pos = {};
                  if (edge.includes("t")) { pos.top = -sz3/2; }
                  if (edge.includes("b")) { pos.bottom = -sz3/2; }
                  if (edge.includes("l")) { pos.left = -sz3/2; }
                  if (edge.includes("r")) { pos.right = -sz3/2; }
                  if (edge === "t" || edge === "b") { pos.left = "50%"; pos.transform = "translateX(-50%)"; }
                  if (edge === "l" || edge === "r") { pos.top = "50%"; pos.transform = "translateY(-50%)"; }
                  const cursors = {r:"ew-resize",l:"ew-resize",t:"ns-resize",b:"ns-resize",rb:"nwse-resize",lt:"nwse-resize",rt:"nesw-resize",lb:"nesw-resize"};
                  return (
                    <div key={edge} data-crop-patch="true"
                      onMouseDown={e => {
                        e.stopPropagation();
                        const rect2 = svgRef.current.getBoundingClientRect();
                        setZoneResize({id:z.id, edge, startX:e.clientX-rect2.left, startY:e.clientY-rect2.top,
                          origXM:z.xM||0, origYM:z.yM||0, origWM:z.wM||10, origHM:z.hM||8});
                      }}
                      style={{position:"absolute",...pos, width:sz3, height:sz3,
                        background:"#fff", border:`2px solid ${C.green}`, borderRadius:isCorner?2:1,
                        cursor:cursors[edge], zIndex:10,
                      }}/>
                  );
                })}
              </div>
            );
          });
        })()}

        {/* Selected zone info panel — persistent game-style HUD */}
        {sel && !dragging && (() => {
          const sz2 = zones.find(z => z.id === sel);
          if (!sz2) return null;
          const zt2 = ZT_MAP.get(sz2.type);
          const area2 = ((sz2.wM||10)*(sz2.hM||8)).toFixed(0);
          const zPlots2 = data.garden.plots.filter(p => p.zone === sel && p.status !== "harvested");
          const isAnimal2 = ["barn","pasture"].includes(sz2.type);
          const animalCount2 = isAnimal2 ? data.livestock.animals.filter(a => LDB[a.type]).reduce((s,a) => s + a.count, 0) : 0;
          // Position panel near the zone
          const panelX = Math.min(75, Math.max(5, ((sz2.xM||0) / farmW * 100) + ((sz2.wM||10) / farmW * 100) + 1));
          const panelY = Math.max(3, ((sz2.yM||0) / farmH * 100));
          // If panel would go off-right, put it on the left side of zone
          const flipLeft = panelX > 70;
          const finalX = flipLeft ? Math.max(2, ((sz2.xM||0) / farmW * 100) - 26) : panelX;
          return (
            <div style={{
              position:"absolute", left:`${finalX}%`, top:`${panelY}%`,
              zIndex:60, width:180, animation:"fadeIn .2s ease",
            }}>
              <div style={{
                background:"linear-gradient(135deg,#1a2e1a,#243524)", color:"#fff",
                borderRadius:14, padding:"14px 16px",
                boxShadow:"0 8px 32px rgba(0,0,0,.35), 0 0 0 1px rgba(255,255,255,.08)",
                backdropFilter:"blur(8px)", border:"1px solid rgba(100,180,100,.2)",
              }}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:18}}>{zt2?.icon || "📍"}</div>
                  <div onClick={(e) => { e.stopPropagation(); setSel(null); }}
                    style={{width:20,height:20,borderRadius:10,background:"rgba(255,255,255,.1)",
                      display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
                      fontSize:11,color:"rgba(255,255,255,.5)",lineHeight:1}}>✕</div>
                </div>
                <div style={{fontSize:15,fontWeight:800,marginBottom:2,fontFamily:F.head,letterSpacing:"-0.02em"}}>{sz2.name}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:10,fontWeight:500}}>{zt2?.label || sz2.type}</div>
                <div className="g2" style={{gap:6,marginBottom:8}}>
                  <div style={{background:"rgba(255,255,255,.06)",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:15,fontWeight:800,fontFamily:F.mono}}>{(sz2.wM||10).toFixed(0)}×{(sz2.hM||8).toFixed(0)}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.4)",marginTop:1}}>metres</div>
                  </div>
                  <div style={{background:"rgba(255,255,255,.06)",borderRadius:8,padding:"6px 8px",textAlign:"center"}}>
                    <div style={{fontSize:15,fontWeight:800,fontFamily:F.mono}}>{area2}</div>
                    <div style={{fontSize:9,color:"rgba(255,255,255,.4)",marginTop:1}}>m²</div>
                  </div>
                </div>
                {zPlots2.length > 0 && (
                  <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:8,marginTop:4}}>
                    <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.4)",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"}}>Crops</div>
                    {zPlots2.slice(0,4).map(p => (
                      <div key={p.id} style={{fontSize:11,color:"rgba(255,255,255,.8)",marginBottom:2}}>
                        🌱 {p.name || p.crop} {p.status === "growing" ? "· growing" : p.status === "ready" ? "· ready!" : ""}
                      </div>
                    ))}
                    {zPlots2.length > 4 && <div style={{fontSize:10,color:"rgba(255,255,255,.3)"}}>+{zPlots2.length-4} more</div>}
                  </div>
                )}
                {animalCount2 > 0 && (
                  <div style={{borderTop:"1px solid rgba(255,255,255,.08)",paddingTop:8,marginTop:4}}>
                    <div style={{fontSize:11,color:"#ffcc00"}}>🐄 {animalCount2} animal{animalCount2>1?"s":""}</div>
                  </div>
                )}
                <div style={{marginTop:10,fontSize:10,color:"rgba(255,255,255,.3)",textAlign:"center",fontStyle:"italic"}}>Click zone to edit below ↓</div>
              </div>
            </div>
          );
        })()}

        {/* Helper text */}
        <div style={{position:"absolute",bottom:6,left:10,fontSize:9,color:"rgba(80,95,80,.45)",fontFamily:F.mono,pointerEvents:"none"}}>Drag zones to reposition · Click to select</div>
      </div>
      {/* Crop color legend */}
      {(()=>{
        const LCC = CROP_COLORS.slice(0, 8);
        const lm=new Map();let li=0;
        data.garden.plots.filter(p=>p.status!=="harvested").forEach(p=>{if(!lm.has(p.crop)){lm.set(p.crop,LCC[li%LCC.length]);li++;}});
        if(lm.size===0)return null;
        return(
          <div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px",padding:"8px 0 0",alignItems:"center"}}>
            <span style={{fontSize:10,fontWeight:700,color:C.t2}}>Crops:</span>
            {[...lm.entries()].map(([name,cc])=>(
              <div key={name} style={{display:"flex",alignItems:"center",gap:3}}>
                <div style={{width:8,height:8,borderRadius:2,background:`rgba(${cc.r},${cc.g},${cc.b},.55)`,boxShadow:`0 0 4px rgba(${cc.r},${cc.g},${cc.b},.3)`}}/>
                <span style={{fontSize:10,color:C.t1}}>{name}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Inline editor for selected zone */}
      {sz && (
        <Card style={{marginTop:10,boxShadow:`0 0 0 2px ${C.green}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <div style={{fontSize:15,fontWeight:700,fontFamily:F.head}}>✏ {sz.name}</div>
            <div style={{display:"flex",gap:6}}>
              <Btn v="danger" sm onClick={()=>delZ(sz.id)}>Delete</Btn>
              <Btn v="ghost" sm onClick={()=>setSel(null)}>Done</Btn>
            </div>
          </div>
          <div style={SX.grid2}>
            <Inp label="Name" value={sz.name} onChange={e=>upZ(sz.id,{name:e.target.value})}/>
            <Sel label="Zone Type" value={sz.type} onChange={e=>upZ(sz.id,{type:e.target.value})} options={ZT.map(t=>({value:t.id,label:`${t.icon} ${t.label}`}))}/>
          </div>
          <div style={{fontSize:12,color:C.t3,marginTop:6,fontStyle:"italic"}}>Drag to move · Drag edges to resize on the map above</div>
        </Card>
      )}

      {/* Templates */}
      {data.zones.length===0 && (
        <Card style={{marginTop:16,textAlign:"center",padding:32}}>
          <div style={{fontSize:36,marginBottom:12}}>🏡</div>
          <div style={{fontSize:16,fontWeight:600,marginBottom:12}}>Start with a template</div>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap"}}>
            <Btn v="secondary" onClick={()=>setData({...data,farmW:80,farmH:50,zones:[
              {id:uid(),name:"House",type:"house",xM:32,yM:1,wM:16,hM:6,x:40,y:2,w:20,h:12},
              {id:uid(),name:"Veggie Beds",type:"veg",xM:2,yM:9,wM:24,hM:18,x:3,y:18,w:30,h:35},
              {id:uid(),name:"Herbs",type:"herbs",xM:28,yM:9,wM:14,hM:8,x:36,y:18,w:18,h:15},
              {id:uid(),name:"Orchard",type:"orchard",xM:2,yM:29,wM:28,hM:19,x:3,y:58,w:35,h:38},
              {id:uid(),name:"Coop",type:"barn",xM:46,yM:9,wM:12,hM:6,x:57,y:18,w:15,h:12},
              {id:uid(),name:"Pasture",type:"pasture",xM:46,yM:16,wM:24,hM:15,x:57,y:33,w:30,h:30},
              {id:uid(),name:"Well",type:"water",xM:60,yM:9,wM:8,hM:5,x:75,y:18,w:10,h:10},
              {id:uid(),name:"Compost",type:"compost",xM:70,yM:27,wM:8,hM:6,x:88,y:55,w:10,h:12},
              {id:uid(),name:"Greenhouse",type:"greenhouse",xM:29,yM:18,wM:14,hM:9,x:36,y:36,w:18,h:18},
              {id:uid(),name:"Shed",type:"storage",xM:70,yM:35,wM:8,hM:6,x:88,y:70,w:10,h:12},
            ]})}>🏡 Small Homestead (80×50m)</Btn>
            <Btn v="secondary" onClick={()=>setData({...data,farmW:150,farmH:80,zones:[
              {id:uid(),name:"House",type:"house",xM:63,yM:1,wM:24,hM:8,x:42,y:2,w:16,h:10},
              {id:uid(),name:"Kitchen Garden",type:"veg",xM:4,yM:12,wM:30,hM:20,x:3,y:15,w:20,h:25},
              {id:uid(),name:"Field A",type:"veg",xM:39,yM:12,wM:27,hM:20,x:26,y:15,w:18,h:25},
              {id:uid(),name:"Field B",type:"veg",xM:70,yM:12,wM:27,hM:20,x:47,y:15,w:18,h:25},
              {id:uid(),name:"Greenhouse",type:"greenhouse",xM:102,yM:12,wM:21,hM:14,x:68,y:15,w:14,h:18},
              {id:uid(),name:"Herbs",type:"herbs",xM:102,yM:29,wM:21,hM:8,x:68,y:36,w:14,h:10},
              {id:uid(),name:"Orchard",type:"orchard",xM:4,yM:35,wM:42,hM:22,x:3,y:44,w:28,h:28},
              {id:uid(),name:"Vineyard",type:"orchard",xM:51,yM:35,wM:33,hM:14,x:34,y:44,w:22,h:18},
              {id:uid(),name:"Pasture",type:"pasture",xM:51,yM:52,wM:45,hM:24,x:34,y:65,w:30,h:30},
              {id:uid(),name:"Barn",type:"barn",xM:100,yM:40,wM:21,hM:11,x:67,y:50,w:14,h:14},
              {id:uid(),name:"Chickens",type:"barn",xM:100,yM:54,wM:21,hM:10,x:67,y:67,w:14,h:12},
              {id:uid(),name:"Pond",type:"water",xM:4,yM:61,wM:21,hM:14,x:3,y:76,w:14,h:18},
              {id:uid(),name:"Compost",type:"compost",xM:126,yM:50,wM:20,hM:8,x:84,y:63,w:13,h:10},
              {id:uid(),name:"Shed",type:"storage",xM:126,yM:61,wM:20,hM:8,x:84,y:76,w:13,h:10},
            ]})}>🌾 Medium Farm (150×80m)</Btn>
          </div>
        </Card>
      )}

      {/* Zone list */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:8,marginTop:14}}>
        {zones.map(z=>{const zt=ZT.find(t=>t.id===z.type);return(
          <Card key={z.id} onClick={()=>setSel(z.id)} active={sel===z.id} style={{borderLeft:`4px solid ${zt?.fill||"#ccc"}`}}>
            <div style={{fontSize:13,fontWeight:600}}>{zt?.icon} {z.name}</div>
            <div style={SX.t2_11}>{zt?.label}</div>
            <div style={{fontSize:10,color:C.t3,fontFamily:F.mono,marginTop:2}}>{(z.wM||0).toFixed(0)}m × {(z.hM||0).toFixed(0)}m</div>
          </Card>
        );})}
      </div>

      {showAdd && (
        <Overlay title="Add Zone" onClose={()=>setShowAdd(false)}>
          <Inp label="Zone Name" placeholder="Main Veggie Bed" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Sel label="Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={ZT.map(t=>({value:t.id,label:`${t.icon} ${t.label}`}))}/>
          <div style={SX.grid2}>
            <Inp label="Width (metres)" type="number" min="1" value={form.wM} onChange={e=>setForm({...form,wM:e.target.value})}/>
            <Inp label="Height (metres)" type="number" min="1" value={form.hM} onChange={e=>setForm({...form,hM:e.target.value})}/>
          </div>
          <div style={{fontSize:12,color:C.t2,marginBottom:12}}>Zone will be placed at top-left — drag to reposition after adding.</div>
          <div style={SX.btnRowEnd}>
            <Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn>
            <Btn onClick={addZ} dis={!form.name}>Add Zone</Btn>
          </div>
        </Overlay>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   FARMING MODULE
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   CROP QUANTITY HELPERS
   ═══════════════════════════════════════════ */
// How this crop is best measured
function cropMeasureType(cropName, region) {
  const crop = rCM(region).get(cropName);
  if (!crop) return "plants";
  if (["Olive","Grape","Fig","Pomegranate","Peach","Plum","Cherry","Apricot",
       "Walnut","Almond","Chestnut","Quince","Persimmon","Lemon","Orange",
       "Hazelnut","Raspberry","Strawberry"].includes(cropName)) return "plants";
  if (["Wheat","Corn"].includes(cropName)) return "area";
  // Default: area for dense crops, plants for sparse
  return crop.spacing <= 15 ? "area" : "plants";
}

// Auto-calculate plant count from area (m²) and crop spacing (cm)
function plantsFromArea(cropName, areaSqm, region) {
  const crop = rCM(region).get(cropName);
  if (!crop || !areaSqm || !crop.spacing || crop.spacing <= 0) return null;
  const spacingM = crop.spacing / 100;
  return Math.round(areaSqm / (spacingM * spacingM));
}

// Expected yield — yld is ALWAYS kg/plant.
// Area mode: convert m² to plant count via spacing, then multiply.
// Plants mode: direct multiply.
// varietyYld overrides base crop yld when a specific variety is selected.
function expectedYield(cropName, quantity, measureType, varietyYld, region) {
  const crop = rCM(region).get(cropName);
  if (!crop || !quantity) return null;
  const yldPerPlant = varietyYld || crop.yld || 3;
  let plants;
  if (measureType === "area") {
    const spacingM = crop.spacing / 100;
    plants = quantity / (spacingM * spacingM);
  } else {
    plants = quantity;
  }
  return Math.round(plants * yldPerPlant * 10) / 10;
}


// ── Zone space helpers ───────────────────────────────────────────────────────
// Total area of a zone in m²
function zoneAreaM2(zone, farmW, farmH) {
  if (zone.wM !== undefined && zone.hM !== undefined) return zone.wM * zone.hM;
  // Legacy percent-based zones
  const fw = farmW || 100, fh = farmH || 60;
  return (zone.w / 100) * fw * (zone.h / 100) * fh;
}

// Area consumed by a single plot in m²
function plotAreaM2(plot, region) {
  if (!plot || plot.status === "harvested") return 0;
  if (plot.measureType === "area" && plot.qty) return +plot.qty;
  if (plot.plantCount) {
    const crop = rCM(region).get(plot.crop);
    if (crop) {
      const spacingM = crop.spacing / 100;
      return plot.plantCount * spacingM * spacingM;
    }
  }
  return 0;
}

// Returns {totalM2, usedM2, freeM2, pct} for a zone
function zoneSpaceStats(zone, plots, farmW, farmH, region) {
  const totalM2 = zoneAreaM2(zone, farmW, farmH);
  const activePlots = plots.filter(p => p.zone === zone.id && p.status !== "harvested");
  const usedM2 = activePlots.reduce((s, p) => s + plotAreaM2(p, region), 0);
  const freeM2 = Math.max(0, totalM2 - usedM2);
  const pct = totalM2 > 0 ? Math.min(1, usedM2 / totalM2) : 0;
  return { totalM2, usedM2: Math.round(usedM2 * 10) / 10, freeM2: Math.round(freeM2 * 10) / 10, pct };
}

// Memoizable: builds stats for ALL zones in one pass
function buildZoneSpaceMap(zones, plots, farmW, farmH, region) {
  const map = {};
  zones.forEach(z => { map[z.id] = zoneSpaceStats(z, plots, farmW, farmH, region); });
  return map;
}

function Farming({data, setData, pageData, clearPageData}) {
  const [showAdd,setShowAdd]=useState(false);
  const [selP,setSelP]=useState(null);
  const [form,setForm]=useState({crop:"",variety:"",name:"",zone:"",plantDate:"",cost:"",qty:"",measureType:""});
  const [cropSearch,setCropSearch]=useState("");
  const [cropDropdownOpen,setCropDropdownOpen]=useState(false);

  // Auto-open add form when arriving from Seasonal Calendar with a specific crop
  useEffect(() => {
    if (pageData?.crop) {
      setForm(f => ({...f, crop: pageData.crop, plantDate: pageData.plantDate || ""}));
      setShowAdd(true);
      if (clearPageData) clearPageData();
    }
  }, [pageData]);
  const ci=rCM(data.region).get(form.crop);
  const vi=ci && form.variety ? getRegionalVarieties(ci.name, data.region).find(v=>v.name===form.variety) : null;
  const effectiveDays = vi?.days || ci?.days || 0;
  const effectiveYld = vi?.yld || ci?.yld || 3;
  const autoMeasure = ci ? cropMeasureType(ci.name, data.region) : "plants";
  const activeMeasure = form.measureType || autoMeasure;
  const plantsCalc = activeMeasure==="area" ? plantsFromArea(ci?.name, +form.qty||0, data.region) : null;
  const yieldCalc = ci && form.qty ? expectedYield(ci.name, +form.qty||0, activeMeasure, vi?.yld, data.region) : null;
  const autoH=()=>form.plantDate&&ci?new Date(new Date(form.plantDate).getTime()+effectiveDays*864e5).toISOString().slice(0,10):"";
  const vegZ=data.zones.filter(z=>["veg","orchard","herbs","greenhouse"].includes(z.type));
  const zoneSpace = useMemo(() => buildZoneSpaceMap(data.zones, data.garden.plots, data.farmW||100, data.farmH||60, data.region), [data.zones, data.garden.plots, data.farmW, data.farmH, data.region]);

  const add=()=>{
    if(!form.crop)return;
    const c=rCM(data.region).get(form.crop);
    const v=form.variety?getRegionalVarieties(form.crop, data.region).find(vr=>vr.name===form.variety):null;
    const displayName=form.name||(form.variety?`${form.crop} (${form.variety})`:form.crop);
    const _measure = form.measureType || (c ? cropMeasureType(c.name, data.region) : "plants");
    const _qty = (form.qty && +form.qty > 0) ? +form.qty : null;
    const _plants = _qty ? (_measure==="area" ? plantsFromArea(form.crop,_qty,data.region) : _qty) : null;
    const _yieldKg = _qty ? expectedYield(form.crop, _qty, _measure, v?.yld, data.region) : null;
    const p={id:uid(),crop:form.crop,variety:form.variety||"",name:displayName,plantDate:form.plantDate,harvestDate:autoH(),status:form.plantDate?"planted":"planned",zone:form.zone,varietyNote:v?.note||"",steps:c?c.steps.map(s=>({...s,done:false})):[],qty:_qty,measureType:_measure,plantCount:_plants,expectedYieldKg:_yieldKg};
    const nd={...data,garden:{plots:[...data.garden.plots,p]},log:appendLog(data.log,{text:`🌱 Planted ${displayName}${_plants?` (${_plants} plants)`:""}`})};
    if(form.cost&&+form.cost>0)nd.costs={items:[...(data.costs?.items||[]),{id:uid(),type:"expense",amount:+form.cost,label:`Seeds: ${displayName}`,date:new Date().toISOString().slice(0,10),cat:"Seeds"}]};
    setData(nd);setForm({crop:"",variety:"",name:"",zone:"",plantDate:"",cost:"",qty:"",measureType:""});setCropSearch("");setCropDropdownOpen(false);setShowAdd(false);
  };
  // tog/del/harv moved into PlotOverlay component — no longer needed here
  const sp=data.garden.plots.find(p=>p.id===selP);

  // Pre-computed values to avoid IIFEs in JSX (IIFEs crash the app)
  const _active=data.garden.plots.filter(function(p){return p.status!=="harvested";});
  const _totalPlants=_active.reduce(function(s,p){return s+(p.plantCount||0);},0);
  const _totalArea=_active.reduce(function(s,p){return s+(p.measureType==="area"?+(p.qty||0):0);},0);
  const _totalYield=_active.reduce(function(s,p){return s+(p.expectedYieldKg||0);},0);
  const _ready=_active.filter(function(p){return p.harvestDate&&new Date(p.harvestDate)<=new Date();}).length;
  // Plot overlay now computes its own zone / companion / card state — removed unused locals
  const _formZoneObj=form.zone?vegZ.find(function(z){return z.id===form.zone;}):null;
  const _formZoneStats=form.zone?zoneSpace[form.zone]:null;
  const _formZoneFill=_formZoneStats?(_formZoneStats.pct>=0.95?C.red:_formZoneStats.pct>=0.7?C.orange:C.green):C.green;

  // Crop picker: filter by search + group by type (Veggies/Fruits/Herbs/Grains)
  const _cropSearchQ = cropSearch.trim().toLowerCase();
  const _cropsForPicker = rCR(data.region).filter(function(c){
    if (!_cropSearchQ) return true;
    const n = c.name.toLowerCase();
    return n.startsWith(_cropSearchQ) || n.includes(_cropSearchQ);
  });
  const _cropGroupsForPicker = [
    {label:"🥬 Veggies",  crops: _cropsForPicker.filter(function(c){return c.cat === "Vegetable";})},
    {label:"🍎 Fruits",   crops: _cropsForPicker.filter(function(c){return c.cat === "Fruit" || c.cat === "Fruit Tree" || c.cat === "Nut Tree";})},
    {label:"🌿 Herbs",    crops: _cropsForPicker.filter(function(c){return c.cat === "Herb";})},
    {label:"🌾 Grains",   crops: _cropsForPicker.filter(function(c){return c.cat === "Grain";})}
  ];
  const _cropPickerHasResults = _cropGroupsForPicker.some(function(g){return g.crops.length > 0;});

  return (
    <div className="page-enter" style={SX.mw800}>
      <div style={SX.pageHead}>
        <div><h2 style={SX.headerH2}>🌱 Farming</h2><p style={SX.pageSubHead}>Track your crops from seed to harvest</p></div>
        <Btn onClick={()=>setShowAdd(true)}>+ Plant Crop</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:20}}>
        <Stat label="Active Crops" value={_active.length}/>
        {_totalPlants>0&&<Stat label="Total Plants" value={_totalPlants} sub="across all beds"/>}
        {_totalArea>0&&<Stat label="Total Area" value={`${_totalArea.toFixed(0)}m²`} sub="under cultivation"/>}
        {_totalYield>0&&<Stat label="Est. Yield" value={`${_totalYield.toFixed(0)}kg`} sub="at harvest" color={C.green}/>}
        <Stat label="Ready" value={_ready} sub="to harvest" color={C.orange}/>
      </div>
      {data.garden.plots.filter(p=>p.status!=="harvested").length===0?
        <Card style={{textAlign:"center",padding:"56px 24px",background:C.grdLight}}><div style={SX.emptyIcon}>🌱</div><div style={SX.s15Bold}>Ready to grow?</div><div style={{color:C.t2,marginTop:6,fontSize:12.5,maxWidth:240,margin:"6px auto 0"}}>Tap "Plant Crop" to add your first seeds and start tracking</div></Card>:
      <div style={{display:"grid",gap:8}}>{data.garden.plots.filter(p=>p.status!=="harvested").map(p=>{
        const c=rCM(data.region).get(p.crop);
        const done=p.steps?p.steps.filter(s=>s.done).length:0;
        const total=p.steps?p.steps.length:0;
        const pct=total>0?done/total:0;
        const isR=p.harvestDate&&new Date(p.harvestDate)<=new Date();
        const dL=p.harvestDate?Math.ceil((new Date(p.harvestDate)-new Date())/864e5):null;
        const zone=data.zones.find(z=>z.id===p.zone);
        const hasQty = p.plantCount || p.qty;
        return (
          <Card key={p.id} onClick={()=>setSelP(p.id)} style={isR?{boxShadow:`0 0 0 2px ${C.orange}`}:{}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <Ring pct={pct} color={isR?C.orange:C.green}>{c?.emoji||"🌱"}</Ring>
              <div style={SX.flex1}>
                <div style={{fontSize:15,fontWeight:600}}>{p.name||p.crop}</div>
                <div style={{fontSize:12,color:C.t2,marginTop:2,display:"flex",gap:8,flexWrap:"wrap"}}>
                  {zone&&<span>📍 {zone.name}</span>}
                  {p.plantCount&&<span>🌱 {p.plantCount} plants</span>}
                  {p.qty&&p.measureType==="area"&&<span>📐 {p.qty}m²</span>}
                  {p.expectedYieldKg&&<span>📦 ~{p.expectedYieldKg}kg</span>}
                  {!hasQty&&p.plantDate&&<span>{p.plantDate}</span>}
                </div>
              </div>
              <div style={{display:"flex",gap:4,flexDirection:"column",alignItems:"flex-end"}}>
                {isR&&<Pill c={C.orange} bg="#fff3e0">🧺 Ready</Pill>}
                {dL>0&&<Pill>{dL}d</Pill>}
              </div>
            </div>
          </Card>
        );
      })}</div>}

      {sp && <PlotOverlay plot={sp} data={data} setData={setData} onClose={()=>setSelP(null)}/>}

      {showAdd&&(
        <Overlay title="🌱 Plant a Crop" onClose={()=>{setShowAdd(false);setCropSearch("");setCropDropdownOpen(false);}}>
          <div style={SX.mb12}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>Crop</label>
            <div style={{position:"relative"}}>
              <input
                type="text"
                placeholder={form.crop ? "" : "Type a letter (e.g. T) or tap to browse…"}
                value={cropDropdownOpen ? cropSearch : (form.crop ? ((rCM(data.region).get(form.crop)?.emoji||"🌱")+" "+form.crop) : "")}
                onFocus={function(){setCropDropdownOpen(true);setCropSearch("");}}
                onChange={function(e){setCropSearch(e.target.value);setCropDropdownOpen(true);}}
                onBlur={function(){setTimeout(function(){setCropDropdownOpen(false);},150);}}
                style={{width:"100%",padding:"10px 14px",paddingRight:36,border:`1.5px solid ${cropDropdownOpen?C.green:C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box"}}
              />
              <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",fontSize:12,color:C.t2}}>{cropDropdownOpen?"▲":"▼"}</div>
              {cropDropdownOpen && (
                <div style={{position:"absolute",top:"100%",left:0,right:0,marginTop:4,background:C.card,border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",maxHeight:320,overflowY:"auto",zIndex:10}}>
                  {!_cropPickerHasResults && (
                    <div style={{padding:"14px 16px",fontSize:13,color:C.t2,textAlign:"center"}}>No crops match "{cropSearch}"</div>
                  )}
                  {_cropGroupsForPicker.map(function(g){
                    if (g.crops.length === 0) return null;
                    return (
                      <div key={g.label}>
                        <div style={{padding:"6px 12px",fontSize:11,fontWeight:700,color:C.t2,textTransform:"uppercase",background:C.bg,position:"sticky",top:0,letterSpacing:"0.03em"}}>{g.label}</div>
                        {g.crops.map(function(c){
                          const isSel = c.name === form.crop;
                          return (
                            <div
                              key={c.name}
                              onMouseDown={function(e){e.preventDefault();setForm({...form,crop:c.name,variety:""});setCropSearch("");setCropDropdownOpen(false);}}
                              style={{padding:"9px 14px",fontSize:14,cursor:"pointer",background:isSel?"#e8f5e9":"transparent",color:C.text,borderBottom:`1px solid ${C.bg}`}}
                              onMouseEnter={function(e){e.currentTarget.style.background="#f0f7f4";}}
                              onMouseLeave={function(e){e.currentTarget.style.background=isSel?"#e8f5e9":"transparent";}}
                            >
                              {c.emoji} {c.name}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          {ci && getRegionalVarieties(ci.name, data.region).length > 0 && (
            <Sel label="Variety / Breed" value={form.variety} onChange={e=>setForm({...form,variety:e.target.value})} options={[{value:"",label:"— Any / General —"},...getRegionalVarieties(ci.name, data.region).map(v=>({value:v.name,label:`${v.name} — ${v.note.slice(0,50)}`}))]}/>
          )}
          {vi && <Card style={{marginBottom:10,background:"#e8f5e9",padding:12}}><div style={SX.lblGreen}>🧬 {vi.name}</div><div style={{fontSize:12,marginTop:4}}>{vi.note}</div>{vi.days!==ci.days&&<div style={{fontSize:11,color:C.gl,marginTop:2}}>Adjusted harvest: ~{vi.days} days (vs {ci.days} general)</div>}</Card>}
          {ci&&<Card style={{marginBottom:14,background:C.gp}}><div style={SX.s13}>Harvest ~<strong>{effectiveDays}d</strong> · {ci.waterFreq} · {ci.sun} · {ci.spacing}cm</div>{COMP[ci.name]&&<div style={{fontSize:12,color:C.gl,marginTop:4}}>✓ Good with: {COMP[ci.name].good.join(", ")}{COMP[ci.name].bad.length>0?` · ✕ Bad: ${COMP[ci.name].bad.join(", ")}`:""}</div>}</Card>}
          {vegZ.length>0&&(
            <div style={SX.mb12}>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5}}>Zone</label>
              <select value={form.zone} onChange={e=>setForm({...form,zone:e.target.value})}
                style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box"}}>
                <option value="">Select zone...</option>
                {vegZ.map(z=>{
                  const sp=zoneSpace[z.id]||{totalM2:0,freeM2:0,pct:0};
                  const label = sp.totalM2 > 0
                    ? (sp.pct>=0.95 ? `📍 ${z.name} — FULL`
                    : `📍 ${z.name} — ${sp.freeM2}m² free of ${sp.totalM2.toFixed(0)}m²`)
                    : `📍 ${z.name}`;
                  return <option key={z.id} value={z.id}>{label}</option>;
                })}
              </select>
              {form.zone && _formZoneObj && _formZoneStats && _formZoneStats.totalM2 > 0 && (
                <div style={{marginTop:6}}>
                  <div style={{height:4,borderRadius:2,background:C.bdr,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(100,_formZoneStats.pct*100).toFixed(0)}%`,background:_formZoneFill,borderRadius:2}}/>
                  </div>
                  <div style={{fontSize:11,color:_formZoneFill,marginTop:3,fontWeight:600}}>
                    {_formZoneStats.pct>=0.95?"⚠ Zone full — consider another zone or expand this zone"
                      :`${_formZoneStats.freeM2}m² available in this zone`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quantity section — smart defaults based on crop type */}
          {ci && (
            <div style={{background:C.bg,borderRadius:C.rs,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:C.t2,marginBottom:8}}>HOW MUCH ARE YOU PLANTING?</div>
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                {["plants","area"].map(m=>(
                  <button key={m} onClick={()=>setForm({...form,measureType:m,qty:""})}
                    style={{padding:"5px 14px",borderRadius:16,border:"none",fontSize:12,fontWeight:600,cursor:"pointer",
                      background:activeMeasure===m?C.green:C.card,color:activeMeasure===m?"#fff":C.t2}}>
                    {m==="plants"?"🌱 By plant count":"📐 By area (m²)"}
                  </button>
                ))}
              </div>
              <div style={SX.grid2}>
                <div>
                  <label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5}}>
                    {activeMeasure==="area"?"Area (m²)":"Number of plants"}
                  </label>
                  <input type="number" min="0" step={activeMeasure==="area"?"0.5":"1"} value={form.qty}
                    onChange={e=>setForm({...form,qty:e.target.value})}
                    placeholder={activeMeasure==="area"?"e.g. 4":"e.g. 6"}
                    style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,fontSize:14,fontFamily:F.body,boxSizing:"border-box"}}/>
                </div>
                <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end",paddingBottom:2}}>
                  {plantsCalc!=null&&<div style={{fontSize:12,color:C.green,fontWeight:600}}>🌱 ~{plantsCalc} plants</div>}
                  {yieldCalc!=null&&<div style={{fontSize:12,color:C.orange,fontWeight:600}}>📦 ~{yieldCalc}kg yield</div>}
                  {ci.spacing&&<div style={SX.t2_11}>Spacing: {ci.spacing}cm</div>}
                </div>
              </div>
            </div>
          )}

          <Inp label="Name (optional)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Inp label="Plant Date" type="date" value={form.plantDate} max={new Date().toISOString().slice(0,10)} onChange={e=>setForm({...form,plantDate:e.target.value})}/>
          {form.plantDate&&ci&&<div style={{fontSize:12,color:C.green,marginBottom:10}}>🧺 Harvest: {autoH()}</div>}
          <Inp label="Seed Cost (€)" type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/>
          <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>{setShowAdd(false);setCropSearch("");setCropDropdownOpen(false);}}>Cancel</Btn><Btn onClick={add} dis={!form.crop}>Plant</Btn></div>
        </Overlay>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   LIVESTOCK
   ═══════════════════════════════════════════ */
function Livestock({data, setData}) {
  const [showAdd,setShowAdd]=useState(false);const [sel,setSel]=useState(null);const [showK,setShowK]=useState(null);const [kQ,setKQ]=useState("1");
  const [showCollect,setShowCollect]=useState(null); // {animal, produce}
  const [collectQty,setCollectQty]=useState("");
  const [form,setForm]=useState({name:"",type:"Chicken",breed:"",count:"1",cost:""});

  const breedOptions = BREEDS[form.type] || [];
  const selectedBreed = breedOptions.find(b => b.name === form.breed);

  const add=()=>{
    const nd={...data,livestock:{animals:[...data.livestock.animals,{...form,id:uid(),count:+form.count||1}]},log:appendLog(data.log,{text:`🐄 Added ${form.count} ${form.type}${form.breed?` (${form.breed})`:""}`})};
    if(form.cost&&+form.cost>0)nd.costs={items:[...(data.costs?.items||[]),{id:uid(),type:"expense",amount:+form.cost,label:`${form.type}${form.breed?` ${form.breed}`:""}`,date:new Date().toISOString().slice(0,10),cat:"Animals"}]};
    setData(nd);setForm({name:"",type:"Chicken",breed:"",count:"1",cost:""});setShowAdd(false);
  };
  // del moved into AnimalOverlay component — no longer needed here

  const doCollect=(animal, produce, qty)=>{
    const db=LDB[animal.type];if(!db)return;
    const p=db.out[produce];if(!p)return;
    const finalQty = qty > 0 ? qty : Math.round(p.p*animal.count*10)/10;
    setData({...data,
      pantry:{items:[...data.pantry.items,{id:uid(),name:`${animal.type} ${produce}`,category:produce==="Eggs"?"Eggs":produce==="Meat"?"Meat":"Dairy",qty:finalQty,unit:produce==="Eggs"?"eggs":"kg",source:"livestock",addedDate:new Date().toISOString().slice(0,10),storageNote:p.s}]},
      log:appendLog(data.log,{text:`Collected ${finalQty} ${produce==="Eggs"?"eggs":produce.toLowerCase()} from ${animal.name||animal.type}`})
    });
    setShowCollect(null);setCollectQty("");
  };

  const kill=a=>{const db=LDB[a.type];if(!db)return;const q=+kQ||1;if(q>a.count)return;const mp=db.out.Meat;if(!mp)return;const mq=Math.round(mp.p*q*10)/10;setData({...data,livestock:{animals:data.livestock.animals.map(x=>x.id===a.id?(x.count-q<=0?null:{...x,count:x.count-q}):x).filter(Boolean)},pantry:{items:[...data.pantry.items,{id:uid(),name:`${a.type} Meat`,category:"Meat",qty:mq,unit:"kg",source:"livestock",addedDate:new Date().toISOString().slice(0,10),storageNote:mp.s}]},log:appendLog(data.log,{text:`🔪 ${q} ${a.type} → ${mq}kg`})});setShowK(null);};
  const sa=sel?data.livestock.animals.find(a=>a.id===sel):null;

  return (
    <div className="page-enter" style={SX.mw800}>
      <div style={SX.pageHead}><div><h2 style={SX.headerH2}>🐄 Livestock</h2><p style={SX.pageSubHead}>Manage your animals, collect produce, track care</p></div><Btn onClick={()=>setShowAdd(true)}>+ Add</Btn></div>
      <Stat label="Total" value={data.livestock.animals.reduce((s,a)=>s+a.count,0)}/>
      <div style={{marginTop:16,display:"grid",gap:8}}>{data.livestock.animals.length===0?<Card style={{textAlign:"center",padding:"56px 24px",background:C.grdLight}}><div style={SX.emptyIcon}>🐄</div><div style={SX.s15Bold}>No animals yet</div><div style={{color:C.t2,marginTop:6,fontSize:12.5}}>Add chickens, goats, or any livestock to track them</div></Card>:data.livestock.animals.map(a=>{const db=LDB[a.type];return (
        <Card key={a.id}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setSel(a.id)}>
            <span style={{fontSize:28}}>{db?.e}</span><div><strong style={{fontSize:15}}>{a.name||a.type}</strong>{a.breed?<span style={SX.t2_12}> ({a.breed})</span>:null}<div style={SX.t2_12}>×{a.count} · Tap for guide</div></div>
          </div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {db?.prod.includes("Eggs")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Eggs"});setCollectQty(String(Math.round(a.count*0.7)))}}>🥚 Collect Eggs</Btn>}
            {db?.prod.includes("Milk")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Milk"});setCollectQty(String(Math.round(a.count*2.5*10)/10))}}>🥛 Milk</Btn>}
            {db?.prod.includes("Honey")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Honey"});setCollectQty(String(Math.round(a.count*0.5*10)/10))}}>🍯 Honey</Btn>}
            {db?.prod.includes("Wool")&&<Btn sm v="secondary" onClick={()=>{setShowCollect({animal:a,produce:"Wool"});setCollectQty(String(a.count*3))}}>🧶 Wool</Btn>}
            {db?.prod.includes("Meat")&&<Btn sm v="danger" onClick={()=>{setShowK(a);setKQ("1")}}>🔪</Btn>}
          </div>
        </div></Card>
      );})}</div>

      {/* Manual Collection Modal */}
      {showCollect&&<Overlay title={`Collect ${showCollect.produce}`} onClose={()=>setShowCollect(null)}>
        <div style={{textAlign:"center",marginBottom:16}}>
          <span style={{fontSize:48}}>{showCollect.produce==="Eggs"?"🥚":showCollect.produce==="Milk"?"🥛":showCollect.produce==="Honey"?"🍯":"🧶"}</span>
          <div style={{fontSize:15,fontWeight:600,marginTop:8}}>From {showCollect.animal.name||showCollect.animal.type} (×{showCollect.animal.count})</div>
        </div>
        <Inp label={`Quantity (${showCollect.produce==="Eggs"?"eggs":"kg"})`} type="number" min="0" step={showCollect.produce==="Eggs"?"1":"0.1"} value={collectQty} onChange={e=>setCollectQty(e.target.value)} />
        <div style={{fontSize:12,color:C.t2,marginBottom:12}}>Suggested daily: ~{LDB[showCollect.animal.type]?.out[showCollect.produce]?.p||0} {LDB[showCollect.animal.type]?.out[showCollect.produce]?.u||""} per animal</div>
        <div style={SX.btnRowEnd}>
          <Btn v="secondary" onClick={()=>setShowCollect(null)}>Cancel</Btn>
          <Btn v="success" onClick={()=>doCollect(showCollect.animal,showCollect.produce,+collectQty||0)}>Collect → Pantry</Btn>
        </div>
      </Overlay>}

      {/* Care Guide */}
      {sa && <AnimalOverlay animal={sa} data={data} setData={setData} onClose={()=>setSel(null)}/>}

      {/* Process/Kill Modal */}
      {showK&&<Overlay title={`🔪 Process ${showK.name||showK.type}`} onClose={()=>setShowK(null)}>
        <Inp label={`Qty (max ${showK.count})`} type="number" min="1" max={showK.count} value={kQ} onChange={e=>setKQ(e.target.value)}/>
        {LDB[showK.type]?.out.Meat&&<div style={{fontSize:13,marginBottom:12}}>Estimated: <strong>{Math.round(LDB[showK.type].out.Meat.p*(+kQ||1)*10)/10}kg</strong> meat</div>}
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>setShowK(null)}>Cancel</Btn><Btn v="danger" onClick={()=>kill(showK)}>Process</Btn></div>
      </Overlay>}

      {/* Add Animal Modal — with breed dropdown */}
      {showAdd&&<Overlay title="🐄 Add Animal" onClose={()=>setShowAdd(false)}>
        <Sel label="Animal Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value,breed:""})} options={Object.entries(LDB).map(([k,v])=>({value:k,label:`${v.e} ${k} — ${v.prod.join(", ")}`}))}/>
        {breedOptions.length > 0 && (
          <Sel label="Breed" value={form.breed} onChange={e=>setForm({...form,breed:e.target.value})} options={[{value:"",label:"— Select breed —"},...breedOptions.map(b=>({value:b.name,label:b.name}))]}/>
        )}
        {selectedBreed && <Card style={{marginBottom:12,background:"#e8f5e9",padding:12}}><div style={SX.lblGreen}>🧬 {selectedBreed.name}</div><div style={{fontSize:12,marginTop:4}}>{selectedBreed.note}</div></Card>}
        <Inp label="Name / Label" placeholder="e.g. Layer Flock A" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <div style={SX.grid2}>
          <Inp label="Count" type="number" min="1" value={form.count} onChange={e=>setForm({...form,count:e.target.value})}/>
          <Inp label="Cost (€)" type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/>
        </div>
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></div>
      </Overlay>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PANTRY
   ═══════════════════════════════════════════ */
function Pantry({data, setData}) {
  const [showAdd,setShowAdd]=useState(false);const [cat,setCat]=useState("All");
  const [showEat,setShowEat]=useState(null);const [eatQty,setEatQty]=useState("1");
  const [form,setForm]=useState({name:"",category:"Other",qty:"",unit:"kg"});
  const add=()=>{if(!form.name)return;setData({...data,pantry:{items:[...data.pantry.items,{...form,id:uid(),qty:+form.qty||0,source:"manual",addedDate:new Date().toISOString().slice(0,10)}]}});setForm({name:"",category:"Other",qty:"",unit:"kg"});setShowAdd(false);};
  const del=id=>setData({...data,pantry:{items:data.pantry.items.filter(i=>i.id!==id)}});
  const eat=(item,q)=>{setData({...data,pantry:{items:data.pantry.items.map(i=>i.id===item.id?(i.qty-q<=0?null:{...i,qty:Math.round((i.qty-q)*10)/10}):i).filter(Boolean)},log:appendLog(data.log,{text:`Ate ${q}${item.unit} ${item.name}`})});};
  const cats=["All","Fresh Produce","Meat","Eggs","Dairy","Preserved","Grain","Other"];
  const fil=cat==="All"?data.pantry.items:data.pantry.items.filter(i=>i.category===cat);
  const itemIcon = (item) => {
    if (item.source === "farm") {
      const crop = rCM(data.region).get(item.name);
      return crop?.emoji || "🌱";
    }
    if (item.source === "livestock") {
      // Item names are like "Chicken Eggs", "Goat Milk", "Duck Meat"
      const animalType = Object.keys(LDB).find(k => item.name.startsWith(k));
      if (animalType) return LDB[animalType].e;
      // Category fallback
      if (item.category === "Eggs") return "🥚";
      if (item.category === "Meat") return "🥩";
      if (item.category === "Dairy") return "🧀";
      return "🐄";
    }
    if (item.category === "Eggs") return "🥚";
    if (item.category === "Meat") return "🥩";
    if (item.category === "Dairy") return "🧀";
    if (item.category === "Preserved") return "🫙";
    if (item.category === "Grain") return "🌾";
    if (item.category === "Fresh Produce") return "🥬";
    return "📦";
  };

  return (
    <div className="page-enter" style={SX.mw800}>
      <div style={SX.pageHead}><div><h2 style={SX.headerH2}>📦 Pantry</h2><p style={SX.pageSubHead}>Everything you've harvested and stored</p></div><Btn v="secondary" onClick={()=>setShowAdd(true)}>+ Manual</Btn></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:16}}>
        <Stat label="Items" value={data.pantry.items.length}/><Stat label="kg" value={Math.round(data.pantry.items.filter(i=>i.unit==="kg").reduce((s,i)=>s+i.qty,0))}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{padding:"6px 14px",borderRadius:20,border:"none",background:cat===c?C.green:C.card,color:cat===c?"#fff":C.t2,fontSize:12,fontWeight:600,cursor:"pointer",boxShadow:cat===c?"none":C.sh}}>{c}</button>)}</div>
      {fil.length===0?<Card style={{textAlign:"center",padding:"56px 24px",background:C.grdWarm}}><div style={SX.emptyIcon}>📦</div><div style={SX.s15Bold}>Pantry is empty</div><div style={{color:C.t2,marginTop:6,fontSize:12.5}}>Harvest crops or collect produce to stock up</div></Card>:
      <div style={{display:"grid",gap:6}}>{fil.map(item=>(
        <Card key={item.id}><div style={SX.rowCenterG10}>
          <span style={SX.s20}>{itemIcon(item)}</span>
          <div style={SX.flex1}><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><strong style={{fontSize:14}}>{item.name}</strong><Pill>{item.category}</Pill><span style={{fontSize:15,fontWeight:700}}>{item.qty} {item.unit}</span></div>
          {item.storageNote&&<div style={SX.t2_11mt2}>💡 {item.storageNote.slice(0,80)}</div>}</div>
          <div style={{display:"flex",gap:4}}><Btn sm v="secondary" onClick={()=>{setShowEat(item);setEatQty(item.unit==="eggs"?"1":"0.5")}}>Eat</Btn><Btn sm v="ghost" onClick={()=>del(item.id)}>🗑</Btn></div>
        </div></Card>
      ))}</div>}
      {/* Eat / Take Modal */}
      {showEat&&<Overlay title={`🍽 Use ${showEat.name}`} onClose={()=>setShowEat(null)}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontSize:48,marginBottom:8}}>{showEat.category==="Eggs"?"🥚":showEat.category==="Meat"?"🥩":showEat.category==="Dairy"?"🧀":"🍽"}</div>
          <div style={{fontSize:16,fontWeight:600}}>{showEat.name}</div>
          <div style={{fontSize:14,color:C.t2,marginTop:4}}>In stock: <strong style={{color:C.text}}>{showEat.qty} {showEat.unit}</strong></div>
        </div>
        <Inp label={`How many ${showEat.unit} to take?`} type="number" min="0.1" max={showEat.qty} step={showEat.unit==="eggs"?"1":"0.1"} value={eatQty} onChange={e=>setEatQty(e.target.value)} />
        {/* Quick buttons */}
        <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
          {[1,2,5,10].filter(n=>n<=showEat.qty).map(n=>(
            <button key={n} onClick={()=>setEatQty(String(n))} style={{padding:"8px 16px",borderRadius:20,border:eatQty===String(n)?`2px solid ${C.green}`:`1px solid ${C.bdr}`,background:eatQty===String(n)?C.gp:C.card,fontSize:13,fontWeight:600,cursor:"pointer",color:eatQty===String(n)?C.green:C.text}}>{n}</button>
          ))}
          <button onClick={()=>setEatQty(String(showEat.qty))} style={{padding:"8px 16px",borderRadius:20,border:`1px solid ${C.bdr}`,background:C.card,fontSize:13,fontWeight:600,cursor:"pointer",color:C.orange}}>All ({showEat.qty})</button>
        </div>
        <div style={{fontSize:13,color:C.t2,marginBottom:16}}>
          After: <strong style={{color:C.text}}>{Math.max(0,Math.round((showEat.qty-(+eatQty||0))*10)/10)} {showEat.unit}</strong> remaining in stock
        </div>
        <div style={SX.btnRowEnd}>
          <Btn v="secondary" onClick={()=>setShowEat(null)}>Cancel</Btn>
          <Btn v="success" dis={!eatQty||+eatQty<=0||+eatQty>showEat.qty} onClick={()=>{eat(showEat,+eatQty);setShowEat(null)}}>Take {eatQty} {showEat.unit}</Btn>
        </div>
      </Overlay>}

      {showAdd&&<Overlay title="Add Item" onClose={()=>setShowAdd(false)}>
        <Inp label="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <Sel label="Category" options={["Fresh Produce","Meat","Eggs","Dairy","Preserved","Grain","Other"]} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}><Inp label="Qty" type="number" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/><Sel label="Unit" options={["kg","lbs","L","units","eggs","jars"]} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></div>
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></div>
      </Overlay>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   FINANCIALS
   ═══════════════════════════════════════════ */
function Financials({data, setData}) {
  const E = "\u20ac";
  const [showAdd,setShowAdd]=useState(false);
  const [chartMode,setChartMode]=useState("monthly");
  const [chartM,setChartM]=useState(new Date().getMonth());
  const [form,setForm]=useState({type:"expense",amount:"",label:"",cat:"Seeds",date:new Date().toISOString().slice(0,10)});
  const items = data.costs?.items || [];
  const add=()=>{if(!form.amount||!form.label||+form.amount<=0)return;setData({...data,costs:{items:[...items,{...form,id:uid(),amount:Math.abs(+form.amount)}]}});setForm({type:"expense",amount:"",label:"",cat:"Seeds",date:new Date().toISOString().slice(0,10)});setShowAdd(false);};
  const del=id=>setData({...data,costs:{items:items.filter(i=>i.id!==id)}});
  const {exp,inc,net,catT}=useMemo(()=>{let e=0,r=0;const ct={};items.forEach(i=>{if(i.type==="expense"){e+=i.amount;ct[i.cat]=(ct[i.cat]||0)+i.amount;}else r+=i.amount;});return{exp:e,inc:r,net:r-e,catT:ct};},[items]);
  const mN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const mData=useMemo(()=>{const acc=Array.from({length:12},()=>({e:0,r:0}));items.forEach(i=>{const m=new Date(i.date).getMonth();if(i.type==="expense")acc[m].e+=i.amount;else acc[m].r+=i.amount;});return acc;},[items]);
  const maxM=Math.max(1,...mData.map(d=>Math.max(d.e,d.r)));
  const dim=new Date(new Date().getFullYear(),chartM+1,0).getDate();
  const dData=useMemo(()=>{const acc=Array.from({length:dim},()=>({e:0,r:0}));const pfx=new Date().getFullYear()+"-"+String(chartM+1).padStart(2,"0")+"-";items.forEach(i=>{if(!i.date.startsWith(pfx))return;const d=parseInt(i.date.slice(-2),10)-1;if(d>=0&&d<dim){if(i.type==="expense")acc[d].e+=i.amount;else acc[d].r+=i.amount;}});return acc;},[items,chartM,dim]);
  const maxD=Math.max(1,...dData.map(d=>Math.max(d.e,d.r)));
  // catT computed in useMemo above
  const last5=items.slice(-5).reverse();

  return (
    <div className="page-enter" style={SX.mw800}>
      <div style={SX.pageHead}>
        <div><h2 style={SX.headerH2}>💰 Financials</h2><p style={SX.pageSubHead}>Income, expenses, and profitability</p></div>
        <Btn onClick={()=>setShowAdd(true)}>+ Add Entry</Btn>
      </div>
      <div className="g3" style={{gap:10,marginBottom:20}}>
        <Stat label="Spent" value={E+exp.toFixed(0)} color={C.red}/>
        <Stat label="Revenue" value={E+inc.toFixed(0)} color={C.green}/>
        <Stat label="Net" value={E+Math.abs(net).toFixed(0)} sub={net>=0?"Profit":"Loss"} color={net>=0?C.green:C.red}/>
      </div>
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:F.head}}>{chartMode==="monthly"?"Monthly Overview":mN[chartM]+" Daily"}</div>
          <div style={{display:"flex",gap:6}}>
            {["monthly","daily"].map(m=><button key={m} onClick={()=>setChartMode(m)} style={{padding:"4px 12px",borderRadius:16,border:"none",background:chartMode===m?C.green:C.card,color:chartMode===m?"#fff":C.t2,fontSize:11,fontWeight:600,cursor:"pointer"}}>{m==="monthly"?"Monthly":"Daily"}</button>)}
          </div>
        </div>
        {chartMode==="daily"&&<div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:12}}><button onClick={()=>setChartM(Math.max(0,chartM-1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.t2}}>{"<"}</button><span style={{fontSize:13,fontWeight:600}}>{mN[chartM]}</span><button onClick={()=>setChartM(Math.min(11,chartM+1))} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.t2}}>{">"}</button></div>}
        <div style={{overflowX:"auto"}}>
          <svg viewBox={"0 0 "+(chartMode==="monthly"?360:Math.max(360,dim*14))+" 140"} style={{width:"100%",display:"block"}}>
            {(chartMode==="monthly"?mData:dData).map((d,i)=>{const bw=chartMode==="monthly"?22:8;const gap=chartMode==="monthly"?8:6;const x=i*(bw*2+gap)+20;const mv=chartMode==="monthly"?maxM:maxD;const eH=(d.e/mv)*100;const rH=(d.r/mv)*100;return(
              <g key={i} onClick={()=>{if(chartMode==="monthly"){setChartMode("daily");setChartM(i);}}} style={{cursor:chartMode==="monthly"?"pointer":"default"}}>
                <rect x={x} y={120-eH} width={bw} height={Math.max(0,eH)} rx={3} fill={C.red} opacity=".7"/>
                <rect x={x+bw+2} y={120-rH} width={bw} height={Math.max(0,rH)} rx={3} fill={C.green} opacity=".7"/>
                <text x={x+bw} y={133} textAnchor="middle" fontSize="7" fill={C.t2} fontFamily={F.mono}>{chartMode==="monthly"?mN[i]:(i+1)}</text>
              </g>
            );})}
            <line x1="16" y1="120" x2={chartMode==="monthly"?"350":String(dim*14+10)} y2="120" stroke={C.bdr} strokeWidth="1"/>
          </svg>
        </div>
        <div style={{display:"flex",gap:12,marginTop:8,justifyContent:"center"}}><span style={{fontSize:10,color:C.red}}>{"■"} Expenses</span><span style={{fontSize:10,color:C.green}}>{"■"} Income</span></div>
      </Card>
      {Object.keys(catT).length>0&&<Card style={{marginBottom:16}}><div style={{fontSize:13,fontWeight:700,marginBottom:12}}>Expense Breakdown</div>{Object.entries(catT).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=><div key={cat} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><div style={{flex:1,fontSize:13}}>{cat}</div><div style={{width:100,height:6,background:C.bdr,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:(amt/exp*100)+"%",background:C.green,borderRadius:3}}/></div><div style={{fontSize:13,fontWeight:600,fontFamily:F.mono,width:60,textAlign:"right"}}>{E}{amt.toFixed(0)}</div></div>)}</Card>}
      <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,marginBottom:10}}>Recent Transactions</div>
      {last5.length===0?<Card style={{textAlign:"center",padding:32}}><div style={{color:C.t2}}>No transactions yet</div></Card>:
      <div style={{display:"grid",gap:6}}>{last5.map(i=>(
        <Card key={i.id}><div style={SX.rowCenterG10}>
          <div style={{width:36,height:36,borderRadius:18,background:i.type==="expense"?"#fce4ec":"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{i.type==="expense"?"📤":"📥"}</div>
          <div style={SX.flex1}><div style={{fontSize:14,fontWeight:600}}>{i.label}</div><div style={SX.t2_12}>{i.date} {" "} {i.cat}</div></div>
          <div style={{fontSize:16,fontWeight:700,color:i.type==="expense"?C.red:C.green,fontFamily:F.mono}}>{i.type==="expense"?"-":"+"}{E}{i.amount.toFixed(2)}</div>
          <Btn sm v="ghost" onClick={()=>del(i.id)}>🗑</Btn>
        </div></Card>
      ))}</div>}
      {showAdd&&<Overlay title="Add Entry" onClose={()=>setShowAdd(false)}>
        <div style={{display:"flex",gap:8,marginBottom:14}}>{["expense","income"].map(t=><Card key={t} onClick={()=>setForm({...form,type:t})} active={form.type===t} style={{flex:1,textAlign:"center",cursor:"pointer"}}><div style={SX.s20}>{t==="expense"?"📤":"📥"}</div><div style={{fontSize:13,fontWeight:600,marginTop:4}}>{t==="expense"?"Expense":"Income"}</div></Card>)}</div>
        <Inp label="Amount" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
        <Inp label="Description" value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/>
        <div style={SX.grid2}><Sel label="Category" value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})} options={["Seeds","Tools","Feed","Animals","Fuel","Infrastructure","Produce Sales","Other"]}/><Inp label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
        <div style={SX.btnRowEnd}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></div>
      </Overlay>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════ */
function Dashboard({data, setData, setPage, tasks}) {
  const [selZone,setSelZone]=useState(null);
  const [openPlotId,setOpenPlotId]=useState(null);
  const [openAnimalId,setOpenAnimalId]=useState(null);
  const [wide,setWide]=useState(typeof window!=="undefined"&&window.innerWidth>=800);  useEffect(()=>{const h=()=>setWide(window.innerWidth>=800);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const totalKg=data.pantry.items.filter(i=>i.unit==="kg").reduce((s,i)=>s+i.qty,0);
  const costs=data.costs?.items||[];
  const {exp,inc}=useMemo(()=>{let e=0,r=0;costs.forEach(i=>i.type==="expense"?e+=i.amount:r+=i.amount);return{exp:e,inc:r};},[costs]);
  const zoneSpace = useMemo(() => buildZoneSpaceMap(data.zones, data.garden.plots, data.farmW||100, data.farmH||60, data.region), [data.zones, data.garden.plots, data.farmW, data.farmH, data.region]);

  const togStep = (pid, si) => {
    const plots = data.garden.plots.map(p => {
      if (p.id === pid) { const st = [...p.steps]; st[si] = {...st[si], done: !st[si].done}; return {...p, steps: st}; }
      return p;
    });
    setData({...data, garden: {plots}});
  };

  // Enrich tasks with zone id for linking
  const enrichedTasks = useMemo(() => tasks.map(t => {
    const plot = data.garden.plots.find(p => p.id === t.plotId);
    return { ...t, zoneId: plot?.zone || null };
  }), [tasks, data.garden.plots]);

  // Zone intelligence data
  const zoneIntel = useMemo(() => {
    const intel = {};
    data.zones.forEach(z => {
      const zPlots = data.garden.plots.filter(p => p.zone === z.id && p.status !== "harvested");
      const zTasks = enrichedTasks.filter(t => t.zoneId === z.id);
      const sp = zoneSpace[z.id];
      const zt = ZT_MAP.get(z.type);
      const isAnimal = ["barn","pasture"].includes(z.type);
      const zAnimals = isAnimal ? data.livestock.animals.filter(a => {
        const zone = data.zones.find(zn => zn.id === z.id);
        return zone && zone.type === (a.type === "Chicken" || a.type === "Duck" || a.type === "Turkey" || a.type === "Quail" || a.type === "Goose" ? "barn" : "pasture");
      }) : [];
      const totalAnimals = zAnimals.reduce((s,a) => s + a.count, 0);
      const yieldEst = zPlots.reduce((s,p) => s + (p.expectedYieldKg || 0), 0);
      const cropProgress = zPlots.map(p => {
        const crop = rCM(data.region).get(p.crop);
        if (!crop || !p.plantDate) return null;
        const dSince = Math.floor((new Date() - new Date(p.plantDate)) / 864e5);
        const pct = Math.min(1, dSince / crop.days);
        return { name: p.name || p.crop, pct, emoji: crop.emoji };
      }).filter(Boolean);

      intel[z.id] = {
        zone: z, zt, sp, isAnimal,
        plotCount: zPlots.length,
        taskCount: zTasks.length,
        urgentCount: zTasks.filter(t => t.pri <= 1).length,
        yieldEst,
        totalAnimals,
        cropProgress,
        status: zTasks.filter(t=>t.pri===0).length > 0 ? "Needs attention"
          : zTasks.filter(t=>t.pri<=2).length > 0 ? "Active"
          : zPlots.length > 0 || totalAnimals > 0 ? "Stable" : "Empty"
      };
    });
    return intel;
  }, [data.zones, data.garden.plots, data.livestock.animals, enrichedTasks, zoneSpace]);

  // Auto-select first zone with tasks, or first zone
  const activeZone = selZone && zoneIntel[selZone] ? selZone
    : data.zones.find(z => (zoneIntel[z.id]?.taskCount || 0) > 0)?.id
    || data.zones[0]?.id || null;
  const azData = activeZone ? zoneIntel[activeZone] : null;

  // Priority color helper
  const priColor = (pri) => pri === 0 ? C.red : pri <= 1 ? C.orange : pri <= 2 ? C.blue : C.green;
  const priBg = (pri) => pri === 0 ? "#fce4ec" : pri <= 1 ? "#fff8e1" : pri <= 2 ? "#e3f2fd" : "#e8f5e9";

  // Status color helper
  const statusStyle = (s) => s === "Needs attention" ? {color:C.red,bg:"#fce4ec"}
    : s === "Active" ? {color:C.orange,bg:"#fff8e1"}
    : s === "Stable" ? {color:C.green,bg:"#e8f5e9"}
    : {color:C.t2,bg:C.bg};

  // ── Progress Rings data ──
  const g = data.gamify || DEF.gamify;
  const activePlots = data.garden.plots.filter(p => p.status !== "harvested");
  const ringData = useMemo(() => {
    // Ring 1: Tasks done today — steps marked done / total steps across active plots
    const allSteps = activePlots.flatMap(p => p.steps || []);
    const doneSteps = allSteps.filter(s => s.done);
    const taskPct = allSteps.length > 0 ? doneSteps.length / allSteps.length : 0;

    // Ring 2: Crops growing — active plots that have been planted / total zone capacity
    const plantedCount = activePlots.filter(p => p.plantDate).length;
    const zoneCapacity = Math.max(1, data.zones.filter(z => ["veg","orchard","herbs","greenhouse"].includes(z.type)).length * 4); // ~4 crops per zone as target
    const growPct = Math.min(1, plantedCount / zoneCapacity);

    // Ring 3: Harvest readiness — crops within 7 days of harvest / all active
    const now = Date.now();
    const readyCount = activePlots.filter(p => {
      if (!p.plantDate) return false;
      const crop = rCM(data.region).get(p.crop);
      if (!crop) return false;
      const harvestDate = new Date(p.plantDate).getTime() + crop.days * 864e5;
      return harvestDate - now <= 7 * 864e5;
    }).length;
    const harvestPct = activePlots.length > 0 ? readyCount / activePlots.length : 0;

    return { taskPct, growPct, harvestPct, doneSteps: doneSteps.length, totalSteps: allSteps.length, plantedCount, readyCount };
  }, [activePlots, data.zones]);

  // All three rings closed?
  const allRingsClosed = ringData.taskPct >= 1 && ringData.growPct >= 1 && ringData.harvestPct >= 1;

  // Pre-computed vars to avoid IIFEs in JSX render
  const _dap = data.garden.plots.filter(function(p){return p.status!=="harvested";});
  const _dfp = _dap.reduce(function(s,p){return s+(p.plantCount||0);},0);
  const _dfa = _dap.reduce(function(s,p){return s+(p.measureType==="area"?+(p.qty||0):0);},0);
  const _dfy = _dap.reduce(function(s,p){return s+(p.expectedYieldKg||0);},0);
  const _dac = data.livestock.animals.reduce(function(s,a){return s+a.count;},0);
  const _durgent = enrichedTasks.filter(function(t){return t.pri<=1;}).length;
  const _dready = _dap.filter(function(p){
    if(!p.plantDate)return false;
    const crop=rCM(data.region).get(p.crop);
    if(!crop)return false;
    return(Date.now()-new Date(p.plantDate).getTime())>=crop.days*864e5;
  });
  const _dnet = inc - exp;
  const _dAnimalTypes=(function(){const t={};data.livestock.animals.forEach(function(a){t[a.type]=(t[a.type]||0)+a.count;});return Object.entries(t).sort(function(a,b){return b[1]-a[1];});})();
  const _dCropCats=(function(){const cats={};_dap.forEach(function(p){const cr=rCM(data.region).get(p.crop);if(cr)cats[cr.cat]=(cats[cr.cat]||0)+1;});return Object.entries(cats).sort(function(a,b){return b[1]-a[1];});})();
  const _catIcons={Fruit:"🍅",Vegetable:"🥬",Herb:"🌿",Legume:"🫘",Root:"🥕",Grain:"🌾",Flower:"🌻",Brassica:"🥦",Perennial:"🫐",Tuber:"🥔"};
  const _miniColorMap=(function(){const m=new Map();let i=0;data.garden.plots.forEach(function(p){if(p.status!=="harvested"&&!m.has(p.crop)){m.set(p.crop,CROP_COLORS[i%CROP_COLORS.length]);i++;}});return m;})();

  // Overlay lookups — pre-computed to avoid IIFEs in JSX render path
  const openPlot = openPlotId ? data.garden.plots.find(x => x.id === openPlotId) : null;
  const openAnimal = openAnimalId ? (data.livestock?.animals || []).find(x => x.id === openAnimalId) : null;

  return (
    <div className="page-enter" style={{maxWidth:1100}}>
      {/* ── Morning Dashboard Header ── */}
      <div style={{marginBottom:20}}>
            {/* Top row: Rings + Title + Date */}
            <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:16}}>
              <div style={{position:"relative",width:64,height:64,flexShrink:0}}>
                <Ring pct={ringData.taskPct} size={64} sw={4} color="#34c759">{""}</Ring>
                <div style={{position:"absolute",top:8,left:8}}><Ring pct={ringData.growPct} size={48} sw={4} color={C.blue}>{""}</Ring></div>
                <div style={{position:"absolute",top:16,left:16}}><Ring pct={ringData.harvestPct} size={32} sw={4} color={C.orange}>{allRingsClosed?"✨":""}</Ring></div>
              </div>
              <div style={{fontSize:10,lineHeight:1.9,flexShrink:0}}>
                <div><span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:"#34c759",marginRight:5}}/>Tasks <strong>{ringData.doneSteps}/{ringData.totalSteps}</strong></div>
                <div><span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:C.blue,marginRight:5}}/>Growing <strong>{ringData.plantedCount}</strong></div>
                <div><span style={{display:"inline-block",width:8,height:8,borderRadius:4,background:C.orange,marginRight:5}}/>Harvest <strong>{ringData.readyCount}</strong></div>
              </div>
              <div style={SX.flex1}>
                <h2 style={{fontFamily:F.head,fontSize:24,margin:0,letterSpacing:"-0.03em",fontWeight:800,color:C.text}}>MyTerra</h2>
                <p style={{color:C.t2,fontSize:12,margin:"2px 0 0",fontWeight:500}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
                <div style={{textAlign:"center",padding:"5px 10px",background:g.streak>=7?"linear-gradient(135deg,#fff8e1,#ffe0b2)":C.bg,borderRadius:10}}>
                  <div style={{fontSize:20,fontWeight:800,fontFamily:F.head,color:g.streak>=7?C.orange:C.green,lineHeight:1}}>{g.streak}</div>
                  <div style={{fontSize:8,color:C.t2,fontWeight:600,marginTop:1}}>streak{g.streak>=7?" 🔥":""}</div>
                </div>
                {g.badges.length > 0 && (
                  <div style={{display:"flex",gap:2}}>
                    {g.badges.slice(-3).map(b => {
                      const def = BADGES.find(bd => bd.id === b.id);
                      return def ? <Tooltip key={b.id} width={180} content={<div><div style={{fontWeight:700}}>{def.emoji} {def.name}</div><div style={{opacity:.85,marginTop:2}}>{def.desc}</div></div>}><span style={{fontSize:16,cursor:"pointer"}}>{def.emoji}</span></Tooltip> : null;
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Info boxes — what a farmer reads first */}
            <div className="g5" style={{gap:10}}>
              {/* TODAY'S WORK */}
              <Card onClick={function(){setPage("tasks");}} style={{padding:"14px 16px",background:_durgent>0?"linear-gradient(135deg,#fff5f5,#ffe8e8)":"linear-gradient(135deg,#f0faf0,#e8f5e8)",border:_durgent>0?`1px solid rgba(220,60,60,.12)`:`1px solid rgba(45,106,79,.08)`}}>
                <div style={SX.capHeader}>Today's Work</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:_durgent>0?C.red:C.text,lineHeight:1,marginTop:4}}>{enrichedTasks.length}</div>
                <div style={SX.t2_11mt4}>
                  {_durgent > 0 ? <span style={{color:C.red,fontWeight:700}}>{_durgent} urgent</span> : "tasks pending"}
                </div>
                <div style={SX.t3_10mt2}>
                  <span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:"#34c759",marginRight:4}}/>{ringData.doneSteps}/{ringData.totalSteps} done
                </div>
              </Card>

              {/* CROPS */}
              <Card onClick={function(){setPage("farm");}} style={{padding:"14px 16px",background:"linear-gradient(135deg,#f5fbf0,#edf5e5)",border:"1px solid rgba(45,106,79,.08)"}}>
                <div style={SX.capHeader}>Crops</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:C.text,lineHeight:1,marginTop:4}}>{_dap.length}</div>
                <div style={SX.t2_11mt4}>
                  <span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:C.blue,marginRight:4}}/>{ringData.plantedCount} growing
                </div>
                {_dready.length > 0 && (
                  <div style={{fontSize:10,color:C.orange,fontWeight:700,marginTop:2}}>🌾 {_dready.length} ready to harvest!</div>
                )}
                {_dready.length === 0 && _dfa > 0 && (
                  <div style={SX.t3_10mt2}>{_dfa.toFixed(0)}m² cultivated</div>
                )}
              </Card>

              {/* ANIMALS */}
              <Card onClick={function(){setPage("live");}} style={{padding:"14px 16px",background:"linear-gradient(135deg,#faf8f0,#f5f0e5)",border:"1px solid rgba(180,150,60,.08)"}}>
                <div style={SX.capHeader}>Animals</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:C.text,lineHeight:1,marginTop:4}}>{_dac}</div>
                <div style={SX.t2_11mt4}>
                  {_dAnimalTypes.length === 0 ? "none yet" : _dAnimalTypes.slice(0,2).map(([t,c]) => `${c} ${t}`).join(", ")}
                </div>
                {data.livestock.animals.length > 2 && (
                  <div style={SX.t3_10mt2}>{Object.keys(data.livestock.animals.reduce((m,a)=>{m[a.type]=1;return m;},{})).length} types</div>
                )}
              </Card>

              {/* WHAT'S GROWING — crop categories */}
              <Card style={{padding:"14px 16px",background:"linear-gradient(135deg,#f8faf5,#f0f4eb)",border:"1px solid rgba(45,106,79,.08)"}}>
                <div style={SX.capHeader}>Growing</div>
                <>
                    <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:C.text,lineHeight:1,marginTop:4}}>{_dCropCats.length}</div>
                    <div style={SX.t2_11mt4}>{_dCropCats.length === 1 ? "category" : "categories"}</div>
                    <div style={{fontSize:10,color:C.t3,marginTop:3,lineHeight:1.6}}>
                      {_dCropCats.slice(0,3).map(function([cat,n]){return <div key={cat}>{_catIcons[cat]||"🌱"} {n} {cat}{n>1?"s":""}</div>;})}
                    </div>
                  </>
              </Card>

              {/* MONEY */}
              <Card style={{padding:"14px 16px",background:_dnet>=0?"linear-gradient(135deg,#f0faf5,#e5f5ed)":"linear-gradient(135deg,#fdf5f5,#f5eaea)",border:_dnet>=0?`1px solid rgba(45,106,79,.08)`:`1px solid rgba(220,60,60,.08)`}}>
                <div style={SX.capHeader}>Money</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:_dnet>=0?C.green:C.red,lineHeight:1,marginTop:4}}>€{_dnet.toFixed(0)}</div>
                <div style={SX.t2_11mt4}>
                  {inc > 0 && <span style={{color:C.green}}>+€{inc.toFixed(0)}</span>}
                  {inc > 0 && exp > 0 && " / "}
                  {exp > 0 && <span style={{color:C.red}}>-€{exp.toFixed(0)}</span>}
                  {inc === 0 && exp === 0 && "no transactions"}
                </div>
                <div style={SX.t3_10mt2}>Pantry: {Math.round(totalKg)}kg stored</div>
              </Card>
            </div>
      </div>

      {/* ── Main two-column: Task Pipeline + Zone Inspector ── */}
      <div style={{display:"grid",gridTemplateColumns: data.zones.length > 0 && wide ? "1.05fr 1.25fr" : "1fr",gap:16,marginBottom:20}}>

        {/* LEFT: Task Pipeline */}
        <Card p={false} style={{overflow:"hidden",display:"flex",flexDirection:"column"}}>
          <div style={{padding:"16px 18px 12px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:15,fontWeight:800,fontFamily:F.head,letterSpacing:"-0.02em",color:C.text}}>Task Pipeline</div>
            <button onClick={()=>setPage("tasks")} style={{background:C.gp,border:"none",fontSize:12,color:C.green,fontWeight:600,cursor:"pointer",padding:"5px 12px",borderRadius:8,transition:"all .2s"}}>View all →</button>
          </div>
          <div style={{flex:1,overflow:"auto",padding:"6px 10px"}}>
            {enrichedTasks.length === 0 ? (
              <div style={{textAlign:"center",padding:"48px 24px",color:C.t2,background:C.grdLight,borderRadius:12,margin:8}}>
                <div style={{fontSize:40,marginBottom:12,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.1))"}}>🌱</div>
                <div style={{fontSize:14,fontWeight:700,color:C.text}}>Your garden awaits</div>
                <div style={{fontSize:12.5,marginTop:6,lineHeight:1.5,maxWidth:220,margin:"6px auto 0"}}>Add crops or livestock to get personalized daily tasks</div>
              </div>
            ) : enrichedTasks.slice(0, 12).map((t, i) => {
              const isActive = t.zoneId === activeZone;
              const canOpen = !!(t.plotId || t.animalId);
              const canMarkDone = t.type !== "step" && t.type !== "upcoming" && t.type !== "forecast" && t.type !== "harvest";
              return (
                <div key={t.key || i}
                  onClick={() => {
                    if (t.zoneId) setSelZone(t.zoneId);
                    if (t.plotId) setOpenPlotId(t.plotId);
                    else if (t.animalId) setOpenAnimalId(t.animalId);
                  }}
                  style={{
                    display:"grid",gridTemplateColumns:"auto 1fr auto",gap:10,alignItems:"center",
                    padding:"10px 12px",marginBottom:4,
                    border:`1px solid ${isActive ? C.gm : C.bdr}`,
                    borderRadius:12,background:isActive ? "#f0faf0" : "#fcfdfb",
                    cursor: canOpen ? "pointer" : (t.zoneId?"pointer":"default"),
                    transition:"all .15s"
                  }}>
                  <span style={{width:9,height:9,borderRadius:"50%",background:priColor(t.pri),flexShrink:0}}/>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.emoji} {t.title}</div>
                    <div style={{fontSize:11,color:C.t2,marginTop:1}}>{t.loc}{t.daysOut > 0 ? ` · in ${t.daysOut}d` : t.daysOut === 0 && t.type !== "water" ? " · now" : ""}</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                    {t.stepIdx != null && <button onClick={e=>{e.stopPropagation();togStep(t.plotId,t.stepIdx);}} style={{background:C.green,color:"#fff",border:"none",borderRadius:6,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Done</button>}
                    {canMarkDone && <button onClick={e=>{e.stopPropagation();setData(markTaskDone(data,t.key));}} style={{background:C.green,color:"#fff",border:"none",borderRadius:6,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Done</button>}
                    {t.type==="harvest" && <button onClick={e=>{e.stopPropagation();if(t.plotId)setOpenPlotId(t.plotId);else setPage("farm");}} style={{background:C.orange,color:"#fff",border:"none",borderRadius:6,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Harvest</button>}
                    <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:20,background:priBg(t.pri),color:priColor(t.pri),whiteSpace:"nowrap"}}>
                      {t.zoneId ? (data.zones.find(z=>z.id===t.zoneId)?.name?.split(" ").map(w=>w[0]).join("").slice(0,3) || "—") : "Farm"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* RIGHT: Zone Inspector + Mini Map */}
        {data.zones.length > 0 && (
          <div style={{display:"grid",gap:14,gridTemplateRows:"auto 1fr",alignContent:"start"}}>

            {/* Zone Inspector */}
            <Card p={false} style={SX.overflowHidden}>
              <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:14,fontWeight:800,fontFamily:F.head}}>
                  {azData ? `${azData.zt?.icon || ""} ${azData.zone.name}` : "Select a zone"}
                </div>
                {azData && <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:statusStyle(azData.status).bg,color:statusStyle(azData.status).color}}>{azData.status}</span>}
              </div>

              {azData ? (
                <div style={{padding:14}}>
                  {/* Metrics row */}
                  <div className="g2" style={{gap:8,marginBottom:14}}>
                    <div style={{border:`1px solid ${C.bdr}`,borderRadius:12,padding:"10px 12px",background:"#fff"}}>
                      <div style={SX.t2_11b}>Task Load</div>
                      <div style={{fontSize:22,fontWeight:800,fontFamily:F.head}}>{azData.taskCount}</div>
                      {azData.urgentCount > 0 && <div style={{fontSize:10,color:C.red,fontWeight:600,marginTop:2}}>{azData.urgentCount} urgent</div>}
                    </div>
                    <div style={{border:`1px solid ${C.bdr}`,borderRadius:12,padding:"10px 12px",background:"#fff"}}>
                      <div style={SX.t2_11b}>{azData.isAnimal ? "Animals" : "Est. Yield"}</div>
                      <div style={{fontSize:22,fontWeight:800,fontFamily:F.head}}>
                        {azData.isAnimal ? azData.totalAnimals : `${azData.yieldEst.toFixed(0)}kg`}
                      </div>
                      {azData.sp && azData.sp.totalM2 > 0 && !azData.isAnimal && (
                        <div style={{fontSize:10,color:C.t2,marginTop:2,fontFamily:F.mono}}>{azData.sp.usedM2}/{azData.sp.totalM2.toFixed(0)}m²</div>
                      )}
                    </div>
                  </div>

                  {/* Crop progress gauges */}
                  {azData.cropProgress.length > 0 && (
                    <div style={{display:"flex",flexWrap:"wrap",gap:12,justifyContent:"center"}}>
                      {azData.cropProgress.slice(0, 5).map((cp, i) => {
                        const pct = Math.round(cp.pct * 100);
                        const r = 32, stroke = 6, circ = 2 * Math.PI * (r - stroke);
                        const offset = circ - (circ * pct / 100);
                        const gaugeColor = pct >= 90 ? "#e74c3c" : pct >= 50 ? "#f39c12" : C.green;
                        const statusLabel = pct >= 100 ? "Ready to harvest!" : pct >= 80 ? "Almost ready" : pct >= 50 ? "Growing strong" : pct >= 25 ? "Sprouting" : "Just planted";
                        return (
                          <div key={i} style={{textAlign:"center",minWidth:80}}>
                            <div style={{position:"relative",width:r*2,height:r*2,margin:"0 auto"}}>
                              <svg width={r*2} height={r*2} style={{transform:"rotate(-90deg)"}}>
                                <circle cx={r} cy={r} r={r-stroke} fill="none" stroke="#edf3e9" strokeWidth={stroke}/>
                                <circle cx={r} cy={r} r={r-stroke} fill="none" stroke={gaugeColor} strokeWidth={stroke}
                                  strokeDasharray={circ} strokeDashoffset={offset}
                                  strokeLinecap="round" style={{transition:"stroke-dashoffset .6s ease"}}/>
                              </svg>
                              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                                <div style={{fontSize:14,fontWeight:800,color:"#2d3a2d",fontFamily:F.mono}}>{pct}%</div>
                              </div>
                            </div>
                            <div style={{fontSize:11,fontWeight:600,color:"#445644",marginTop:4}}>{cp.emoji} {cp.name}</div>
                            <div style={{fontSize:9,color:C.t3,marginTop:1}}>{statusLabel}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Zone capacity bar */}
                  {azData.sp && azData.sp.totalM2 > 0 && (
                    <div style={{marginTop:14}}>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                        <span style={{color:"#445644"}}>Zone Capacity</span>
                        <strong style={{color: azData.sp.pct >= 0.95 ? C.red : azData.sp.pct >= 0.7 ? C.orange : C.green, fontFamily:F.mono}}>
                          {azData.sp.pct >= 0.95 ? "FULL" : `${azData.sp.freeM2}m² free`}
                        </strong>
                      </div>
                      <div style={{height:7,borderRadius:20,background:"#edf3e9",overflow:"hidden",border:"1px solid #e0e9da"}}>
                        <div style={{height:"100%",width:`${Math.min(100,azData.sp.pct*100).toFixed(0)}%`,background: azData.sp.pct >= 0.95 ? C.red : azData.sp.pct >= 0.7 ? C.orange : `linear-gradient(90deg, ${C.gl}, ${C.green})`,borderRadius:20}}/>
                      </div>
                    </div>
                  )}

                  {/* Quick zone nav */}
                  {data.zones.length > 1 && (
                    <div style={{display:"flex",gap:6,marginTop:14,flexWrap:"wrap"}}>
                      {data.zones.map(z => {
                        const zi = zoneIntel[z.id];
                        const isSel = z.id === activeZone;
                        return (
                          <button key={z.id} onClick={() => setSelZone(z.id)}
                            style={{fontSize:11,fontWeight:isSel?700:500,padding:"5px 10px",borderRadius:20,
                              border:`1px solid ${isSel ? C.green : C.bdr}`,
                              background:isSel ? C.gp : "#fff",color:isSel ? C.green : "#556655",
                              cursor:"pointer",transition:"all .15s"}}>
                            {zi?.zt?.icon} {z.name.length > 10 ? z.name.slice(0,10)+"…" : z.name}
                            {zi?.urgentCount > 0 && <span style={{marginLeft:4,color:C.red,fontWeight:700}}>!</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{padding:32,textAlign:"center",color:C.t2}}>
                  <div style={SX.s13}>Click a task or zone to inspect</div>
                </div>
              )}
            </Card>

            {/* Mini Farm Map — preserves actual farm proportions */}
            <div style={{position:"relative",background:"linear-gradient(180deg,#f7faf5,#edf4e8)",border:`1px solid ${C.bdr}`,borderRadius:16,overflow:"hidden",aspectRatio:`${data.farmW||100} / ${data.farmH||60}`,width:"100%"}}>
              {/* Grid overlay */}
              <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(to right, rgba(80,95,80,.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(80,95,80,.06) 1px, transparent 1px)",backgroundSize:"24px 24px"}}/>
              {/* Zone blocks — with crop color overlays */}
              {(()=>{
                // Build crop color map for the mini map
                const MINI_CROP_COLORS = CROP_COLORS;
                const miniCropColorMap = new Map();
                let colorIdx = 0;
                data.garden.plots.forEach(p => {
                  if (p.status !== "harvested" && !miniCropColorMap.has(p.crop)) {
                    miniCropColorMap.set(p.crop, MINI_CROP_COLORS[colorIdx % MINI_CROP_COLORS.length]);
                    colorIdx++;
                  }
                });
                return data.zones.map(z => {
                  const fW = data.farmW || 100, fH = data.farmH || 60;
                  const xPct = ((z.xM || 0) / fW * 100).toFixed(1);
                  const yPct = ((z.yM || 0) / fH * 100).toFixed(1);
                  const wPct = ((z.wM || 10) / fW * 100).toFixed(1);
                  const hPct = ((z.hM || 8) / fH * 100).toFixed(1);
                  const zt = ZT_MAP.get(z.type);
                  const isSel = z.id === activeZone;
                  const isPlant = ["veg","orchard","herbs","greenhouse"].includes(z.type);

                  // Calculate crop patches — use saved positions from Farm Layout
                  const zPlots = isPlant ? data.garden.plots.filter(p => p.zone === z.id && p.status !== "harvested") : [];
                  const zoneTotalM2 = (z.wM||10)*(z.hM||8);
                  const patches = [];
                  if (isPlant && zPlots.length > 0 && zoneTotalM2 > 0) {
                    let autoFillY = 1;
                    zPlots.forEach(p => {
                      let area = 0;
                      if (p.measureType === "area" && p.qty) area = +p.qty;
                      else if (p.plantCount) {
                        const crop = rCM(data.region).get(p.crop);
                        if (crop) { const sp = crop.spacing/100; area = p.plantCount * sp * sp; }
                      }
                      if (area > 0) {
                        const frac = Math.min(0.98, area / zoneTotalM2);
                        const cc = miniCropColorMap.get(p.crop) || {r:100,g:140,b:60};
                        let pw, ph, px, py;
                        if (p.patchW !== undefined && p.patchH !== undefined) {
                          pw = p.patchW; ph = p.patchH;
                          px = p.patchX || 0.03; py = p.patchY || 0;
                        } else {
                          const side = Math.sqrt(frac);
                          pw = Math.min(1, side * 1.2);
                          ph = Math.min(1, frac / pw);
                          px = 0.03;
                          py = Math.max(0, autoFillY - ph);
                          autoFillY -= ph + 0.02;
                        }
                        patches.push({crop:p.crop, name:p.name||p.crop, frac, pctLabel:Math.round(frac*100), cc, pw, ph, px, py});
                      }
                    });
                    patches.sort((a,b) => b.frac - a.frac);
                  }

                  return (
                    <div key={z.id}
                      onClick={() => setSelZone(z.id)}
                      style={{
                        position:"absolute",
                        left:`${xPct}%`,top:`${yPct}%`,width:`${wPct}%`,height:`${hPct}%`,
                        borderRadius:10,
                        border:`1.5px solid ${isSel ? C.green : "rgba(35,50,35,.15)"}`,
                        boxShadow: isSel ? `0 0 0 3px rgba(45,106,79,.18)` : "none",
                        background: zt?.fill ? `${zt.fill}88` : "#ddd8",
                        cursor:"pointer",transition:"all .15s",overflow:"hidden",
                      }}>
                      {/* Zone name label — floating on top */}
                      <div style={{position:"absolute",top:0,left:0,right:0,padding:"1px 3px",fontSize:8,fontWeight:700,
                        color:"#213321",textAlign:"center",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                        zIndex:3}}>
                        {z.name}
                      </div>
                      {/* Crop patches — use saved positions from Farm Layout */}
                      {patches.map((cb,i) => (
                        <div key={i} style={{
                          position:"absolute",
                          left:`${(cb.px * 100).toFixed(1)}%`,
                          top:`${(cb.py * 100).toFixed(1)}%`,
                          width:`${(cb.pw * 100).toFixed(1)}%`,
                          height:`${(cb.ph * 100).toFixed(1)}%`,
                          background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.38)`,
                          borderRadius:4,overflow:"hidden",
                          display:"flex",alignItems:"center",justifyContent:"center",
                          zIndex:1,
                        }}>
                          {/* Inner glow */}
                          <div style={{position:"absolute",inset:"10%",borderRadius:"50%",
                            background:`rgba(${cb.cc.r},${cb.cc.g},${cb.cc.b},.25)`,
                            filter:"blur(6px)",zIndex:0}}/>
                          {/* Label */}
                          <div style={{position:"relative",zIndex:1,textAlign:"center",lineHeight:1.1}}>
                            <div style={{fontSize:8,fontWeight:900,color:"#fff",
                              textShadow:"0 1px 3px rgba(0,0,0,.55)"}}>{cb.pctLabel}%</div>
                            <div style={{fontSize:6,fontWeight:700,color:"rgba(255,255,255,.85)",
                              textShadow:"0 1px 2px rgba(0,0,0,.4)",
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
                              maxWidth:"100%",padding:"0 1px"}}>{cb.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                });
              })()}
              {/* Edit link */}
              <button onClick={()=>setPage("setup")} style={{position:"absolute",top:6,right:8,background:"rgba(255,255,255,.85)",border:`1px solid ${C.bdr}`,borderRadius:8,padding:"3px 8px",fontSize:10,fontWeight:600,color:C.green,cursor:"pointer"}}>Edit Map</button>
            </div>
            {/* Crop color legend */}
            {_miniColorMap.size > 0 && (
              <div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px",padding:"6px 0 0",alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:C.t2}}>Crops:</span>
                  {[..._miniColorMap.entries()].map(function([name,cc]){return (
                    <div key={name} style={{display:"flex",alignItems:"center",gap:3}}>
                      <div style={{width:8,height:8,borderRadius:2,background:`rgba(${cc.r},${cc.g},${cc.b},.55)`,boxShadow:`0 0 4px rgba(${cc.r},${cc.g},${cc.b},.3)`}}/>
                      <span style={{fontSize:10,color:C.t1}}>{name}</span>
                    </div>
                  );})})
              </div>
            )}
          </div>
        )}
      </div>



      {/* Recent Activity */}
      {data.log.length>0&&<div><div style={{fontSize:14,fontWeight:700,fontFamily:F.head,marginBottom:8}}>Recent Activity</div>{data.log.slice(-5).reverse().map((l,i)=><div key={i} style={{fontSize:12,color:C.t2,padding:"6px 0",borderBottom:`1px solid ${C.bg}`}}>{l.text}</div>)}</div>}

      {/* ── Achievement Badges ── */}
      <div style={{marginTop:20}}>
        <div style={{fontSize:14,fontWeight:700,fontFamily:F.head,marginBottom:10}}>Achievements</div>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {BADGES.map(badge => {
            const earned = g.badges.find(b => b.id === badge.id);
            return (
              <Tooltip key={badge.id} width={200} content={
                <div>
                  <div style={{fontWeight:700,marginBottom:4}}>{badge.emoji} {badge.name}</div>
                  <div style={{opacity:.85}}>{badge.desc}</div>
                  {earned && <div style={{marginTop:6,color:"#ffcc00",fontWeight:600,fontSize:11}}>Unlocked {earned.unlockedAt}</div>}
                  {!earned && <div style={{marginTop:6,opacity:.6,fontSize:11}}>Not yet earned</div>}
                </div>
              }>
                <div style={{
                  flex:"0 0 auto",minWidth:100,padding:"12px 10px",borderRadius:12,textAlign:"center",cursor:"pointer",
                  background: earned ? "linear-gradient(135deg, #fff8e1, #fffde7)" : C.bg,
                  border: earned ? `1.5px solid ${C.orange}` : `1.5px dashed ${C.bdr}`,
                  opacity: earned ? 1 : 0.5,
                  transition: "all .3s ease",
                  boxShadow: earned ? "0 2px 8px rgba(255,152,0,.15)" : "none",
                }}>
                  <div style={{fontSize:28,filter:earned?"none":"grayscale(1)",marginBottom:4}}>{badge.emoji}</div>
                  <div style={{fontSize:10,fontWeight:700,color:earned?C.text:C.t3,fontFamily:F.body}}>{badge.name}</div>
                  {earned && <div style={{fontSize:9,color:C.orange,marginTop:2,fontWeight:600}}>Unlocked ✓</div>}
                  {!earned && <div style={{fontSize:9,color:C.t3,marginTop:2}}>{badge.desc.slice(0,35)}…</div>}
                </div>
              </Tooltip>
            );
          })}
        </div>
      </div>
      {openPlot && <PlotOverlay plot={openPlot} data={data} setData={setData} onClose={()=>setOpenPlotId(null)}/>}
      {openAnimal && <AnimalOverlay animal={openAnimal} data={data} setData={setData} onClose={()=>setOpenAnimalId(null)}/>}
    </div>
  );
}


/* ═══════════════════════════════════════════
   ENCYCLOPEDIA
   ═══════════════════════════════════════════ */
function Manuals({data}) {
  const [s,setS]=useState("");const [sel,setSel]=useState(null);const [tab,setTab]=useState("crops");
  const rgCrops = rCR(data && data.region);
  const curRegion = REGION_MAP.get((data && data.region) || "western_europe");
  const fil=rgCrops.filter(c=>!s||c.name.toLowerCase().includes(s.toLowerCase()));
  const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const TABS=[{id:"crops",l:"🌱 Crops"},{id:"animals",l:"🐄 Animals"},{id:"preserving",l:"🫙 Preserving"},{id:"projects",l:"🔨 Projects"}];
  return (
    <div className="page-enter" style={{maxWidth:960}}>
      <h2 style={{fontFamily:F.head,fontSize:30,margin:"0 0 4px",letterSpacing:"-0.03em",fontWeight:800}}>📖 MyTerra Manuals</h2>
      <p style={{color:C.t2,fontSize:13,margin:"0 0 16px",fontWeight:500}}>Everything you need to know — crops, animals, preservation, and DIY builds</p>
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>{TABS.map(t=><button key={t.id} onClick={()=>{setTab(t.id);setSel(null);setS("");}} style={{padding:"8px 20px",borderRadius:20,border:"none",background:tab===t.id?C.green:C.card,color:tab===t.id?"#fff":C.t2,fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:tab===t.id?"none":C.sh}}>{t.l}</button>)}</div>

      {tab==="crops"&&<>
        <Inp placeholder="Search crops..." value={s} onChange={e=>setS(e.target.value)}/>
        <div style={{display:"grid",gap:6,marginTop:12}}>{fil.map(c=><Card key={c.name} onClick={()=>setSel(c)} style={{borderLeft:`4px solid ${c.color}`}}><div style={SX.rowCenterG10}><span style={{fontSize:24}}>{c.emoji}</span><div style={SX.flex1}><strong>{c.name}</strong> <Pill>{c.cat}</Pill><div style={SX.t2_12mt2}>{c.sowIn} · {c.harvest} · {c.days}d</div></div><span style={{color:C.t3}}>›</span></div></Card>)}</div>
        {sel&&<Overlay title={`${sel.emoji} ${sel.name}`} onClose={()=>setSel(null)} wide>
          {sel && <div style={{background:"#f0f7f4",borderRadius:C.rs,padding:10,marginBottom:12,border:"1px solid #c8e6c9"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}><span style={{fontSize:13,fontWeight:700,color:C.green}}>🌱 Crop Data</span>{sel.pH&&<Pill c="#6d4c41" bg="#efebe9">pH {sel.pH}</Pill>}</div></div>}
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}><Pill c="#fff" bg={sel.color}>{sel.cat}</Pill><Pill>☀ {sel.sun}</Pill><Pill>💧 {sel.waterFreq}</Pill>{sel?.pH ? <Pill c="#6d4c41" bg="#efebe9">pH {sel.pH}</Pill> : null}</div>
          <div style={{marginBottom:16}}><div style={{fontSize:11,fontFamily:F.mono,color:C.t2,marginBottom:4}}>CALENDAR</div><div style={{display:"flex",gap:2}}>{mn.map(m=>{const iS=sel.sowIn.toLowerCase().includes(m.toLowerCase());const iH=sel.harvest.toLowerCase().includes(m.toLowerCase());return <div key={m} style={{flex:1,textAlign:"center"}}><div style={{fontSize:8,color:C.t2,fontFamily:F.mono}}>{m}</div><div style={{height:14,borderRadius:3,background:iS&&iH?`linear-gradient(135deg,${C.green} 50%,${C.orange} 50%)`:iS?C.green:iH?C.orange:C.bdr,opacity:(iS||iH)?1:.25}}/></div>})}</div><div style={{display:"flex",gap:12,marginTop:4}}><span style={{fontSize:10,color:C.green}}>■ Sow</span><span style={{fontSize:10,color:C.orange}}>■ Harvest</span></div></div>
          {sel.regionNote && <Card style={{marginBottom:12,background:"linear-gradient(135deg,#e8f5e9,#f1f8e9)",border:"1.5px solid #a5d6a7"}}><div style={SX.lblGreen}>{curRegion ? curRegion.emoji + " " : "🌍 "}Regional Note — {curRegion ? curRegion.name : "Your Region"}</div><div style={{fontSize:12,marginTop:4,lineHeight:1.5,color:C.text}}>{sel.regionNote}</div></Card>}
          {COMP[sel.name]&&<Card style={{marginBottom:12,background:"#e8f5e9"}}><div style={SX.lblGreen}>🌱 Companions</div><div style={{fontSize:12,marginTop:4}}>✓ {COMP[sel.name].good.join(", ")||"—"}{COMP[sel.name].bad.length>0?<span style={{color:C.red}}> · ✕ {COMP[sel.name].bad.join(", ")}</span>:""}</div></Card>}
          <Card style={{marginBottom:12,background:"#e3f2fd"}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>💧 Water</div><div style={SX.s13mt4}>{sel.waterNote}</div></Card>
          {sel.steps?.length>0&&<div style={SX.mb12}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:8}}>Step-by-Step Guide</div>{sel.steps.map((s,i)=><Card key={i} style={{marginBottom:4,padding:10}}><div style={{display:"flex",justifyContent:"space-between"}}><strong style={SX.s13}>{s.l}</strong><span style={{fontSize:10,color:C.t2,fontFamily:F.mono}}>Day {s.d}</span></div><div style={SX.t2_12mt2}>{s.t}</div></Card>)}</div>}
          {sel?.fert && <Card style={{marginBottom:12,background:"#e8f5e9"}}><div style={SX.lblGreen}>🧪 Fertilizer</div><div style={{fontSize:12,marginTop:4,lineHeight:1.6}}>{sel.fert}</div></Card>}
          {sel?.pests&&sel.pests.length>0 && <Card style={{marginBottom:12,background:"#fff3e0"}}><div style={{fontSize:12,fontWeight:700,color:C.orange}}>🐛 Pests & Disease</div>{sel.pests.map(function(p,i){return <div key={i} style={{fontSize:12,marginTop:6}}><strong>{p.n}</strong>{p.t&&<div style={SX.t2_11mt2}>→ {p.t}</div>}</div>;})}</Card>}
          {sel.storage&&<Card style={{marginBottom:12,background:"#fffde7"}}><div style={{fontSize:12,fontWeight:700,color:"#f57f17"}}>📦 Storage</div><div style={SX.s13mt4}>{sel.storage}</div></Card>}
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(sel.name+" growing guide complete")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#ff0000",textDecoration:"none",fontWeight:600,padding:"8px 14px",background:"#fff5f5",borderRadius:C.rs,border:"1px solid #ffcdd2",marginBottom:12}}>▶ Watch: Complete {sel.name} Growing Guide</a>
        </Overlay>}
      </>}

      {tab==="animals"&&<>
        <div style={{display:"grid",gap:8}}>{Object.entries(LDB).map(([n,db])=><Card key={n} onClick={()=>setSel({...db,name:n})} style={{cursor:"pointer"}}><div style={SX.rowCenterG10}><span style={{fontSize:28}}>{db.e}</span><div style={SX.flex1}><strong style={{fontSize:15}}>{n}</strong><div style={SX.t2_12}>Produces: {db.prod.join(", ")}</div></div><span style={{color:C.t3}}>›</span></div></Card>)}</div>
        {sel?.feed&&<Overlay title={`${sel.e} ${sel.name}`} onClose={()=>setSel(null)} wide>
          {[{i:"🍽",t:"Feeding",v:sel.feed},{i:"🏠",t:"Housing",v:sel.house},{i:"😴",t:"Sleep",v:sel.sleep},{i:"💕",t:"Breeding",v:sel.breed}].map(s=><Card key={s.t} style={{marginBottom:8}}><div style={SX.lblGreen}>{s.i} {s.t}</div><div style={{fontSize:13,lineHeight:1.7,marginTop:4}}>{s.v}</div></Card>)}
          <Card style={{background:"#fce4ec",marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.red}}>🩹 Injuries</div>{sel.inj.map((j,i)=><div key={i} style={{marginTop:6}}><strong>{j.n}</strong><div style={SX.t2_12}>{j.t}</div></div>)}</Card>
          {getRegionalCalendar(sel.name, data.region)&&<Card style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:8}}>📅 Monthly Calendar</div>{Object.entries(getRegionalCalendar(sel.name, data.region)).map(([m,t])=><div key={m} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid #f0f0f0"}}><span style={{fontSize:11,fontWeight:700,color:C.green,width:28,flexShrink:0,fontFamily:F.mono}}>{m}</span><span style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{t}</span></div>)}</Card>}
        </Overlay>}
      </>}

      {tab==="preserving"&&<Preserving embedded/>}
      {tab==="projects"&&<Projects embedded/>}
    </div>
  );
}


/* ═══════════════════════════════════════════
   PRESERVATION MANUAL PAGE
   ═══════════════════════════════════════════ */
function Preserving({embedded}) {
  const [sel, setSel] = useState(null);
  const [catFilter, setCatFilter] = useState("All");

  const items = Object.entries(PRESERVATION);
  const cats = ["All", ...new Set(items.map(([, r]) => r.cat))];
  const filtered = catFilter === "All" ? items : items.filter(([, r]) => r.cat === catFilter);

  const CAT_COLOR = {
    "Fermentation":             { bg: "#e8f5e9", c: "#2d6a4f", accent: "#52b788" },
    "Pickling":                 { bg: "#e3f2fd", c: "#1565c0", accent: "#42a5f5" },
    "Canning":                  { bg: "#fff8e1", c: "#e65100", accent: "#ffa726" },
    "Drying":                   { bg: "#fffde7", c: "#f57f17", accent: "#fdd835" },
    "Freezing":                 { bg: "#e8eaf6", c: "#3949ab", accent: "#7986cb" },
    "Cold Storage":             { bg: "#eceff1", c: "#37474f", accent: "#78909c" },
    "Oil Preservation":         { bg: "#f9fbe7", c: "#558b2f", accent: "#9ccc65" },
    "Dairy & Fermentation":     { bg: "#f3e5f5", c: "#6a1b9a", accent: "#ab47bc" },
    "Curing & Smoking":         { bg: "#fbe9e7", c: "#bf360c", accent: "#ff7043" },
    "Fermentation & Distilling":{ bg: "#fce4ec", c: "#880e4f", accent: "#ec407a" },
    "Apiary":                   { bg: "#fff8e1", c: "#f57f17", accent: "#ffca28" },
  };

  const DIFF_COLOR = { Easy: C.green, Intermediate: C.orange, Advanced: C.red, "Easy (once set up)": C.green, "Easy (with hive access)": C.green, "Intermediate–Advanced": C.orange, "Easy–Intermediate": "#27ae60" };

  const InfoBlock = ({ label, color, bg, children }) => (
    <div style={{ background: bg || "#f5f5f5", borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: color || C.green, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={SX.bodyText}>{children}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      {!embedded && <>
        <h2 style={{ fontFamily: F.head, fontSize: 28, margin: "0 0 4px" }}>🫙 Preservation Manual</h2>
        <p style={{ color: C.t2, fontSize: 14, margin: "0 0 16px" }}>
          Complete guide to every preservation method — ratios, science, safety, and troubleshooting
        </p>
      </>}

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {cats.map(c => {
          const cc = CAT_COLOR[c] || { bg: C.gp, c: C.green };
          return (
            <button key={c} onClick={() => setCatFilter(c)} style={{
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              background: catFilter === c ? (cc.accent || C.green) : C.card,
              color: catFilter === c ? "#fff" : C.t2,
              fontSize: 12, fontWeight: 600, boxShadow: catFilter === c ? "none" : C.sh,
              transition: "all .15s"
            }}>{c}</button>
          );
        })}
      </div>

      {/* Method cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
        {filtered.map(([key, r]) => {
          const cc = CAT_COLOR[r.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
          const dc = DIFF_COLOR[r.difficulty] || C.t2;
          return (
            <div key={key} onClick={() => setSel(r)} style={{
              background: C.card, borderRadius: C.r, boxShadow: C.sh, cursor: "pointer",
              borderLeft: `5px solid ${cc.accent}`, overflow: "hidden", transition: "box-shadow .15s",
              padding: "16px 16px 14px"
            }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{r.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: cc.bg, color: cc.c, fontWeight: 600 }}>{r.cat}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#f5f5f5", color: dc, fontWeight: 600 }}>{r.difficulty}</span>
                  </div>
                </div>
              </div>
              {/* Shelf life + teaser */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: C.t2 }}>📦 {r.shelf}</span>
                <span style={{ fontSize: 11, color: cc.c, fontWeight: 600 }}>Read manual →</span>
              </div>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{r.overview.slice(0, 110)}…</div>
            </div>
          );
        })}
      </div>

      {/* Detail overlay — full manual page */}
      {sel && (() => {
        const cc = CAT_COLOR[sel.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
        const dc = DIFF_COLOR[sel.difficulty] || C.t2;
        return (
          <Overlay title="" onClose={() => setSel(null)} wide>
            {/* Hero header */}
            <div style={{ background: `linear-gradient(135deg, ${cc.accent}22, ${cc.bg})`, borderRadius: C.rs, padding: "20px 20px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 44 }}>{sel.icon}</span>
                <div>
                  <h2 style={{ margin: 0, fontFamily: F.head, fontSize: 22, lineHeight: 1.2 }}>{sel.name}</h2>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: cc.bg, color: cc.c, fontWeight: 700 }}>{sel.cat}</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "#fff", color: dc, fontWeight: 700, border: `1px solid ${dc}` }}>
                      {sel.difficulty === "Easy" || sel.difficulty.startsWith("Easy") ? "✓ " : sel.difficulty.startsWith("Advanced") ? "⚠ " : "◎ "}{sel.difficulty}
                    </span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "#fff", color: C.t2, fontWeight: 600 }}>📦 {sel.shelf}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overview */}
            <InfoBlock label="📖 Overview" color={cc.c} bg={cc.bg}>
              {sel.overview}
            </InfoBlock>

            {/* Ratio */}
            {sel.ratio && (
              <InfoBlock label="📏 Ratios & Quantities" color="#1565c0" bg="#e3f2fd">
                {sel.ratio}
              </InfoBlock>
            )}

            {/* What you need */}
            {sel.what_you_need && (
              <InfoBlock label="🛠 What You Need" color="#37474f" bg="#eceff1">
                {sel.what_you_need}
              </InfoBlock>
            )}

            {/* Method — full step-by-step */}
            <div style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: C.rs, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>
                👨‍🍳 Step-by-Step Method
              </div>
              {sel.method.split(/(?=\d+\. |SUN DRYING:|DEHYDRATOR:|OVEN:|BLANCHING:|FRESH WHITE|RICOTTA:|EQUILIBRIUM|COLD SMOKING|REST:|WINE:|VINEGAR:|POTATOES:|CARROTS|ONIONS|CABBAGE:|SQUASH|APPLES:|SAFE ITEMS|UNSAFE)/).map((step, i) => (
                step.trim() ? (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.bdr}` }}>
                    <div style={{ flex: 1, fontSize: 13, lineHeight: 1.65, color: C.text }}>{step.trim()}</div>
                  </div>
                ) : null
              ))}
            </div>

            {/* Best for */}
            {sel.best_for && (
              <InfoBlock label="✅ Best For" color={C.green} bg="#e8f5e9">
                {sel.best_for}
              </InfoBlock>
            )}

            {/* Storage */}
            <InfoBlock label="📦 Storage & Shelf Life" color="#6a1b9a" bg="#f3e5f5">
              {sel.storage}
            </InfoBlock>

            {/* Troubleshooting */}
            {sel.troubleshooting && (
              <InfoBlock label="🔧 Troubleshooting" color={C.orange} bg="#fff3e0">
                {sel.troubleshooting}
              </InfoBlock>
            )}

            {/* Science */}
            {sel.science && (
              <InfoBlock label="🔬 The Science" color="#1565c0" bg="#e3f2fd">
                {sel.science}
              </InfoBlock>
            )}

            {/* Tip */}
            {sel.tip && (
              <div style={{ background: "#f0f7f4", border: `1px solid ${C.gm}`, borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 4 }}>💡 PRO TIP</div>
                <div style={SX.bodyText}>{sel.tip}</div>
              </div>
            )}

            {/* Video link */}
            <div style={{ marginTop: 6 }}>
            </div>
          </Overlay>
        );
      })()}
    </div>
  );
}


/* ═══════════════════════════════════════════
   SEASONAL PLANTING CALENDAR
   Location-aware "what to plant this month"
   ═══════════════════════════════════════════ */
const MN_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MN_ABR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function parseSowMonths(sowIn) {
  if (!sowIn) return [];
  const months = [];
  const ranges = sowIn.split(",").map(s => s.trim());
  ranges.forEach(r => {
    const parts = r.split("-").map(s => s.trim());
    if (parts.length === 2) {
      let si = MN_ABR.indexOf(parts[0]), ei = MN_ABR.indexOf(parts[1]);
      if (si < 0 || ei < 0) return;
      if (ei >= si) { for (let i = si; i <= ei; i++) months.push(i); }
      else { for (let i = si; i <= 11; i++) months.push(i); for (let i = 0; i <= ei; i++) months.push(i); }
    } else if (parts.length === 1) {
      const idx = MN_ABR.indexOf(parts[0]);
      if (idx >= 0) months.push(idx);
    }
  });
  return [...new Set(months)];
}

function parseHarvestMonths(harvest) { return parseSowMonths(harvest); }

// Difficulty rating for beginners
const CROP_DIFFICULTY = {
  easy: ["Radish","Lettuce","Spinach","Zucchini","Bean (Dry)","Pea","Broad Bean","Mint","Basil","Kale","Swiss Chard","Strawberry","Turnip","Sunflower","Blackberry","Rhubarb","Lentil","Chickpea"],
  medium: ["Tomato","Pepper (Sweet)","Cucumber","Carrot","Onion","Beetroot","Cabbage","Potato","Garlic","Leek","Pumpkin","Corn","Oregano","Rosemary","Sage","Thyme","Parsley","Dill","Chamomile","Lavender","Broccoli","Brussels Sprouts","Fennel","Sweet Potato"],
  hard: ["Eggplant","Pepper (Hot)","Watermelon","Melon","Celery","Asparagus","Okra","Wheat","Olive","Grape","Fig","Pomegranate","Peach","Plum","Cherry","Apricot","Walnut","Almond","Chestnut","Quince","Persimmon","Lemon","Orange","Hazelnut","Raspberry","Cauliflower","Artichoke","Celeriac"],
};
function getCropDifficulty(name) { if (CROP_DIFFICULTY.easy.includes(name)) return {l:"Easy",c:"#27ae60",bg:"#e8f5e9",e:"🟢"}; if (CROP_DIFFICULTY.hard.includes(name)) return {l:"Advanced",c:"#e74c3c",bg:"#fce4ec",e:"🔴"}; return {l:"Medium",c:"#f39c12",bg:"#fff3e0",e:"🟡"}; }

function SeasonalCalendar({data, setPage}) {
  const [month, setMonth] = useState(new Date().getMonth());
  const [filter, setFilter] = useState("sow"); // sow | harvest | all
  const [catFilter, setCatFilter] = useState("all");

  const isCurrentMonth = month === new Date().getMonth();
  const alreadyPlanted = data.garden.plots.filter(p => p.status !== "harvested").map(p => p.crop);

  const results = useMemo(() => {
    const sow = [], harvest = [], maintain = [];
    rCR(data.region).forEach(c => {
      const sowM = parseSowMonths(c.sowIn);
      const harM = parseHarvestMonths(c.harvest);
      const diff = getCropDifficulty(c.name);
      const planted = alreadyPlanted.includes(c.name);
      if (sowM.includes(month)) sow.push({...c, diff, planted, action: "sow"});
      if (harM.includes(month)) harvest.push({...c, diff, planted, action: "harvest"});
    });
    // Maintenance: crops planted that are growing during this month
    data.garden.plots.filter(p => p.status !== "harvested" && p.plantDate).forEach(p => {
      const crop = rCM(data.region).get(p.crop);
      if (!crop) return;
      const ds = Math.floor((new Date() - new Date(p.plantDate)) / 864e5);
      const pendingSteps = (p.steps||[]).filter(s => !s.done && Math.abs(s.d - ds) <= 14);
      if (pendingSteps.length > 0) maintain.push({...crop, plot: p, pendingSteps, action: "maintain"});
    });
    return {sow, harvest, maintain};
  }, [month, data, alreadyPlanted]);

  const cats = useMemo(() => {
    const all = [...results.sow, ...results.harvest];
    return [...new Set(all.map(c => c.cat))].sort();
  }, [results]);

  const filtered = useMemo(() => {
    let items = filter === "sow" ? results.sow : filter === "harvest" ? results.harvest : [...results.sow, ...results.harvest];
    if (catFilter !== "all") items = items.filter(c => c.cat === catFilter);
    // Deduplicate by name for "all" view
    if (filter === "all") { const seen = new Set(); items = items.filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true; }); }
    return items;
  }, [results, filter, catFilter]);

  const CropRow = ({c}) => (
    <Card style={{marginBottom:6, borderLeft:`4px solid ${c.color}`, opacity: c.planted ? 0.65 : 1}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <span style={{fontSize:28}}>{c.emoji}</span>
        <div style={SX.flex1}>
          <div style={SX.rowCenterG6}>
            <span style={{fontSize:15,fontWeight:600}}>{c.name}</span>
            {c.planted && <Pill c={C.blue} bg="#e3f2fd">Already planted</Pill>}
          </div>
          <div style={SX.t2_12mt2}>{c.cat} · {c.days}d to harvest · {c.spacing}cm spacing</div>
          <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap"}}>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:c.diff.bg,color:c.diff.c,fontWeight:600}}>{c.diff.e} {c.diff.l}</span>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"#e3f2fd",color:C.blue,fontWeight:600}}>☀ {c.sun}</span>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:10,background:"#e8f5e9",color:C.green,fontWeight:600}}>💧 {c.waterFreq}</span>
          </div>
        </div>
        {!c.planted && <Btn sm onClick={() => setPage("farm", {crop: c.name, plantDate: new Date().toISOString().slice(0,10)})}>+ Plant</Btn>}
      </div>
    </Card>
  );

  return (
    <div className="page-enter" style={SX.mw800}>
      <h2 style={{fontFamily:F.head,fontSize:30,margin:"0 0 4px",letterSpacing:"-0.03em",fontWeight:800}}>🗓 Seasonal Calendar</h2>
      <p style={{color:C.t2,fontSize:13,margin:"0 0 16px",fontWeight:500}}>What to plant and harvest each month — tailored to your farm</p>

      {/* Month selector */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
        <button onClick={() => setMonth(m => m === 0 ? 11 : m-1)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t2}}>‹</button>
        <div style={{display:"flex",gap:4,flex:1,justifyContent:"center",flexWrap:"wrap"}}>
          {MN_ABR.map((m,i) => (
            <button key={i} onClick={() => setMonth(i)} style={{
              padding:"6px 10px",borderRadius:20,border:"none",fontSize:12,fontWeight:month===i?700:500,cursor:"pointer",
              background:month===i?C.green:i===new Date().getMonth()?"#d8f3dc":"transparent",
              color:month===i?"#fff":C.text,
            }}>{m}</button>
          ))}
        </div>
        <button onClick={() => setMonth(m => m === 11 ? 0 : m+1)} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t2}}>›</button>
      </div>

      {/* Summary stats */}
      <div className="g3" style={{gap:10,marginBottom:16}}>
        <Stat label="Sow This Month" value={results.sow.length} sub={`${results.sow.filter(c=>!c.planted).length} new options`} color={C.green}/>
        <Stat label="Harvest" value={results.harvest.length} sub="crops in season" color={C.orange}/>
        <Stat label="Maintain" value={results.maintain.length} sub="steps due" color={C.blue}/>
      </div>

      {/* Filter tabs */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {[{id:"sow",l:"🌱 Sow",n:results.sow.length},{id:"harvest",l:"🧺 Harvest",n:results.harvest.length},{id:"all",l:"📋 All",n:0}].map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding:"7px 16px",borderRadius:20,border:filter===t.id?"none":`1.5px solid ${C.bdr}`,
            background:filter===t.id?C.green:C.card,color:filter===t.id?"#fff":C.t2,
            fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F.body
          }}>{t.l}{t.n > 0 ? ` (${t.n})` : ""}</button>
        ))}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{marginLeft:"auto",padding:"6px 12px",borderRadius:20,border:`1.5px solid ${C.bdr}`,fontSize:12,fontFamily:F.body,color:C.t2,background:C.card}}>
          <option value="all">All categories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Beginner tip */}
      {isCurrentMonth && filter === "sow" && (
        <Card style={{marginBottom:12,background:"#f0f7f4",border:`1px solid ${C.gm}`}}>
          <div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:4}}>💡 New to farming?</div>
          <div style={{fontSize:13,lineHeight:1.6}}>Start with 🟢 Easy crops this month. They're forgiving, grow fast, and build your confidence. Radishes are ready in 25 days — plant a row today and you'll be harvesting in less than a month.</div>
        </Card>
      )}

      {/* Crop list */}
      {filtered.length === 0
        ? <Card style={{textAlign:"center",padding:"56px 24px",background:C.grdWarm}}><div style={SX.emptyIcon}>🌾</div><div style={SX.s15Bold}>Quiet month</div><div style={{color:C.t2,marginTop:6,fontSize:12.5}}>Nothing to {filter} in {MN_FULL[month]} — try a different filter</div></Card>
        : filtered.map(c => <CropRow key={c.name + c.action} c={c}/>)
      }

      {/* Maintenance section */}
      {filter === "sow" && results.maintain.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,marginBottom:10}}>🔧 Maintenance Due This Month</div>
          {results.maintain.map((c, i) => (
            <Card key={i} style={{marginBottom:6,borderLeft:`3px solid ${C.blue}`}}>
              <div style={SX.rowCenterG10}>
                <span style={SX.s20}>{c.emoji}</span>
                <div style={SX.flex1}>
                  <div style={{fontSize:14,fontWeight:600}}>{c.plot.name || c.name}</div>
                  {c.pendingSteps.map((s,j) => <div key={j} style={SX.t2_12mt2}>→ {s.l}: {s.t}</div>)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DIY PROJECTS & INFRASTRUCTURE
   Track builds, materials, costs, maintenance
   ═══════════════════════════════════════════ */
const PROJECT_GUIDES = {
  raised_bed: {
    name: "Raised Bed (1.2×2.4m)", cat: "Growing", icon: "🌱",
    difficulty: "Easy", time: "2–4 hours", cost: "€30–80",
    ref: "Adapted from Seymour's Self-Sufficient Life & Coleman's Four Season Harvest",
    overview: "The raised bed is the single best first project for any new homesteader. It solves drainage, soil quality, weed suppression, and back pain in one build. A 1.2×2.4m bed is the ideal size — you can reach the centre from either side without stepping on the soil, and standard timber comes in those lengths with zero waste. Coleman runs his entire four-season farm on raised beds. Seymour considers them essential for any plot with poor native soil.",
    materials: "4× timber planks 2.4m long, 4× timber planks 1.2m long, 24× wood screws 75mm, 3m² weed membrane, 0.7m³ soil/compost mix. Use cedar or larch for 10+ years untreated. Pine needs treatment — never use creosote or CCA-treated wood near food crops.",
    method: "1. LEVEL THE GROUND. Clear sod, rocks, and large roots. Lay weed membrane overlapping 10cm at seams. Don't skip leveling — a wonky bed pools water at one end. 2. BUILD THE FRAME. Lay out planks in rectangle. Pre-drill 2cm from ends to prevent splitting. Screw corners with 2 screws per joint. Clamp a corner square while drilling — once one corner is true, the rest follow. 3. STACK (OPTIONAL). Second layer: offset joints 30cm for strength. Screw top into bottom every 60cm. Taller = less bending but more soil cost. 4. FILL. 60% topsoil, 30% compost, 10% perlite or sharp sand. Fill to 3cm below rim. Seymour's rule: soil you can squeeze into a ball that crumbles when poked is perfect. 5. SETTLE. Water deeply, let settle 5–7 days. Beds shrink 10–15% in year one as organic matter breaks down.",
    maintenance: "Re-fill soil 5–10cm annually. Add compost each autumn. Replace timber every 5–8 years (cedar lasts 10+). Never step inside the bed.",
    tip: "Cardboard under the weed membrane smothers grass even better. Lay overlapping, wet down, then membrane on top. By spring the cardboard is decomposed and the grass is dead."
  },
  chicken_coop: {
    name: "Chicken Coop (6–8 hens)", cat: "Livestock", icon: "🐔",
    difficulty: "Intermediate", time: "2–3 days", cost: "€150–400",
    ref: "Based on Ussery's The Small-Scale Poultry Flock & Storey's Guide to Raising Chickens",
    overview: "A proper coop protects from predators, provides ventilation without drafts, and makes cleaning easy. Ussery's key insight: a raised floor with a removable cleanout tray cuts coop cleaning from an hour to ten minutes. Most beginner coops fail on ventilation — ammonia from droppings causes respiratory disease. The #1 rule: ventilation holes go ABOVE the birds' heads, never at perch level.",
    materials: "4× plywood sheets, 8× timber frame 50×50mm, 2× roofing sheets, 5m hardware cloth (NOT chicken wire — foxes tear through it), 3× hinge+latch sets, 2× perch poles 40mm, 2× nesting boxes. Floor space: 0.4m² per bird plus 1–2m² outdoor run per bird.",
    method: "1. FLOOR. Build 1.2×2m frame. Raise 20–30cm off ground on blocks — prevents rot, deters rats. Ussery considers this the most important detail. 2. WALLS. Frame to 1.5m (back), 1.8m (front) for roof slope. Slope AWAY from pop-hole. Leave 60×40cm pop-hole opening. 3. CLADDING + VENTILATION. Plywood walls. Two ventilation holes (15×30cm) near roofline on OPPOSITE walls. Cover with hardware cloth. Ventilation above perch height removes ammonia without drafts — this is what beginners get wrong. 4. PERCHES. 40mm poles at 60–90cm, 25cm per bird. Flat side up — chickens' feet go flat when sleeping. AWAY from nesting boxes. 5. NESTING. 1 box per 3–4 hens, 30×30×30cm, 60cm off floor. Lip at front, angled roof on top so nobody roosts there. 6. RUN. Hardware cloth (welded mesh), NOT chicken wire. Bury 30cm or lay 30cm apron to defeat diggers. 7. SECURITY. Two-step latches defeat raccoons. Auto-closers on pop-holes are worth every cent.",
    maintenance: "Clean bedding weekly. Deep clean + disinfect quarterly. Red mite check monthly (they hide in crevices by day — check at night). Replace all bedding each season.",
    tip: "Chicken wire keeps chickens IN. Hardware cloth keeps predators OUT. This distinction saves lives. If you do one thing right, make it the mesh."
  },
  compost_bin: {
    name: "Compost Bin (3-bay)", cat: "Soil", icon: "♻️",
    difficulty: "Easy", time: "3–5 hours", cost: "€50–120",
    ref: "Based on Rodale's Complete Book of Composting & Dowding's No Dig",
    overview: "Three bays run a continuous system: Bay 1 fresh, Bay 2 composting, Bay 3 finished. Rodale's golden ratio: 25–30 parts carbon (brown — straw, cardboard, leaves) to 1 part nitrogen (green — scraps, grass) by volume. In practice: alternate armfuls. Dowding says compost happens fastest in warmth but shade prevents drying. Dappled shade under a deciduous tree is ideal.",
    materials: "9× pallets or equivalent timber, 3m² wire mesh (optional liner), 2× hinges, 40× screws. Free pallets from garden centres. HT-stamped (heat treated) are safe. Avoid MB (methyl bromide).",
    method: "1. SITE. Partial shade, bare soil (not concrete — worms need access), near garden. Drainage away. 2. BUILD BAYS. 4 pallets in U-shape for Bay 1. Screw corners. Repeat for Bays 2 and 3 sharing walls. Each ~1m×1m×1m. 3. FRONT ACCESS. Vertical runners inside each opening. Slide horizontal planks between them as bay fills — removable fronts are the secret to easy turning. 4. LINE (OPTIONAL). Staple wire mesh inside pallets to prevent material falling through.",
    maintenance: "Turn every 2–4 weeks. Keep moist as wrung sponge. Move through bays every 2–3 months. Finished compost: dark, crumbly, smells like forest floor. Ready in 3–6 months.",
    tip: "A compost thermometer (€10) pays for itself. Pile should hit 55–65°C centre within a week — this kills weed seeds. Not heating? Too dry (add water), too wet (add brown), or not enough nitrogen (add green)."
  },
  rain_barrel: {
    name: "Rain Barrel System", cat: "Water", icon: "💧",
    difficulty: "Easy", time: "2–3 hours", cost: "€40–100",
    ref: "From Art Ludwig's Water Storage & USDA rainwater harvesting guidelines",
    overview: "Every 1m² of roof captures 1L per 1mm of rain. A 50m² roof in 10mm rain = 500L — one storm fills multiple barrels. Ludwig's principle: elevation = pressure. Barrel on blocks gives gravity flow. Daisy-chain barrels: overflow from #1 feeds #2.",
    materials: "1× food-grade barrel 200L, 1× downpipe diverter, 1× tap with washers, 2m overflow hose, 4× cinder blocks, 1× mesh screen. A full 200L barrel weighs 200kg — platform must be rock solid.",
    method: "1. PLATFORM. Cinder blocks 2 high near downpipe. Level carefully. Soft ground sinks — paving slab underneath. 2. DIVERTER. Cut downpipe at barrel-top height. Install diverter kit. 3. TAP. Drill 5cm from bottom (not AT bottom — sediment settles). Rubber washers both sides. Silicone. Cure 24hr. 4. SCREEN. Mesh over lid opening. Uncovered water breeds mosquitoes in 7 days — not optional. 5. OVERFLOW. Hole near top, hose to drain or second barrel.",
    maintenance: "Clean screen monthly. Scrub annually. Check tap for leaks. Drain before hard frost — ice cracks plastic.",
    tip: "Three daisy-chained barrels = 600L from one downpipe. First-flush diverters (€15) send dirty roof water to waste and fill barrels with clean water only."
  },
  fencing: {
    name: "Perimeter Fencing (per 10m)", cat: "Infrastructure", icon: "🏗",
    difficulty: "Intermediate", time: "1 day per 20m", cost: "€80–200 per 10m",
    ref: "From Storey's Basic Country Skills & USDA livestock fencing standards",
    overview: "Good fencing is the invisible backbone of every homestead. Storey's critical insight: corner posts take ALL the tension. Over-engineer corners — a weak corner means the entire fence sags within a year.",
    materials: "Per 10m: 6× fence posts 1.8m, 10m wire mesh, 30× staples, 1× strainer post (corner), 3× bags postcrete. Goats: 1.2m+ with electric top wire. Sheep: 1m stock fence. Chickens: 1.8m hardware cloth.",
    method: "1. PLAN. Walk the line. Note slopes, wet spots, rock. Stake every 2–2.5m. String line for straightness. 2. CORNERS FIRST. 60cm deep, plumb, postcrete. Diagonal brace at 45°. Wait 24hr before tensioning. 3. INTERMEDIATES. 60cm deep. Rammed earth works — tamp in 10cm layers. Cheaper than concrete. 4. MESH. Unroll from corner outward. Staple at 5 points. Tension FROM corners. Loose on intermediates first, then tension, then staple firm. 5. TOP WIRE. High-tensile for visibility and strength. Livestock: bottom wire pegged every 2m.",
    maintenance: "Walk monthly. Tighten annually. Replace leaning posts immediately — one weak post compromises 4m each side. Oil gate hinges.",
    tip: "Goats treat fencing as a suggestion. Electric top wire is not optional — two strands at nose height and top teaches respect fast."
  },
  tool_shed: {
    name: "Tool Shed / Storage", cat: "Infrastructure", icon: "🏚",
    difficulty: "Intermediate", time: "3–5 days", cost: "€200–600",
    ref: "From Reader's Digest Back to Basics & Popular Mechanics DIY guides",
    overview: "A shed is a force multiplier — tools last longer dry, supplies stay organized, you stop wasting time hunting. Pier foundations let air circulate under the floor, preventing rot. Build bigger than you think — every homesteader says the shed is too small within a year.",
    materials: "12× concrete blocks, 10× timber frame lengths, 8× cladding sheets, 4m² roofing felt + corrugated sheets, 1× door + hardware, 4× shelf bracket sets. Pressure-treated timber for anything within 15cm of ground.",
    method: "1. FOUNDATION. Level ground. 12 blocks in 3×4 grid as piers. Spirit level essential. 2. FLOOR. Treated timber frame on piers. Joists every 40cm. OSB on top. 3. WALLS. Frame on floor, tilt up. Front 2.2m, back 1.8m for pitch. Get a helper for tilt-up. 4. CLADDING. Bottom up, overlapping downward — water runs off, never behind. 5mm expansion gaps on plywood. 5. ROOF. Rafters front to back. OSB, felt, corrugated. Minimum 15° pitch. 10cm overhang all sides. 6. FINISH. Door, hasp, padlock. Shelves, hooks, pegboard.",
    maintenance: "Check roof annually. Treat timber every 2–3 years. Keep blades oiled.",
    tip: "Silhouette outlines on pegboard for each tool — you'll instantly see what's missing. A sharp hoe does the work of three dull ones — keep a stone in the shed."
  },
  cold_frame: {
    name: "Cold Frame / Mini Greenhouse", cat: "Growing", icon: "🏡",
    difficulty: "Easy", time: "2–3 hours", cost: "€20–60",
    ref: "From Eliot Coleman's Four Season Harvest — the definitive cold-frame guide",
    overview: "Coleman built an entire commercial farm in Maine that harvests year-round using cold frames and row covers — no heating. A cold frame traps solar radiation, creating a microclimate 5–10°C warmer than outside. Against a south-facing dark wall, it extends your season 6–8 weeks each end. The simplest and highest-return project on this list. Total cost can be nearly zero with reclaimed materials.",
    materials: "4× timber planks, 1× old window or polycarbonate sheet, 2× hinges, 1× prop stick, 12× screws. Polycarbonate is lighter and shatter-proof. Old windows are free but heavier.",
    method: "1. BUILD BOX. Trapezoid: back 40cm, front 25cm, angled sides. Slope faces south. Coleman: angle should roughly match your latitude (35–45° for most temperate zones). 2. LID. Hinge window/polycarbonate to back edge. Overhang front 2–3cm to shed rain. 3. VENTILATION. Notched prop stick at 3 positions: cracked (5cm), half, full. Coleman's rule: open above 15°C — closed frames hit 40°C+ and cook seedlings. 4. SITE. Against south wall for reflected heat. Dig 10cm into soil for insulation. Paint inside back wall white for light reflection.",
    maintenance: "Open above 15°C daily in spring. Clean glass annually. Replace cracked panels immediately.",
    tip: "Coleman calls this 'the poor man's greenhouse' — more useful than an actual greenhouse for most home growers. A dark stone wall behind it stores heat all day and radiates warmth at night. Free thermal mass heating."
  },
  drip_irrigation: {
    name: "Drip Irrigation Line", cat: "Water", icon: "🚿",
    difficulty: "Easy", time: "2–4 hours", cost: "€30–80 per 20m",
    ref: "From Steve Solomon's Gardening When It Counts & irrigation trade guides",
    overview: "Drip delivers water to roots — no evaporation, no wet foliage, no wasted water between rows. Solomon considers it the biggest labour-saver: set a timer and daily watering is eliminated forever. A €30 kit pays for itself in one season.",
    materials: "20m main hose (16mm), 30× emitters (2L/hr), 4× T-connectors, 4× end caps, 1× battery timer, 1× pressure reducer, 1× tap connector, inline filter. Without pressure reducer, mains pressure blows emitters off — not optional.",
    method: "1. CONNECT. Tap adapter → pressure reducer (drip runs 1–1.5 bar, mains is 3–4) → filter. Thread tape on joints. 2. LAY HOSE. Along bed edges. Warm in sun 30 min to straighten. Solomon: ON TOP of mulch, not under — easier to find leaks. 3. EMITTERS. Punch hole at each plant, push in emitter. 2L/hr standard, 4L/hr for tomatoes. One per plant. 4. CAP ENDS. Fold-back with clamp. Opens for flushing. 5. TIMER. Early morning (4–6 AM). 30 min sandy soil, 15 min clay. 6. TEST. Walk entire line. Cup under emitters for 1hr — should deliver rated litres. Under-delivery = partial clog, soak in vinegar.",
    maintenance: "Monthly: flush open end caps 30 seconds. Quarterly: clean filter. Replace blocked emitters. Winter: drain entire system — frost cracks fittings.",
    tip: "Mulch OVER drip lines. The combination of drip + mulch cuts water use 50–70% vs overhead sprinkler. That's not a typo."
  },
};

/* ═══════════════════════════════════════════
   BLUEPRINT — full-image manual page per project
   Each manual is a single illustrated PNG in /public/manuals/.
   ═══════════════════════════════════════════ */
const BLUEPRINT_IMAGES = {
  raised_bed:      "/manuals/1-raised-bed.png",
  chicken_coop:    "/manuals/2-chicken-coop.png",
  compost_bin:     "/manuals/3-compost-bin.png",
  rain_barrel:     "/manuals/4-rain-barrel.png",
  fencing:         "/manuals/5-perimeter-fencing.png",
  tool_shed:       "/manuals/6-tool-shed.png",
  cold_frame:      "/manuals/7-cold-frame.png",
  drip_irrigation: "/manuals/8-drip-irrigation.png",
};

function Blueprint({type}) {
  const src = BLUEPRINT_IMAGES[type];
  if (!src) return null;
  return (
    <div style={{background:"#fff",border:"1px solid #ddd",borderRadius:C.rs,padding:"12px",marginBottom:12}}>
      <div style={{fontSize:10,fontWeight:700,color:"#999",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>📐 Step-by-Step Blueprint</div>
      <img
        src={src}
        alt={`${type} build manual`}
        loading="lazy"
        style={{width:"100%",height:"auto",display:"block",borderRadius:C.rs}}
      />
    </div>
  );
}

function Projects({embedded}) {
  const [selKey, setSelKey] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const items = Object.entries(PROJECT_GUIDES);
  const cats = [...new Set(items.map(([,r]) => r.cat))].sort();
  const filtered = catFilter === "all" ? items : items.filter(([,r]) => r.cat === catFilter);
  const sel = selKey ? PROJECT_GUIDES[selKey] : null;

  const CAT_COLOR = {
    "Growing":        { bg: "#e8f5e9", c: "#2e7d32", accent: "#66bb6a" },
    "Livestock":      { bg: "#fff3e0", c: "#e65100", accent: "#ffa726" },
    "Soil":           { bg: "#efebe9", c: "#4e342e", accent: "#8d6e63" },
    "Water":          { bg: "#e3f2fd", c: "#1565c0", accent: "#42a5f5" },
    "Infrastructure": { bg: "#eceff1", c: "#37474f", accent: "#78909c" },
  };
  const DIFF_COLOR = { Easy: C.green, Intermediate: C.orange, Advanced: C.red };

  const InfoBlock = ({ label, color, bg, children }) => (
    <div style={{ background: bg || "#f5f5f5", borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: color || C.green, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      <div style={SX.bodyText}>{children}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 960 }}>
      {!embedded && <>
        <h2 style={{ fontFamily: F.head, fontSize: 28, margin: "0 0 4px" }}>🔨 DIY Project Guides</h2>
        <p style={{ color: C.t2, fontSize: 14, margin: "0 0 16px" }}>
          Step-by-step build manuals with materials, methods, and maintenance — sourced from proven homesteading guides
        </p>
      </>}

      {/* Category filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setCatFilter("all")} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: catFilter === "all" ? C.green : C.card, color: catFilter === "all" ? "#fff" : C.t2, fontSize: 12, fontWeight: 600, boxShadow: catFilter === "all" ? "none" : C.sh }}>All</button>
        {cats.map(c => {
          const cc = CAT_COLOR[c] || { accent: C.green };
          return <button key={c} onClick={() => setCatFilter(c)} style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", background: catFilter === c ? (cc.accent) : C.card, color: catFilter === c ? "#fff" : C.t2, fontSize: 12, fontWeight: 600, boxShadow: catFilter === c ? "none" : C.sh }}>{c}</button>;
        })}
      </div>

      {/* Project cards grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, marginBottom: 24 }}>
        {filtered.map(([key, r]) => {
          const cc = CAT_COLOR[r.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
          const dc = DIFF_COLOR[r.difficulty] || C.t2;
          return (
            <div key={key} onClick={() => setSelKey(key)} style={{ background: C.card, borderRadius: C.r, boxShadow: C.sh, cursor: "pointer", borderLeft: `5px solid ${cc.accent}`, padding: "16px 16px 14px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>{r.name}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: cc.bg, color: cc.c, fontWeight: 600 }}>{r.cat}</span>
                    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: "#f5f5f5", color: dc, fontWeight: 600 }}>{r.difficulty}</span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: C.t2 }}>⏱ {r.time} · 💰 {r.cost}</span>
                <span style={{ fontSize: 11, color: cc.c, fontWeight: 600 }}>Read guide →</span>
              </div>
              <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.5 }}>{r.overview.slice(0, 120)}…</div>
            </div>
          );
        })}
      </div>

      {/* Detail overlay — full manual page */}
      {sel && (() => {
        const cc = CAT_COLOR[sel.cat] || { bg: "#f5f5f5", c: C.t2, accent: C.t3 };
        const dc = DIFF_COLOR[sel.difficulty] || C.t2;
        return (
          <Overlay title="" onClose={() => setSelKey(null)} wide>
            <div style={{ background: `linear-gradient(135deg, ${cc.accent}22, ${cc.bg})`, borderRadius: C.rs, padding: "20px 20px 16px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 44 }}>{sel.icon}</span>
                <div>
                  <h2 style={{ margin: 0, fontFamily: F.head, fontSize: 22, lineHeight: 1.2 }}>{sel.name}</h2>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: cc.bg, color: cc.c, fontWeight: 700 }}>{sel.cat}</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "#fff", color: dc, fontWeight: 700, border: `1px solid ${dc}` }}>{sel.difficulty === "Easy" ? "✓ " : "◎ "}{sel.difficulty}</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "#fff", color: C.t2, fontWeight: 600 }}>⏱ {sel.time}</span>
                    <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 12, background: "#fff", color: C.t2, fontWeight: 600 }}>💰 {sel.cost}</span>
                  </div>
                </div>
              </div>
              {sel.ref && <div style={{ fontSize: 11, color: cc.c, marginTop: 10, fontStyle: "italic", opacity: 0.7 }}>📚 {sel.ref}</div>}
            </div>

            <InfoBlock label="📖 Overview" color={cc.c} bg={cc.bg}>{sel.overview}</InfoBlock>
            <Blueprint type={selKey}/>
            <InfoBlock label="🛠 Materials & Tools" color="#37474f" bg="#eceff1">{sel.materials}</InfoBlock>

            <div style={{ background: C.card, border: `1px solid ${C.bdr}`, borderRadius: C.rs, padding: "14px 16px", marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".04em" }}>🔧 Step-by-Step Method</div>
              {sel.method.split(/(?=\d+\. )/).map((step, i) => (
                step.trim() ? <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.bdr}` }}><div style={{ flex: 1, fontSize: 13, lineHeight: 1.65, color: C.text }}>{step.trim()}</div></div> : null
              ))}
            </div>

            <InfoBlock label="🔧 Ongoing Maintenance" color={C.orange} bg="#fff3e0">{sel.maintenance}</InfoBlock>

            {sel.tip && (
              <div style={{ background: "#f0f7f4", border: `1px solid ${C.gm}`, borderRadius: C.rs, padding: "12px 14px", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.green, marginBottom: 4 }}>💡 PRO TIP</div>
                <div style={SX.bodyText}>{sel.tip}</div>
              </div>
            )}
          </Overlay>
        );
      })()}
    </div>
  );
}

const NAV=[
  {id:"home",    l:"Home",          E:Home},
  {id:"tasks",   l:"Tasks",         E:ClipboardList},
  {id:"setup",   l:"Farm Layout",   E:MapIcon},
  {id:"farm",    l:"Farming",       E:Sprout},
  {id:"live",    l:"Livestock",     E:Rabbit},
  {id:"season",  l:"Seasonal",      E:CalendarDays},
  {id:"pantry",  l:"Pantry",        E:Package},
  {id:"fin",     l:"Financials",    E:TrendingUp},
  {id:"manuals", l:"Manuals",       E:BookOpen},
  {id:"feedback",l:"Give Feedback", E:MessageSquare},
];

/* ═══════════════════════════════════════════
   DATA REDUCER — replaces spread-based state updates
   ═══════════════════════════════════════════ */
function dataReducer(state, action) {
  if (action.type === 'SET_ALL') return action.data;
  if (action.type === 'TOGGLE_STEP') {
    const plots = state.garden.plots.map(p => {
      if (p.id === action.plotId) {
        const st = [...p.steps];
        st[action.stepIdx] = {...st[action.stepIdx], done: !st[action.stepIdx].done};
        return {...p, steps: st};
      }
      return p;
    });
    return {...state, garden: {plots}};
  }
  // Fallback: merge like the old setData({...data, ...changes})
  return {...state, ...action};
}

/* ═══════════════════════════════════════════
   ERROR BOUNDARY — graceful crash recovery
   ═══════════════════════════════════════════ */
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("MyTerra Error:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:F.body,padding:32}}>
          <div style={{background:C.card,borderRadius:C.r,padding:32,maxWidth:480,boxShadow:C.shL,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:12}}>🌾</div>
            <h2 style={{fontFamily:F.head,fontSize:22,marginBottom:8}}>Something went wrong</h2>
            <p style={{color:C.t2,fontSize:14,marginBottom:16}}>Your farm data is safe in your browser. Try reloading.</p>
            <p style={{color:C.t2,fontSize:12,marginBottom:20,fontFamily:F.mono,background:"#f5f5f5",padding:8,borderRadius:8,textAlign:"left",wordBreak:"break-word"}}>{String(this.state.error)}</p>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button onClick={() => {
                try {
                  const raw = localStorage.getItem(DB.KEY);
                  if (raw) {
                    const blob = new Blob([raw], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `myterra-emergency-backup-${new Date().toISOString().slice(0,10)}.json`;
                    a.click();
                  }
                } catch(e) { alert("Could not export: " + e.message); }
              }} style={{padding:"10px 20px",borderRadius:10,border:`1.5px solid ${C.bdr}`,background:C.card,cursor:"pointer",fontSize:13,fontWeight:600}}>
                Export Backup
              </button>
              <button onClick={() => window.location.reload()} style={{padding:"10px 20px",borderRadius:10,border:"none",background:C.green,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:600}}>
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════════════════════════════
   ZONE MIGRATION — convert legacy percent coords to meters (run once)
   ═══════════════════════════════════════════ */
function migrateZones(data) {
  const farmW = data.farmW || 100;
  const farmH = data.farmH || 60;
  let changed = false;
  const zones = data.zones.map(z => {
    if (z.xM !== undefined) return z;
    changed = true;
    return {...z, xM: z.x/100*farmW, yM: z.y/100*farmH, wM: z.w/100*farmW, hM: z.h/100*farmH};
  });
  if (changed) return {...data, zones};
  return data;
}

function migrateGamify(data) {
  if (data.gamify) return data;
  // Bootstrap gamification state from existing data (defensive against corrupted localStorage)
  const totalHarvests = (data.garden?.plots || []).filter(p => p.status === "harvested").length;
  const totalPlants = (data.garden?.plots || []).length;
  const totalLogEntries = (data.log || []).length;
  return {
    ...data,
    gamify: {
      ...DEF.gamify,
      totalHarvests,
      totalPlants,
      totalLogEntries,
      lastActiveDate: totalLogEntries > 0 ? toLocalDateKey(new Date()) : null,
    }
  };
}

// Ensure data.completions exists and prune entries older than 30 days to keep
// localStorage small. Safe to call on every load.
function migrateCompletions(data) {
  const out = data.completions ? {...data.completions} : {};
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30); cutoff.setHours(0,0,0,0);
  Object.keys(out).forEach(k => {
    const d = new Date(k + "T00:00:00");
    if (isNaN(d.getTime()) || d < cutoff) delete out[k];
  });
  return {...data, completions: out};
}

// Update streak + badge state after any data change that includes a log entry
function updateGamify(data) {
  const g = data.gamify || DEF.gamify;
  const today = toLocalDateKey(new Date());
  let streak = g.streak;
  let bestStreak = g.bestStreak;
  const totalLogEntries = (data.log || []).length;
  const totalHarvests = (data.garden?.plots || []).filter(p => p.status === "harvested").length;
  const totalPlants = (data.garden?.plots || []).length;

  // Update streak
  if (g.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = toLocalDateKey(yesterday);
    if (g.lastActiveDate === yStr) {
      streak = streak + 1; // consecutive day
    } else if (g.lastActiveDate && g.lastActiveDate < yStr) {
      streak = 1; // hard reset — missed a day
    } else if (!g.lastActiveDate) {
      streak = 1; // first ever activity
    }
    bestStreak = Math.max(bestStreak, streak);
  }

  const newG = { ...g, streak, bestStreak, lastActiveDate: today, totalHarvests, totalPlants, totalLogEntries };

  // Check for new badges
  const testData = { ...data, gamify: newG };
  const earned = new Set(newG.badges.map(b => b.id));
  const newBadges = [...newG.badges];
  BADGES.forEach(b => {
    if (!earned.has(b.id) && b.check(testData)) {
      newBadges.push({ id: b.id, unlockedAt: today });
    }
  });
  newG.badges = newBadges;

  return { ...data, gamify: newG };
}

/* ═══════════════════════════════════════════
   BOTTOM NAVIGATION — mobile (< 768px)
   ═══════════════════════════════════════════ */
const BOTTOM_TABS = [
  {id:"home",   l:"Today",   E:Home},
  {id:"farm",   l:"Farm",    E:Sprout},
  {id:"live",   l:"Animals", E:PawPrint},
  {id:"pantry", l:"Pantry",  E:Package},
  {id:"more",   l:"More",    E:MoreHorizontal},
];

const MORE_ITEMS = [
  {id:"tasks",   l:"Task Queue",    E:ClipboardList},
  {id:"setup",   l:"Farm Layout",   E:Map},
  {id:"season",  l:"Seasonal",      E:CalendarDays},
  {id:"fin",     l:"Financials",    E:TrendingUp},
  {id:"manuals", l:"Manuals",       E:BookOpen},
  {id:"feedback",l:"Give Feedback", E:MessageSquare},
];

const BottomNav = React.memo(function BottomNav({page, setPage, taskCount, moreOpen, setMoreOpen}) {
  return (
    <nav aria-label="Main navigation" style={{
      position:"fixed", bottom:0, left:0, right:0,
      height:"calc(56px + env(safe-area-inset-bottom))",
      background:C.card, borderTop:`1px solid ${C.bdr}`,
      display:"flex", alignItems:"flex-start", paddingTop:6,
      paddingBottom:"env(safe-area-inset-bottom)",
      zIndex:400, boxShadow:"0 -1px 12px rgba(0,0,0,.06)",
    }}>
      {BOTTOM_TABS.map(function(tab) {
        const isActive = tab.id==="more" ? moreOpen : (page===tab.id && !moreOpen);
        return (
          <button key={tab.id} aria-label={tab.l}
            onClick={function(){ if(tab.id==="more"){setMoreOpen(!moreOpen);}else{setMoreOpen(false);setPage(tab.id);} }}
            style={{
              flex:1, display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"flex-start", gap:2, border:"none", background:"transparent",
              cursor:"pointer", padding:"2px 4px", minHeight:44,
              color: isActive ? C.green : C.t2, position:"relative",
            }}
          >
            <span style={{display:"flex",alignItems:"center",justifyContent:"center",opacity:isActive?1:0.45,transition:"opacity .15s"}}><tab.E size={22} strokeWidth={isActive?2.2:1.7}/></span>
            <span style={{fontSize:9,fontWeight:isActive?700:400,fontFamily:F.body,letterSpacing:"0.01em",whiteSpace:"nowrap"}}>{tab.l}</span>
            {tab.id==="home"&&taskCount>0&&(
              <span style={{position:"absolute",top:0,right:"calc(50% - 18px)",background:"#ef4444",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8,minWidth:16,textAlign:"center"}}>{taskCount>9?"9+":taskCount}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
});

const MoreDrawer = React.memo(function MoreDrawer({page, setPage, onClose, exportData, importData, isOffline, darkMode, setDarkMode}) {
  return createPortal(
    <>
      <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",backdropFilter:"blur(2px)",WebkitBackdropFilter:"blur(2px)",zIndex:500}}/>
      <div style={{
        position:"fixed", bottom:"calc(56px + env(safe-area-inset-bottom))",
        left:0, right:0, zIndex:501,
        background:C.card, borderRadius:"20px 20px 0 0",
        paddingBottom:8, boxShadow:"0 -4px 32px rgba(0,0,0,.14)",
        animation:"slideUp .22s cubic-bezier(.25,.46,.45,.94) both",
        maxHeight:"70vh", overflowY:"auto",
      }}>
        <div style={{width:36,height:4,borderRadius:2,background:C.bdr,margin:"12px auto 8px"}}/>
        <div style={{padding:"4px 0"}}>
          {MORE_ITEMS.map(function(item) {
            return (
              <button key={item.id} onClick={function(){setPage(item.id);onClose();}}
                style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"14px 20px",
                  border:"none",background:page===item.id?C.gp:"transparent",
                  color:page===item.id?C.green:C.text,cursor:"pointer",
                  fontSize:15,fontFamily:F.body,fontWeight:page===item.id?600:400,
                  textAlign:"left",transition:"background .15s",
                }}
              >
                <span style={{width:28,display:"flex",alignItems:"center",justifyContent:"center",color:page===item.id?C.green:C.t2}}><item.E size={19} strokeWidth={1.8}/></span>{item.l}
              </button>
            );
          })}
        </div>
        <div style={{margin:"4px 20px",borderTop:`1px solid ${C.bdr}`,paddingTop:4}}>
          <button onClick={exportData} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 0",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:14,fontFamily:F.body,textAlign:"left"}}>
            <span style={{width:28,display:"flex",alignItems:"center",justifyContent:"center"}}><Download size={17} strokeWidth={1.8}/></span> Export Backup
          </button>
          <label style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 0",cursor:"pointer",fontSize:14,fontFamily:F.body,color:C.t2}}>
            <span style={{width:28,display:"flex",alignItems:"center",justifyContent:"center"}}><Upload size={17} strokeWidth={1.8}/></span> Import Backup
            <input type="file" accept=".json" onChange={function(e){if(e.target.files[0])importData(e.target.files[0]);e.target.value="";}} style={{display:"none"}}/>
          </label>
        </div>
          <button onClick={function(){setDarkMode(!darkMode);}} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 0",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:14,fontFamily:F.body,textAlign:"left"}}>
            <span style={{width:28,display:"flex",alignItems:"center",justifyContent:"center"}}>{darkMode ? <Sun size={17} strokeWidth={1.8}/> : <Moon size={17} strokeWidth={1.8}/>}</span> {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
        {isOffline&&<div style={{padding:"8px 20px",fontSize:11,fontWeight:600,color:"#ea580c",background:"linear-gradient(135deg, #fff7ed, #fef3c7)",textAlign:"center",borderRadius:8,margin:"0 10px 8px"}}>📡 Offline — data saved locally</div>}
      </div>
    </>,
    document.body
  );
});

function AppInner() {
  // Lazy initializer — loads data synchronously, no loading flash
  // Wrapped in try-catch: if localStorage is corrupt or migration throws, fall back to DEF
  // instead of crashing the reducer with undefined state.
  const initData = () => {
    try {
      const d = DB.load();
      let initial = d ? {...DEF,...d,log:d.log||[],costs:d.costs||{items:[]}} : DEF;
      if (!initial.schemaVersion) initial = {...initial, schemaVersion: 7};
      initial = migrateZones(initial);
      initial = migrateGamify(initial);
      initial = migrateCompletions(initial);
      return initial;
    } catch (e) {
      console.error("initData failed, falling back to DEF:", e);
      return DEF;
    }
  };

  const [page,setPageRaw]=useState(() => {
    try { const p = localStorage.getItem("hfm_page"); return (p && p !== "setup") ? p : "home"; } catch(e) { return "home"; }
  });
  const [pageData,setPageData]=useState(null);
  const [data,dispatchData]=useReducer(dataReducer, null, initData);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [viewW,setViewW]=useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [moreOpen,setMoreOpen]=useState(false);
  const [darkMode,setDarkMode]=useState(() => {
    try {
      const saved = localStorage.getItem("hfm_theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch(e) { return false; }
  });
  const [isOffline,setIsOffline]=useState(typeof navigator !== "undefined" && !navigator.onLine);
  const [showFeedbackPrompt,setShowFeedbackPrompt]=useState(false);

  // 7-day feedback prompt — record first use, show prompt after 7 days (once)
  useEffect(() => {
    try {
      const done = localStorage.getItem("hfm_feedback_done");
      if (done) return; // already submitted
      const dismissed = localStorage.getItem("hfm_feedback_dismissed");
      if (dismissed) return; // user said "maybe later"
      let firstUse = localStorage.getItem("hfm_first_use");
      if (!firstUse) {
        localStorage.setItem("hfm_first_use", Date.now().toString());
        return; // just started using, check again next time
      }
      const daysSinceFirst = (Date.now() - parseInt(firstUse)) / (1000 * 60 * 60 * 24);
      if (daysSinceFirst >= 7) setShowFeedbackPrompt(true);
    } catch(e) {}
  }, []);

  // Online/offline detection
  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Responsive breakpoint listener
  useEffect(() => {
    const check = () => setViewW(window.innerWidth);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const isMobile = viewW < 768;
  const isTablet = viewW >= 768 && viewW < 1024;

  // Flush pending save on tab close / navigate away
  useEffect(() => {
    const flush = () => DB.flush();
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  // Dark mode — apply data-theme attribute and persist
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
      localStorage.setItem('hfm_theme', darkMode ? 'dark' : 'light');
    } catch(e) {}
  }, [darkMode]);

  // Navigate + persist current page
  const setPage = useCallback((p, pData) => {
    setPageRaw(p);
    setPageData(pData || null);
    try { localStorage.setItem("hfm_page", p); } catch(e) {}
  }, []);

  // Save wrapper — backward-compatible setData that dispatches + debounced save
  // Also runs gamification updates (streak, badges) on every data change
  const setData = useCallback((nd) => {
    const withGamify = updateGamify(nd);
    dispatchData({type:'SET_ALL', data: withGamify});
    DB.save(withGamify);
    // silent save — no UI indicator
  }, []);

  // Export farm data as JSON backup
  const exportData = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `myterra-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch(e) { console.warn("Export failed:", e); }
  }, [data]);

  // Import farm data from JSON backup
  const importData = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const d = JSON.parse(e.target.result);
        // Defensive: reject backup files with prototype-pollution payloads
        if (d && typeof d === "object" && (
          Object.prototype.hasOwnProperty.call(d, "__proto__") ||
          Object.prototype.hasOwnProperty.call(d, "constructor") ||
          Object.prototype.hasOwnProperty.call(d, "prototype")
        )) {
          throw new Error("Backup file contains reserved keys and cannot be imported safely.");
        }
        const merged = migrateCompletions(migrateGamify(migrateZones({...DEF, ...d, log: d.log||[], costs: d.costs||{items:[]}})));
        setData(merged);
      } catch(err) { alert("Invalid backup file: " + err.message); }
    };
    reader.readAsText(file);
  }, [setData]);

  // Auto-redirect to setup ONLY on very first visit
  // Defensive null guards: do nothing if data or data.zones is missing.
  useEffect(()=>{
    if(!data || !Array.isArray(data.zones)) return;
    if(!data.setupDone && data.zones.length===0) setPageRaw("setup");
  },[data?.setupDone, data?.zones?.length]);

  // Compute tasks ONCE — passed down to Dashboard + TaskQueue
  // Null guard: if data hasn't initialized yet, return empty tasks rather than crashing buildTaskQueue.
  const tasks = useMemo(() => data ? buildTaskQueue(data) : [], [data]);
  const taskCount = useMemo(() => tasks.filter(t => t.pri <= 2).length, [tasks]);

  // Loading fallback — if reducer somehow returns null, render a safe placeholder instead of crashing pg()
  if (!data) {
    return <div style={{padding:40,textAlign:"center",color:C.t2,fontFamily:F.body}}>Loading…</div>;
  }

  const pg = () => {
    switch(page) {
      case "setup": return <Setup data={data} setData={setData}/>;
      case "tasks": return <TaskQueue data={data} setData={setData} setPage={setPage} tasks={tasks}/>;
      case "farm": return <Farming data={data} setData={setData} pageData={pageData} clearPageData={() => setPageData(null)}/>;
      case "season": return <SeasonalCalendar data={data} setPage={setPage}/>;
      case "live": return <Livestock data={data} setData={setData}/>;
      case "pantry": return <Pantry data={data} setData={setData}/>;
      case "fin": return <Financials data={data} setData={setData}/>;
      case "manuals": return <Manuals data={data}/>;
      case "feedback": return <FeedbackSurvey setPage={setPage}/>;
      default: return <Dashboard data={data} setData={setData} setPage={setPage} tasks={tasks}/>;
    }
  };

  return (
    <>
      {/* Fonts loaded via system fallback for offline use */}
      <div style={{display:"flex",height:"100vh",fontFamily:F.body,background:C.bg,color:C.text,overflow:"hidden",letterSpacing:"0.005em"}}>
        <nav style={{width:isMobile?0:isTablet?64:220,minWidth:isMobile?0:isTablet?64:220,background:C.card,borderRight:isMobile?"none":`1px solid ${C.bdr}`,display:isMobile?"none":"flex",flexDirection:"column",padding:"0",overflow:"hidden",position:"relative",transition:"width .3s cubic-bezier(.25,.46,.45,.94)"}}>
          {/* Premium brand header */}
          <div style={{padding:isTablet?"16px 0":"24px 20px 20px",marginBottom:4,background:C.grdHero,borderRadius:isTablet?"0":"0 0 20px 0",display:"flex",flexDirection:"column",alignItems:isTablet?"center":"flex-start"}}>
            <div style={{fontSize:isTablet?22:21,fontFamily:F.head,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>🌾{!isTablet&&" MyTerra"}</div>
            {!isTablet&&<div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:3,fontWeight:500}}>Farm Manager</div>}
          </div>
          <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:2}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{setPage(n.id);}} className="nav-item" style={{display:"flex",alignItems:"center",gap:isTablet?0:11,padding:isTablet?"10px 0":"10px 14px",justifyContent:isTablet?"center":"flex-start",border:"none",background:page===n.id?C.gp:"transparent",color:page===n.id?C.green:C.t2,cursor:"pointer",fontSize:13.5,fontFamily:F.body,fontWeight:page===n.id?600:500,textAlign:"left",width:"100%",borderRadius:10,borderLeft:isTablet?"none":page===n.id?`3px solid ${C.green}`:"3px solid transparent",position:"relative",letterSpacing:"0.01em"}} title={isTablet?n.l:undefined}>
              <span style={{width:isTablet?undefined:24,display:"flex",alignItems:"center",justifyContent:"center",opacity:page===n.id?1:0.55,transition:"opacity .2s"}}><n.E size={isTablet?20:17} strokeWidth={page===n.id?2.2:1.8}/></span>{!isTablet&&n.l}
              {n.id==="home"&&taskCount>0&&<span style={{position:"absolute",right:10,background:"linear-gradient(135deg, #ef4444, #dc2626)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,minWidth:18,textAlign:"center",boxShadow:"0 2px 6px rgba(239,68,68,.3)"}}>{taskCount}</span>}
              {n.id==="tasks"&&taskCount>0&&<span style={{position:"absolute",right:10,background:"linear-gradient(135deg, #f59e0b, #d97706)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,boxShadow:"0 2px 6px rgba(245,158,11,.3)"}}>{taskCount}</span>}
            </button>
          ))}
          </div>
          <div style={SX.flex1}/>
          {/* Backup controls — hidden on tablet icon rail */}
          {!isTablet&&<div style={{padding:"10px 14px",borderTop:`1px solid ${C.bdr}`,margin:"0 10px"}}>
            <button onClick={exportData} style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 10px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:11.5,fontFamily:F.body,fontWeight:500,borderRadius:8,transition:"all .2s"}} title="Download farm data as JSON backup">
              <Download size={14} strokeWidth={1.8}/> Export Backup
            </button>
            <label style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 10px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:11.5,fontFamily:F.body,fontWeight:500,borderRadius:8,transition:"all .2s"}} title="Restore from a JSON backup file">
              <Upload size={14} strokeWidth={1.8}/> Import Backup
              <input type="file" accept=".json" onChange={e => { if(e.target.files[0]) importData(e.target.files[0]); e.target.value=""; }} style={{display:"none"}}/>
            </label>
          </div>}
          {!isTablet&&<div style={{padding:"10px 24px 18px",fontSize:10.5,color:C.t3,fontWeight:500}}>{rCR(data.region).length} crops · {Object.keys(LDB).length} animals</div>}
          <button onClick={()=>setDarkMode(!darkMode)} style={{display:"flex",alignItems:"center",gap:isTablet?0:8,padding:isTablet?"10px 0":"8px 20px 14px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:12,fontFamily:F.body,fontWeight:500,width:"100%",justifyContent:isTablet?"center":"flex-start"}} title={darkMode?"Switch to light mode":"Switch to dark mode"}>
            {darkMode ? <Sun size={isTablet?20:14} strokeWidth={1.8}/> : <Moon size={isTablet?20:14} strokeWidth={1.8}/>}{!isTablet&&<span style={{marginLeft:2}}>{darkMode?"Light Mode":"Dark Mode"}</span>}
          </button>
          {isOffline&&!isTablet&&<div style={{padding:"8px 20px",fontSize:11,fontWeight:600,color:"#ea580c",background:"linear-gradient(135deg, #fff7ed, #fef3c7)",textAlign:"center",borderRadius:8,margin:"0 10px 10px"}}>📡 Offline — data saved locally</div>}
        </nav>
        <main style={{flex:1,overflow:"auto",padding:isMobile?"16px 16px calc(72px + env(safe-area-inset-bottom))":isTablet?"24px":"32px 36px",background:C.bg}}>
          {pg()}
        </main>
      </div>
      {isMobile&&<BottomNav page={page} setPage={setPage} taskCount={taskCount} moreOpen={moreOpen} setMoreOpen={setMoreOpen}/>}
      {isMobile&&moreOpen&&<MoreDrawer page={page} setPage={setPage} onClose={()=>setMoreOpen(false)} exportData={exportData} importData={importData} isOffline={isOffline} darkMode={darkMode} setDarkMode={setDarkMode}/>}
      {showFeedbackPrompt && <FeedbackPrompt onOpen={() => { setShowFeedbackPrompt(false); setPage("feedback"); }} onDismiss={() => { setShowFeedbackPrompt(false); try { localStorage.setItem("hfm_feedback_dismissed", "true"); } catch(e) { console.warn("Could not save feedback dismissal state:", e); } }}/>}
      <AIAssistant data={data} setData={setData}/>
    </>
  );
}

export default function App() {
  return <ErrorBoundary><AppInner/></ErrorBoundary>;
}

/* ═══════════════════════════════════════════
   FEEDBACK SURVEY — 4-question user feedback
   ═══════════════════════════════════════════ */
function FeedbackSurvey({ setPage }) {
  const [answers, setAnswers] = useState({ module: "", confusion: "", missing: "", pay: "" });
  const [submitted, setSubmitted] = useState(false);

  const modules = ["Dashboard","Tasks","Farm Layout","Farming","Seasonal Calendar","Livestock","Pantry","Financials","Manuals","Smart offline farm assistant"];

  const update = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    const subject = encodeURIComponent("MyTerra App Feedback");
    const body = encodeURIComponent(
      `Most used module: ${answers.module || "Not answered"}\n\n` +
      `Confusing in first 5 minutes: ${answers.confusion || "Not answered"}\n\n` +
      `Missing feature: ${answers.missing || "Not answered"}\n\n` +
      `Willingness to pay: ${answers.pay || "Not answered"}`
    );
    window.open(`mailto:dervis.kanina@gmail.com?subject=${subject}&body=${body}`, "_blank");
    setSubmitted(true);
    // Mark survey as done so 7-day prompt won't show again
    try { localStorage.setItem("hfm_feedback_done", "true"); } catch(e) {}
  };

  if (submitted) {
    return (
      <div className="page-enter" style={{maxWidth:560,margin:"0 auto",textAlign:"center",padding:"60px 20px"}}>
        <div style={{fontSize:56,marginBottom:16}}>🎉</div>
        <h2 style={{fontFamily:F.head,fontSize:24,fontWeight:800,color:C.green,marginBottom:8}}>Thank you!</h2>
        <p style={{color:C.t2,fontSize:15,lineHeight:1.6,marginBottom:24}}>Your feedback helps us build a better tool for farmers like you. We read every single response.</p>
        <Btn onClick={() => setPage("home")}>Back to Dashboard</Btn>
      </div>
    );
  }

  return (
    <div className="page-enter" style={{maxWidth:600,margin:"0 auto"}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:F.head,fontSize:26,fontWeight:800,color:C.text,letterSpacing:"-0.02em"}}>💬 Help Us Improve</h1>
        <p style={{color:C.t2,fontSize:14,marginTop:4}}>4 quick questions — takes about 1 minute</p>
      </div>

      {/* Q1: Most used module */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>1. Which module do you use the most?</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {modules.map(m => (
            <button key={m} onClick={() => update("module", m)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${answers.module === m ? C.green : C.bdr}`,background:answers.module === m ? C.gp : C.bg,color:answers.module === m ? C.green : C.t2,fontSize:13,fontWeight:answers.module === m ? 600 : 500,cursor:"pointer",fontFamily:F.body,transition:"all .2s"}}>{m}</button>
          ))}
        </div>
      </div>

      {/* Q2: Confusion */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>2. What confused you in the first 5 minutes?</div>
        <textarea value={answers.confusion} onChange={e => update("confusion", e.target.value)} placeholder="e.g. I didn't know where to start, the layout was unclear..." rows={3} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:12,fontSize:13,fontFamily:F.body,resize:"vertical",outline:"none",background:C.bg,boxSizing:"border-box"}}/>
      </div>

      {/* Q3: Missing feature */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>3. What feature is missing that you'd really want?</div>
        <textarea value={answers.missing} onChange={e => update("missing", e.target.value)} placeholder="e.g. Weather integration, community forum, export to PDF..." rows={3} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:12,fontSize:13,fontFamily:F.body,resize:"vertical",outline:"none",background:C.bg,boxSizing:"border-box"}}/>
      </div>

      {/* Q4: Willingness to pay */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={SX.sectionHead}>4. Would you pay for this app?</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {["No, must be free","Maybe, if it had more features","Yes, $4.99/mo sounds fair","Yes, I'd pay $9.99/mo for a pro version"].map(opt => (
            <button key={opt} onClick={() => update("pay", opt)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${answers.pay === opt ? C.green : C.bdr}`,background:answers.pay === opt ? C.gp : C.bg,color:answers.pay === opt ? C.green : C.t2,fontSize:13,fontWeight:answers.pay === opt ? 600 : 500,cursor:"pointer",fontFamily:F.body,transition:"all .2s",textAlign:"left"}}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Btn onClick={handleSubmit} style={{width:"100%",marginBottom:12}}>
        Send Feedback via Email
      </Btn>
      <p style={{color:C.t3,fontSize:12,textAlign:"center"}}>Opens your email app with the answers pre-filled. Just hit send!</p>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FEEDBACK PROMPT — shows once after 7 days
   ═══════════════════════════════════════════ */
function FeedbackPrompt({ onOpen, onDismiss }) {
  return (
    <div style={{position:"fixed",bottom:92,left:"50%",transform:"translateX(-50%)",zIndex:1800,background:C.card,borderRadius:20,boxShadow:"0 12px 48px rgba(0,0,0,.18)",padding:"20px 24px",maxWidth:360,width:"calc(100% - 32px)",border:`1px solid ${C.bdr}`,animation:"fadeUp .4s ease both"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
        <div style={{fontSize:32,lineHeight:1}}>💬</div>
        <div style={SX.flex1}>
          <div style={{fontSize:16,fontWeight:700,color:C.text,fontFamily:F.head,marginBottom:4}}>How's it going?</div>
          <p style={{fontSize:13,color:C.t2,lineHeight:1.5,margin:0}}>You've been using MyTerra for a week! We'd love your feedback — it takes just 1 minute.</p>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={onOpen} sm>Give Feedback</Btn>
            <Btn onClick={onDismiss} v="secondary" sm>Maybe Later</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   AI FARM ASSISTANT — Offline Knowledge Engine
   Powered by the app's own crop/animal database.
   No API keys. No internet needed. Works in the field.
   ═══════════════════════════════════════════ */

// ── Knowledge Engine: smart offline query matcher ──
function farmKnowledgeEngine(query, data) {
  const q = query.toLowerCase().trim();
  const words = q.split(/\s+/);
  const now = new Date();
  const month = now.getMonth();
  const MN = ["january","february","march","april","may","june","july","august","september","october","november","december"];
  const MN_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

  // ── Helper: find crop by name (fuzzy) ──
  const findCrop = (text) => {
    const t = text.toLowerCase();
    return rCR(data.region).find(c => t.includes(c.name.toLowerCase())) || rCR(data.region).find(c => c.name.toLowerCase().includes(t));
  };

  // ── Helper: find animal by name (fuzzy) ──
  const findAnimal = (text) => {
    const t = text.toLowerCase();
    return Object.entries(LDB).find(([k]) => t.includes(k.toLowerCase()));
  };

  // ── Helper: get user's active crops ──
  const activePlots = data.garden.plots.filter(p => p.status !== "harvested");
  const userAnimals = data.livestock.animals;
  const zones = data.zones;

  // ── 1. CROP-SPECIFIC QUERIES ──
  const matchedCrop = findCrop(q);
  if (matchedCrop) {
    const c = matchedCrop;
    const varieties = getRegionalVarieties(c.name, data.region);
    const companions = COMP[c.name];
    const diff = getCropDifficulty(c.name);
    const userPlot = activePlots.find(p => p.crop === c.name);

    // "how to grow X" / "X guide" / "plant X"
    if (q.match(/how|grow|plant|guide|care|tips|start/)) {
      let r = `${c.emoji} ${c.name} — Complete Growing Guide\n\n`;
      r += `Category: ${c.cat} | Difficulty: ${diff.l}\n`;
      r += `Days to harvest: ${c.days} | Spacing: ${c.spacing}cm\n`;
      r += `Sun: ${c.sun} | Water: ${c.waterFreq}\n`;
      if (c.pH) r += `Ideal pH: ${c.pH}\n`;
      r += `Sow: ${c.sowIn} | Harvest: ${c.harvest}\n\n`;
      r += `Step-by-step:\n`;
      c.steps.forEach((s, i) => { r += `${i + 1}. Day ${s.d}: ${s.l} — ${s.t}\n`; });
      if (c.fert) r += `\nFertilizer: ${c.fert}\n`;
      if (companions) {
        r += `\nCompanions:\n`;
        r += `Good with: ${companions.good.join(", ") || "None listed"}\n`;
        if (companions.bad.length > 0) r += `Avoid near: ${companions.bad.join(", ")}\n`;
      }
      if (varieties.length > 0) {
        r += `\nBest varieties:\n`;
        varieties.slice(0, 3).forEach(v => { r += `- ${v.name}: ${v.note}\n`; });
      }
      r += `\nStorage: ${c.storage}`;
      if (userPlot) r += `\n\nYou currently have ${userPlot.name || c.name} planted${userPlot.plantDate ? ` since ${userPlot.plantDate}` : ""}.`;
      return r;
    }

    // "X pests" / "pest" / "disease" / "bugs"
    if (q.match(/pest|disease|bug|problem|sick|dying|yellow|wilt|rot|mold|mildew|aphid|worm/)) {
      let r = `${c.emoji} ${c.name} — Pests & Disease Guide\n\n`;
      if (c.pests && c.pests.length > 0) {
        c.pests.forEach((p, i) => { r += `${i + 1}. ${p.n}\nTreatment: ${p.t}\n\n`; });
      } else {
        r += `No major pest data recorded for ${c.name}. General tips:\n`;
        r += `- Check leaves daily for spots, holes, or discoloration\n`;
        r += `- Neem oil spray for most common pests\n`;
        r += `- Good spacing and airflow prevent fungal issues\n`;
      }
      return r;
    }

    // "water X" / "watering"
    if (q.match(/water|irrigat/)) {
      return `${c.emoji} ${c.name} — Watering Guide\n\nFrequency: ${c.waterFreq}\n\n${c.waterNote}\n\nTip: Water at the base, not the leaves. Early morning is best.`;
    }

    // "harvest X" / "when to pick"
    if (q.match(/harvest|pick|ready|ripe/)) {
      let r = `${c.emoji} ${c.name} — Harvest Info\n\n`;
      r += `Days to harvest: ${c.days}\n`;
      r += `Harvest season: ${c.harvest}\n`;
      r += `Storage: ${c.storage}\n`;
      if (userPlot && userPlot.plantDate) {
        const dLeft = Math.ceil((new Date(userPlot.plantDate).getTime() + c.days * 864e5 - now.getTime()) / 864e5);
        r += dLeft <= 0 ? `\nYour ${c.name} should be ready to harvest now!` : `\nYour ${c.name} should be ready in about ${dLeft} days.`;
      }
      return r;
    }

    // "X varieties" / "best variety"
    if (q.match(/variet|breed|type|which|best/)) {
      if (varieties.length > 0) {
        let r = `${c.emoji} ${c.name} — Varieties\n\n`;
        varieties.forEach(v => { r += `${v.name} (${v.days}d): ${v.note}${v.yld ? ` — Yield: ~${v.yld}kg/plant` : ""}\n\n`; });
        return r;
      }
      return `${c.emoji} ${c.name}: No specific variety data available. The general variety works well for most conditions. Days to harvest: ${c.days}, Spacing: ${c.spacing}cm.`;
    }

    // "companion" / "what to plant with X"
    if (q.match(/companion|plant with|next to|near|together|pair/)) {
      if (companions) {
        return `${c.emoji} ${c.name} — Companion Planting\n\nGood companions: ${companions.good.join(", ") || "None listed"}\nAvoid planting near: ${companions.bad.length > 0 ? companions.bad.join(", ") : "No known bad companions"}\n\nTip: Companion planting helps with pest control, pollination, and soil health.`;
      }
      return `No companion planting data for ${c.name} yet. General rule: mix plant families and avoid grouping the same crop type.`;
    }

    // Default: quick crop summary
    let r = `${c.emoji} ${c.name}\n\n`;
    r += `${c.cat} | ${diff.l} | ${c.days} days | ${c.sun}\n`;
    r += `Sow: ${c.sowIn} | Harvest: ${c.harvest}\n`;
    r += `Water: ${c.waterFreq} | Spacing: ${c.spacing}cm\n`;
    if (c.storage) r += `Storage: ${c.storage}\n`;
    r += `\nAsk me specifics like "${c.name} pests", "${c.name} varieties", or "how to grow ${c.name}".`;
    return r;
  }

  // ── 2. ANIMAL-SPECIFIC QUERIES ──
  const matchedAnimal = findAnimal(q);
  if (matchedAnimal) {
    const [name, db] = matchedAnimal;
    const breeds = BREEDS[name] || [];
    const cal = getRegionalCalendar(name, data.region);
    const userAnimal = userAnimals.find(a => a.type === name);

    if (q.match(/feed|food|eat|diet|nutrition/)) {
      return `${db.e} ${name} — Feeding Guide\n\n${db.feed}\n\nYour farm: ${userAnimal ? `${userAnimal.count}x ${name}${userAnimal.breed ? ` (${userAnimal.breed})` : ""}` : "None yet"}`;
    }
    if (q.match(/house|housing|coop|barn|shelter|space/)) {
      return `${db.e} ${name} — Housing\n\n${db.house}\n\nSleep: ${db.sleep}`;
    }
    if (q.match(/breed|mating|reproduc|baby|pregnan|gestat/)) {
      return `${db.e} ${name} — Breeding\n\n${db.breed}`;
    }
    if (q.match(/sick|health|injur|hurt|limp|wound|treat|vet/)) {
      let r = `${db.e} ${name} — Health & Injuries\n\n`;
      db.inj.forEach((j, i) => { r += `${i + 1}. ${j.n}\nTreatment: ${j.t}\n\n`; });
      return r;
    }
    if (q.match(/produce|egg|milk|meat|wool|honey|output|yield/)) {
      let r = `${db.e} ${name} — Produce\n\nProduces: ${db.prod.join(", ")}\n\n`;
      Object.entries(db.out).forEach(([k, v]) => { r += `${k}: ~${v.p} ${v.u}\nStorage: ${v.s}\n\n`; });
      if (userAnimal) r += `Your ${userAnimal.count}x ${name} could produce:\n`;
      if (userAnimal) Object.entries(db.out).forEach(([k, v]) => { r += `- ${k}: ~${Math.round(v.p * userAnimal.count * 10) / 10} ${v.u}\n`; });
      return r;
    }
    if (q.match(/breed|which breed|best breed|variet|type/i) && breeds.length > 0) {
      let r = `${db.e} ${name} — Breeds\n\n`;
      breeds.forEach(b => { r += `${b.name}: ${b.note}${b.eggs ? ` (${b.eggs} eggs/day)` : ""}\n\n`; });
      return r;
    }
    if (q.match(/calendar|month|schedul|when/i) && cal) {
      let r = `${db.e} ${name} — Monthly Calendar\n\n`;
      Object.entries(cal).forEach(([m, t]) => { r += `${m}: ${t}\n`; });
      return r;
    }
    // Default animal summary
    let r = `${db.e} ${name}\n\nProduces: ${db.prod.join(", ")}\n`;
    r += `Feed: ${db.feed}\nHousing: ${db.house}\nBreeding: ${db.breed}\n`;
    if (userAnimal) r += `\nYour farm: ${userAnimal.count}x ${name}${userAnimal.breed ? ` (${userAnimal.breed})` : ""}`;
    r += `\n\nAsk me: "${name} feeding", "${name} health", "${name} breeds", or "${name} produce"`;
    return r;
  }

  // ── 3. SEASONAL QUERIES ──
  if (q.match(/what.*plant|what.*sow|what.*grow|plant now|sow now|this month|season/)) {
    const sowNow = rCR(data.region).filter(c => {
      const months = c.sowIn.toLowerCase();
      return MN_SHORT[month] && months.includes(MN_SHORT[month].toLowerCase());
    });
    const harvestNow = rCR(data.region).filter(c => {
      const months = c.harvest.toLowerCase();
      return MN_SHORT[month] && months.includes(MN_SHORT[month].toLowerCase());
    });
    const alreadyPlanted = new Set(activePlots.map(p => p.crop));
    const newOptions = sowNow.filter(c => !alreadyPlanted.has(c.name));

    let r = `${MN[month].charAt(0).toUpperCase() + MN[month].slice(1)} — What to Plant & Harvest\n\n`;
    r += `SOW NOW (${sowNow.length} crops):\n`;
    sowNow.slice(0, 10).forEach(c => {
      const diff = getCropDifficulty(c.name);
      r += `${c.emoji} ${c.name} — ${c.days}d, ${diff.l}${alreadyPlanted.has(c.name) ? " (already planted)" : ""}\n`;
    });
    if (sowNow.length > 10) r += `...and ${sowNow.length - 10} more\n`;
    if (harvestNow.length > 0) {
      r += `\nHARVEST NOW (${harvestNow.length} crops):\n`;
      harvestNow.slice(0, 8).forEach(c => { r += `${c.emoji} ${c.name}\n`; });
    }
    if (newOptions.length > 0) {
      const easy = newOptions.filter(c => getCropDifficulty(c.name).l === "Easy").slice(0, 3);
      if (easy.length > 0) {
        r += `\nRecommended for you (easy, not yet planted):\n`;
        easy.forEach(c => { r += `${c.emoji} ${c.name} — ${c.days}d to harvest\n`; });
      }
    }
    return r;
  }

  // ── 4. COMPANION PLANTING QUERIES ──
  if (q.match(/companion|plant.*with|plant.*near|good.*together|bad.*together/)) {
    if (activePlots.length > 0) {
      let r = "Companion Planting — Your Current Crops\n\n";
      activePlots.forEach(p => {
        const co = COMP[p.crop];
        if (co) {
          r += `${p.name || p.crop}:\n`;
          r += `  Good with: ${co.good.join(", ") || "—"}\n`;
          if (co.bad.length > 0) r += `  Avoid: ${co.bad.join(", ")}\n`;
          r += "\n";
        }
      });
      return r;
    }
    let r = "Companion Planting — Top Pairings\n\n";
    r += "Tomato + Basil: Classic duo. Basil repels pests, improves flavor.\n";
    r += "Carrot + Onion: Each repels the other's main pest.\n";
    r += "Corn + Bean + Squash: The Three Sisters. Corn supports beans, squash shades soil.\n";
    r += "Lettuce + Radish: Fast radish marks slow lettuce rows.\n\n";
    r += "Plant some crops and I'll give you personalized companion advice!";
    return r;
  }

  // ── 5. MY FARM STATUS ──
  if (q.match(/my farm|my crop|my animal|status|overview|what do i have|farm summary|how.*my/)) {
    let r = "Your Farm Summary\n\n";
    r += `Zones: ${zones.length > 0 ? zones.map(z => z.name).join(", ") : "None yet — set up your farm layout first"}\n\n`;
    if (activePlots.length > 0) {
      r += `Active crops (${activePlots.length}):\n`;
      activePlots.forEach(p => {
        const c = rCM(data.region).get(p.crop);
        if (c && p.plantDate) {
          const dLeft = Math.ceil((new Date(p.plantDate).getTime() + c.days * 864e5 - now.getTime()) / 864e5);
          r += `${c.emoji} ${p.name || p.crop}${dLeft <= 0 ? " — READY TO HARVEST!" : ` — ${dLeft}d to harvest`}\n`;
        } else {
          r += `${c?.emoji || "🌱"} ${p.name || p.crop} (planned)\n`;
        }
      });
    } else { r += "No crops planted yet.\n"; }
    if (userAnimals.length > 0) {
      r += `\nLivestock:\n`;
      userAnimals.forEach(a => {
        const db = LDB[a.type];
        r += `${db?.e || "🐄"} ${a.count}x ${a.type}${a.breed ? ` (${a.breed})` : ""}\n`;
      });
    } else { r += "\nNo animals yet.\n"; }
    const costs = data.costs?.items || [];
    const exp = costs.filter(i => i.type === "expense").reduce((s, i) => s + i.amount, 0);
    const inc = costs.filter(i => i.type !== "expense").reduce((s, i) => s + i.amount, 0);
    if (costs.length > 0) r += `\nFinancials: Spent \u20ac${exp.toFixed(0)} | Revenue \u20ac${inc.toFixed(0)} | Net \u20ac${(inc - exp).toFixed(0)}`;
    return r;
  }

  // ── 6. WHAT TO DO TODAY ──
  if (q.match(/what.*do|today|task|todo|should i|next step|what now|action/)) {
    const tasks = buildTaskQueue(data);
    if (tasks.length === 0) {
      return "No tasks right now! Here's what you can do:\n\n1. Plant a new crop (go to Farming)\n2. Add livestock (go to Livestock)\n3. Check the Seasonal Calendar for what's in season\n4. Set up your farm layout in Farm Designer";
    }
    let r = "Today's Priority Tasks\n\n";
    tasks.slice(0, 8).forEach((t, i) => {
      const pri = t.pri === 0 ? "URGENT" : t.pri <= 1 ? "High" : t.pri <= 2 ? "Medium" : "Low";
      r += `${i + 1}. [${pri}] ${t.emoji} ${t.title}\n   ${t.loc}${t.daysOut > 0 ? ` — in ${t.daysOut}d` : t.daysOut === 0 ? " — TODAY" : ""}\n`;
    });
    return r;
  }

  // ── 7. PRESERVATION QUERIES ──
  if (q.match(/preserv|can|pickle|ferment|dry|freeze|store|jam|sauce|smoke|cure/)) {
    const pKeys = Object.keys(PRESERVATION);
    const match = pKeys.find(k => q.includes(k.toLowerCase()));
    if (match) {
      const p = PRESERVATION[match];
      let r = `${p.emoji || "🫙"} ${match}\n\n`;
      r += `Category: ${p.cat} | Difficulty: ${p.diff}\n`;
      r += `Time: ${p.time}\n\n`;
      if (p.overview) r += `${p.overview}\n\n`;
      if (p.ingredients) r += `Ingredients: ${p.ingredients}\n\n`;
      if (p.steps) r += `Steps:\n${p.steps}\n`;
      return r;
    }
    // General preservation advice
    let r = "Food Preservation Methods\n\n";
    r += "Available in your Manuals tab:\n";
    const cats = {};
    Object.entries(PRESERVATION).forEach(([name, p]) => {
      if (!cats[p.cat]) cats[p.cat] = [];
      cats[p.cat].push(name);
    });
    Object.entries(cats).slice(0, 6).forEach(([cat, items]) => {
      r += `\n${cat}: ${items.slice(0, 4).join(", ")}${items.length > 4 ? "..." : ""}\n`;
    });
    r += "\nAsk me about a specific method like 'how to pickle' or 'how to make jam'.";
    return r;
  }

  // ── 8. WATERING GENERAL ──
  if (q.match(/water|irrigat/)) {
    if (activePlots.length > 0) {
      let r = "Watering Guide for Your Crops\n\n";
      activePlots.forEach(p => {
        const c = rCM(data.region).get(p.crop);
        if (c) r += `${c.emoji} ${p.name || p.crop}: ${c.waterFreq} — ${c.waterNote}\n\n`;
      });
      r += "General tip: Water in the early morning at the base of plants, not on leaves.";
      return r;
    }
    return "Watering Tips\n\nEarly morning is best. Water at the base, not on leaves. Most vegetables need water every 2-3 days in summer. Check soil moisture by sticking your finger 5cm deep — if dry, water.\n\nPlant some crops and I'll give you specific watering schedules!";
  }

  // ── 9. YELLOWING LEAVES ──
  if (q.match(/yellow|leaf|leaves/)) {
    return "Yellowing Leaves — Common Causes\n\n1. Nitrogen deficiency: Lower leaves yellow first. Fix with compost tea or balanced fertilizer.\n2. Overwatering: Leaves yellow and droop. Let soil dry between waterings.\n3. Underwatering: Leaves dry and curl. Water deeply and consistently.\n4. pH imbalance: Test soil. Most vegetables want pH 6.0-7.0.\n5. Pests: Check undersides of leaves for aphids, whitefly, or mites.\n6. Natural aging: Oldest leaves yellow as plant matures — normal.\n\nTip: If it's just the bottom leaves, it's likely nitrogen. If it's all over, check water and pH first.";
  }

  // ── 10. HEAT STRESS ──
  if (q.match(/heat|hot|summer|shade|scorch|sunburn|wilt/)) {
    return "Heat Stress Management\n\nSigns: Wilting in afternoon, leaf curl, blossom drop, sunscald on fruit.\n\nImmediate actions:\n1. Water deeply in early morning (before 8am)\n2. Mulch 8-10cm thick to keep roots cool\n3. Shade cloth (30-50%) over sensitive crops\n4. Mist plants in late afternoon (not midday!)\n5. Harvest early morning when cool\n\nHeat-tolerant crops: Okra, eggplant, peppers, sweet potato, watermelon.\nHeat-sensitive: Lettuce, spinach, peas, broccoli — grow these in spring/fall.";
  }

  // ── 11. BEGINNER QUERIES ──
  if (q.match(/beginner|start|new|first time|easy|simple|recommend/)) {
    const easyCrops = rCR(data.region).filter(c => getCropDifficulty(c.name).l === "Easy").slice(0, 6);
    let r = "Getting Started — Beginner's Guide\n\n";
    r += "Start with these easy crops:\n";
    easyCrops.forEach(c => { r += `${c.emoji} ${c.name} — ${c.days} days, ${c.spacing}cm spacing\n`; });
    r += "\nFirst steps:\n";
    r += "1. Set up your Farm Layout (map your zones)\n";
    r += "2. Plant 2-3 easy crops to build confidence\n";
    r += "3. Follow the step-by-step guides in each crop card\n";
    r += "4. Check your Tasks page daily\n";
    r += "5. Harvest and enjoy!\n\n";
    r += "For animals, start with chickens — they're the easiest and give you eggs daily.";
    return r;
  }

  // ── 12. SOIL QUERIES ──
  if (q.match(/soil|ph|compost|mulch|fertiliz|nutrient|nitrogen|potassium|phosphor/)) {
    return "Soil Health Guide\n\nIdeal soil pH for most vegetables: 6.0-7.0\n\nImproving soil:\n1. Compost: Add 5-8cm yearly. Best all-round amendment.\n2. Mulch: 8-10cm straw or wood chips. Retains moisture, suppresses weeds.\n3. Crop rotation: Never plant the same family in the same spot 2 years running.\n4. Cover crops: Plant clover or rye in fallow beds over winter.\n\nFertilizer basics:\n- N (Nitrogen): Leafy growth. Compost, blood meal, fish emulsion.\n- P (Phosphorus): Roots and flowers. Bone meal, rock phosphate.\n- K (Potassium): Fruit and disease resistance. Wood ash, potassium sulfate.\n\nTest your soil yearly. Local agricultural offices often do free tests.";
  }

  // ── 13. LIST ALL CROPS ──
  if (q.match(/list.*crop|all crop|crop list|what crop|how many crop/)) {
    let r = `All ${rCR(data.region).length} Crops in Database\n\n`;
    const byCat = {};
    rCR(data.region).forEach(c => { if (!byCat[c.cat]) byCat[c.cat] = []; byCat[c.cat].push(c); });
    Object.entries(byCat).forEach(([cat, crops]) => {
      r += `${cat} (${crops.length}):\n`;
      crops.forEach(c => { r += `  ${c.emoji} ${c.name} — ${c.days}d\n`; });
      r += "\n";
    });
    return r;
  }

  // ── 14. LIST ALL ANIMALS ──
  if (q.match(/list.*animal|all animal|animal list|what animal|how many animal/)) {
    let r = `All ${Object.keys(LDB).length} Animals in Database\n\n`;
    Object.entries(LDB).forEach(([name, db]) => {
      r += `${db.e} ${name} — Produces: ${db.prod.join(", ")}\n`;
    });
    r += "\nAsk about any animal for detailed care guide, breeds, and produce info.";
    return r;
  }

  // ── 15. HELP / WHAT CAN YOU DO ──
  if (q.match(/help|what can you|can you|how to use|feature|capabilit/)) {
    return "I'm your offline farming encyclopedia! Here's what I can help with:\n\n" +
      "Crops: \"How to grow tomatoes\", \"tomato pests\", \"tomato varieties\"\n" +
      "Animals: \"chicken feeding\", \"goat health\", \"cow breeds\"\n" +
      "Seasonal: \"What to plant now\", \"what's in season\"\n" +
      "Companions: \"What to plant with tomatoes\"\n" +
      "Tasks: \"What should I do today\"\n" +
      "My farm: \"Farm status\", \"My crops\"\n" +
      "Preservation: \"How to pickle\", \"how to make jam\"\n" +
      "General: \"Soil health\", \"watering tips\", \"heat stress\"\n" +
      "Lists: \"All crops\", \"All animals\"\n\n" +
      `I have data on ${rCR(data.region).length} crops, ${Object.keys(LDB).length} animals, ${Object.keys(PRESERVATION).length} preservation methods, and ${Object.keys(VARIETIES).length > 0 ? Object.values(VARIETIES).flat().length : 0} varieties. All offline!`;
  }

  // ── FALLBACK: Try to find any matching content ──
  // Search crop names, animal names, preservation names
  const allNames = [...rCR(data.region).map(c => ({name: c.name, type: "crop", emoji: c.emoji})),
    ...Object.entries(LDB).map(([k, v]) => ({name: k, type: "animal", emoji: v.e})),
    ...Object.keys(PRESERVATION).map(k => ({name: k, type: "preservation", emoji: "🫙"}))];

  const fuzzyMatches = allNames.filter(n => {
    const nLow = n.name.toLowerCase();
    return words.some(w => w.length > 2 && nLow.includes(w));
  });

  if (fuzzyMatches.length > 0) {
    let r = "I found some matches for your question:\n\n";
    fuzzyMatches.slice(0, 5).forEach(m => {
      r += `${m.emoji} ${m.name} (${m.type})\n`;
    });
    r += "\nTry asking specifically, like \"how to grow " + fuzzyMatches[0].name + "\" or \"" + fuzzyMatches[0].name + " care guide\".";
    return r;
  }

  return `I didn't find a specific answer for "${query}" in my database.\n\nTry asking about:\n- A specific crop: "How to grow tomatoes"\n- An animal: "Chicken care"\n- Seasonal advice: "What to plant now"\n- Your farm: "My farm status"\n- Tasks: "What should I do today"\n\nI have ${rCR(data.region).length} crops and ${Object.keys(LDB).length} animals in my offline knowledge base!`;
}

// ── Build suggestion catalog from all database entries ──
function buildAISuggestions(region) {
  const s = [];
  // Crop suggestions — region-filtered: crops with _na for this region are excluded.
  rCR(region).forEach(c => {
    s.push({e:c.emoji, q:`How to grow ${c.name}`, cat:"Crop Guide", keys:[c.name.toLowerCase(),"grow","plant","guide"]});
    s.push({e:c.emoji, q:`${c.name} pests & diseases`, cat:"Pest Help", keys:[c.name.toLowerCase(),"pest","disease","bug"]});
    s.push({e:c.emoji, q:`${c.name} watering guide`, cat:"Watering", keys:[c.name.toLowerCase(),"water","irrigat"]});
    s.push({e:c.emoji, q:`${c.name} harvest info`, cat:"Harvest", keys:[c.name.toLowerCase(),"harvest","pick","ready"]});
    s.push({e:c.emoji, q:`${c.name} varieties`, cat:"Varieties", keys:[c.name.toLowerCase(),"variet","type","best"]});
    s.push({e:c.emoji, q:`Companion planting for ${c.name}`, cat:"Companions", keys:[c.name.toLowerCase(),"companion","plant with"]});
  });
  // Animal suggestions
  Object.entries(LDB).forEach(([name, db]) => {
    s.push({e:db.e, q:`${name} care guide`, cat:"Animal Care", keys:[name.toLowerCase(),"care","guide"]});
    s.push({e:db.e, q:`${name} feeding guide`, cat:"Feeding", keys:[name.toLowerCase(),"feed","food","diet"]});
    s.push({e:db.e, q:`${name} housing`, cat:"Housing", keys:[name.toLowerCase(),"house","coop","barn","shelter"]});
    s.push({e:db.e, q:`${name} breeding`, cat:"Breeding", keys:[name.toLowerCase(),"breed","mating","baby"]});
    s.push({e:db.e, q:`${name} health & injuries`, cat:"Health", keys:[name.toLowerCase(),"health","sick","vet","injur"]});
    s.push({e:db.e, q:`${name} produce & yield`, cat:"Produce", keys:[name.toLowerCase(),"produce","egg","milk","yield"]});
    if (BREEDS[name]?.length > 0) s.push({e:db.e, q:`${name} breeds`, cat:"Breeds", keys:[name.toLowerCase(),"breed","type"]});
    if (getRegionalCalendar(name, region)) s.push({e:db.e, q:`${name} monthly calendar`, cat:"Calendar", keys:[name.toLowerCase(),"calendar","month","schedule"]});
  });
  // Preservation suggestions
  Object.entries(PRESERVATION).forEach(([name, p]) => {
    s.push({e:p.emoji||"🫙", q:`How to ${name.toLowerCase()}`, cat:"Preservation", keys:[name.toLowerCase(),"preserv","store"]});
  });
  // General topics
  s.push({e:"🌱", q:"What should I plant now?", cat:"Seasonal", keys:["plant","sow","season","month","now"]});
  s.push({e:"📋", q:"What should I do today?", cat:"Tasks", keys:["today","task","todo","do","action"]});
  s.push({e:"🌾", q:"My farm status", cat:"Farm", keys:["farm","status","overview","my"]});
  s.push({e:"🤝", q:"Companion planting tips", cat:"Companions", keys:["companion","together","pair"]});
  s.push({e:"💧", q:"Watering tips for my crops", cat:"Watering", keys:["water","irrigat"]});
  s.push({e:"🌿", q:"Soil health guide", cat:"Soil", keys:["soil","ph","compost","mulch","fertiliz"]});
  s.push({e:"🌡️", q:"Heat stress management", cat:"Weather", keys:["heat","hot","summer","shade","wilt"]});
  s.push({e:"🍂", q:"Yellowing leaves diagnosis", cat:"Diagnosis", keys:["yellow","leaf","leaves"]});
  s.push({e:"🌱", q:"Beginner's guide to farming", cat:"Getting Started", keys:["beginner","start","new","first","easy"]});
  s.push({e:"📜", q:"List all crops", cat:"Lists", keys:["list","all crop","crop list"]});
  s.push({e:"🐾", q:"List all animals", cat:"Lists", keys:["list","all animal","animal list"]});
  s.push({e:"❓", q:"What can you help with?", cat:"Help", keys:["help","what can","feature"]});
  return s;
}

function AIAssistant({data}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    {role:"assistant", content:`Hi! I'm your farm assistant. I know everything about the ${rCR(data.region).length} crops and ${Object.keys(LDB).length} animals in your database — and I work offline!\n\nStart typing a crop or animal name and pick from the dropdown, or tap a quick prompt below.`}
  ]);
  const [input, setInput] = useState("");
  const [suggestionsHidden, setSuggestionsHidden] = useState(false);
  const [selIdx, setSelIdx] = useState(-1);
  const scrollRef = useRef(null);
  const sugRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, open]);

  // Score suggestions during render — derived, no setState-in-effect cascade.
  // The dropdown can be dismissed (Escape, Tab, send) via suggestionsHidden;
  // typing again sets suggestionsHidden=false in onChange and the dropdown
  // reappears against the next input value.
  // Region-scoped suggestion catalog — recomputed only when the user changes region.
  const aiCatalog = useMemo(() => buildAISuggestions(data.region), [data.region]);
  const scoredSuggestions = useMemo(() => {
    const q = input.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/);
    const scored = aiCatalog.map(s => {
      let score = 0;
      if (s.keys.some(k => k.startsWith(q))) score += 10;
      else if (s.keys.some(k => k.includes(q))) score += 6;
      else {
        words.forEach(w => {
          if (w.length < 2) return;
          s.keys.forEach(k => { if (k.includes(w)) score += 3; });
          if (s.q.toLowerCase().includes(w)) score += 2;
          if (s.cat.toLowerCase().includes(w)) score += 1;
        });
      }
      return {...s, score};
    }).filter(s => s.score > 0).sort((a,b) => b.score - a.score);
    const seen = new Set();
    const unique = [];
    for (const s of scored) {
      if (!seen.has(s.q) && unique.length < 8) { seen.add(s.q); unique.push(s); }
    }
    return unique;
  }, [input, aiCatalog]);
  const suggestions = suggestionsHidden ? [] : scoredSuggestions;

  const sendQuery = (text) => {
    if (!text.trim()) return;
    const reply = farmKnowledgeEngine(text, data);
    setMsgs(prev => [...prev, {role:"user", content: text}, {role:"assistant", content: reply}]);
    setInput("");
    setSuggestionsHidden(true);
    setSelIdx(-1);
  };

  const send = () => sendQuery(input.trim());

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx(i => Math.max(i - 1, -1)); return; }
      if (e.key === "Enter" && !e.shiftKey && selIdx >= 0) { e.preventDefault(); sendQuery(suggestions[selIdx].q); return; }
      if (e.key === "Tab" && selIdx >= 0) { e.preventDefault(); setInput(suggestions[selIdx].q); setSuggestionsHidden(true); return; }
      if (e.key === "Escape") { setSuggestionsHidden(true); setSelIdx(-1); return; }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const quickPrompts = [
    {e:"🌱", q:"What should I plant now?"},
    {e:"📋", q:"What should I do today?"},
    {e:"🌾", q:"My farm status"},
    {e:"🐔", q:"Chicken care guide"},
    {e:"🍅", q:"How to grow tomatoes"},
    {e:"🤝", q:"Companion planting tips"},
    {e:"💧", q:"Watering tips for my crops"},
    {e:"📚", q:"What can you help with?"},
  ];

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="emoji-bounce"
        style={{
          position:"fixed", bottom:24, right:24, zIndex:2000,
          width:56, height:56, borderRadius:28,
          background:C.grd,
          border:"none", cursor:"pointer",
          boxShadow:"0 4px 20px rgba(45,106,79,.5)",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:24, color:"#fff",
          transition:"transform .2s, box-shadow .2s",
        }}
        title="Farm Assistant"
      >
        {open ? "\u2715" : "\uD83C\uDF3E"}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position:"fixed", bottom:92, right:24, zIndex:1999,
          width:380, maxWidth:"calc(100vw - 32px)",
          height:540, maxHeight:"calc(100vh - 120px)",
          background:C.card, borderRadius:20,
          boxShadow:"0 12px 48px rgba(0,0,0,.18)",
          display:"flex", flexDirection:"column",
          overflow:"hidden",
          border:`1px solid ${C.bdr}`,
          animation:"fadeUp .3s ease both",
        }}>
          {/* Header */}
          <div style={{background:C.grdHero,padding:"14px 18px",flexShrink:0}}>
            <div style={SX.rowCenterG10}>
              <div style={{width:36,height:36,borderRadius:18,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🌾</div>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#fff",fontFamily:F.head}}>Farm Assistant</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Offline · {rCR(data.region).length} crops · {Object.keys(LDB).length} animals</div>
              </div>
              <button onClick={()=>setOpen(false)} style={{marginLeft:"auto",background:"rgba(255,255,255,.2)",border:"none",borderRadius:16,width:28,height:28,cursor:"pointer",color:"#fff",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"14px 14px 8px",display:"flex",flexDirection:"column",gap:10}}>
            {msgs.map((m,i) => (
              <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start",gap:4}}>
                <div style={{
                  maxWidth:"88%", padding:"10px 13px",
                  background:m.role==="user"?C.green:"#f3f4f6",
                  color:m.role==="user"?"#fff":C.text,
                  borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
                  fontSize:13, lineHeight:1.6,
                  whiteSpace:"pre-wrap", fontFamily:F.body,
                }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          {/* Quick prompts */}
          {msgs.length <= 1 && (
            <div style={{padding:"4px 12px 2px",flexShrink:0,display:"flex",gap:4,flexWrap:"wrap"}}>
              {quickPrompts.map((p,i)=>(
                <button key={i} onClick={()=>sendQuery(p.q)} style={{padding:"5px 10px",borderRadius:16,border:`1px solid ${C.bdr}`,background:C.bg,fontSize:11,cursor:"pointer",color:C.t2,fontFamily:F.body,transition:"all .15s"}}>{p.e} {p.q}</button>
              ))}
            </div>
          )}

          {/* Input area with autocomplete dropdown */}
          <div style={{padding:"10px 12px",borderTop:`1px solid ${C.bdr}`,flexShrink:0,background:C.bg,position:"relative"}}>
            {/* Autocomplete dropdown — appears above input */}
            {suggestions.length > 0 && (
              <div ref={sugRef} style={{
                position:"absolute", bottom:"100%", left:0, right:0,
                background:C.card, borderTop:`1px solid ${C.bdr}`,
                boxShadow:"0 -4px 16px rgba(0,0,0,.1)",
                maxHeight:280, overflowY:"auto",
                borderRadius:"12px 12px 0 0",
              }}>
                {suggestions.map((s,i) => (
                  <button key={i}
                    onClick={() => sendQuery(s.q)}
                    onMouseEnter={() => setSelIdx(i)}
                    style={{
                      display:"flex", alignItems:"center", gap:10,
                      width:"100%", padding:"10px 14px",
                      background: i === selIdx ? "#f0fdf4" : "transparent",
                      border:"none", borderBottom:`1px solid ${C.bdr}`,
                      cursor:"pointer", textAlign:"left",
                      transition:"background .1s",
                    }}
                  >
                    <span style={{fontSize:18,flexShrink:0}}>{s.e}</span>
                    <div style={SX.flex1min0}>
                      <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:F.body,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.q}</div>
                      <div style={{fontSize:10,color:C.t3,fontFamily:F.body}}>{s.cat}</div>
                    </div>
                    <span style={{fontSize:10,color:C.t3,flexShrink:0}}>tap</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
              <textarea
                value={input}
                onChange={e=>{setInput(e.target.value); setSuggestionsHidden(false); setSelIdx(-1);}}
                onKeyDown={handleKeyDown}
                placeholder="Type a crop or animal name..."
                rows={1}
                style={{
                  flex:1, padding:"8px 12px", border:`1.5px solid ${suggestions.length > 0 ? C.green : C.bdr}`,
                  borderRadius:18, fontSize:13, fontFamily:F.body,
                  outline:"none", resize:"none", background:C.card,
                  lineHeight:1.4, maxHeight:80, overflowY:"auto",
                  transition:"border-color .2s",
                }}
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                style={{flexShrink:0,width:44,height:44,borderRadius:22,background:!input.trim()?"#ccc":C.green,border:"none",cursor:!input.trim()?"default":"pointer",color:"#fff",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}
              >➤</button>
            </div>
            <div style={{fontSize:10,color:C.t3,textAlign:"center",marginTop:5}}>Type 2+ letters to see suggestions · Works offline</div>
          </div>
        </div>
      )}
    </>
  );
}


