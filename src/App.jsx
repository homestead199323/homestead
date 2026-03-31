import React, { useState, useEffect, useCallback, useMemo, useRef, useReducer } from "react";
import { createPortal } from "react-dom";

/* ═══════════════════════════════════════════
   STORAGE — with error handling & debounced saves
   ═══════════════════════════════════════════ */
let _saveTimer = null;
let _latestData = null; // Track latest data for beforeunload flush
const DB = {
  KEY: "hfm_data_v7",
  load() {
    try {
      const raw = localStorage.getItem(DB.KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn("Load failed:", e); }
    return null;
  },
  save(data) {
    _latestData = data;
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      try { localStorage.setItem(DB.KEY, JSON.stringify(data)); }
      catch (e) { console.warn("Save failed:", e); }
    }, 500);
  },
  saveImmediate(data) {
    if (_saveTimer) clearTimeout(_saveTimer);
    try { localStorage.setItem(DB.KEY, JSON.stringify(data)); return true; }
    catch (e) { console.warn("Save failed:", e); return false; }
  },
  flush() {
    if (_latestData) DB.saveImmediate(_latestData);
  }
};
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);


/* ═══════════════════════════════════════════
   THEME
   ═══════════════════════════════════════════ */
const C = {
  bg: "#f8faf9", card: "#ffffff", green: "#2d6a4f", gl: "#40916c", gp: "#e8f5e9",
  gm: "#95d5b2", text: "#1a2e1a", t2: "#6b7b6b", t3: "#b8c4b8", bdr: "#e8ece8",
  red: "#ef4444", orange: "#f59e0b", blue: "#3b82f6", yellow: "#eab308",
  sh: "0 1px 3px rgba(0,0,0,.04), 0 1px 2px rgba(0,0,0,.06)",
  shL: "0 10px 25px rgba(0,0,0,.06), 0 4px 10px rgba(0,0,0,.04)",
  shXL: "0 20px 40px rgba(0,0,0,.08), 0 8px 16px rgba(0,0,0,.04)",
  r: 16, rs: 12,
  // Gradient presets — viral apps always use gradients
  grd: "linear-gradient(135deg, #2d6a4f 0%, #40916c 100%)",
  grdLight: "linear-gradient(135deg, #f0faf4 0%, #e8f5e9 50%, #f0f9ff 100%)",
  grdWarm: "linear-gradient(135deg, #fef9ef 0%, #fff7ed 50%, #fef3c7 100%)",
  grdHero: "linear-gradient(160deg, #1a4731 0%, #2d6a4f 40%, #40916c 100%)",
};
const F = { body: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", head: "'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", mono: "'JetBrains Mono','SF Mono','Cascadia Code',monospace" };

/* ═══════════════════════════════════════════
   ZONE TYPES
   ═══════════════════════════════════════════ */
const ZT = [
  { id: "veg", label: "Vegetable Bed", fill: "#52b788", stroke: "#2d6a4f", icon: "🥬" },
  { id: "orchard", label: "Orchard", fill: "#a7c957", stroke: "#6a994e", icon: "🍎" },
  { id: "herbs", label: "Herb Garden", fill: "#b7e4c7", stroke: "#52b788", icon: "🌿" },
  { id: "pasture", label: "Pasture", fill: "#d8f3dc", stroke: "#74c69d", icon: "🐄" },
  { id: "greenhouse", label: "Greenhouse", fill: "#c8e6c9", stroke: "#81c784", icon: "🏡" },
  { id: "barn", label: "Barn/Coop", fill: "#d4a373", stroke: "#a0522d", icon: "🏚" },
  { id: "water", label: "Water", fill: "#90caf9", stroke: "#42a5f5", icon: "💧" },
  { id: "house", label: "House", fill: "#ffe0b2", stroke: "#ffa726", icon: "🏠" },
  { id: "compost", label: "Compost", fill: "#a1887f", stroke: "#6d4c41", icon: "♻" },
  { id: "storage", label: "Storage", fill: "#b39ddb", stroke: "#7e57c2", icon: "📦" },
];

const ZT_MAP = new Map(ZT.map(t => [t.id, t]));

/* ═══════════════════════════════════════════
   COMPANION PLANTING
   ═══════════════════════════════════════════ */
const COMP = {
  Tomato: { good: ["Basil","Carrot","Onion","Spinach"], bad: ["Cabbage","Potato","Corn"] },
  "Pepper (Sweet)": { good: ["Basil","Carrot","Onion","Tomato"], bad: ["Bean (Dry)","Broad Bean"] },
  Potato: { good: ["Bean (Dry)","Cabbage","Corn","Garlic"], bad: ["Tomato","Pumpkin","Cucumber"] },
  Onion: { good: ["Carrot","Lettuce","Beetroot","Tomato"], bad: ["Bean (Dry)","Broad Bean"] },
  Garlic: { good: ["Tomato","Pepper (Sweet)","Carrot","Beetroot"], bad: ["Bean (Dry)","Broad Bean"] },
  Cabbage: { good: ["Beetroot","Onion","Garlic","Broad Bean"], bad: ["Tomato","Pepper (Sweet)"] },
  "Bean (Dry)": { good: ["Corn","Potato","Carrot","Cucumber"], bad: ["Onion","Garlic"] },
  Zucchini: { good: ["Corn","Bean (Dry)","Basil","Oregano"], bad: ["Potato"] },
  Carrot: { good: ["Tomato","Onion","Lettuce","Rosemary"], bad: [] },
  Cucumber: { good: ["Bean (Dry)","Corn","Lettuce","Basil"], bad: ["Potato","Sage"] },
  Basil: { good: ["Tomato","Pepper (Sweet)","Oregano"], bad: ["Sage"] },
  Oregano: { good: ["Tomato","Basil","Zucchini"], bad: [] },
  Rosemary: { good: ["Sage","Cabbage","Carrot"], bad: ["Basil"] },
  Lettuce: { good: ["Carrot","Onion","Cucumber","Spinach"], bad: [] },
  "Pepper (Hot)": { good: ["Basil","Carrot","Onion","Tomato"], bad: ["Bean (Dry)","Broad Bean"] },
  Eggplant: { good: ["Basil","Bean (Dry)","Pepper (Sweet)","Spinach"], bad: ["Potato","Tomato"] },
  Spinach: { good: ["Strawberry","Pea","Lettuce","Cabbage"], bad: [] },
  Pumpkin: { good: ["Corn","Bean (Dry)","Radish","Oregano"], bad: ["Potato"] },
  Beetroot: { good: ["Onion","Garlic","Lettuce","Cabbage"], bad: ["Bean (Dry)"] },
  Leek: { good: ["Carrot","Celery","Lettuce","Strawberry"], bad: ["Bean (Dry)","Broad Bean"] },
  Pea: { good: ["Carrot","Turnip","Radish","Cucumber","Corn"], bad: ["Onion","Garlic"] },
  "Broad Bean": { good: ["Cabbage","Potato","Lettuce","Spinach"], bad: ["Onion","Garlic"] },
  Corn: { good: ["Bean (Dry)","Pumpkin","Zucchini","Pea","Cucumber"], bad: ["Tomato"] },
  Celery: { good: ["Leek","Tomato","Cabbage","Bean (Dry)"], bad: ["Potato"] },
  Kale: { good: ["Beetroot","Onion","Garlic","Broad Bean","Celery"], bad: ["Tomato","Strawberry"] },
  "Swiss Chard": { good: ["Bean (Dry)","Cabbage","Onion","Lavender"], bad: [] },
  Strawberry: { good: ["Lettuce","Spinach","Leek","Onion","Basil"], bad: ["Cabbage","Kale"] },
  Sage: { good: ["Rosemary","Cabbage","Carrot","Strawberry"], bad: ["Basil","Cucumber"] },
  Lavender: { good: ["Rosemary","Sage","Oregano","Tomato"], bad: [] },
  Mint: { good: ["Cabbage","Tomato","Pepper (Sweet)"], bad: [] },
  Watermelon: { good: ["Corn","Radish","Oregano"], bad: ["Potato","Cucumber"] },
  Melon: { good: ["Corn","Lettuce","Radish"], bad: ["Potato","Cucumber"] },
  Okra: { good: ["Pepper (Sweet)","Basil","Lettuce"], bad: ["Potato"] },
  Radish: { good: ["Carrot","Lettuce","Pea","Spinach","Cucumber"], bad: [] },
  Turnip: { good: ["Pea","Lettuce","Onion"], bad: [] },
  Asparagus: { good: ["Tomato","Basil","Parsley","Lettuce"], bad: ["Onion","Garlic"] },
  Broccoli: { good: ["Onion","Garlic","Beetroot","Celery","Oregano"], bad: ["Tomato","Pepper (Sweet)","Strawberry"] },
  Cauliflower: { good: ["Onion","Garlic","Beetroot","Celery","Bean (Dry)"], bad: ["Tomato","Strawberry","Pepper (Sweet)"] },
  "Brussels Sprouts": { good: ["Onion","Garlic","Beetroot","Sage","Thyme"], bad: ["Tomato","Strawberry","Pepper (Sweet)"] },
  "Sweet Potato": { good: ["Bean (Dry)","Corn","Oregano","Thyme"], bad: ["Tomato","Pumpkin"] },
  Sunflower: { good: ["Corn","Cucumber","Lettuce","Bean (Dry)"], bad: ["Potato"] },
  Artichoke: { good: ["Broad Bean","Pea","Lettuce","Sunflower"], bad: ["Tomato"] },
  Rhubarb: { good: ["Cabbage","Kale","Garlic","Onion","Strawberry"], bad: [] },
  Blackberry: { good: ["Garlic","Mint","Oregano","Lavender"], bad: [] },
  Fennel: { good: ["Sage","Mint"], bad: ["Tomato","Bean (Dry)","Carrot","Dill","Coriander","Pepper (Sweet)"] },
  Celeriac: { good: ["Leek","Tomato","Cabbage","Bean (Dry)"], bad: ["Potato","Carrot"] },
  Lentil: { good: ["Cucumber","Lettuce","Potato","Corn"], bad: ["Onion","Garlic"] },
  Chickpea: { good: ["Lettuce","Corn","Cucumber","Sunflower"], bad: ["Onion","Garlic","Fennel"] },
};

/* ═══════════════════════════════════════════
   ANIMAL BREEDS
   ═══════════════════════════════════════════ */
const BREEDS = {
  Chicken: [
    {name:"Rhode Island Red",note:"Dual purpose. 250-300 eggs/yr. Hardy. Brown eggs.",eggs:0.8},
    {name:"Leghorn",note:"Top layer. 280-320 white eggs/yr. Active forager.",eggs:0.9},
    {name:"Sussex",note:"Dual purpose. 250 eggs/yr. Docile. Good meat bird.",eggs:0.7},
    {name:"Plymouth Rock",note:"Friendly. 200 brown eggs/yr. Cold-hardy.",eggs:0.6},
    {name:"Australorp",note:"Record holder 364 eggs/yr. Gentle. Heat-tolerant.",eggs:0.85},
    {name:"Orpington",note:"Very docile. 200 eggs/yr. Great mothers. Meat bird.",eggs:0.55},
    {name:"Marans",note:"Dark chocolate brown eggs. 150-200/yr. Hardy.",eggs:0.5},
    {name:"Silkie",note:"Broody. Best mothers. 100 eggs/yr. Ornamental.",eggs:0.3},
    {name:"ISA Brown",note:"Commercial hybrid. 300+ eggs/yr. First 2 years.",eggs:0.9},
    {name:"Heritage/Mixed",note:"Local heritage breeds. Hardy. 150-200 eggs/yr.",eggs:0.5},
  ],
  Goat: [
    {name:"Saanen",note:"Top dairy. 3-4L/day. White. Gentle."},
    {name:"Alpine",note:"Hardy dairy. 2-3L/day. Adaptable to mountains."},
    {name:"Nubian",note:"Rich milk (high butterfat). 2L/day. Good meat."},
    {name:"Boer",note:"Best meat breed. Fast growth. Docile."},
    {name:"Toggenburg",note:"Swiss dairy. 2-3L/day. Cold-hardy."},
    {name:"Local Heritage",note:"Regional breed. Hardy. Adapted to local terrain. Dual purpose."},
  ],
  Sheep: [
    {name:"Merino",note:"Best wool. Fine fiber. 150-200 fleece/yr."},
    {name:"Suffolk",note:"Top meat breed. Fast growth. Large."},
    {name:"Dorper",note:"Hair sheep (no shearing). Excellent meat. Heat-tolerant."},
    {name:"East Friesian",note:"Top dairy sheep. 2-3L/day."},
    {name:"Local Mountain Breed",note:"Native regional breed. Hardy mountain sheep. Dual purpose."},
    {name:"Lacaune",note:"Roquefort cheese sheep. Good dairy."},
  ],
  Cow: [
    {name:"Jersey",note:"Rich milk. 20L/day. Small. Efficient. High butterfat."},
    {name:"Holstein",note:"Highest volume. 25-30L/day. Large."},
    {name:"Brown Swiss",note:"Dual purpose. 18-22L/day. Hardy mountain breed."},
    {name:"Hereford",note:"Beef breed. Hardy. Easy calving."},
    {name:"Dexter",note:"Smallest. Dual purpose. Perfect for small farm."},
    {name:"Local/Busha",note:"Small native breed. Very hardy. Low maintenance. Suits small farms."},
  ],
  Pig: [
    {name:"Large White",note:"Best commercial breed. Fast growth. Lean."},
    {name:"Berkshire",note:"Premium meat. Marbled. Heritage."},
    {name:"Duroc",note:"Fast growth. Good meat quality. Hardy."},
    {name:"Mangalica",note:"Woolly pig. Excellent fat/lard. Heritage."},
    {name:"Kunekune",note:"Small. Grass-fed. Perfect homestead pig."},
    {name:"Heritage Local",note:"Hardy regional breed. Well adapted to local conditions."},
  ],
  Rabbit: [
    {name:"New Zealand White",note:"Top meat breed. Fast growth. 5kg adult."},
    {name:"Californian",note:"Excellent meat. 4-5kg. Commercial standard."},
    {name:"Rex",note:"Good meat + fur. 3-4kg."},
    {name:"Flemish Giant",note:"Largest breed. 6-8kg. Slower growth."},
    {name:"Heritage Mixed",note:"Hardy local heritage rabbits."},
  ],
  Duck: [
    {name:"Khaki Campbell",note:"Top layer. 300+ eggs/yr."},
    {name:"Pekin",note:"Best meat duck. Fast growth. 3kg in 7wk."},
    {name:"Indian Runner",note:"Upright. Great layers. Slug control."},
    {name:"Muscovy",note:"Quiet. Lean meat. Good mothers. Fly."},
    {name:"Rouen",note:"Large. Good meat. Decorative."},
  ],
  Bee: [{name:"Italian (Apis mellifera ligustica)",note:"Gentle. Productive. Most popular."},{name:"Carniolan",note:"Very gentle. Cold-hardy. Low swarming."},{name:"Buckfast",note:"Hybrid. Productive. Disease-resistant."}],
  Turkey: [{name:"Broad Breasted Bronze",note:"Commercial. Fast growth to 15kg. Cannot mate naturally."},{name:"Bourbon Red",note:"Heritage. Beautiful. 6-8kg. Good forager. Med-adapted."},{name:"Narragansett",note:"Heritage. Calm. 7-9kg. Cold and heat tolerant."},{name:"Royal Palm",note:"Small ornamental. 4-5kg. Excellent pest control."},{name:"Local Bronze/Black",note:"Regional heritage. Hardy. Self-sustaining. Best for free-range."}],
  Goose: [{name:"Toulouse",note:"Large grey. 8-10kg. Calm. Excellent for foie gras/confit."},{name:"Embden",note:"Large white. 10-12kg. Fast growth. Good meat."},{name:"Chinese",note:"Light breed. Best layers (60+ eggs). Loud — excellent guard goose."},{name:"Pilgrim",note:"Auto-sexing (males white, females grey). Calm. Dual purpose."},{name:"Sebastopol",note:"Curly-feathered ornamental. Gentle. Good layers."}],
  Quail: [{name:"Coturnix (Japanese)",note:"Standard. 300+ eggs/yr. Mature 6wk. Best for beginners."},{name:"Jumbo Coturnix",note:"Larger meat strain. 300g body. Same laying rate."},{name:"Texas A&M",note:"White. Bred for meat. Calm temperament."},{name:"Pharaoh",note:"Brown speckled. Original Coturnix. Hardy. Most common."},{name:"Button Quail",note:"Tiny ornamental. Not for production. Pets only."}],
  "Guinea Fowl": [{name:"Pearl",note:"Most common. Grey spotted. Hardy. Excellent tick control."},{name:"Lavender",note:"Light grey. Slightly calmer than Pearl."},{name:"White",note:"Visible at night. Slightly more predator-vulnerable."},{name:"Royal Purple",note:"Dark iridescent. Beautiful. Same hardiness as Pearl."}],
  Donkey: [{name:"Standard",note:"110-130cm. General purpose. Guardian. Pack animal."},{name:"Miniature",note:"Under 90cm. Companion. Pet. Light cart only."},{name:"Mammoth",note:"Over 140cm. Draft work. Can breed with horses (mules)."},{name:"Mediterranean Miniature",note:"Sardinian/Sicilian origin. Hardy. Heat-adapted. 80-100cm."}],
  Horse: [{name:"Haflinger",note:"Small (130-140cm). Strong. Draft + riding. Alpine/Med adapted. Golden chestnut."},{name:"Fjord",note:"Norwegian. Small, strong. Excellent draft. Calm. Easy keeper."},{name:"Murgese",note:"Italian breed. 150-160cm. Draft/riding. Heat-adapted. Hardy."},{name:"Quarter Horse",note:"Versatile. Cattle work, riding, light draft. Most popular worldwide."},{name:"Local Mountain Breed",note:"Regional breeds adapted to terrain. Hardy. Low maintenance. Dual purpose."}],
};

/* ═══════════════════════════════════════════
   CROP VARIETIES — breed-specific data
   ═══════════════════════════════════════════ */
const VARIETIES = {
  Tomato: [
    {name:"San Marzano",days:78,note:"Best paste/sauce tomato. Elongated. Low moisture. Italian classic.",yld:5},
    {name:"Roma",days:75,note:"Plum type. Great canning. Determinate — all ripen at once.",yld:5},
    {name:"Cherry",pH:"6.0-7.5",fert:"NPK 10-10-10 in early spring. Light feeder once established.",days:60,note:"Tiny, sweet. Very prolific. Kids love them. Eat fresh.",yld:3},
    {name:"Beefsteak",days:85,note:"Large slicing tomato. 300-500g each. Needs strong stakes.",yld:6},
    {name:"Brandywine",days:90,note:"Heirloom. Exceptional flavor. Pink. Lower yield but worth it.",yld:3},
  ],
  "Pepper (Sweet)": [
    {name:"California Wonder",days:75,note:"Classic bell. Thick walls. Green→red. Reliable.",yld:3},
    {name:"Corno di Toro",days:80,note:"Italian bull horn. Sweet. Perfect for roasting/grilling.",yld:4},
    {name:"Kapia",days:85,note:"Thick-walled. Ideal for roasting and pepper spreads.",yld:4},
    {name:"Banana Pepper",days:70,note:"Mild, yellow. Pickles beautifully. Early producer.",yld:3},
    {name:"Marconi",days:80,note:"Long Italian. Very sweet red. Thin skin. Frying pepper.",yld:3},
  ],
  Potato: [
    {name:"Yukon Gold",days:90,note:"Yellow flesh. Buttery. All-purpose. Early-mid season.",yld:2},
    {name:"Russet",days:110,note:"Classic baking potato. High starch. Good storage.",yld:2.5},
    {name:"Kennebec",days:100,note:"High yield. Disease resistant. Good chips/fries.",yld:3},
    {name:"Red Pontiac",days:90,note:"Red skin. Waxy. Great boiled/roasted. Mid season.",yld:2},
    {name:"Fingerling",days:90,note:"Small, elongated. Gourmet. Roast whole.",yld:1.5},
  ],
  Onion: [
    {name:"Yellow Spanish",days:110,note:"Large, mild. Good storage. All-purpose.",yld:0.2},
    {name:"Red Tropea",days:100,note:"Italian red. Sweet. Beautiful in salads.",yld:0.15},
    {name:"White Sweet",days:95,note:"Mild. Best raw. Shorter storage.",yld:0.15},
    {name:"Cipollini",days:90,note:"Flat Italian. Very sweet caramelized.",yld:0.1},
    {name:"Shallot",days:90,note:"Gourmet. Multiplies from 1 bulb. Milder.",yld:0.08},
  ],
  Cabbage: [
    {name:"Copenhagen Market",days:85,note:"Round, dense heads. 1.5-2kg. Classic.",yld:2},
    {name:"Red Cabbage",days:95,note:"Purple. High antioxidants. Braised or pickled.",yld:2},
    {name:"Savoy",days:90,note:"Crinkled leaves. Tender. Best for stuffing.",yld:1.5},
    {name:"Napa/Chinese",days:70,note:"Asian type. Mild. Fast growing. Stir-fry.",yld:1.5},
    {name:"Pointed/Hispi",days:65,note:"Cone-shaped. Very early. Sweet, tender.",yld:1},
  ],
  Cucumber: [
    {name:"Marketmore",days:55,note:"Classic slicing. Dark green. Disease-resistant.",yld:4},
    {name:"Pickling/Gherkin",days:50,note:"Small. Perfect for pickles. Very productive.",yld:5},
    {name:"Lemon",days:60,note:"Round, yellow. Mild. Unique. Prolific.",yld:3},
    {name:"Persian/Mini",days:50,note:"Thin skin. Seedless. No peeling needed.",yld:3},
    {name:"Armenian",days:55,note:"Long, ribbed. Heat-tolerant. Actually a melon.",yld:4},
  ],
  Lettuce: [
    {name:"Butterhead",days:45,note:"Soft, buttery leaves. Loose head. Mild.",yld:0.3},
    {name:"Romaine",days:55,note:"Upright. Crisp. Heat-tolerant. Caesar salad.",yld:0.4},
    {name:"Oak Leaf",days:40,note:"Loose leaf. Cut-and-come-again. Heat-tolerant.",yld:0.3},
    {name:"Lollo Rosso",days:40,note:"Red frilly. Beautiful. Cut-and-come-again.",yld:0.3},
    {name:"Iceberg",days:70,note:"Crisp head. Needs cool weather. Most water.",yld:0.5},
  ],
  Zucchini: [
    {name:"Black Beauty",days:50,note:"Classic dark green. Very prolific.",yld:6},
    {name:"Costata Romanesco",days:55,note:"Italian heirloom. Ribbed. Nutty flavor.",yld:5},
    {name:"Yellow Crookneck",days:50,note:"Yellow. Buttery flavor. Pick small.",yld:5},
    {name:"Round/Tondo",days:45,note:"Ball-shaped. Perfect for stuffing.",yld:4},
    {name:"Patio Star",days:48,note:"Compact bushy plant. Good for small gardens.",yld:5},
  ],
  Carrot: [
    {name:"Nantes",days:65,note:"Sweet, cylindrical. Best all-round. Reliable.",yld:0.12},
    {name:"Chantenay",days:70,note:"Short, stout. Rocky soil OK. Sweet.",yld:0.1},
    {name:"Danvers",days:75,note:"Conical. Tolerates heavy soil. Good storage.",yld:0.1},
    {name:"Purple Haze",days:70,note:"Purple outside, orange inside. High antioxidants.",yld:0.1},
    {name:"Cosmic Purple",days:70,note:"Deep purple. Striking. Sweet flavour.",yld:0.11},
  ],
  Beetroot: [
    {name:"Detroit Dark Red",days:60,note:"Classic. Deep red. Reliable. Sweet.",yld:0.2},
    {name:"Chioggia",days:55,note:"Candy-striped inside. Italian heirloom. Mild.",yld:0.2},
    {name:"Golden",days:55,note:"Yellow. Doesn't stain. Mild, sweet.",yld:0.2},
    {name:"Cylindra",days:60,note:"Long cylinder shape. Even slices. Good storage.",yld:0.25},
    {name:"Boltardy",days:60,note:"Bolt-resistant. Best for early sowing.",yld:0.2},
  ],
  "Pepper (Hot)": [
    {name:"Jalapeño",days:75,note:"Medium heat. 2,500-8,000 SHU. Versatile. Thick-walled.",yld:2},
    {name:"Cayenne",days:80,note:"Classic hot. 30,000-50,000 SHU. Dry whole. Prolific.",yld:1.5},
    {name:"Hungarian Wax",days:70,note:"Mild-medium. 5,000-15,000 SHU. Great pickled. Early.",yld:2},
    {name:"Habanero",days:100,note:"Very hot. 100,000-350,000 SHU. Needs long hot season.",yld:1},
    {name:"Serrano",days:80,note:"Hotter than jalapeño. Thin-walled. Mexican classic.",yld:1.5},
  ],
  Eggplant: [
    {name:"Black Beauty",days:75,note:"Classic large dark. Standard. Heavy yielder.",yld:4},
    {name:"Long Purple",days:70,note:"Slim elongated. Fast. Good frying. Asian-type.",yld:4},
    {name:"Rosa Bianca",days:85,note:"Italian heirloom. Violet-white. Creamy. Best flavor.",yld:3},
    {name:"Listada de Gandia",days:80,note:"Striped purple-white. Sweet. Beautiful. Grilling.",yld:3},
    {name:"Round/Stuffing",days:75,note:"Heat-tolerant. Ideal size for stuffing.",yld:4},
  ],
  Watermelon: [
    {name:"Crimson Sweet",days:85,note:"Classic. 8-12kg. Sweet red flesh. Striped.",yld:8},
    {name:"Sugar Baby",days:75,note:"Small (3-5kg). Icebox type. Very sweet. Space-efficient.",yld:4},
    {name:"Charleston Gray",days:90,note:"Large oblong (10-15kg). Good shipping. Disease-resistant.",yld:10},
    {name:"Moon and Stars",days:100,note:"Heirloom. Dark green + yellow spots. Sweet.",yld:8},
    {name:"Jubilee",days:85,note:"Long, striped. Classic flavour. Good disease resistance.",yld:9},
  ],
  Spinach: [
    {name:"Bloomsdale",days:40,note:"Savoyed leaves. Some heat tolerance. Traditional.",yld:0.3},
    {name:"Matador",days:40,note:"Smooth leaf. Very bolt-resistant. Best for heat.",yld:0.3},
    {name:"Giant Winter",days:45,note:"Overwintering type. Very cold-hardy. Large leaves.",yld:0.4},
    {name:"New Zealand Spinach",days:55,note:"Heat-tolerant summer substitute. Cut-and-come-again.",yld:0.5},
    {name:"Perpetual Spinach",days:50,note:"Actually chard. Bolt-proof. Harvest all season.",yld:0.5},
  ],
  Pumpkin: [
    {name:"Butternut",days:100,note:"Stores longest (6+ months). Sweet. Tan skin.",yld:5},
    {name:"Hokkaido/Red Kuri",days:90,note:"Japanese. Red-orange. Edible skin. Chestnut flavor.",yld:3},
    {name:"Musquée de Provence",days:110,note:"French heirloom. Large flat. Deep orange. Soup.",yld:10},
    {name:"Delicata",days:90,note:"Small. Edible skin. Sweet. No peeling needed.",yld:3},
    {name:"Crown Prince",days:100,note:"Blue-grey skin. Dense orange flesh. Excellent storage.",yld:6},
  ],
  Corn: [
    {name:"Golden Bantam",days:78,note:"Open-pollinated sweet corn. Classic flavor. Seed-saveable.",yld:0.3},
    {name:"Incredible",days:85,note:"Supersweet hybrid. Large ears. Popular.",yld:0.4},
    {name:"Peaches and Cream",days:83,note:"Bi-colour. Sweet and tender. Very popular.",yld:0.35},
    {name:"Glass Gem",days:110,note:"Multi-colored ornamental/flour corn. Stunning. Decorative.",yld:0.2},
    {name:"Heritage Flour Corn",days:80,note:"Traditional open-pollinated flour corn. Great for cornbread.",yld:0.3},
  ],
  Leek: [
    {name:"Musselburgh",days:120,note:"Hardy Scotch variety. Thick stems. Very cold-tolerant.",yld:0.3},
    {name:"King Richard",days:75,note:"Early variety. Long slim shanks. Summer leek.",yld:0.25},
    {name:"Blue Solaise",days:130,note:"French heirloom. Blue-green leaves. Very hardy.",yld:0.3},
    {name:"Megaton",days:100,note:"Very large stems. High yield. Good disease resistance.",yld:0.35},
    {name:"Autumn Giant",days:110,note:"Late season. Holds well in ground through winter.",yld:0.3},
  ],
  "Broad Bean": [
    {name:"Aguadulce",days:150,note:"Best for autumn sowing. Long pods. 8-9 beans/pod. Cold-hardy.",yld:0.5},
    {name:"The Sutton",days:120,note:"Dwarf type. No staking needed. Good for small gardens.",yld:0.4},
    {name:"Crimson-Flowered",days:140,note:"Beautiful red flowers. Heritage. Good flavor.",yld:0.4},
    {name:"Witkiem Manita",days:130,note:"High yield. Wind-resistant. Early cropper.",yld:0.5},
    {name:"Imperial Green Longpod",days:140,note:"Long pods, 8 beans each. Classic variety.",yld:0.5},
  ],
  Okra: [
    {name:"Clemson Spineless",days:55,note:"Standard. Spineless pods. Very productive.",yld:2},
    {name:"Burgundy",days:60,note:"Red pods. Ornamental. Turns green when cooked.",yld:1.5},
    {name:"Star of David",days:60,note:"Fat ridged pods. Israeli heirloom. Meaty.",yld:2},
    {name:"Jambalaya",days:50,note:"Early producer. Compact. Good for containers.",yld:2},
    {name:"Annie Oakley",days:52,note:"Spineless. Vigorous. Very productive in heat.",yld:2.5},
  ],
  Strawberry: [
    {name:"Albion",days:90,note:"Everbearing. Large sweet fruit. Day-neutral.",yld:0.5},
    {name:"Camarosa",days:90,note:"High yield. Firm fruit. Good for Mediterranean.",yld:0.6},
    {name:"Mara des Bois",days:90,note:"French alpine cross. Intense strawberry flavor.",yld:0.3},
    {name:"Elsanta",days:90,note:"European commercial standard. Firm. Long shelf life.",yld:0.5},
    {name:"Senga Sengana",days:90,note:"Great jam berry. Very fragrant. European classic.",yld:0.4},
  ],
  Olive: [
    {name:"Arbequina",days:365,note:"Small fruited. High oil. Self-fertile. Cold-tolerant.",yld:20},
    {name:"Frantoio",days:365,note:"Italian oil variety. Premium quality oil. Classic.",yld:22},
    {name:"Picual",days:365,note:"World's most planted. High oil yield. Robust flavor.",yld:25},
    {name:"Kalamata",days:365,note:"Iconic Greek table olive. Almond-shaped. Premium price.",yld:18},
    {name:"Koroneiki",days:365,note:"Highest oil content of all varieties (~27%). Greek.",yld:22},
  ],
  Grape: [
    {name:"Cabernet Sauvignon",days:365,note:"Classic red wine grape. Full-bodied. Worldwide.",yld:7},
    {name:"Merlot",days:365,note:"Soft, round red. Early ripening. Versatile.",yld:8},
    {name:"Chardonnay",days:365,note:"Premium white wine. Adapts to many climates.",yld:8},
    {name:"Muscat/Moscato",days:365,note:"Sweet aromatic table + wine grape. Very popular.",yld:9},
    {name:"Thompson Seedless",days:365,note:"Top table grape. Large seedless. Fresh or raisins.",yld:12},
  ],
  Broccoli: [
    {name:"Calabrese",days:65,note:"Classic green head. Med origin. Good side-shoot production after main cut.",yld:0.5},
    {name:"De Cicco",days:60,note:"Italian heirloom. Small heads but prolific side shoots all season.",yld:0.4},
    {name:"Romanesco",days:80,note:"Fractal spirals. Italian. Nutty. Stunning appearance.",yld:0.6},
  ],
  Cauliflower: [
    {name:"Snowball",days:70,note:"Classic white. Self-blanching. Reliable.",yld:0.8},
    {name:"Violetta di Sicilia",days:80,note:"Purple Sicilian. No blanching needed. Stunning.",yld:0.7},
    {name:"Romanesco",days:85,note:"Green fractal. Italian. Nutty. Technically a cauliflower.",yld:0.6},
  ],
  "Brussels Sprouts": [
    {name:"Long Island Improved",days:100,note:"Compact stalks. Cold-hardy. Classic.",yld:0.8},
    {name:"Falstaff",days:110,note:"Red/purple. Sweet after frost. Beautiful.",yld:0.7},
    {name:"Catskill",days:90,note:"Early producer. Shorter stalks. Good for Med autumns.",yld:0.6},
  ],
  "Sweet Potato": [
    {name:"Beauregard",days:100,note:"Orange. Most popular worldwide. Good in Med heat.",yld:3},
    {name:"Covington",days:110,note:"Sweet, orange. Disease-resistant. Stores well.",yld:2.5},
    {name:"Murasaki",days:110,note:"Purple skin, white flesh. Japanese. Dry/sweet.",yld:2},
  ],
  Sunflower: [
    {name:"Mammoth Russian",days:80,note:"Giant. 3m+. Large seed heads. Classic.",yld:0.5},
    {name:"Black Peredovik",days:90,note:"Oil seed variety. High yield. Bird/chicken feed.",yld:0.6},
    {name:"Teddy Bear",days:65,note:"Dwarf. Fluffy double flowers. Good bee forage.",yld:0.1},
  ],
  Artichoke: [
    {name:"Green Globe",days:365,note:"Standard. Large globes. Perennial. Divide every 3-4yr.",yld:5},
    {name:"Violetto di Romagna",days:365,note:"Italian purple. Tender. Eat raw when young.",yld:4},
    {name:"Imperial Star",days:180,note:"Can produce FIRST YEAR from seed. Annual option.",yld:4},
  ],
  Fennel: [
    {name:"Florence (Finocchio)",days:75,note:"Bulb fennel. Italian staple. Anise flavor. Roast/raw.",yld:0.3},
    {name:"Romanesco",days:80,note:"Large flat bulbs. Tender. Slow bolting.",yld:0.35},
    {name:"Finale",days:70,note:"Fast maturity. Bolt-resistant. Good for succession sowing.",yld:0.3},
  ],
  Chickpea: [
    {name:"Desi",days:100,note:"Small, dark. Traditional Med/Asian. Higher protein.",yld:0.15},
    {name:"Kabuli",days:110,note:"Large, cream. Hummus type. Lower yield but premium price.",yld:0.12},
  ],
  Lentil: [
    {name:"Puy (French Green)",days:90,note:"Premium. Holds shape when cooked. Best flavor.",yld:0.1},
    {name:"Red/Masoor",days:85,note:"Fast cooking. Splits easily. High yield.",yld:0.12},
    {name:"Castelluccio",days:95,note:"Italian PDO lentil. Small, brown-green. Earthy. Premium.",yld:0.1},
  ],
};


const CROPS = [
  { name:"Tomato",pH:"6.0-7.0",fert:"NPK 5-10-10 at transplant. Side-dress 10-10-10 at 3wk. Switch to 0-10-20 (high-K) at fruit set. Compost tea every 2wk.",emoji:"🍅",cat:"Vegetable",days:75,sowIn:"Feb-Mar",harvest:"Jun-Oct",spacing:50,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Deep water at base. Reduce as fruit colors.",color:"#e74c3c",yld:5,
    pests:[{n:"Tuta absoluta (tomato leaf miner)",t:"Tuta absoluta: pheromone traps, Bacillus thuringiensis (Bt) spray, remove infested leaves, netting"},{n:"Whitefly (Bemisia tabaci)",t:"Whitefly: yellow sticky traps, neem oil 5ml/L, introduce Encarsia formosa parasitic wasp"},{n:"Aphids",t:"Aphids: soap spray (5ml dish soap per L water), ladybugs, nasturtium trap crop"},{n:"Late blight (Phytophthora)",t:"Late blight: copper hydroxide spray preventive every 10-14d in wet weather, never overhead water"},{n:"Blossom end rot (calcium deficiency)",t:"BER: calcium foliar spray, consistent watering, add crushed eggshells or gypsum to soil"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🍅"],
    steps:[{d:-14,l:"Prepare soil",t:"Compost 5-8cm, pH 6-7, 30cm deep. Add calcium."},{d:0,l:"Transplant",t:"Bury 2/3 of stem. 2L water. Stake immediately."},{d:7,l:"Mulch",t:"Straw 5-8cm. Deep water at base."},{d:14,l:"First feed",t:"Balanced fertilizer or compost tea."},{d:21,l:"Prune suckers",t:"Remove below first flower. Tie to stakes."},{d:35,l:"K feed",t:"High-potassium. Continue removing suckers."},{d:45,l:"Pest check",t:"Hornworms, aphids, whitefly. Remove yellow leaves."},{d:55,l:"Reduce water",t:"Fruit coloring — less water = more flavor."},{d:70,l:"Harvest begins",t:"Pick colored but firm. Never refrigerate."},{d:85,l:"Season end",t:"Pull plants. Rotate: no nightshades here 3 yrs."}],
    storage:"Room temp 3-5d. Can 12mo+. Sun-dry 6mo+. Freeze blanched 8mo."
  },
  { name:"Pepper (Sweet)",pH:"6.0-7.0",fert:"NPK 10-10-10 at transplant. High-K (0-0-50 potassium sulfate) when fruit sets. Compost tea biweekly.",emoji:"🫑",cat:"Vegetable",days:80,sowIn:"Feb-Mar",harvest:"Jul-Oct",spacing:45,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Consistent moisture, mulch in heat.",color:"#27ae60",yld:3,
    pests:[{n:"Aphids",t:"Aphids: soap spray, beneficial insects"},{n:"Pepper weevil",t:"Pepper weevil: hand-pick, crop rotation, destroy infested fruit"},{n:"Powdery mildew",t:"Powdery mildew: milk spray (1:9), good spacing, morning watering"},{n:"Bacterial spot",t:"Bacterial spot: copper spray, remove infected leaves, rotate 3yr"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🫑"],
    steps:[{d:0,l:"Transplant",t:"Warm soil 18°C+. 40-50cm apart."},{d:14,l:"Feed",t:"Balanced fertilizer. Mulch."},{d:30,l:"Stake",t:"Support heavy plants."},{d:50,l:"K feed",t:"High-potassium at fruit set."},{d:70,l:"Harvest",t:"Cut with scissors. Green=mild, colored=sweet."}],
    storage:"Fresh 2 weeks fridge. Roast+freeze 12mo. Pickle. Dry for paprika."
  },
  { name:"Potato",pH:"5.5-6.5",fert:"NPK 10-20-20 at planting. Side-dress 0-0-50 potassium at hilling. Avoid fresh manure (causes scab).",emoji:"🥔",cat:"Vegetable",days:100,sowIn:"Mar-Apr",harvest:"Jun-Aug",spacing:33,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Even moisture in tuber stage. Stop 2wk pre-harvest.",color:"#d4a017",yld:2,
    pests:[{n:"Colorado beetle (Leptinotarsa — #1 threat)",t:"Colorado beetle: hand-pick daily (morning when slow), Bt var. tenebrionis, neem, crop rotation ESSENTIAL"},{n:"Late blight",t:"Late blight: copper spray preventive, destroy infected plants, resistant varieties (Kennebec, Sarpo)"},{n:"Wireworm",t:"Wireworm: trap with buried potato halves on sticks, rotate, avoid planting after grass"},{n:"Scab",t:"Scab: keep pH below 6.0, avoid lime, consistent watering, resistant varieties"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🥔"],
    steps:[{d:-7,l:"Chit",t:"Sprout 1-2cm in light, cool spot."},{d:0,l:"Plant",t:"Trench 10-15cm, 30cm apart, sprouts up."},{d:14,l:"Hill soil",t:"Mound around stems when 15cm tall."},{d:28,l:"Hill again",t:"Potassium feed. Keep hilling."},{d:42,l:"Flowering",t:"Critical water period."},{d:80,l:"Foliage dies",t:"Stop water. Wait 2 weeks."},{d:100,l:"Dig",t:"Fork carefully. Cure 2 weeks dark/cool."}],
    storage:"4-6 months at 7-10°C dark."
  },
  { name:"Onion",pH:"6.0-7.0",fert:"NPK 10-10-10 early. Switch to high-K at bulbing. Stop nitrogen 4wk before harvest.",emoji:"🧅",cat:"Vegetable",days:110,sowIn:"Jan-Feb, Sep-Oct",harvest:"Jun-Aug",spacing:12,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Regular during bulbing. Stop when tops fall.",color:"#d4a017",yld:0.15,
    pests:[{n:"Onion fly (Delia antiqua)",t:"Onion fly: companion plant with carrot (confuses both pests), fleece cover, rotate"},{n:"Downy mildew",t:"Downy mildew: copper spray, good spacing, avoid overhead watering"},{n:"White rot",t:"White rot: no cure — rotate 8+ years, never compost infected bulbs"},{n:"Thrips",t:"Thrips: blue sticky traps, neem oil, spinosad"}],
    stages:["🟤","🌱","🌿","🌿","🧅","🧅"],
    steps:[{d:0,l:"Plant sets",t:"Tips showing, 10-15cm apart."},{d:21,l:"Nitrogen feed",t:"Keep weed-free."},{d:60,l:"Bulb swelling",t:"Switch to K. Consistent water."},{d:90,l:"Tops fall",t:"Stop water."},{d:110,l:"Cure",t:"Sun 2-3d, then airy spot 2-3 weeks."}],
    storage:"Cured 3-6 months mesh bags."
  },
  { name:"Garlic",pH:"6.0-7.5",fert:"NPK 10-10-10 in early spring. No nitrogen after April. Potassium at scape stage.",emoji:"🧄",cat:"Vegetable",days:240,sowIn:"Oct-Nov",harvest:"Jun-Jul",spacing:12,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Moderate. Stop 2-3wk pre-harvest.",color:"#f1c40f",yld:0.05,
    pests:[{n:"White rot",t:"White rot: rotate 8+ years, plant in new ground, never compost infected"},{n:"Rust",t:"Rust: improve airflow, copper spray, remove worst leaves"},{n:"Nematodes",t:"Nematodes: rotate with brassicas, marigold trap crop"}],
    stages:["🟤","🌱","🌿","🌿","🧄","🧄"],
    steps:[{d:0,l:"Plant cloves",t:"Pointed up, 5cm deep."},{d:14,l:"Mulch 10cm",t:"Straw for winter."},{d:120,l:"Spring feed",t:"Nitrogen. Remove scapes."},{d:200,l:"Stop water",t:"Lower leaves browning."},{d:240,l:"Harvest",t:"Dig when 5-6 leaves brown. Cure 3-4wk."}],
    storage:"6-8 months cured."
  },
  { name:"Cabbage",pH:"6.5-7.5",fert:"Heavy feeder. NPK 20-10-10 at transplant. Side-dress nitrogen at 3wk. Boron supplement (borax 1g/m²).",emoji:"🥬",cat:"Vegetable",days:90,sowIn:"Feb-Mar, Aug-Sep",harvest:"Jun-Jul, Nov-Feb",spacing:45,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Consistent for tight heads. Heavy feeder.",color:"#76d7c4",yld:2,
    pests:[{n:"Cabbage white butterfly (Pieris rapae)",t:"Cabbage white: fine mesh netting (best solution), Bt spray, hand-pick caterpillars"},{n:"Slugs",t:"Slugs: beer traps, copper tape, evening patrol, ducks for slug control"},{n:"Aphids",t:"Aphids: soap spray, lacewings"},{n:"Club root",t:"Club root: raise pH above 7.0 with lime, rotate 7+ years, resistant varieties"}],
    stages:["🟤","🌱","🌿","🥬","🥬","🥬"],
    steps:[{d:0,l:"Transplant",t:"40-50cm. Slug protection."},{d:14,l:"Heavy feed",t:"Nitrogen rich. Mulch."},{d:45,l:"Heading",t:"Consistent water. Net for butterflies."},{d:80,l:"Harvest",t:"Cut firm head. Leave stalk for mini-heads."}],
    storage:"2-3mo root cellar. Ferment as sauerkraut/kimchi: 12+mo."
  },
  { name:"Bean (Dry)",pH:"6.0-7.0",fert:"NO nitrogen (they fix their own). Low-P fertilizer if needed. Inoculate with rhizobia if first time growing beans in that soil.",emoji:"🫘",cat:"Vegetable",days:95,sowIn:"Apr-May",harvest:"Aug-Sep",spacing:18,sun:"Full",waterFreq:"Every 3 days",waterNote:"More during flowering.",color:"#27ae60",yld:0.3,
    pests:[{n:"Bean weevil (storage)",t:"Bean weevil: freeze dried beans 48hr before storage, seal in airtight containers"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Rust",t:"Rust: resistant varieties, good spacing, avoid overhead watering"},{n:"Anthracnose",t:"Anthracnose: don't work wet plants, rotate 3yr, clean seed"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🫘"],
    steps:[{d:0,l:"Direct sow",t:"3cm deep, soil 15°C+."},{d:14,l:"Emerge",t:"No N fertilizer needed."},{d:35,l:"Flowering",t:"Increase water."},{d:70,l:"Pods drying",t:"Reduce water."},{d:95,l:"Harvest dry",t:"Shell when crispy."}],
    storage:"Dried: 5+ YEARS sealed."
  },
  { name:"Zucchini",pH:"6.0-7.5",fert:"NPK 10-10-10 at planting. Compost side-dress at 3wk. Liquid feed every 2wk during fruiting.",emoji:"🥒",cat:"Vegetable",days:50,sowIn:"Apr-May",harvest:"Jun-Oct",spacing:75,sun:"Full",waterFreq:"Every 2 days",waterNote:"Heavy drinker. Base water only.",color:"#2ecc71",yld:6,
    pests:[{n:"Powdery mildew",t:"Powdery mildew: milk spray 1:9, baking soda 5g/L, good airflow"},{n:"Squash vine borer",t:"Squash vine borer: wrap stem base with foil, Bt injection into stem"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Blossom end rot",t:"BER: consistent watering, calcium"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🥒"],
    steps:[{d:0,l:"Sow on mound",t:"2 seeds, 2cm deep."},{d:14,l:"Thin + mulch",t:"Keep strongest."},{d:30,l:"Feed",t:"Compost side-dress."},{d:40,l:"Harvest",t:"Pick at 15-20cm DAILY."}],
    storage:"Fresh 1wk. Grate+freeze. Dehydrate."
  },
  { name:"Carrot",pH:"6.0-6.8",fert:"Low nitrogen (causes forking). NPK 5-10-10 worked in before sowing. No fresh manure.",emoji:"🥕",cat:"Vegetable",days:70,sowIn:"Feb-Apr, Sep-Oct",harvest:"May-Jul, Dec-Feb",spacing:4,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Even moisture.",color:"#e67e22",yld:0.1,
    pests:[{n:"Carrot fly (Psila rosae)",t:"Carrot fly: companion plant with onion, 60cm barrier around bed (fly flies low), fleece"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Nematodes",t:"Nematodes: rotate, marigold interplant"}],
    stages:["🟤","🌱","🌿","🌿","🥕","🥕"],
    steps:[{d:0,l:"Sow thin",t:"1cm deep, loose stone-free soil."},{d:14,l:"Germinate",t:"14-21 days. Keep moist."},{d:28,l:"Thin",t:"3-5cm. Evening."},{d:70,l:"Harvest",t:"Can leave in ground."}],
    storage:"Damp sand 4-6mo. Freeze blanched."
  },
  { name:"Spinach",pH:"6.5-7.5",fert:"Nitrogen-rich. NPK 20-10-10 or compost tea. Quick crop, light feeder overall.",emoji:"🥬",cat:"Vegetable",days:40,sowIn:"Feb-Apr, Sep-Nov",harvest:"Mar-Jun, Nov-Feb",spacing:12,sun:"Partial",waterFreq:"Every 2 days",waterNote:"Keep moist. Bolts in heat.",color:"#196f3d",yld:0.3,
    pests:[{n:"Downy mildew",t:"Downy mildew: resistant varieties, spacing, morning watering"},{n:"Leaf miners",t:"Leaf miners: remove affected leaves, fleece cover"},{n:"Bolting (heat stress)",t:"Bolting: shade cloth in summer, succession sow, use heat-tolerant varieties (Bloomsdale)"}],
    stages:["🟤","🌱","🌿","🥬","🥬","🥬"],
    steps:[{d:0,l:"Sow",t:"2cm deep, cool weather."},{d:14,l:"Thin",t:"12cm apart."},{d:30,l:"Harvest leaves",t:"Outer leaves at 8-10cm."},{d:40,l:"Full cut",t:"Before bolting."}],
    storage:"Blanch+freeze."
  },
  { name:"Cucumber",pH:"6.0-7.0",fert:"NPK 10-10-10 at transplant. Liquid feed weekly during fruiting. Heavy feeder.",emoji:"🥒",cat:"Vegetable",days:55,sowIn:"Apr-May",harvest:"Jun-Sep",spacing:35,sun:"Full",waterFreq:"Daily",waterNote:"Constant moisture or bitter.",color:"#27ae60",yld:4,
    pests:[{n:"Powdery mildew",t:"Powdery mildew: milk spray, airflow, resistant varieties"},{n:"Downy mildew",t:"Downy mildew: copper spray, avoid wet leaves"},{n:"Cucumber beetle",t:"Cucumber beetle: hand-pick, row cover until flowering, kaolin clay spray"},{n:"Spider mites",t:"Spider mites: spray underside of leaves with water, neem oil"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🥒"],
    steps:[{d:0,l:"Sow",t:"Warm soil 18°C+. Trellis."},{d:14,l:"Train",t:"Guide vines."},{d:35,l:"Pick",t:"Regular picking=more fruit."},{d:50,l:"Peak",t:"Daily harvest."}],
    storage:"Pickle 12+mo."
  },
  { name:"Lettuce",pH:"6.0-7.0",fert:"Light feeder. Compost at planting sufficient. Liquid feed if yellowing.",emoji:"🥬",cat:"Vegetable",days:45,sowIn:"Mar-Apr, Sep-Nov",harvest:"Apr-Jun, Nov-Mar",spacing:25,sun:"Partial",waterFreq:"Every 1-2 days",waterNote:"Consistently moist.",color:"#82e0aa",yld:0.3,
    pests:[{n:"Aphids",t:"Aphids: soap spray, lacewings"},{n:"Slugs",t:"Slugs: beer traps, copper, evening patrol"},{n:"Bolting",t:"Bolting: shade cloth, succession sow every 2-3wk, heat-tolerant varieties (Romaine, Oak Leaf)"}],
    stages:["🟤","🌱","🌿","🥬","🥬","🥬"],
    steps:[{d:0,l:"Sow",t:"20-25cm apart."},{d:10,l:"Thin",t:"Use thinnings."},{d:30,l:"Harvest",t:"Outer leaves."},{d:45,l:"Full head",t:"Before bolting."}],
    storage:"Fresh 5-7 days only."
  },
  { name:"Pumpkin",pH:"6.0-7.5",fert:"Very heavy feeder. Compost-rich mound at planting. NPK 10-10-10 every 2wk. High-K at fruit set.",emoji:"🎃",cat:"Vegetable",days:100,sowIn:"Apr-May",harvest:"Sep-Nov",spacing:120,sun:"Full",waterFreq:"Every 3 days",waterNote:"Deep weekly. Less at maturity.",color:"#e67e22",yld:8,
    pests:[{n:"Powdery mildew",t:"Powdery mildew: inevitable late season — milk spray delays onset"},{n:"Squash bug",t:"Squash bug: hand-pick eggs (bronze clusters on leaf undersides), neem"},{n:"Vine borer",t:"Vine borer: wrap stem base, Bt injection"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🎃"],
    steps:[{d:0,l:"Sow",t:"Rich mound. Much space."},{d:21,l:"Running",t:"Guide vines. Feed 2-weekly."},{d:50,l:"Fruit set",t:"Limit 2-3 per vine."},{d:90,l:"Cure",t:"Hard skin, dry stem. Sun 1-2wk."}],
    storage:"3-6mo at 10-15°C."
  },
  { name:"Beetroot",pH:"6.5-7.5",fert:"Light feeder. Compost at planting. Avoid high nitrogen (causes leafy growth, small roots). Add boron (borax 1g/m²).",emoji:"🟣",cat:"Vegetable",days:60,sowIn:"Mar-May, Aug-Sep",harvest:"Jun-Aug, Oct-Dec",spacing:10,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Even moisture.",color:"#922b21",yld:0.2,
    pests:[{n:"Leaf miners",t:"Leaf miners: remove affected leaves"},{n:"Cercospora leaf spot",t:"Cercospora: rotate, remove debris, copper spray"}],
    stages:["🟤","🌱","🌿","🌿","🟣","🟣"],
    steps:[{d:0,l:"Soak+sow",t:"24hr soak. 2cm deep."},{d:14,l:"Thin",t:"Strongest per cluster."},{d:40,l:"Check size",t:"Golf-tennis ball."},{d:60,l:"Harvest",t:"Twist leaves. 2cm stem."}],
    storage:"Pickle, damp sand months."
  },
  { name:"Broad Bean",pH:"6.5-7.5",fert:"NO nitrogen. Fixes own. Add potassium at flowering. Likes lime.",emoji:"🫘",cat:"Vegetable",days:160,sowIn:"Oct-Nov",harvest:"Apr-Jun",spacing:18,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"More at flowering.",color:"#1e8449",yld:0.5,
    pests:[{n:"Black bean aphid",t:"Black aphid: pinch out growing tips when first pods form (aphid hotspot), soap spray"},{n:"Chocolate spot",t:"Chocolate spot: spacing, airflow, don't overhead water"},{n:"Weevils",t:"Weevils: cosmetic damage, tolerate"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🫘"],
    steps:[{d:0,l:"Sow",t:"5cm deep, fall on coast."},{d:21,l:"Overwinter",t:"Slow growth."},{d:120,l:"Spring",t:"Potassium. Pinch tops."},{d:160,l:"Harvest",t:"Plump green pods."}],
    storage:"Shell+freeze. Dry for years."
  },
  { name:"Leek",pH:"6.0-7.0",fert:"Nitrogen-rich. NPK 20-10-10 at transplant. Side-dress compost monthly.",emoji:"🟢",cat:"Vegetable",days:130,sowIn:"Jan-Mar",harvest:"Oct-Mar",spacing:18,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Hill soil to blanch.",color:"#28b463",yld:0.3,
    pests:[{n:"Leek moth",t:"Leek moth: fine mesh netting, Bt spray"},{n:"Rust",t:"Rust: remove worst leaves, spacing"},{n:"Allium leaf miner",t:"Allium leaf miner: fleece cover Oct-Nov and Mar-Apr"}],
    stages:["🟤","🌱","🌿","🌿","🟢","🟢"],
    steps:[{d:0,l:"Transplant deep",t:"15cm holes with dibber."},{d:30,l:"Hill",t:"Soil around stems."},{d:60,l:"Feed",t:"Compost."},{d:120,l:"Harvest",t:"Dig at 2-3cm dia."}],
    storage:"Leave in ground=living storage."
  },
  // FRUITS
  { name:"Olive",pH:"7.0-8.5",fert:"Mature trees: NPK 15-5-15 in late winter. Foliar boron spray at flowering. Young trees: balanced 10-10-10.",emoji:"🫒",cat:"Fruit Tree",days:365,sowIn:"Nov-Mar",harvest:"Oct-Dec",spacing:600,sun:"Full",waterFreq:"Monthly",waterNote:"Very drought-tolerant.",color:"#566573",yld:25,
    pests:[{n:"Olive fly (Bactrocera oleae — #1 threat)",t:"Olive fly: kaolin clay spray (Surround), mass trapping with McPhail traps, early harvest"},{n:"Olive moth",t:"Olive moth: Bt spray at egg hatch"},{n:"Scale insects",t:"Scale: horticultural oil winter spray"},{n:"Peacock spot",t:"Peacock spot: copper spray autumn and spring"}],
    stages:["🌳","🌳","🌳","🌳","🫒","🫒"],steps:[{d:0,l:"Plant",t:"South-facing, drained."},{d:30,l:"Establish",t:"Weekly water 2 years."}],
    storage:"Oil 2yr. Brine 12+mo."
  },
  { name:"Grape",pH:"6.0-7.5",fert:"NPK 10-10-10 in early spring. Potassium at veraison (color change). Avoid excess nitrogen (promotes disease).",emoji:"🍇",cat:"Fruit",days:365,sowIn:"Dec-Mar",harvest:"Aug-Oct",spacing:250,sun:"Full",waterFreq:"Every 7-10 days",waterNote:"Reduce near harvest.",color:"#6c3483",yld:8,
    pests:[{n:"Downy mildew",t:"Downy mildew: copper spray (Bordeaux mixture) preventive every 10-14d in wet spring"},{n:"Powdery mildew (Oidium)",t:"Oidium: sulfur spray, good airflow, leaf removal around clusters"},{n:"Grape moth",t:"Grape moth: pheromone traps, Bt"},{n:"Botrytis",t:"Botrytis: remove affected clusters, airflow, reduce humidity"}],
    stages:["🌿","🌿","🌿","🍃","🌸","🍇"],steps:[{d:0,l:"Plant cutting",t:"Strong trellis."},{d:30,l:"Train",t:"Main trunk year 1."}],
    storage:"Wine, juice, raisins."
  },
  { name:"Fig",pH:"6.0-8.0",fert:"Light feeder. Compost in spring. Excess nitrogen reduces fruiting.",emoji:"🤎",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Jun-Oct",spacing:500,sun:"Full",waterFreq:"Every 7-10 days",waterNote:"Drought-tolerant.",color:"#784212",yld:15,
    pests:[{n:"Fig rust",t:"Fig rust: rake fallen leaves, copper spray"},{n:"Fig wasp (beneficial!)",t:"Birds: netting when fruit ripens"},{n:"Birds"}],
    stages:["🌳","🌳","🌳","🌳","🤎","🤎"],steps:[{d:0,l:"Plant",t:"South wall. Sandy soil."},{d:30,l:"Establish",t:"Light pruning."}],
    storage:"Sun-dry months. Jam."
  },
  { name:"Pomegranate",pH:"6.0-8.0",fert:"Light feeder. NPK 10-10-10 in spring. Tolerates poor soil.",emoji:"🔴",cat:"Fruit Tree",days:365,sowIn:"Nov-Mar",harvest:"Sep-Nov",spacing:400,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Drought-tolerant.",color:"#c0392b",yld:15,
    pests:[{n:"Fruit fly",t:"Fruit fly: bag individual fruits, trapping"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Fruit cracking (from irregular watering)",t:"Cracking: consistent watering, harvest promptly"}],
    stages:["🌳","🌳","🌳","🌳","🌸","🔴"],steps:[{d:0,l:"Plant",t:"Full sun, any soil."},{d:30,l:"Establish",t:"Remove suckers."}],
    storage:"Whole 2-3mo. Molasses."
  },
  // HERBS
  { name:"Basil",pH:"6.0-7.0",fert:"Light feeder. Compost at planting. Pinch flowers to prolong leaf production.",emoji:"🌿",cat:"Herb",days:30,sowIn:"Apr-May",harvest:"Jun-Oct",spacing:22,sun:"Full",waterFreq:"Every 1-2 days",waterNote:"Moist, not waterlogged.",color:"#27ae60",yld:0.3,
    pests:[{n:"Fusarium wilt",t:"Fusarium: rotate, resistant varieties"},{n:"Downy mildew",t:"Downy mildew: spacing, morning water"},{n:"Aphids",t:"Aphids: soap spray"}],
    stages:["🟤","🌱","🌿","🌿","🌿","🌿"],steps:[{d:0,l:"Plant",t:"After frost."},{d:14,l:"Pinch",t:"Remove tips+flowers."},{d:25,l:"Harvest",t:"Above leaf node."}],
    storage:"Pesto+freeze."
  },
  { name:"Oregano",pH:"6.0-8.0",fert:"NONE. Poor rocky soil = MORE flavor. Fertile soil makes weak-flavored plants.",emoji:"🌿",cat:"Herb",days:45,sowIn:"Mar-Apr",harvest:"Jun-Oct",spacing:28,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"DRY=more flavor.",color:"#1e8449",yld:0.2,
    pests:[{n:"Virtually pest-free",t:"Rarely needed"}],
    stages:["🟤","🌱","🌿","🌿","🌸","🌿"],steps:[{d:0,l:"Plant",t:"Poor rocky soil fine."},{d:30,l:"Harvest",t:"Cut at bud stage."}],
    storage:"Dry 1-2yr."
  },
  { name:"Rosemary",pH:"6.0-8.0",fert:"NONE. Hates rich soil. Well-drained, poor, alkaline soil ideal.",emoji:"🌿",cat:"Herb",days:90,sowIn:"Mar-Apr",harvest:"Year-round",spacing:75,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Hates wet roots.",color:"#2874a6",yld:0.5,
    pests:[{n:"Root rot (from overwatering — main killer)",t:"Root rot: improve drainage, never overwater, raised bed"}],
    stages:["🌱","🌿","🌿","🌿","🌸","🌿"],steps:[{d:0,l:"Plant cutting",t:"Well-drained, full sun."},{d:60,l:"Established",t:"Prune to shape."}],
    storage:"Evergreen year-round."
  },
  { name:"Sage",pH:"6.0-8.0",fert:"NONE. Poor alkaline soil best.",emoji:"🌿",cat:"Herb",days:60,sowIn:"Mar-Apr",harvest:"Year-round",spacing:50,sun:"Full",waterFreq:"Every 7 days",waterNote:"Overwatering kills.",color:"#7dcea0",yld:0.3,
    pests:[{n:"Virtually pest-free",t:"Rarely needed"}],
    stages:["🌱","🌿","🌿","🌿","🌸","🌿"],steps:[{d:0,l:"Plant",t:"Alkaline soil."},{d:45,l:"Light harvest",t:"Max 1/3 first year."}],
    storage:"Dry 1-2yr."
  },
  { name:"Mint",pH:"6.0-7.0",fert:"Compost in spring. Moderate feeder. Rich moist soil.",emoji:"🌿",cat:"Herb",days:20,sowIn:"Mar-May",harvest:"Apr-Nov",spacing:35,sun:"Partial",waterFreq:"Every 2-3 days",waterNote:"IN POTS ONLY.",color:"#17a589",yld:0.5,
    pests:[{n:"Rust",t:"Rust: cut back and destroy affected growth, replant in new spot"},{n:"Mint beetle",t:"Beetle: hand-pick"}],
    stages:["🌱","🌿","🌿","🌿","🌿","🌿"],steps:[{d:0,l:"Pot only!",t:"Rich moist soil."},{d:14,l:"Harvest",t:"Cut stems freely."}],
    storage:"Dry for tea."
  },
  { name:"Lavender",emoji:"💜",cat:"Herb",days:90,sowIn:"Feb-Mar",harvest:"Jun-Aug",spacing:40,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Excellent drainage required.",color:"#8e44ad",yld:0.2,
    pests:[{n:"Root rot (overwatering)",t:"Root rot: drainage, never overwater"},{n:"Lavender shab (Phomopsis)",t:"Shab: remove affected branches, airflow"}],
    stages:["🌱","🌿","🌿","🌿","💜","💜"],steps:[{d:0,l:"Plant",t:"Fast-draining soil."},{d:60,l:"Harvest flowers",t:"Lower flowers open."}],
    storage:"Dry in bunches."
  },
  { name:"Wheat",pH:"6.0-7.5",fert:"NPK 20-10-10 at sowing. Side-dress nitrogen in early spring if weak.",emoji:"🌾",cat:"Grain",days:210,sowIn:"Oct-Nov",harvest:"Jun-Jul",spacing:3,sun:"Full",waterFreq:"Weekly",waterNote:"Rain-fed winter.",color:"#d4a017",yld:0.01,
    pests:[{n:"Rust",t:"Rust: resistant varieties, fungicide if severe"},{n:"Fusarium head blight",t:"Fusarium: rotate, avoid planting after corn"},{n:"Aphids",t:"Aphids: generally tolerated in grain crops"}],
    stages:["🟤","🌱","🌿","🌾","🌾","🌾"],steps:[{d:0,l:"Broadcast",t:"150g/sqm. Rake in."},{d:120,l:"Spring",t:"N if weak."},{d:180,l:"Heading",t:"No water."},{d:210,l:"Harvest",t:"Thresh. Winnow."}],
    storage:"Whole berries: 30+ YEARS."
  },
  // ── NEW VEGETABLES ──
  { name:"Pepper (Hot)",pH:"6.0-7.0",fert:"Low nitrogen. NPK 5-10-10. More K at flowering. Stress (dry) = hotter fruit.",emoji:"🌶️",cat:"Vegetable",days:85,sowIn:"Feb-Mar",harvest:"Jul-Nov",spacing:40,sun:"Full",waterFreq:"Every 3 days",waterNote:"Less water = hotter peppers.",color:"#e74c3c",yld:1.5,
    pests:[{n:"Same as sweet pepper",t:"Same as sweet pepper"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🌶️"],steps:[{d:0,l:"Transplant",t:"Warm soil 20°C+. 35-45cm apart."},{d:21,l:"Feed",t:"Low nitrogen. Potassium at flowering."},{d:60,l:"Harvest",t:"Pick at any stage. Riper = hotter."}],
    storage:"Dry strings 1yr+. Smoke. Pickle. Freeze."
  },
  { name:"Eggplant",pH:"6.0-7.0",fert:"NPK 10-10-10 at transplant. Compost tea biweekly. High-K at fruit set.",emoji:"🍆",cat:"Vegetable",days:75,sowIn:"Feb-Mar",harvest:"Jul-Oct",spacing:55,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Loves heat. Consistent deep water.",color:"#8e44ad",yld:4,
    pests:[{n:"Flea beetle",t:"Flea beetle: row cover until plants established, kaolin clay"},{n:"Colorado beetle",t:"Colorado beetle: hand-pick, Bt var. tenebrionis"},{n:"Spider mites",t:"Spider mites: mist undersides, neem"},{n:"Verticillium wilt",t:"Verticillium: rotate 4yr, resistant rootstocks, solarize soil"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🍆"],steps:[{d:0,l:"Transplant",t:"Soil 20°C+. 50-60cm apart. Stake."},{d:14,l:"Mulch+feed",t:"Compost tea. Thick mulch."},{d:45,l:"Support",t:"Stake heavy fruit."},{d:65,l:"Harvest",t:"Glossy skin = ready. Dull = overripe."}],
    storage:"Fresh 3-5 days. Grill+freeze. Preserve in oil."
  },
  { name:"Watermelon",pH:"6.0-7.0",fert:"NPK 10-10-10 at planting. High-K at fruit set. Stop nitrogen after fruit forms.",emoji:"🍉",cat:"Vegetable",days:85,sowIn:"Apr-May",harvest:"Jul-Sep",spacing:100,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Heavy water growing. Stop at ripening.",color:"#27ae60",yld:8,
    pests:[{n:"Fusarium wilt",t:"Fusarium: rotate 5+ years, resistant varieties, grafted seedlings"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Powdery mildew",t:"Powdery mildew: milk spray"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🍉"],steps:[{d:0,l:"Sow",t:"Warm soil 21°C+. Mound planting."},{d:21,l:"Train",t:"Guide vines. Feed."},{d:50,l:"Fruit",t:"Board under fruit. Reduce water."},{d:75,l:"Ripeness",t:"Thump=hollow. Yellow belly."}],
    storage:"Whole 2-3wk. Pickle rind."
  },
  { name:"Melon",pH:"6.0-7.0",fert:"Same as watermelon. Reduce water near harvest for sweetness.",emoji:"🍈",cat:"Vegetable",days:80,sowIn:"Apr-May",harvest:"Jul-Sep",spacing:60,sun:"Full",waterFreq:"Every 2 days",waterNote:"Reduce water near harvest for sweetness.",color:"#f39c12",yld:4,
    pests:[{n:"Fusarium wilt",t:"Same as watermelon"},{n:"Powdery mildew"},{n:"Aphids"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🍈"],steps:[{d:0,l:"Sow",t:"Warm soil. Black plastic mulch."},{d:21,l:"Train",t:"Guide vines. Hand-pollinate."},{d:60,l:"Ripen",t:"Slips from vine when ready."}],
    storage:"Fresh 1-2wk."
  },
  { name:"Corn",pH:"6.0-7.0",fert:"Very heavy nitrogen feeder. NPK 30-10-10 at planting. Side-dress nitrogen at knee-high. Again at tasseling.",emoji:"🌽",cat:"Vegetable",days:80,sowIn:"Apr-May",harvest:"Jul-Sep",spacing:28,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Critical during tasseling.",color:"#f1c40f",yld:0.3,
    pests:[{n:"Corn earworm",t:"Corn earworm: Bt spray at silking, drop mineral oil on silk tips"},{n:"European corn borer",t:"Corn borer: Bt, crop rotation, destroy stalks after harvest"},{n:"Armyworm",t:"Armyworm: Bt, hand-pick"}],
    stages:["🟤","🌱","🌿","🌿","🌽","🌽"],steps:[{d:0,l:"Sow blocks",t:"Not rows. 25-30cm. Soil 15°C+."},{d:14,l:"Thin",t:"One plant/station. Nitrogen."},{d:40,l:"Tasseling",t:"Don't let water stress."},{d:80,l:"Harvest",t:"Silk brown+dry. Twist+pull."}],
    storage:"Eat immediately. Blanch+freeze. Dry for flour."
  },
  { name:"Okra",pH:"6.0-7.0",fert:"NPK 10-10-10 at planting. Light feeder. Monthly compost tea.",emoji:"🟢",cat:"Vegetable",days:60,sowIn:"Apr-May",harvest:"Jul-Oct",spacing:38,sun:"Full",waterFreq:"Every 3 days",waterNote:"Drought-tolerant. Deep infrequent.",color:"#27ae60",yld:2,
    pests:[{n:"Aphids",t:"Aphids: soap spray"},{n:"Whitefly",t:"Whitefly: yellow sticky traps"},{n:"Root-knot nematode",t:"Nematode: rotate, marigold interplant"}],
    stages:["🟤","🌱","🌿","🍃","🌸","🟢"],steps:[{d:0,l:"Soak+sow",t:"24hr soak. 2cm deep. Soil 18°C+."},{d:21,l:"Thin",t:"30-45cm. Monthly feed."},{d:50,l:"Harvest",t:"5-8cm EVERY 2 DAYS. Gloves."}],
    storage:"Fresh 2-3 days. Freeze. Pickle. Dehydrate."
  },
  { name:"Radish",pH:"6.0-7.0",fert:"None needed. Too much nitrogen = all leaf. Compost at planting sufficient.",emoji:"🔴",cat:"Vegetable",days:28,sowIn:"Feb-May, Sep-Nov",harvest:"Mar-Jun, Oct-Dec",spacing:4,sun:"Full",waterFreq:"Every 2 days",waterNote:"Quick. Even moisture.",color:"#e74c3c",yld:0.05,
    pests:[{n:"Flea beetle",t:"Flea beetle: fleece cover"},{n:"Root maggot",t:"Root maggot: rotate, fleece"}],
    stages:["🟤","🌱","🌿","🔴","🔴","🔴"],steps:[{d:0,l:"Sow",t:"1cm deep. Very easy."},{d:14,l:"Thin",t:"3-5cm apart."},{d:25,l:"Harvest",t:"Pull when marble-sized."}],
    storage:"Fresh 1-2wk. Pickle."
  },
  { name:"Turnip",pH:"6.0-7.0",fert:"Light feeder. Compost at planting sufficient.",emoji:"🟡",cat:"Vegetable",days:50,sowIn:"Mar-Apr, Aug-Oct",harvest:"May-Jun, Oct-Dec",spacing:12,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Cool season. Bolts in heat.",color:"#f1c40f",yld:0.2,
    pests:[{n:"Flea beetle",t:"Flea beetle: fleece"},{n:"Cabbage root fly",t:"Root fly: fleece, rotate"}],
    stages:["🟤","🌱","🌿","🌿","🟡","🟡"],steps:[{d:0,l:"Sow",t:"1cm deep, 10-15cm."},{d:14,l:"Thin",t:"12cm apart."},{d:45,l:"Harvest",t:"Tennis ball size."}],
    storage:"Root cellar 2-3 months."
  },
  { name:"Celery",pH:"6.0-7.0",fert:"Very heavy feeder. Rich soil with compost. Liquid feed (fish emulsion) weekly. Needs constant moisture.",emoji:"🟢",cat:"Vegetable",days:120,sowIn:"Feb-Mar",harvest:"Jul-Sep",spacing:25,sun:"Partial",waterFreq:"Daily",waterNote:"Needs constant moisture. Very thirsty.",color:"#82e0aa",yld:0.5,
    pests:[{n:"Celery fly",t:"Celery fly: fleece, remove affected leaves"},{n:"Septoria leaf spot",t:"Septoria: copper spray, remove debris, rotate"},{n:"Slugs",t:"Slugs: beer traps"}],
    stages:["🟤","🌱","🌿","🟢","🟢","🟢"],steps:[{d:0,l:"Transplant",t:"Rich, moist soil."},{d:30,l:"Feed",t:"Heavy feeder. Liquid feed weekly."},{d:80,l:"Blanch",t:"Hill soil or wrap stems."},{d:120,l:"Harvest",t:"Cut at base."}],
    storage:"Fresh 2wk. Freeze for cooking."
  },
  { name:"Swiss Chard",pH:"6.0-7.5",fert:"Moderate feeder. NPK 10-10-10 at planting. Compost tea monthly.",emoji:"🌿",cat:"Vegetable",days:55,sowIn:"Mar-May, Aug-Sep",harvest:"May-Nov",spacing:20,sun:"Full-Partial",waterFreq:"Every 2-3 days",waterNote:"Heat AND cold tolerant.",color:"#e74c3c",yld:0.5,
    pests:[{n:"Leaf miners",t:"Leaf miners: remove affected leaves"},{n:"Slugs",t:"Slugs: beer traps, copper"}],
    stages:["🟤","🌱","🌿","🌿","🌿","🌿"],steps:[{d:0,l:"Sow",t:"2cm deep, 20-30cm."},{d:14,l:"Thin",t:"Keep strongest."},{d:40,l:"Harvest",t:"Outer leaves. Continuous."}],
    storage:"Blanch+freeze."
  },
  { name:"Kale",pH:"6.0-7.5",fert:"NPK 10-10-10 at planting. Nitrogen side-dress at 3wk.",emoji:"🥬",cat:"Vegetable",days:60,sowIn:"Mar-Apr, Aug-Sep",harvest:"May-Jun, Oct-Mar",spacing:35,sun:"Full-Partial",waterFreq:"Every 2-3 days",waterNote:"Cold-hardy. Sweeter after frost.",color:"#196f3d",yld:0.5,
    pests:[{n:"Cabbage white butterfly",t:"Cabbage white: netting, Bt spray"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Whitefly",t:"Whitefly: yellow sticky traps"}],
    stages:["🟤","🌱","🌿","🥬","🥬","🥬"],steps:[{d:0,l:"Sow/transplant",t:"30-45cm apart."},{d:14,l:"Feed",t:"Nitrogen."},{d:45,l:"Harvest",t:"Pick outer leaves."}],
    storage:"Blanch+freeze. Dehydrate for chips."
  },
  { name:"Asparagus",pH:"6.5-7.5",fert:"Heavy compost annually. NPK 10-10-10 in early spring. Likes salt (tolerates brackish areas).",emoji:"🌿",cat:"Vegetable",days:730,sowIn:"Feb-Mar",harvest:"Apr-Jun (yr 3+)",spacing:38,sun:"Full",waterFreq:"Every 3 days",waterNote:"Perennial. Establish well.",color:"#27ae60",yld:0.3,
    pests:[{n:"Asparagus beetle",t:"Asparagus beetle: hand-pick, encourage parasitic wasps"},{n:"Fusarium crown rot",t:"Fusarium: well-drained soil, resistant varieties (Jersey series)"}],
    stages:["🌱","🌱","🌿","🌿","🌿","🌿"],steps:[{d:0,l:"Plant crowns",t:"Trench 20cm. Don't harvest 2yr."},{d:730,l:"First harvest yr3",t:"Cut spears at 15-20cm for 6wk."}],
    storage:"Blanch+freeze. Pickle."
  },
  { name:"Pea",pH:"6.0-7.0",fert:"NO nitrogen (fixes own). Low-P fertilizer if needed. Inoculate seeds.",emoji:"🟢",cat:"Vegetable",days:60,sowIn:"Feb-Mar, Oct-Nov",harvest:"May-Jun",spacing:6,sun:"Full-Partial",waterFreq:"Every 2-3 days",waterNote:"Cool season. More at flowering.",color:"#27ae60",yld:0.2,
    pests:[{n:"Pea moth",t:"Pea moth: early sowing avoids peak moth flight, fleece"},{n:"Powdery mildew",t:"Powdery mildew: resistant varieties, spacing"},{n:"Aphids",t:"Aphids: soap spray"}],
    stages:["🟤","🌱","🌿","🌿","🌸","🟢"],steps:[{d:0,l:"Sow",t:"3cm deep, 5-8cm apart. Support."},{d:21,l:"Train",t:"Guide up support."},{d:45,l:"Flower",t:"Increase water."},{d:60,l:"Pick",t:"Regular = more pods."}],
    storage:"Shell+freeze. Dry for split peas."
  },
  // ── NEW FRUITS ──
  { name:"Strawberry",pH:"5.5-6.5",fert:"NPK 10-20-20 at planting. Liquid feed every 2wk during fruiting. Avoid excess nitrogen (soft fruit, disease).",emoji:"🍓",cat:"Fruit",days:120,sowIn:"Sep-Oct, Feb-Mar",harvest:"May-Jul",spacing:28,sun:"Full",waterFreq:"Every 1-2 days",waterNote:"Consistent moisture. Straw mulch.",color:"#e74c3c",yld:0.4,
    pests:[{n:"Botrytis (grey mold)",t:"Botrytis: straw mulch under fruit, spacing, remove affected fruit"},{n:"Slugs",t:"Slugs: straw mulch, copper tape, beer traps"},{n:"Spider mites",t:"Spider mites: mist foliage, neem"},{n:"Birds",t:"Birds: netting"}],
    stages:["🌱","🌱","🌿","🌸","🍓","🍓"],steps:[{d:0,l:"Plant runners",t:"Crown at soil level. 25-30cm."},{d:30,l:"Remove flowers",t:"First year: remove for stronger plants."},{d:90,l:"Mulch straw",t:"Under fruit to keep clean."}],
    storage:"Fresh 2-3 days. Freeze for 12 months. Make jam."
  },
  { name:"Raspberry",pH:"5.5-6.5",fert:"Compost mulch annually. NPK 10-10-10 in spring. Likes acidic soil.",emoji:"🫐",cat:"Fruit",days:365,sowIn:"Nov-Mar",harvest:"Jun-Jul, Sep-Oct",spacing:45,sun:"Full-Partial",waterFreq:"Every 2-3 days",waterNote:"Post and wire support.",color:"#c0392b",yld:1,
    pests:[{n:"Raspberry beetle",t:"Raspberry beetle: shake onto white cloth in early morning"},{n:"Cane diseases",t:"Cane diseases: remove fruited canes after harvest, thin for airflow"},{n:"Birds",t:"Birds: netting essential"}],
    stages:["🌱","🌿","🌿","🌿","🫐","🫐"],steps:[{d:0,l:"Plant canes",t:"40-50cm. Support system."},{d:365,l:"Yr 2 harvest",t:"Everbearing: two crops."}],
    storage:"Freeze. Jam. Very perishable fresh."
  },
  { name:"Peach",pH:"6.0-7.0",fert:"NPK 10-10-10 in early spring. Reduce nitrogen after fruit set.",emoji:"🍑",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Jun-Aug",spacing:450,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Deep water. Less near harvest.",color:"#e67e22",yld:20,
    pests:[{n:"Peach leaf curl",t:"Peach leaf curl: copper spray in AUTUMN (after leaf fall) and LATE WINTER (before bud break) — must be preventive"},{n:"Brown rot",t:"Brown rot: remove mummified fruit, copper spray, thin fruit"},{n:"Oriental fruit moth",t:"Oriental fruit moth: pheromone traps"},{n:"Aphids",t:"Aphids: dormant oil spray winter"}],
    stages:["🌳","🌳","🌳","🌸","🍑","🍑"],steps:[{d:0,l:"Plant tree",t:"Open center pruning. Full sun."},{d:30,l:"Establish",t:"Water weekly first year."}],
    storage:"Fresh 1wk. Can. Jam. Dry."
  },
  { name:"Plum",pH:"6.0-7.5",fert:"NPK 10-10-10 in spring. Moderate feeder.",emoji:"🟣",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Jul-Sep",spacing:450,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Moderate water.",color:"#6c3483",yld:20,
    pests:[{n:"Plum moth",t:"Plum moth: pheromone traps, pick up fallen fruit"},{n:"Brown rot",t:"Brown rot: remove mummified fruit, copper spray"},{n:"Silver leaf",t:"Silver leaf: prune ONLY in summer (Jun-Aug), never winter"}],
    stages:["🌳","🌳","🌳","🌸","🟣","🟣"],steps:[{d:0,l:"Plant",t:"European types best."},{d:30,l:"Establish",t:"Stake. Water."}],
    storage:"Dry as prunes (years). Jam. Brandy/Distilling."
  },
  { name:"Cherry",emoji:"🍒",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"May-Jun",spacing:500,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Moderate. Net against birds.",color:"#c0392b",yld:15,
    pests:[{n:"Cherry fly",t:"Cherry fly: yellow sticky traps, early harvest"},{n:"Birds (main threat!)",t:"Birds: full netting is only reliable solution"},{n:"Brown rot",t:"Brown rot: remove mummies, copper spray"},{n:"Bacterial canker",t:"Bacterial canker: prune only in summer, copper spray autumn"}],
    stages:["🌳","🌳","🌳","🌸","🍒","🍒"],steps:[{d:0,l:"Plant",t:"Slightly cooler spots best."},{d:30,l:"Establish",t:"Net when fruiting."}],
    storage:"Fresh 1wk. Freeze. Dry. Preserve in syrup."
  },
  { name:"Apricot",pH:"6.0-7.5",fert:"NPK 10-10-10 in spring. Light feeder.",emoji:"🟠",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Jun-Jul",spacing:450,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Drought-tolerant once established.",color:"#e67e22",yld:15,
    pests:[{n:"Brown rot",t:"Brown rot: remove mummies, copper spray, thin fruit"},{n:"Bacterial canker",t:"Bacterial canker: summer pruning only, copper autumn"},{n:"Aphids",t:"Aphids: dormant oil winter"}],
    stages:["🌳","🌳","🌳","🌸","🟠","🟠"],steps:[{d:0,l:"Plant",t:"Sheltered. Early bloomer—frost risk."},{d:30,l:"Establish",t:"Water first year."}],
    storage:"Dry excellently. Jam."
  },
  { name:"Walnut",pH:"6.0-7.5",fert:"Minimal once established. Young trees: balanced fertilizer in spring.",emoji:"🥜",cat:"Nut Tree",days:365,sowIn:"Nov-Feb",harvest:"Sep-Oct",spacing:800,sun:"Full",waterFreq:"Monthly",waterNote:"Deep roots. Very drought-tolerant.",color:"#8B4513",yld:30,
    pests:[{n:"Codling moth",t:"Codling moth: pheromone traps"},{n:"Walnut blight",t:"Walnut blight: copper spray at bud break"},{n:"Walnut husk fly",t:"Husk fly: clean up fallen nuts"}],
    stages:["🌳","🌳","🌳","🌳","🥜","🥜"],steps:[{d:0,l:"Plant",t:"Large tree. Plan placement."}],
    storage:"Shell: 6mo. In-shell: 12mo+."
  },
  { name:"Almond",pH:"6.0-8.0",fert:"NPK 10-10-10 in spring. Light feeder. Drought-tolerant.",emoji:"🥜",cat:"Nut Tree",days:365,sowIn:"Nov-Feb",harvest:"Aug-Sep",spacing:550,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Drought-tolerant.",color:"#d4a017",yld:10,
    pests:[{n:"Brown rot",t:"Brown rot: copper spray, remove mummies"},{n:"Shot hole disease",t:"Shot hole: copper spray, improve airflow"},{n:"Aphids",t:"Aphids: dormant oil"}],
    stages:["🌳","🌳","🌳","🌸","🥜","🥜"],steps:[{d:0,l:"Plant",t:"Mediterranean native. Well-drained."}],
    storage:"Shell: 12mo+. Blanch and freeze."
  },
  { name:"Chestnut",emoji:"🌰",cat:"Nut Tree",days:365,sowIn:"Nov-Feb",harvest:"Oct-Nov",spacing:800,sun:"Full",waterFreq:"Monthly",waterNote:"Deep roots. Rain-fed once established.",color:"#8B4513",yld:25,
    stages:["🌳","🌳","🌳","🌳","🌰","🌰"],
    steps:[{d:0,l:"Plant",t:"Acidic soil preferred. Large tree — plan placement."},{d:30,l:"Establish",t:"Water weekly first 2 years. Mulch heavily."}],
    storage:"Fresh 1-2wk. Dry/roast 3-6mo. Flour indefinitely."
  },
  { name:"Quince",emoji:"🍐",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Oct-Nov",spacing:400,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Drought-tolerant.",color:"#f1c40f",yld:15,
    stages:["🌳","🌳","🌳","🌸","🍐","🍐"],
    steps:[{d:0,l:"Plant",t:"Full sun. Any soil. Very tough tree."},{d:30,l:"Establish",t:"Water first year."}],
    storage:"Whole 2-3mo cool. Jam/preserve: 12+mo. Jelly."
  },
  { name:"Persimmon",emoji:"🟠",cat:"Fruit Tree",days:365,sowIn:"Nov-Feb",harvest:"Oct-Dec",spacing:500,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Drought-tolerant once established.",color:"#e67e22",yld:20,
    stages:["🌳","🌳","🌳","🌳","🟠","🟠"],
    steps:[{d:0,l:"Plant",t:"Full sun. Well-drained. Sheltered."},{d:30,l:"Establish",t:"Water first year."}],
    storage:"Firm: ripen at room temp. Fully ripe: freeze."
  },
  { name:"Lemon",emoji:"🍋",cat:"Fruit Tree",days:365,sowIn:"Mar-Apr",harvest:"Nov-Apr",spacing:400,sun:"Full",waterFreq:"Every 7 days",waterNote:"Consistent moisture. Sensitive to cold.",color:"#f1c40f",yld:20,
    stages:["🌳","🌳","🌳","🌸","🍋","🍋"],
    steps:[{d:0,l:"Plant",t:"South-facing wall for heat reflection. Frost-free location only."},{d:30,l:"Establish",t:"Water weekly. Protect from cold first 3 winters."}],
    storage:"Fresh 2-3wk. Juice + freeze. Preserved lemons (salt) 12+mo."
  },
  { name:"Orange",emoji:"🍊",cat:"Fruit Tree",days:365,sowIn:"Mar-Apr",harvest:"Dec-Mar",spacing:500,sun:"Full",waterFreq:"Every 7 days",waterNote:"Consistent moisture.",color:"#e67e22",yld:30,
    stages:["🌳","🌳","🌳","🌸","🍊","🍊"],
    steps:[{d:0,l:"Plant",t:"Frost-free location. South-facing."},{d:30,l:"Establish",t:"Water. Protect winter."}],
    storage:"Fresh 2-3wk room temp, 4-6wk fridge. Marmalade 12+mo."
  },
  { name:"Hazelnut",emoji:"🌰",cat:"Nut Tree",days:365,sowIn:"Nov-Feb",harvest:"Sep-Oct",spacing:450,sun:"Full-Partial",waterFreq:"Every 7-14 days",waterNote:"Moderate. Likes some moisture.",color:"#8B4513",yld:5,
    stages:["🌳","🌳","🌳","🌳","🌰","🌰"],
    steps:[{d:0,l:"Plant",t:"Two varieties needed for pollination. Wind-pollinated."},{d:30,l:"Establish",t:"Mulch. Water."}],
    storage:"In shell: 12+ months cool dry. Shelled: freeze."
  },
  { name:"Chamomile",emoji:"🌼",cat:"Herb",days:60,sowIn:"Mar-Apr, Sep-Oct",harvest:"May-Jul",spacing:15,sun:"Full",waterFreq:"Every 3-5 days",waterNote:"Moderate. Drought-tolerant once established.",color:"#f1c40f",yld:0.1,
    stages:["🟤","🌱","🌿","🌿","🌼","🌼"],
    steps:[{d:0,l:"Sow surface",t:"Tiny seeds — don't bury. Press into soil."},{d:30,l:"Thin",t:"15cm apart."},{d:50,l:"Harvest flowers",t:"Pick when petals fold back. Morning after dew dries."}],
    storage:"Dry flowers 1-2 years."
  },
  { name:"Thyme",emoji:"🌿",cat:"Herb",days:90,sowIn:"Mar-Apr",harvest:"Jun-Oct",spacing:25,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Very drought-tolerant. Poor soil = more flavor.",color:"#7dcea0",yld:0.2,
    stages:["🟤","🌱","🌿","🌿","🌸","🌿"],
    steps:[{d:0,l:"Plant",t:"Well-drained. Full sun. From cuttings or divisions."},{d:60,l:"Harvest",t:"Cut stems. Never more than 1/3 at once."}],
    storage:"Dry 1-2 years. Keeps flavor well."
  },
  { name:"Parsley",emoji:"🌿",cat:"Herb",days:70,sowIn:"Mar-May, Sep",harvest:"May-Nov",spacing:18,sun:"Full-Partial",waterFreq:"Every 2-3 days",waterNote:"Moderate moisture.",color:"#27ae60",yld:0.3,
    stages:["🟤","🌱","🌿","🌿","🌿","🌿"],
    steps:[{d:0,l:"Sow",t:"Slow to germinate (2-4wk). Soak seed 24hr first."},{d:14,l:"Patience",t:"Don't give up — it's slow."},{d:50,l:"Harvest",t:"Outer stems first."}],
    storage:"Dry for winter. Freeze in oil/ice cubes."
  },
  { name:"Dill",emoji:"🌿",cat:"Herb",days:40,sowIn:"Mar-May, Sep",harvest:"May-Jul",spacing:20,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Moderate. Bolts in heat.",color:"#27ae60",yld:0.2,
    stages:["🟤","🌱","🌿","🌿","🌸","🌿"],
    steps:[{d:0,l:"Direct sow",t:"Don't transplant — tap root. Succession sow every 3wk."},{d:30,l:"Harvest leaves",t:"Before flowering for best flavor."},{d:40,l:"Seed heads",t:"Let some flower for pickle dill."}],
    storage:"Dry 1 year. Seeds for pickling indefinitely."
  },
  // ── NEW CROPS: BRASSICAS ──
  { name:"Broccoli",pH:"6.0-7.5",fert:"Heavy feeder. NPK 20-10-10 at transplant. Side-dress nitrogen at 3wk. Liquid feed every 2wk during head formation.",emoji:"🥦",cat:"Vegetable",days:70,sowIn:"Feb-Mar, Aug-Sep",harvest:"May-Jun, Oct-Dec",spacing:45,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Consistent moisture. Drought causes bolting.",color:"#27ae60",yld:0.5,
    pests:[{n:"Cabbage white butterfly",t:"Cabbage white: netting essential. Bt spray if caterpillars found"},{n:"Aphids",t:"Aphids: soap spray, check undersides"},{n:"Club root",t:"Club root: lime to pH 7.2+, rotate 7yr"},{n:"Downy mildew",t:"Downy mildew: copper spray, spacing, morning water"}],
    stages:["🟤","🌱","🌿","🥦","🥦","🥦"],steps:[{d:0,l:"Transplant",t:"40-50cm apart. Rich soil. Net for cabbage white immediately."},{d:14,l:"Feed",t:"Nitrogen-rich. Compost side-dress."},{d:45,l:"Head forming",t:"Consistent water now. Don't let it dry out."},{d:65,l:"Harvest main",t:"Cut 15cm below head. LEAVE PLANT — side shoots produce for weeks."},{d:80,l:"Side shoots",t:"Keep cutting side shoots every 3-4 days."}],
    storage:"Fresh 5-7 days. Blanch+freeze 12mo. Pickle florets."
  },
  { name:"Cauliflower",pH:"6.5-7.5",fert:"Heaviest feeder of all brassicas. NPK 20-10-10. Weekly liquid feed. Any stress = tiny heads or bolting.",emoji:"🥦",cat:"Vegetable",days:80,sowIn:"Feb-Mar, Aug-Sep",harvest:"May-Jul, Nov-Jan",spacing:55,sun:"Full",waterFreq:"Every 2 days",waterNote:"Most demanding brassica. Inconsistent water = tiny heads.",color:"#ecf0f1",yld:0.8,
    pests:[{n:"Cabbage white butterfly",t:"Cabbage white: fine mesh netting from day 1"},{n:"Aphids",t:"Aphids: soap spray"},{n:"Club root",t:"Club root: lime, rotate 7yr, resistant varieties"}],
    stages:["🟤","🌱","🌿","🌿","🥦","🥦"],steps:[{d:0,l:"Transplant",t:"50-60cm apart. Richest soil you have. Heavy feeder."},{d:14,l:"Feed weekly",t:"Liquid feed. This crop punishes neglect."},{d:50,l:"Blanch heads",t:"White types: tie outer leaves over curd when 5cm diameter. Protects color."},{d:75,l:"Harvest",t:"Cut when head is tight and firm. Once florets separate you're too late."}],
    storage:"Fresh 1-2wk. Blanch+freeze. Pickle. Cauliflower rice — grate and freeze."
  },
  { name:"Brussels Sprouts",pH:"6.5-7.5",fert:"NPK 20-10-10 at transplant. Very long season — monthly compost side-dress. Firm soil (don't dig after planting).",emoji:"🥬",cat:"Vegetable",days:110,sowIn:"Mar-Apr",harvest:"Oct-Feb",spacing:60,sun:"Full",waterFreq:"Every 3 days",waterNote:"Long season crop. Steady moisture. Better after frost.",color:"#27ae60",yld:0.8,
    pests:[{n:"Cabbage white butterfly",t:"Cabbage white: netting whole season"},{n:"Aphids (grey cabbage aphid)",t:"Grey aphid: soap spray + blast with hose. Worst brassica aphid problem"},{n:"Whitefly",t:"Whitefly: yellow sticky traps"}],
    stages:["🟤","🌱","🌿","🌿","🥬","🥬"],steps:[{d:0,l:"Transplant",t:"60cm apart. STAKE — they get tall and heavy."},{d:21,l:"Feed",t:"Nitrogen. Remove yellowing lower leaves."},{d:80,l:"Top off",t:"Remove growing tip when lowest sprouts are 1cm. Forces energy into sprouts."},{d:100,l:"Harvest",t:"Pick from bottom up. Frost improves sweetness dramatically."}],
    storage:"Fresh 2-3wk on stalk in cold. Blanch+freeze. Roast and eat fresh — Med winters perfect for this crop."
  },
  // ── NEW CROPS: ROOTS + TUBERS ──
  { name:"Sweet Potato",pH:"5.5-6.5",fert:"Low nitrogen — excess N = all vine, no tubers. NPK 5-10-20 (high potassium). Sandy, well-drained soil ideal.",emoji:"🍠",cat:"Vegetable",days:110,sowIn:"Apr-May",harvest:"Sep-Oct",spacing:35,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Drought-tolerant once established. Reduce water 3wk before harvest.",color:"#e67e22",yld:2.5,
    pests:[{n:"Sweet potato weevil (Med/subtropical)",t:"Weevil: rotate, destroy infested tubers, hill soil over exposed tubers"},{n:"Whitefly",t:"Whitefly: yellow traps"},{n:"Fusarium wilt",t:"Fusarium: resistant varieties, rotate 3yr"}],
    stages:["🟤","🌱","🌿","🍃","🍠","🍠"],steps:[{d:-21,l:"Start slips",t:"Submerge half a tuber in water. Sprouts in 3wk. Twist off slips when 15cm."},{d:0,l:"Plant slips",t:"Bury 2/3 of slip in mound. Soil must be 18°C+. Full sun. Med summers perfect."},{d:21,l:"Mulch",t:"Black plastic or straw. Weed-free zone around vines."},{d:80,l:"Reduce water",t:"Dry soil = sweeter tubers. Stop watering 3wk before harvest."},{d:110,l:"Harvest",t:"Before first cold night. Cure at 28-30°C for 10 days (Med sun works). Then cool storage."}],
    storage:"Cured: 6-8 months at 13-15°C. Never refrigerate — cold damage below 10°C. Different family than potato — no rotation conflict."
  },
  { name:"Celeriac",pH:"6.0-7.0",fert:"Heavy feeder like celery. Rich soil, compost, liquid feed every 2wk. Never let dry out.",emoji:"🟤",cat:"Vegetable",days:150,sowIn:"Feb-Mar",harvest:"Oct-Dec",spacing:30,sun:"Full-Partial",waterFreq:"Every 2 days",waterNote:"Extremely thirsty. Mulch heavily. Never let dry out.",color:"#a1887f",yld:0.6,
    pests:[{n:"Celery fly",t:"Celery fly: fleece early season"},{n:"Septoria leaf spot",t:"Septoria: copper spray, rotate"},{n:"Slugs",t:"Slugs: beer traps"}],
    stages:["🟤","🌱","🌿","🌿","🟤","🟤"],steps:[{d:0,l:"Transplant",t:"Slow to germinate (3-4wk). Start very early indoors. 30cm apart."},{d:21,l:"Mulch + feed",t:"Heavy mulch to retain moisture. Liquid feed every 2wk."},{d:60,l:"Remove side shoots",t:"Snap off side roots and lower leaves to focus growth into bulb."},{d:120,l:"Harvest",t:"Dig when softball-sized. Can leave in ground into winter with mulch protection."}],
    storage:"Fresh 3-4 months in damp sand. Freeze blanched cubes. Makes incredible remoulade, soup, mash."
  },
  // ── NEW CROPS: FLOWERS + SEEDS ──
  { name:"Sunflower",pH:"6.0-7.5",fert:"Moderate feeder. NPK 10-10-10 at planting. Tolerates poor soil. Deep tap root mines nutrients.",emoji:"🌻",cat:"Vegetable",days:80,sowIn:"Apr-May",harvest:"Aug-Sep",spacing:45,sun:"Full",waterFreq:"Every 3-4 days",waterNote:"Deep roots = drought-tolerant once established. Heavy water at flowering.",color:"#f1c40f",yld:0.5,
    pests:[{n:"Birds (biggest threat to seeds)",t:"Birds: bag heads with mesh when seeds forming"},{n:"Sunflower moth",t:"Moth: Bt if larvae found"},{n:"Downy mildew",t:"Downy mildew: resistant varieties, spacing"}],
    stages:["🟤","🌱","🌿","🌿","🌻","🌻"],steps:[{d:0,l:"Direct sow",t:"2cm deep, 40-50cm apart. Soil 10°C+. Stake tall varieties."},{d:21,l:"Thin + feed",t:"Balanced fertilizer. Protect from slugs while small."},{d:55,l:"Flowering",t:"Massive bee magnet. Cross-pollination improves seed set."},{d:75,l:"Harvest seeds",t:"When back of head turns brown. Cut, hang upside down to dry. Rub out seeds."}],
    storage:"Dry seeds: 12+ months. Roast for snacking. Press for oil. Whole heads: chicken feed. Stalks: compost or bean poles."
  },
  // ── NEW CROPS: PERENNIALS ──
  { name:"Artichoke",pH:"6.5-8.0",fert:"Heavy feeder in spring growth. NPK 10-10-10 monthly Mar-Jun. Compost mulch autumn.",emoji:"🌿",cat:"Vegetable",days:365,sowIn:"Oct-Nov, Feb-Mar",harvest:"Apr-Jun",spacing:90,sun:"Full",waterFreq:"Every 5-7 days",waterNote:"Drought-tolerant once established. Mediterranean native.",color:"#7dcea0",yld:3.5,
    pests:[{n:"Aphids (artichoke plume moth)",t:"Plume moth: remove affected buds, Bt"},{n:"Slugs on young plants",t:"Slugs: beer traps, copper. Only young plants"},{n:"Botrytis in wet springs",t:"Botrytis: spacing, don't overhead water"}],
    stages:["🌱","🌿","🌿","🌿","🌿","🌿"],steps:[{d:0,l:"Plant offsets",t:"Root divisions from established plant. 90cm apart. Or seed Imperial Star for first-year crop."},{d:30,l:"Establish",t:"Water weekly first season. Mulch heavily."},{d:365,l:"Year 2+",t:"Harvest globes when scales are tight. Cut 10cm below head. Remove dead stalks in autumn. Divide every 3-4yr."}],
    storage:"Fresh 1-2wk. Hearts in oil 3-6mo. Freeze hearts. Italian: preserved in brine."
  },
  { name:"Rhubarb",pH:"6.0-7.0",fert:"Annual heavy compost mulch in autumn. NPK 10-10-10 in spring. Perennial — feed the crown.",emoji:"🟥",cat:"Vegetable",days:365,sowIn:"Nov-Mar",harvest:"Mar-Jun (yr 2+)",spacing:90,sun:"Full-Partial",waterFreq:"Every 5-7 days",waterNote:"Established plants very drought-tolerant. Mulch heavily.",color:"#c0392b",yld:2,
    pests:[{n:"Crown rot (overwatering/poor drainage)",t:"Crown rot: improve drainage. Never waterlog. Raised bed ideal"},{n:"Slugs on young shoots",t:"Slugs: copper rings around crown in spring"}],
    stages:["🌱","🌿","🌿","🌿","🟥","🟥"],steps:[{d:0,l:"Plant crown",t:"Divisions from established plant. Crown at soil surface. 90cm apart."},{d:365,l:"Year 2",t:"Light harvest only — pull 3-4 stalks."},{d:730,l:"Year 3+",t:"Full harvest Mar-Jun. PULL stalks, don't cut. Stop by end June to let plant recover."}],
    storage:"Fresh 2wk. Freeze chopped 12mo. Compote, jam, crumble. LEAVES ARE POISONOUS — never eat leaves."
  },
  { name:"Blackberry",pH:"5.5-7.0",fert:"Compost mulch annually. NPK 10-10-10 in spring. Potassium at fruiting.",emoji:"🫐",cat:"Fruit",days:365,sowIn:"Nov-Mar",harvest:"Jul-Sep",spacing:200,sun:"Full-Partial",waterFreq:"Every 3-5 days",waterNote:"Water at fruiting. Drought-tolerant otherwise.",color:"#2c3e50",yld:3,
    pests:[{n:"Spotted wing drosophila (Med)",t:"SWD: early harvest, traps, fine mesh over ripening fruit"},{n:"Raspberry beetle",t:"Raspberry beetle: shake onto cloth early morning"},{n:"Cane diseases",t:"Cane disease: remove fruited canes immediately after harvest"}],
    stages:["🌱","🌿","🌿","🌿","🫐","🫐"],steps:[{d:0,l:"Plant canes",t:"Thornless varieties for ease. Post-and-wire support. 1.5-2m apart."},{d:365,l:"Year 2 fruit",t:"Fruit on LAST year's canes. After harvest, cut fruited canes to ground. Tie in new canes."}],
    storage:"Very perishable fresh (2-3 days). Freeze immediately. Jam, wine, syrup, dry."
  },
  // ── NEW CROPS: LEGUME STAPLES ──
  { name:"Fennel",pH:"6.0-8.0",fert:"Light feeder. Compost at planting sufficient. Don't over-feed — reduces bulb flavor.",emoji:"🌿",cat:"Vegetable",days:75,sowIn:"Mar-Apr, Aug-Sep",harvest:"Jun-Jul, Oct-Nov",spacing:25,sun:"Full",waterFreq:"Every 2-3 days",waterNote:"Consistent moisture prevents bolting. Bolts in heat — sow for autumn harvest in Med.",color:"#27ae60",yld:0.3,
    pests:[{n:"Aphids",t:"Aphids: soap spray"},{n:"Bolting (heat stress — #1 problem)",t:"Bolting: sow for autumn harvest in Med. Spring sowing bolts in summer heat"}],
    stages:["🟤","🌱","🌿","🌿","🌿","🌿"],steps:[{d:0,l:"Direct sow",t:"Don't transplant — tap root. 25cm apart. Autumn sowing best in Med climate."},{d:21,l:"Thin + mulch",t:"Keep moist. Hill soil around swelling bulb."},{d:60,l:"Harvest",t:"Cut at soil level when bulb is tennis-ball sized. Feathery fronds edible too."}],
    storage:"Fresh 1-2wk fridge. Roast, braise, raw in salads. Seeds: dry for spice (1yr+). Italian staple."
  },
  { name:"Lentil",pH:"6.0-8.0",fert:"NO nitrogen (fixes own). Low-P if needed. Poor soil fine. Mediterranean native — rain-fed.",emoji:"🟤",cat:"Vegetable",days:90,sowIn:"Feb-Mar, Oct-Nov",harvest:"Jun-Jul",spacing:5,sun:"Full",waterFreq:"Every 7-10 days",waterNote:"Very drought-tolerant. Rain-fed in Med climate. Stop water when pods brown.",color:"#8B4513",yld:0.1,
    pests:[{n:"Ascochyta blight",t:"Ascochyta: resistant varieties, don't work wet plants"},{n:"Aphids",t:"Aphids: tolerate — lentils are tough"},{n:"Bruchid beetle (storage)",t:"Bruchid: freeze dried lentils 48hr before storage"}],
    stages:["🟤","🌱","🌿","🍃","🟤","🟤"],steps:[{d:0,l:"Broadcast sow",t:"3cm deep, thick. Like wheat/grain — dense planting. Poor soil fine. NO nitrogen."},{d:45,l:"Flowering",t:"Don't irrigate unless extreme drought."},{d:80,l:"Harvest",t:"When 80% of pods brown. Cut whole plant. Thresh. Winnow."}],
    storage:"Dried: 5+ YEARS sealed. Protein staple. Nitrogen-fixer — improves soil for next crop."
  },
  { name:"Chickpea",pH:"6.0-9.0",fert:"NO nitrogen (legume). Tolerates very poor, alkaline, dry soil. Mediterranean native. Minimal inputs.",emoji:"🟡",cat:"Vegetable",days:100,sowIn:"Feb-Mar, Oct-Nov",harvest:"Jun-Jul",spacing:10,sun:"Full",waterFreq:"Every 7-14 days",waterNote:"Extremely drought-tolerant. Mediterranean native. Rain-fed is ideal.",color:"#d4a017",yld:0.12,
    pests:[{n:"Ascochyta blight",t:"Ascochyta: resistant varieties, spacing, don't work wet foliage"},{n:"Pod borer",t:"Pod borer: Bt spray"},{n:"Fusarium wilt",t:"Fusarium: rotate 4yr, resistant varieties"}],
    stages:["🟤","🌱","🌿","🍃","🟡","🟡"],steps:[{d:0,l:"Direct sow",t:"5cm deep, 10cm apart. Can autumn-sow in mild Med winters for spring harvest."},{d:60,l:"Flowering",t:"No water needed. Pod formation."},{d:90,l:"Harvest",t:"When plant yellows and pods rattle. Pull whole plant. Dry. Thresh."}],
    storage:"Dried: 5+ YEARS sealed. Hummus, falafel, roasted. Nitrogen-fixer. THE staple legume of the Mediterranean."
  },
];

/* ═══════════════════════════════════════════
   O(1) LOOKUP MAP — replaces 18 linear CROPS.find scans
   ═══════════════════════════════════════════ */
const CROP_MAP = new Map(CROPS.map(c => [c.name, c]));

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
    ratio: "10L milk → approximately 1kg fresh cheese (yield varies by type). Rennet: 1/4 tsp liquid per 10L. Salt for brine: 200g per litre (20% brine).",
    overview: "Cheese is simply milk with most of its moisture removed and controlled fermentation applied. Every cheese style — from fresh ricotta to aged parmesan — uses the same basic principles: acidify milk, add coagulant (rennet), cut and drain curds, salt, and optionally age. Cheese is one of the most efficient preservation methods: 10L of milk (perishable, days) becomes 1kg of cheese (shelf-stable, months or years).",
    what_you_need: "Large heavy pot. Thermometer (accuracy to 1°C). Cheesecloth/muslin. Colander. Cheese mold. Rennet (liquid or tablet). Cultures (optional for aged cheeses). Cheese salt (non-iodized).",
    method: "FRESH WHITE CHEESE (Feta style): 1. Heat milk to exactly 32°C — no higher. 2. Add rennet: dissolve 1/4 tsp in 30ml cool water, add to milk, stir gently exactly 1 minute. 3. Cover and do NOT disturb for 45–60 minutes. 4. Test curd: insert knife at 45°, lift — clean break means it is ready. 5. Cut curd into 2cm cubes with long knife. Rest 10 minutes. 6. Raise temperature to 38°C over 20 minutes, stirring gently. 7. Ladle curds into cheesecloth-lined mold. Press gently 6–8 hours. 8. Cut into blocks. Brine in 20% salt solution for 24 hours. RICOTTA: Heat whey (leftover from cheese) to 85°C. Add 2 tbsp white vinegar. Stir once. Wait 10 minutes. Ladle floating curds into cheesecloth.",
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
    Jun: "Peak laying. Watch for heat stress (>35°C): shade, cold water, electrolytes.",
    Jul: "Heat management critical. Collect eggs 2x daily (heat spoils). Parasites peak.",
    Aug: "Continue heat management. Dust bath area (diatomaceous earth for mites).",
    Sep: "Molt begins — laying drops. Increase protein (feather regrowth). Deworm.",
    Oct: "Molt continues. Clean and prepare coop for winter. Check ventilation.",
    Nov: "Reduced laying. Supplement calcium. Plan breeding for spring chicks.",
    Dec: "Shortest days = lowest laying. Maintain but don't stress. Review flock — cull non-layers.",
  },
  Goat: {
    Jan: "Late pregnancy care. Increase grain. Selenium/vitamin E supplement 1 month before kidding.",
    Feb: "KIDDING SEASON begins (coast). Have supplies ready: towels, iodine, molasses water.",
    Mar: "Kidding continues. Colostrum within 1hr. Dam milking begins. Dehorn kids at 3-7 days.",
    Apr: "Kids weaning at 8-12wk. Pasture quality improving. Reduce grain for does.",
    May: "Full pasture. Hoof trim. Fecal egg count — deworm if needed (targeted, not routine).",
    Jun: "Peak milk production. Watch for heat stress. Ensure shade and water. Fly management.",
    Jul: "Heat management. Parasites peak. FAMACHA scoring for anemia (barberpole worm).",
    Aug: "Continue parasite management. Dry off late-lactation does (stop milking 2mo before breeding).",
    Sep: "BREEDING SEASON begins. Introduce buck. Buck in rut — strong smell, aggressive.",
    Oct: "Breeding continues. Mark bred does with marking harness on buck.",
    Nov: "Remove buck. Fecal egg count. Hoof trim. Check body condition before winter.",
    Dec: "Early pregnancy. Maintain nutrition. Copper bolus if deficient area.",
  },
  Bee: {
    Jan: "Leave alone. Don't open hive if <10°C. Check weight (hefting) — feed fondant if light.",
    Feb: "Queen starts laying. Monitor stores. First cleansing flights. Oxalic acid treatment (if not done Dec).",
    Mar: "Spring inspection when >15°C: queen present? Brood pattern? Food? Disease? Add super if strong.",
    Apr: "Main spring buildup. SWARM WATCH begins. Check weekly. Split strong hives to prevent swarming.",
    May: "Peak swarming period. Inspect every 7 days. Add supers. Sage and thyme flowering begins.",
    Jun: "Honey flow from wildflowers, sage, thyme. Add supers as needed. Continue swarm management.",
    Jul: "Late honey flow. Monitor varroa (sugar roll test >3% = treat). Ensure water source.",
    Aug: "HARVEST HONEY. Leave 15-20kg minimum for winter. Remove supers.",
    Sep: "Varroa treatment (Apivar strips or formic acid). Feed 2:1 sugar syrup if stores low.",
    Oct: "Reduce entrance (mouse guard). Final feeding. Combine weak colonies with strong.",
    Nov: "Wrap/insulate hives if mountain zone. Leave alone on coast. Monitor weight.",
    Dec: "Oxalic acid treatment (broodless period). Don't disturb. Check weight monthly.",
  },
  Sheep: {
    Jan: "Late pregnancy care. Increase nutrition. Vaccinate ewes 4wk before lambing (CDT).",
    Feb: "LAMBING begins. Supplies ready. Colostrum within 1hr. Iodine navels. Tag/record.",
    Mar: "Lambing continues. Process lambs: dock tails (if wool breed), castrate, vaccinate.",
    Apr: "Pasture improving. Rotational grazing starts. Fecal egg count.",
    May: "SHEARING. Full pasture. Footbath monthly (zinc sulfate 10%). Wean early lambs.",
    Jun: "Peak grazing. Monitor for fly strike (dagging — keep rear clean). Wean remaining lambs.",
    Jul: "Manage parasites. FAMACHA scoring. Targeted deworming only.",
    Aug: "Flush ewes (increase nutrition 2-3wk before breeding to boost ovulation).",
    Sep: "BREEDING SEASON. Ram goes in (1 ram per 30-40 ewes). Marking harness.",
    Oct: "Remove ram after 2 cycles (34 days). Fecal test. Hoof trim.",
    Nov: "Pregnancy scanning available (day 40-90). Winter feeding begins if pasture poor.",
    Dec: "Feed hay if snow/poor pasture. Body condition score — should be 3-3.5/5.",
  },
  Turkey: {
    Jan: "Low activity. Maintain weight. Shelter from rain — turkeys hate wet. Supplement grain.",
    Feb: "Breeding prep. Increase protein. Check tom condition. Toms start displaying.",
    Mar: "BREEDING begins. 1 tom per 8-10 hens. Collect eggs for incubation or let hens brood.",
    Apr: "Incubation 28 days. Poults extremely fragile — warm, dry, no drafts. Medicated starter feed.",
    May: "Poults to outdoor shelter at 6-8wk. Pasture access. Start bug foraging — natural pest control.",
    Jun: "Free range on pasture. Turkeys eat ticks, grasshoppers, scorpions. Shade critical in Med heat.",
    Jul: "Heat management — turkeys tolerate heat better than chickens. Ensure shade and water. Dust baths.",
    Aug: "Growing birds on pasture. Heritage breeds ready at 6-7 months. Broad-breasted at 4-5 months.",
    Sep: "Continue pasture rotation. Supplemental grain increases as forage quality drops.",
    Oct: "Processing season for meat birds. Heritage breeds at peak weight 6-8kg.",
    Nov: "Process remaining meat birds. Select breeders for next year — keep best toms and hens.",
    Dec: "Breeding stock maintenance. Shelter from cold rain. Turkeys roost in trees if allowed.",
  },
  Goose: {
    Jan: "Breeding condition. Increase grain. Geese pair-bond — don't separate bonded pairs.",
    Feb: "LAYING begins (Mediterranean). Collect eggs daily — 40-60 eggs per season. 30d incubation.",
    Mar: "Peak laying. Set eggs under broody goose or incubator. Goslings at 30 days.",
    Apr: "Goslings to grass at 2-3wk. Geese are excellent mothers — let them raise their own.",
    May: "Pasture weeding — geese eat grass and weeds but leave most crops alone. Orchard weeding.",
    Jun: "Full pasture. Geese need swimming water (even a tub). Shade in Med heat.",
    Jul: "Heat management. Always access to water for bathing. Fresh drinking water twice daily.",
    Aug: "Meat birds ready at 4-5 months. Down harvest from live birds (post-molt, humane).",
    Sep: "Pasture quality dropping. Supplement with grain. Molt begins.",
    Oct: "Feather molt complete. Guardian duty — geese are aggressive to foxes, dogs, strangers.",
    Nov: "Reduce flock to breeding pairs. Geese live 20+ years — plan long-term.",
    Dec: "Cold-hardy. Minimal shelter needed. Maintain breeding condition with good nutrition.",
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
const DEF = {zones:[],garden:{plots:[]},livestock:{animals:[]},pantry:{items:[]},costs:{items:[]},log:[],setupDone:false,
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
  return <div style={{marginBottom:12}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <input {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box",...p.style}}/>
  </div>;
});

const Sel = React.memo(function Sel({label,options,...p}) {
  return <div style={{marginBottom:12}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <select {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",boxSizing:"border-box"}}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>
  </div>;
});

const Txt = React.memo(function Txt({label,...p}) {
  return <div style={{marginBottom:12}}>
    {label&&<label style={{display:"block",fontSize:12,fontWeight:600,color:C.t2,marginBottom:5,fontFamily:F.body}}>{label}</label>}
    <textarea {...p} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:C.rs,background:C.card,fontSize:14,fontFamily:F.body,color:C.text,outline:"none",resize:"vertical",minHeight:60,boxSizing:"border-box"}}/>
  </div>;
});

const Overlay = React.memo(function Overlay({title,onClose,children,wide}) {
  return createPortal(
    <div style={{position:"fixed",top:0,left:0,width:"100vw",height:"100vh",background:"rgba(0,0,0,.35)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:16,boxSizing:"border-box"}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className="page-enter" style={{background:C.card,borderRadius:C.r+4,maxWidth:wide?720:520,width:"100%",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.2), 0 8px 20px rgba(0,0,0,.1)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px 0",position:"sticky",top:0,background:C.card,zIndex:1,borderRadius:`${C.r+4}px ${C.r+4}px 0 0`}}>
          <h3 style={{margin:0,fontSize:20,fontFamily:F.head,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:C.t2,width:32,height:32,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
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
function Tooltip({children, content, width=220}) {
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
}

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
    <div style={{marginBottom:12}}>
      <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:8}}>Growing Steps</div>
      {steps.map((s, i) => {
        const sd = plantDate ? new Date(new Date(plantDate).getTime() + s.d * 864e5).toLocaleDateString("en-GB",{day:"numeric",month:"short"}) : "";
        return (
          <div key={i} onClick={e => {e.stopPropagation(); onToggle?.(plotId, i);}} style={{display:"flex",gap:10,padding:"10px 12px",background:s.done?"#f0faf0":C.card,border:`1px solid ${s.done?C.gm:C.bdr}`,borderRadius:C.rs,marginBottom:4,cursor:"pointer"}}>
            <div style={{width:22,height:22,borderRadius:22,border:`2px solid ${s.done?C.green:C.bdr}`,background:s.done?C.green:"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,flexShrink:0}}>{s.done?"✓":""}</div>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <strong style={{fontSize:13,textDecoration:s.done?"line-through":"none"}}>{s.l}</strong>
                <span style={{fontSize:10,color:C.t2,fontFamily:F.mono}}>Day {s.d}{sd ? ` (${sd})` : ""}</span>
              </div>
              <div style={{fontSize:12,color:C.t2,marginTop:2}}>{s.t}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

const WaterCard = React.memo(function WaterCard({waterNote}) {
  if (!waterNote) return null;
  return <Card style={{marginBottom:12,background:"#e3f2fd"}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>💧 Watering</div><div style={{fontSize:13,marginTop:4}}>{waterNote}</div></Card>;
});

const StorageCard = React.memo(function StorageCard({storage}) {
  if (!storage) return null;
  return <Card style={{marginBottom:12,background:"#fffde7"}}><div style={{fontSize:12,fontWeight:700,color:"#f57f17"}}>📦 Storage</div><div style={{fontSize:13,marginTop:4}}>{storage}</div></Card>;
});

/* ═══════════════════════════════════════════
   TASK QUEUE ENGINE — sorted by urgency
   ═══════════════════════════════════════════ */
function buildTaskQueue(data) {
  const now = new Date(); now.setHours(0,0,0,0);
  const tasks = [];

  data.garden.plots.forEach(p => {
    if (!p.plantDate || p.status === "harvested") return;
    const crop = CROP_MAP.get(p.crop);
    if (!crop) return;
    const dSince = Math.floor((now - new Date(p.plantDate)) / 864e5);
    const zone = data.zones.find(z => z.id === p.zone);
    const loc = zone ? zone.name : "Farm";
    const dLeft = crop.days - dSince;

    // Harvest ready
    if (dSince >= crop.days) {
      tasks.push({ pri: 0, type: "harvest", emoji: crop.emoji, title: `Harvest ${p.name || p.crop}`, desc: `Ready! Est. yield available.`, loc, plotId: p.id, daysOut: 0 });
    }

    // Steps due
    if (p.steps) p.steps.forEach((s, i) => {
      if (s.done) return;
      const due = dSince - s.d;
      if (due >= 0 && due <= 3) {
        tasks.push({ pri: 1, type: "step", emoji: crop.emoji, title: `${p.name || p.crop}: ${s.l}`, desc: s.t, loc, plotId: p.id, stepIdx: i, daysOut: 0 });
      } else if (due >= -3 && due < 0) {
        tasks.push({ pri: 3, type: "upcoming", emoji: crop.emoji, title: `${p.name || p.crop}: ${s.l}`, desc: s.t, loc, plotId: p.id, stepIdx: i, daysOut: Math.abs(due) });
      }
    });

    // Watering
    if (crop.waterFreq) {
      const m = crop.waterFreq.match(/(\d+)/);
      if (m && dSince > 0 && dSince % parseInt(m[1]) === 0) {
        tasks.push({ pri: 2, type: "water", emoji: "💧", title: `Water ${p.name || p.crop}`, desc: crop.waterNote, loc, plotId: p.id, daysOut: 0 });
      }
    }

    // Harvest forecast (upcoming)
    if (dLeft > 0 && dLeft <= 14) {
      const hDate = new Date(new Date(p.plantDate).getTime() + crop.days * 864e5);
      const estYld = p.expectedYieldKg || crop.yld || 3;
      tasks.push({ pri: 4, type: "forecast", emoji: "📅", title: `${p.name || p.crop} harvest in ${dLeft}d`, desc: `Expected: ${hDate.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}. ~${estYld}kg yield.`, loc, plotId: p.id, daysOut: dLeft });
    }
  });

  tasks.sort((a, b) => a.pri - b.pri || a.daysOut - b.daysOut);
  return tasks;
}

/* ═══════════════════════════════════════════
   INTERACTIVE FARM MAP — with zoom
   ═══════════════════════════════════════════ */
const FarmMap = React.memo(function FarmMap({zones, plots=[], tasks=[], onZoneClick, selectedZone, onBack, zoomedZone, expandedCrop, setExpandedCrop, expandedAnimal, setExpandedAnimal, onToggleStep, animals=[], allAnimals=[], farmW=100, farmH=60, zoneSpace={}}) {
  const W = 700, H = 440;

  // Compute "now" ONCE per render — avoid new Date() in every loop iteration
  const now = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const nowMs = now.getTime();

  const getCropStage = useCallback((p) => {
    const crop = CROP_MAP.get(p.crop);
    if (!crop || !p.plantDate) return crop?.stages?.[0] || "🌱";
    const ds = Math.floor((nowMs - new Date(p.plantDate).getTime()) / 864e5);
    const pct = Math.min(1, ds / crop.days);
    return crop.stages?.[Math.min(5, Math.floor(pct * 6))] || crop.emoji;
  }, [nowMs]);

  // Zoomed view of single zone
  if (zoomedZone) {
    const z = zones.find(zn => zn.id === zoomedZone);
    if (!z) return null;
    const zt = ZT.find(t => t.id === z.type);
    const zPlots = plots.filter(p => p.zone === z.id && p.status !== "harvested");
    const zTasks = tasks.filter(t => t.loc === z.name);
    const isAnimalZone = ["barn","pasture"].includes(z.type);

    return (
      <Card p={false} style={{overflow:"hidden"}}>
        <div style={{background:`linear-gradient(135deg, ${zt?.fill || "#ccc"}cc, ${zt?.fill || "#ccc"}88)`,padding:"20px 24px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",right:-20,bottom:-20,fontSize:80,opacity:.15}}>{zt?.icon}</div>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.25)",backdropFilter:"blur(4px)",border:"none",borderRadius:20,padding:"5px 16px",cursor:"pointer",fontSize:12,fontWeight:600,color:"#fff",marginBottom:10,display:"flex",alignItems:"center",gap:4}}>← Back to farm</button>
          <h3 style={{margin:0,fontSize:24,fontFamily:F.head,color:"#fff",textShadow:"0 1px 3px rgba(0,0,0,.2)"}}>{z.name}</h3>
          <div style={{fontSize:13,color:"rgba(255,255,255,.85)",marginTop:4}}>{zt?.label}{zPlots.length > 0 ? ` · ${zPlots.length} crops` : ""}</div>
        </div>
        <div style={{padding:20,maxHeight:"60vh",overflowY:"auto"}}>
          {/* Urgent tasks for this zone */}
          {zTasks.filter(t => t.pri <= 2).length > 0 && (
            <div style={{marginBottom:16,background:"#fff5f5",borderRadius:C.rs,padding:12,border:"1px solid #ffcdd2"}}>
              <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:6}}>⚡ Actions needed</div>
              {zTasks.filter(t => t.pri <= 2).slice(0, 4).map((t, i) => (
                <div key={i} style={{fontSize:13,padding:"5px 0",borderBottom:i < 3 ? `1px solid ${C.bdr}` : "none",display:"flex",gap:8,alignItems:"center"}}>
                  <span>{t.emoji}</span><span style={{flex:1}}>{t.title}</span>
                  {t.stepIdx != null && <button onClick={() => onToggleStep?.(t.plotId, t.stepIdx)} style={{background:C.green,color:"#fff",border:"none",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer",fontWeight:600}}>✓</button>}
                </div>
              ))}
            </div>
          )}

          {/* CROPS — full detail with step checklists */}
          {zPlots.length > 0 && zPlots.map(p => {
            const crop = CROP_MAP.get(p.crop);
            if (!crop) return null;
            const ds = p.plantDate ? Math.floor((nowMs - new Date(p.plantDate).getTime()) / 864e5) : 0;
            const pct = crop ? Math.min(1, ds / crop.days) : 0;
            const isReady = pct >= 1;
            const isExpanded = expandedCrop === p.id;
            return (
              <Card key={p.id} style={{marginBottom:10,border:isReady?`2px solid ${C.orange}`:`1px solid ${C.bdr}`}}>
                <div onClick={() => setExpandedCrop(isExpanded ? null : p.id)} style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
                  <Ring pct={pct} size={48} color={isReady?C.orange:C.green}>{getCropStage(p)}</Ring>
                  <div style={{flex:1}}>
                    <div style={{fontSize:15,fontWeight:600}}>{p.name || p.crop}</div>
                    <div style={{fontSize:12,color:C.t2}}>
                      {isReady ? "🧺 Ready to harvest!" : `${Math.round(pct*100)}% · ${Math.max(0,crop.days-ds)}d left`}
                      {p.plantDate ? ` · Planted ${p.plantDate}` : ""}
                    </div>
                  </div>
                  <span style={{fontSize:18,color:C.t3,transition:"transform .2s",transform:isExpanded?"rotate(90deg)":"none"}}>›</span>
                </div>

                {/* Expanded: full step checklist + info */}
                {isExpanded && (
                  <div style={{marginTop:16,borderTop:`1px solid ${C.bdr}`,paddingTop:16}}>
                    {/* Quick info pills */}
                    <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                      <Pill>☀ {crop.sun}</Pill><Pill>💧 {crop.waterFreq}</Pill><Pill>📏 {crop.spacing}cm</Pill>
                    </div>

                    <WaterCard waterNote={crop.waterNote}/>
                    <StepChecklist steps={p.steps} plantDate={p.plantDate} onToggle={onToggleStep} plotId={p.id}/>
                    <StorageCard storage={crop.storage}/>

                    {/* Harvest button */}
                    {isReady && <Btn v="success" onClick={() => onZoneClick?.(p)} style={{width:"100%",justifyContent:"center"}}>🧺 Harvest → Pantry</Btn>}
                  </div>
                )}
              </Card>
            );
          })}

          {/* ANIMALS — for barn/pasture zones */}
          {isAnimalZone && animals && animals.length > 0 && (
            <div style={{marginTop:zPlots.length > 0 ? 16 : 0}}>
              <div style={{fontSize:13,fontWeight:700,color:"#8b6914",marginBottom:8}}>🐄 Animals in this area</div>
              {animals.map(a => {
                const db = LDB[a.type];
                if (!db) return null;
                const isAExpanded = expandedAnimal === a.id;
                return (
                  <Card key={a.id} style={{marginBottom:10}}>
                    <div onClick={() => setExpandedAnimal(isAExpanded ? null : a.id)} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
                      <span style={{fontSize:28}}>{db.e}</span>
                      <div style={{flex:1}}>
                        <strong style={{fontSize:15}}>{a.name || a.type}</strong>{a.breed ? ` (${a.breed})` : ""}
                        <div style={{fontSize:12,color:C.t2}}>×{a.count} head</div>
                      </div>
                      <span style={{fontSize:18,color:C.t3,transition:"transform .2s",transform:isAExpanded?"rotate(90deg)":"none"}}>›</span>
                    </div>

                    {isAExpanded && (
                      <div style={{marginTop:16,borderTop:`1px solid ${C.bdr}`,paddingTop:16}}>
                        {[{i:"🍽",t:"Feeding",v:db.feed,vq:`${a.type} feeding guide homestead`},
                          {i:"🏠",t:"Housing",v:db.house,vq:`${a.type} housing coop barn setup`},
                          {i:"😴",t:"Sleeping",v:db.sleep,vq:`${a.type} sleeping arrangements farm`},
                          {i:"💕",t:"Breeding",v:db.breed,vq:`${a.type} breeding guide beginners`}
                        ].map(s => (
                          <div key={s.t} style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:C.rs,padding:10,marginBottom:6}}>
                            <div style={{fontSize:11,fontWeight:700,color:C.green}}>{s.i} {s.t}</div>
                            <div style={{fontSize:12,lineHeight:1.6,marginTop:4}}>{s.v}</div>
                          </div>
                        ))}
                        <div style={{background:"#fce4ec",borderRadius:C.rs,padding:10,marginBottom:6}}>
                          <div style={{fontSize:11,fontWeight:700,color:C.red}}>🩹 Common Injuries</div>
                          {db.inj.map((j, i) => (
                            <div key={i} style={{marginTop:6}}>
                              <strong style={{fontSize:12}}>{j.n}</strong>
                              <div style={{fontSize:11,color:C.t2}}>{j.t}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {zPlots.length === 0 && !(isAnimalZone && animals && animals.length > 0) && (
            <div style={{textAlign:"center",padding:32,color:C.t2}}>Nothing here yet. Go to {isAnimalZone ? "Livestock" : "Farming"} to add.</div>
          )}
        </div>
      </Card>
    );
  }

  // ── Classic Topo: full farm view ──
  // Distinct crop colors — each vegetable gets its own hue so you can tell them apart at a glance
  const CROP_COLORS = [
    {r:220,g:60,b:60},   // red (tomato-ish)
    {r:60,g:160,b:60},   // green
    {r:60,g:100,b:200},  // blue
    {r:200,g:160,b:30},  // gold
    {r:160,g:60,b:180},  // purple
    {r:230,g:120,b:30},  // orange
    {r:40,g:180,b:170},  // teal
    {r:200,g:80,b:140},  // pink
    {r:100,g:140,b:60},  // olive
    {r:80,g:80,b:180},   // indigo
    {r:180,g:100,b:60},  // brown
    {r:60,g:180,b:100},  // mint
  ];
  // Map each unique crop name to a stable color index
  const cropColorMap = useMemo(() => {
    const map = new Map();
    const seen = [];
    plots.forEach(p => {
      if (p.status !== "harvested" && !map.has(p.crop)) {
        map.set(p.crop, CROP_COLORS[seen.length % CROP_COLORS.length]);
        seen.push(p.crop);
      }
    });
    return map;
  }, [plots]);
  // Zone style overrides for topo palette
  const TOPO = {
    veg:{fill:"#c5d5a6",stroke:"#7a9456",grad:"#a8c278"},
    orchard:{fill:"#b8cca0",stroke:"#6a8848",grad:"#9ab880"},
    herbs:{fill:"#d0e0bc",stroke:"#8aa060",grad:"#bdd4a0"},
    pasture:{fill:"#d8e0c8",stroke:"#98b078",grad:"#c8d4b0"},
    greenhouse:{fill:"#c8dcc8",stroke:"#78a878",grad:"#b0d0b0"},
    barn:{fill:"#d4c4a8",stroke:"#a08858",grad:"#c0aa88"},
    water:{fill:"#a8c8d8",stroke:"#6898b0",grad:"#88b0c8"},
    house:{fill:"#ddd4c0",stroke:"#b0a080",grad:"#d0c0a8"},
    compost:{fill:"#b8a890",stroke:"#8a7050",grad:"#a89478"},
    storage:{fill:"#c8bca8",stroke:"#988868",grad:"#b8a890"},
  };

  // Hover tooltip state for zones
  const svgRef = useRef(null);
  const [hoverZone, setHoverZone] = useState(null);
  const [hoverPos, setHoverPos] = useState({x:0, y:0});

  const handleZoneHover = useCallback((z, zPlots, zTasks, sp, e) => {
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const y = e.clientY - svgRect.top;
    setHoverPos({x, y});
    setHoverZone({
      name: z.name,
      type: ZT_MAP.get(z.type)?.label || z.type,
      icon: ZT_MAP.get(z.type)?.icon || "",
      cropCount: zPlots.length,
      taskCount: zTasks.length,
      usedPct: sp?.pct ? Math.round(sp.pct * 100) : 0,
      crops: zPlots.slice(0, 3).map(p => {
        const crop = CROP_MAP.get(p.crop);
        const ds = p.plantDate ? Math.floor((nowMs - new Date(p.plantDate).getTime()) / 864e5) : 0;
        const pct = crop ? Math.min(100, Math.round(ds / crop.days * 100)) : 0;
        return { name: p.name || p.crop, emoji: crop?.emoji || "🌱", pct };
      }),
    });
  }, [nowMs]);

  return (
    <Card p={false} style={{overflow:"hidden",position:"relative"}}>
      {/* Zone hover tooltip */}
      {hoverZone && (
        <div style={{
          position:"absolute", left: hoverPos.x, top: hoverPos.y - 8,
          transform:"translate(-50%, -100%)", zIndex:50, pointerEvents:"none",
          minWidth:180, maxWidth:240,
        }}>
          <div style={{
            background:"#1d1d1f", color:"#fff", borderRadius:10, padding:"10px 14px",
            fontSize:12, lineHeight:1.5, fontFamily:F.body, boxShadow:"0 8px 24px rgba(0,0,0,.25)",
          }}>
            <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{hoverZone.icon} {hoverZone.name}</div>
            <div style={{opacity:.7,fontSize:11,marginBottom:6}}>{hoverZone.type} · {hoverZone.usedPct}% used · {hoverZone.taskCount} tasks</div>
            {hoverZone.crops.length > 0 && hoverZone.crops.map((c,i) => (
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginTop:3}}>
                <span>{c.emoji}</span>
                <span style={{flex:1}}>{c.name}</span>
                <span style={{fontSize:10,opacity:.7}}>{c.pct}%</span>
                <div style={{width:30,height:3,borderRadius:2,background:"rgba(255,255,255,.15)"}}>
                  <div style={{width:`${c.pct}%`,height:3,borderRadius:2,background:c.pct>=85?"#ffcc00":"#34c759"}}/>
                </div>
              </div>
            ))}
            {hoverZone.cropCount === 0 && <div style={{opacity:.5,fontSize:11}}>No crops planted</div>}
          </div>
          <div style={{width:0,height:0,borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1d1d1f",margin:"0 auto"}}/>
        </div>
      )}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}}>
        <defs>
          {/* Contour line pattern — topographic feel */}
          <pattern id="topo-ct" width="50" height="30" patternUnits="userSpaceOnUse">
            <path d="M0,15 Q12,10 25,15 T50,15" fill="none" stroke="#5a7340" strokeWidth=".25" opacity=".12"/>
            <path d="M0,25 Q12,20 25,25 T50,25" fill="none" stroke="#5a7340" strokeWidth=".2" opacity=".084"/>
            <path d="M0,5 Q12,1 25,5 T50,5" fill="none" stroke="#5a7340" strokeWidth=".2" opacity=".10"/>
          </pattern>
          {/* Inner shadow filter for zone depth */}
          <filter id="topo-in">
            <feFlood floodColor="#000" floodOpacity=".04" result="f"/>
            <feComposite in="f" in2="SourceAlpha" operator="in" result="s"/>
            <feGaussianBlur in="s" stdDeviation="1.5" result="b"/>
            <feComposite in="b" in2="SourceAlpha" operator="in"/>
            <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          {/* Zone gradients */}
          {Object.entries(TOPO).map(([k,v]) => (
            <linearGradient key={k} id={`tg-${k}`} x1="0" y1="0" x2=".3" y2="1">
              <stop offset="0%" stopColor={v.fill}/><stop offset="100%" stopColor={v.grad}/>
            </linearGradient>
          ))}
        </defs>

        {/* Parchment background + contour overlay */}
        <rect width={W} height={H} fill="#e8e0d0"/>
        <rect width={W} height={H} fill="url(#topo-ct)"/>

        {/* Survey grid ticks */}
        {[...Array(Math.floor(farmW/10)-1)].map((_,i) => {
          const px = ((i+1)*10/farmW)*W;
          return <g key={`gx${i}`}><line x1={px} y1={0} x2={px} y2={5} stroke="#8a7a60" strokeWidth=".4" opacity=".25"/><line x1={px} y1={H-5} x2={px} y2={H} stroke="#8a7a60" strokeWidth=".4" opacity=".25"/></g>;
        })}
        {[...Array(Math.floor(farmH/10)-1)].map((_,i) => {
          const py = ((i+1)*10/farmH)*H;
          return <g key={`gy${i}`}><line x1={0} y1={py} x2={5} y2={py} stroke="#8a7a60" strokeWidth=".4" opacity=".25"/><line x1={W-5} y1={py} x2={W} y2={py} stroke="#8a7a60" strokeWidth=".4" opacity=".25"/></g>;
        })}

        {/* ── Zones ── */}
        {zones.map(z => {
          const zt = ZT_MAP.get(z.type);
          const tp = TOPO[z.type] || TOPO.veg;
          const x = z.xM !== undefined ? (z.xM/farmW)*W : (z.x/100)*W;
          const y = z.yM !== undefined ? (z.yM/farmH)*H : (z.y/100)*H;
          const w = z.wM !== undefined ? (z.wM/farmW)*W : (z.w/100)*W;
          const h = z.hM !== undefined ? (z.hM/farmH)*H : (z.h/100)*H;
          const sel = selectedZone === z.id;
          const isWater = z.type === "water";
          const isPlantZone = ["veg","orchard","herbs","greenhouse"].includes(z.type);
          const isAnimalZone = ["barn","pasture"].includes(z.type);

          // Crop data for proportional bands
          const zPlots = plots.filter(p => p.zone === z.id && p.status !== "harvested");
          const sp = zoneSpace[z.id] || {totalM2:0,usedM2:0,freeM2:0,pct:0};
          const totalM2 = sp.totalM2;

          // Build proportional crop bands — each fills exact % of zone as a horizontal slab
          const PAD = 1.5, TOP = 13;
          const innerX = x + PAD, innerY = y + TOP;
          const innerW = w - PAD*2, innerH = h - TOP - PAD;
          const cropBands = [];
          let bandCurY = 0;

          if (isPlantZone && totalM2 > 0 && zPlots.length > 0 && innerW > 8 && innerH > 8) {
            // Compute area per plot, sort largest first
            const plotsWithArea = zPlots.map(p => {
              const area = plotAreaM2(p);
              return { p, area, frac: Math.min(0.98, area / totalM2) };
            }).filter(pa => pa.frac > 0.001).sort((a,b) => b.frac - a.frac);

            plotsWithArea.forEach((pa, i) => {
              const bH = pa.frac * innerH;
              if (bH < 3 || bandCurY + bH > innerH) return;
              const crop = CROP_MAP.get(pa.p.crop);
              const ds = pa.p.plantDate ? Math.floor((nowMs - new Date(pa.p.plantDate).getTime()) / 864e5) : 0;
              const pct = crop ? Math.min(1, ds / crop.days) : 0;
              cropBands.push({
                p: pa.p, crop, bx: innerX, by: innerY + bandCurY,
                bW: innerW, bH, pct, frac: pa.frac,
                pctLabel: Math.round(pa.frac * 100),
                emoji: getCropStage(pa.p),
              });
              bandCurY += bH;
            });
          }

          const freeFrac = Math.max(0, 1 - cropBands.reduce((s,b) => s + b.frac, 0));
          const freePct = Math.round(freeFrac * 100);
          const freeY = innerY + bandCurY;
          const freeH = innerH - bandCurY;

          // Animal icons
          const zAnimals = isAnimalZone ? allAnimals.filter(a => LDB[a.type]) : [];
          const animalIconMap = {};
          zAnimals.forEach(a => {
            if (!animalIconMap[a.type]) animalIconMap[a.type] = {emoji: LDB[a.type]?.e||"🐄", count:0};
            animalIconMap[a.type].count += a.count;
          });
          const animalIcons = Object.entries(animalIconMap);

          // Tasks
          const zTasks = tasks.filter(t => t.loc === z.name && t.pri <= 2);
          const urgentCount = zTasks.length;

          return (
            <g key={z.id} onClick={() => onZoneClick?.(z)}
              onMouseMove={(e) => handleZoneHover(z, zPlots, zTasks, sp, e)}
              onMouseLeave={() => setHoverZone(null)}
              style={{cursor:"pointer"}}>
              {/* Drop shadow */}
              <rect x={x+1} y={y+1.5} width={w} height={h} rx={isWater?Math.min(w,h)/2:4} fill="rgba(50,40,20,.06)"/>

              {/* Zone fill — topo gradient + inner shadow */}
              <rect x={x} y={y} width={w} height={h} rx={isWater?Math.min(w,h)/2:4}
                fill={`url(#tg-${z.type})`} stroke={sel?"#1d1d1f":tp.stroke}
                strokeWidth={sel?2:0.7} filter="url(#topo-in)"/>

              {/* Water: dual ripple animation */}
              {isWater && <>
                <ellipse cx={x+w/2} cy={y+h/2} rx={w/3} ry={h/3.5} fill="none" stroke="rgba(255,255,255,.2)" strokeWidth=".6">
                  <animate attributeName="rx" values={`${w/3};${w/3-1.5};${w/3}`} dur="3s" repeatCount="indefinite"/>
                </ellipse>
                <ellipse cx={x+w/2} cy={y+h/2} rx={w/5} ry={h/5} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth=".4">
                  <animate attributeName="rx" values={`${w/5};${w/5+1};${w/5}`} dur="2.2s" repeatCount="indefinite"/>
                </ellipse>
              </>}

              {/* ── CROP COLOR OVERLAYS: each vegetable gets a colored band ── */}
              {isPlantZone && cropBands.length > 0 && (
                <g style={{pointerEvents:"none"}}>
                  {cropBands.map((b, i) => {
                    const cc = cropColorMap.get(b.p.crop) || {r:100,g:140,b:60};
                    const emojiSize = Math.min(16, Math.max(8, b.bH * 0.6));
                    const showLabel = b.bW > 28 && b.bH > 9;
                    const showPct = b.bW > 16 && b.bH > 7;
                    return (
                      <g key={b.p.id}>
                        {/* Colored fill — the main visible overlay */}
                        <rect x={b.bx} y={b.by} width={b.bW} height={b.bH} rx="2"
                          fill={`rgba(${cc.r},${cc.g},${cc.b},.35)`}/>
                        {/* Softer inner glow — slightly inset, more opaque center */}
                        <rect x={b.bx+1.5} y={b.by+1} width={Math.max(1,b.bW-3)} height={Math.max(1,b.bH-2)} rx="2"
                          fill={`rgba(${cc.r},${cc.g},${cc.b},.18)`}/>
                        {/* Separator between crops */}
                        {i > 0 && <line x1={b.bx} y1={b.by} x2={b.bx+b.bW} y2={b.by} stroke="rgba(255,255,255,.5)" strokeWidth=".6"/>}
                        {/* Crop emoji */}
                        <text x={b.bx + b.bW/2} y={b.by + b.bH/2 + emojiSize*0.35}
                          textAnchor="middle" fontSize={emojiSize}>{b.emoji}</text>
                        {/* Crop name */}
                        {showLabel && <text x={b.bx+3} y={b.by+b.bH/2+2.5}
                          fontSize="5.5" fontFamily={F.mono} fontWeight="700" fill={`rgb(${Math.max(0,cc.r-80)},${Math.max(0,cc.g-80)},${Math.max(0,cc.b-80)})`}>{(b.p.name||b.p.crop).slice(0,10)}</text>}
                        {/* Percentage badge */}
                        {showPct && (
                          <g>
                            <rect x={b.bx+b.bW-19} y={b.by+b.bH/2-5} width="17" height="9" rx="2.5"
                              fill={`rgba(${cc.r},${cc.g},${cc.b},.75)`}/>
                            <text x={b.bx+b.bW-10.5} y={b.by+b.bH/2+1.5}
                              textAnchor="middle" fontSize="5.5" fontFamily={F.mono} fontWeight="800" fill="#fff">{b.pctLabel}%</text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                  {/* Free space */}
                  {freePct > 2 && freeH > 4 && (
                    <g>
                      <rect x={innerX} y={freeY} width={innerW} height={freeH} rx="2"
                        fill="rgba(255,255,255,.1)" stroke="rgba(120,100,60,.15)" strokeWidth=".4" strokeDasharray="3 2"/>
                      {freeH > 8 && <text x={innerX+innerW/2} y={freeY+freeH/2+3}
                        textAnchor="middle" fontSize="5" fontFamily={F.mono} fill="rgba(80,70,40,.35)">{freePct}% free</text>}
                    </g>
                  )}
                </g>
              )}

              {/* FULL indicator */}
              {isPlantZone && sp.totalM2 > 0 && sp.pct >= 0.95 && (
                <text x={x+w/2} y={y+h-3} textAnchor="middle" fontSize="6"
                  fill="rgba(192,57,43,.85)" fontFamily={F.mono} fontWeight="800"
                  style={{pointerEvents:"none"}}>FULL</text>
              )}

              {/* ── Animal icons ── */}
              {!isPlantZone && !isWater && animalIcons.length > 0 && (
                <g style={{pointerEvents:"none"}}>
                  {animalIcons.slice(0,6).map(([type, {emoji, count}], i) => {
                    const cols = Math.max(1, Math.floor((w-8)/22));
                    const col = i % cols, row = Math.floor(i / cols);
                    const cx = x + 12 + col * 22, cy = y + 24 + row * 22;
                    return (
                      <g key={type}>
                        <circle cx={cx} cy={cy} r="8" fill="rgba(255,255,255,.45)"/>
                        <text x={cx} y={cy+3.5} fontSize="10" textAnchor="middle">{emoji}</text>
                        {count > 1 && <text x={cx+6} y={cy-3} fontSize="5" fill={tp.stroke} fontWeight="700" fontFamily={F.mono}>{count}</text>}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Zone label — pill with frosted background */}
              <rect x={x+2} y={y+1.5} width={Math.min(w-4, z.name.length*5.2+10)} height="9.5" rx="2"
                fill="rgba(255,255,255,.6)"/>
              <text x={x+6} y={y+8.5} fontSize="6.5" fontFamily={F.mono} fontWeight="700" fill="#4a4030"
                style={{pointerEvents:"none"}}>{z.name}</text>

              {/* Task notification badge */}
              {urgentCount > 0 && (
                <g style={{pointerEvents:"none"}}>
                  <circle cx={x+w-8} cy={y+8} r="8" fill="none" stroke="#c0392b" strokeWidth="1.5" opacity=".4">
                    <animate attributeName="r" values="6;10;6" dur="1.5s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values=".4;0;.4" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                  <circle cx={x+w-8} cy={y+8} r="6.5" fill={urgentCount>=3?"#c0392b":C.orange} opacity=".9"/>
                  <text x={x+w-8} y={y+10.5} textAnchor="middle" fontSize="7" fill="#fff" fontWeight="800">{urgentCount}</text>
                </g>
              )}

              {/* Hover border */}
              <rect x={x} y={y} width={w} height={h} rx={isWater?Math.min(w,h)/2:4} fill="transparent" stroke="transparent" strokeWidth="1.5">
                <set attributeName="stroke" to="#4a4030" begin="mouseover" end="mouseout"/>
              </rect>
            </g>
          );
        })}

        {/* Scale bar — survey style */}
        <line x1={W-70} y1={H-10} x2={W-18} y2={H-10} stroke="#7a6a50" strokeWidth="1" strokeLinecap="round" opacity=".45"/>
        <line x1={W-70} y1={H-13} x2={W-70} y2={H-7} stroke="#7a6a50" strokeWidth=".7" opacity=".35"/>
        <line x1={W-18} y1={H-13} x2={W-18} y2={H-7} stroke="#7a6a50" strokeWidth=".7" opacity=".35"/>
        <text x={W-44} y={H-13.5} textAnchor="middle" fontSize="5.5" fill="#7a6a50" fontFamily={F.mono} opacity=".5">10m</text>

        {/* Compass */}
        <g transform="translate(16,16)" opacity=".4">
          <circle cx="0" cy="0" r="7" fill="none" stroke="#7a6a50" strokeWidth=".5"/>
          <line x1="0" y1="-5" x2="0" y2="-2" stroke="#7a6a50" strokeWidth=".8"/>
          <text x="0" y="-9" textAnchor="middle" fontSize="4.5" fill="#7a6a50" fontFamily={F.mono} fontWeight="700">N</text>
        </g>
      </svg>
      <div style={{position:"absolute",bottom:6,left:12,fontSize:9,color:"#7a6a50",fontFamily:F.mono,opacity:.45}}>Click any zone to zoom in</div>
      {/* Crop color legend */}
      {cropColorMap.size > 0 && (
        <div style={{padding:"8px 14px 10px",borderTop:`1px solid ${C.bdr}`,display:"flex",flexWrap:"wrap",gap:"6px 12px",alignItems:"center"}}>
          <span style={{fontSize:10,fontWeight:700,color:C.t2,fontFamily:F.mono}}>Crops:</span>
          {[...cropColorMap.entries()].map(([name, cc]) => (
            <div key={name} style={{display:"flex",alignItems:"center",gap:4}}>
              <div style={{width:10,height:10,borderRadius:3,background:`rgba(${cc.r},${cc.g},${cc.b},.5)`,boxShadow:`0 0 6px rgba(${cc.r},${cc.g},${cc.b},.3)`}}/>
              <span style={{fontSize:10,color:C.t1,fontFamily:F.mono}}>{name}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
});




/* ═══════════════════════════════════════════
   WEATHER MINI WIDGET — used in Dashboard & TaskQueue
   ═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   WEATHER DASHBOARD CARD — full card for dashboard
   ═══════════════════════════════════════════ */


/* ═══════════════════════════════════════════
   TASK ROW — extracted outside TaskQueue to prevent remount on every render
   ═══════════════════════════════════════════ */
const TaskRow = React.memo(function TaskRow({t, showCheck=true, onToggleStep, onGoToFarm}) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:t.pri<=1?"#fff5f5":t.pri===2?"#fffde7":"#f0f7ff",borderRadius:C.rs,marginBottom:4,borderLeft:`3px solid ${t.pri===0?C.red:t.pri===1?"#ff6b35":t.pri===2?C.orange:C.blue}`}}>
      <span style={{fontSize:16}}>{t.emoji}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.title}</div>
        <div style={{fontSize:10,color:C.t2}}>📍 {t.loc}{t.daysOut>0?` · ${t.daysOut}d`:""}</div>
      </div>
      {showCheck && t.stepIdx!=null && <button onClick={()=>onToggleStep?.(t.plotId,t.stepIdx)} style={{background:C.green,color:"#fff",border:"none",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>✓</button>}
      {t.type==="harvest" && <button onClick={onGoToFarm} style={{background:C.orange,color:"#fff",border:"none",borderRadius:5,padding:"2px 7px",fontSize:10,fontWeight:700,cursor:"pointer",flexShrink:0}}>🧺</button>}
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

  const togStep = (pid, si) => {
    const plots = data.garden.plots.map(p => {
      if (p.id === pid) { const st = [...p.steps]; st[si] = {...st[si], done: !st[si].done}; return {...p, steps: st}; }
      return p;
    });
    setData({...data, garden: {plots}});
  };

  // ── CONSOLIDATED: compute calendar events AND by-time list in ONE pass over plots ──
  const { calendarEvents, byTime } = useMemo(() => {
    const evts = {};
    const timeline = [];
    const now = new Date(); now.setHours(0,0,0,0);
    const nowMs = now.getTime();

    data.garden.plots.forEach(p => {
      if (!p.plantDate || p.status === "harvested") return;
      const crop = CROP_MAP.get(p.crop);
      if (!crop) return;
      const plantMs = new Date(p.plantDate).getTime();
      const loc = data.zones.find(z => z.id === p.zone)?.name || "Farm";

      // Harvest date
      const hDate = new Date(plantMs + crop.days * 864e5);
      const hKey = hDate.toISOString().slice(0,10);
      if (!evts[hKey]) evts[hKey] = [];
      evts[hKey].push({type:"harvest", emoji:crop.emoji, label:`Harvest ${p.name||p.crop}`});
      const dLeft = Math.ceil((hDate - now) / 864e5);
      if (dLeft >= 0 && dLeft <= 60) {
        timeline.push({daysOut: dLeft, dueDate: hDate, type:"harvest", emoji:crop.emoji, title:`Harvest ${p.name||p.crop}`, loc});
      }

      // Step dates
      if (p.steps) p.steps.forEach((s, i) => {
        if (s.done) return;
        const sDate = new Date(plantMs + s.d * 864e5);
        const sKey = sDate.toISOString().slice(0,10);
        if (!evts[sKey]) evts[sKey] = [];
        evts[sKey].push({type:"step", emoji:crop.emoji, label:`${p.name||p.crop}: ${s.l}`});
        const sLeft = Math.ceil((sDate - now) / 864e5);
        if (sLeft >= -1 && sLeft <= 30) {
          timeline.push({daysOut: Math.max(0,sLeft), dueDate: sDate, type:"step", emoji:crop.emoji, title:`${p.name||p.crop}: ${s.l}`, loc, plotId:p.id, stepIdx:i});
        }
      });
    });

    timeline.sort((a,b) => a.daysOut - b.daysOut);
    return { calendarEvents: evts, byTime: timeline };
  }, [data]);

  const urgent = tasks.filter(t => t.pri <= 1);
  const nonUrgent = tasks.filter(t => t.pri >= 2);

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

  const todayStr = today.toISOString().slice(0,10);

  const goToFarm = useCallback(() => setPage("farm"), [setPage]);

  return (
    <div className="page-enter" style={{maxWidth:1100}}>
      <h2 style={{fontFamily:F.head,fontSize:30,margin:"0 0 4px",letterSpacing:"-0.03em",fontWeight:800}}>📋 Task Calendar</h2>
      <p style={{color:C.t2,fontSize:13,margin:"0 0 16px",fontWeight:500}}>All upcoming farm tasks, sorted by urgency and time</p>

      {/* ── Row 1: Urgent + Upcoming side by side ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>

        {/* Urgent tasks box */}
        <Card p={false} style={{overflow:"hidden"}}>
          <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.bdr}`,background:"#fff5f5"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:16}}>🔴</span>
              <div style={{fontSize:14,fontWeight:700,color:C.red}}>Urgent — Act Now</div>
              {urgent.length>0 && <span style={{marginLeft:"auto",background:C.red,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10}}>{urgent.length}</span>}
            </div>
          </div>
          <div style={{padding:"10px",overflowY:"auto",maxHeight:260}}>
            {urgent.length === 0
              ? <div style={{textAlign:"center",padding:24,color:C.t2,fontSize:12}}>✨ All clear!</div>
              : urgent.map((t,i) => <TaskRow key={i} t={t} onToggleStep={togStep} onGoToFarm={goToFarm}/>)
            }
          </div>
        </Card>

        {/* Non-urgent tasks box */}
        <Card p={false} style={{overflow:"hidden"}}>
          <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.bdr}`,background:"#f0f7ff"}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:16}}>🔵</span>
              <div style={{fontSize:14,fontWeight:700,color:C.blue}}>Upcoming & Planned</div>
              {nonUrgent.length>0 && <span style={{marginLeft:"auto",background:C.blue,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:10}}>{nonUrgent.length}</span>}
            </div>
          </div>
          <div style={{padding:"10px",overflowY:"auto",maxHeight:260}}>
            {nonUrgent.length === 0
              ? <div style={{textAlign:"center",padding:24,color:C.t2,fontSize:12}}>Nothing upcoming</div>
              : nonUrgent.map((t,i) => <TaskRow key={i} t={t} onToggleStep={togStep} onGoToFarm={goToFarm}/>)
            }
          </div>
        </Card>
      </div>

      {/* ── Row 2: By Due Date — full width ── */}
      <Card p={false} style={{overflow:"hidden",marginBottom:16}}>
        <div style={{padding:"14px 18px 10px",borderBottom:`1px solid ${C.bdr}`}}>
          <div style={{fontSize:16,fontWeight:700,fontFamily:F.head}}>⏱ By Due Date</div>
          <div style={{fontSize:11,color:C.t2,marginTop:2}}>Next 30 days, time-sorted</div>
        </div>
        <div style={{padding:"10px 14px",overflowY:"auto",maxHeight:320}}>
          {byTime.length === 0
            ? <div style={{textAlign:"center",padding:24,color:C.t2,fontSize:12}}>No upcoming tasks</div>
            : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                {byTime.slice(0,20).map((t,i) => (
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:t.daysOut===0?"#fff5f5":t.daysOut<=3?"#fffde7":"#f8fafb",borderRadius:C.rs,border:`1px solid ${C.bdr}`}}>
                    <div style={{flexShrink:0,textAlign:"center",width:38}}>
                      <div style={{fontSize:12,fontWeight:700,color:t.daysOut===0?C.red:t.daysOut<=3?C.orange:C.blue,fontFamily:F.mono}}>{t.daysOut===0?"NOW":`${t.daysOut}d`}</div>
                      <div style={{fontSize:9,color:C.t2}}>{t.dueDate.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.emoji} {t.title}</div>
                      <div style={{fontSize:10,color:C.t2}}>📍 {t.loc}</div>
                    </div>
                    {t.stepIdx!=null && <button onClick={()=>togStep(t.plotId,t.stepIdx)} style={{background:C.green,color:"#fff",border:"none",borderRadius:5,padding:"3px 8px",fontSize:10,cursor:"pointer",flexShrink:0}}>✓</button>}
                  </div>
                ))}
              </div>
          }
        </div>
      </Card>

      {/* ── Row 3: Calendar — full width ── */}
      <Card p={false} style={{overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${C.bdr}`}}>
          <button onClick={()=>{let m=viewMonth-1,y=viewYear;if(m<0){m=11;y--;}setViewMonth(m);setViewYear(y);}} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.t2,width:32,height:32}}>‹</button>
          <div style={{fontFamily:F.head,fontSize:17,fontWeight:700}}>{MN[viewMonth]} {viewYear}</div>
          <button onClick={()=>{let m=viewMonth+1,y=viewYear;if(m>11){m=0;y++;}setViewMonth(m);setViewYear(y);}} style={{background:"none",border:"none",fontSize:18,cursor:"pointer",color:C.t2,width:32,height:32}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"10px 16px 4px",gap:2}}>
          {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.t2,fontFamily:F.mono}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",padding:"4px 16px 16px",gap:4}}>
          {cells.map((d,i) => {
            if (!d) return <div key={i}/>;
            const dateStr = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
            const evts = calendarEvents[dateStr] || [];
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
          const selEvts = calendarEvents[selectedDate] || [];
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
                  <div style={{fontSize:11,color:C.t2,marginTop:2}}>
                    {selEvts.length === 0 ? "No tasks scheduled" : `${selEvts.length} task${selEvts.length>1?"s":""} scheduled`}
                  </div>
                </div>
                <button onClick={()=>setSelectedDate(null)} style={{background:"none",border:`1px solid ${C.bdr}`,borderRadius:8,padding:"4px 10px",fontSize:11,color:C.t2,cursor:"pointer",fontWeight:600}}>✕ Close</button>
              </div>
              {selEvts.length === 0
                ? <div style={{textAlign:"center",padding:"20px 0",color:C.t2,fontSize:12}}>🌱 Nothing to do — enjoy the day!</div>
                : <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {selEvts.map((evt,idx) => (
                      <div key={idx} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"#fff",borderRadius:C.rs,border:`1px solid ${C.bdr}`,borderLeft:`4px solid ${evt.type==="harvest"?C.orange:C.blue}`}}>
                        <span style={{fontSize:20}}>{evt.emoji}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:600,color:C.text}}>{evt.label}</div>
                          <div style={{fontSize:10,color:C.t2,marginTop:2}}>
                            {evt.type==="harvest" ? "🧺 Ready to harvest" : "📋 Growing step due"}
                          </div>
                        </div>
                        <div style={{flexShrink:0,padding:"3px 10px",borderRadius:6,fontSize:10,fontWeight:700,color:"#fff",background:evt.type==="harvest"?C.orange:C.blue}}>
                          {evt.type==="harvest"?"Harvest":"Step"}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          );
        })()}
      </Card>
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
          <h2 style={{fontFamily:F.head,fontSize:30,margin:0,letterSpacing:"-0.03em",fontWeight:800}}>🗺 Farm Designer</h2>
          <p style={{color:C.t2,fontSize:13,margin:"4px 0",fontWeight:500}}>Drag zones to position · Enter real measurements in metres</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <Btn v="secondary" onClick={()=>setShowAdd(true)}>+ Zone</Btn>
          {data.zones.length>0 && <Btn onClick={doSave}>{saved?"✓ Saved!":"Save Layout"}</Btn>}
        </div>
      </div>

      {/* Farm size config */}
      <Card style={{marginBottom:12,padding:"10px 16px"}}>
        <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:C.t2}}>🗺 Total Farm Size:</span>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <label style={{fontSize:12,color:C.t2}}>Width</label>
            <input type="number" min="10" max="2000" value={farmW}
              onChange={e => { const v = +e.target.value||100; setFarmW(v); setData({...data, farmW:v}); }}
              style={{width:70,padding:"4px 8px",border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:13,fontFamily:F.mono}}/>
            <span style={{fontSize:12,color:C.t2}}>m</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <label style={{fontSize:12,color:C.t2}}>Height</label>
            <input type="number" min="10" max="2000" value={farmH}
              onChange={e => { const v = +e.target.value||60; setFarmH(v); setData({...data, farmH:v}); }}
              style={{width:70,padding:"4px 8px",border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:13,fontFamily:F.mono}}/>
            <span style={{fontSize:12,color:C.t2}}>m</span>
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
          const SETUP_CC = [{r:220,g:60,b:60},{r:60,g:160,b:60},{r:60,g:100,b:200},{r:200,g:160,b:30},{r:160,g:60,b:180},{r:230,g:120,b:30},{r:40,g:180,b:170},{r:200,g:80,b:140},{r:100,g:140,b:60},{r:80,g:80,b:180},{r:180,g:100,b:60},{r:60,g:180,b:100}];
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
                else if (p.plantCount) { const cr=CROP_MAP.get(p.crop); if(cr){const sp=cr.spacing/100;area=p.plantCount*sp*sp;} }
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
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>
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
        const LCC=[{r:220,g:60,b:60},{r:60,g:160,b:60},{r:60,g:100,b:200},{r:200,g:160,b:30},{r:160,g:60,b:180},{r:230,g:120,b:30},{r:40,g:180,b:170},{r:200,g:80,b:140}];
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
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
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
            <div style={{fontSize:11,color:C.t2}}>{zt?.label}</div>
            <div style={{fontSize:10,color:C.t3,fontFamily:F.mono,marginTop:2}}>{(z.wM||0).toFixed(0)}m × {(z.hM||0).toFixed(0)}m</div>
          </Card>
        );})}
      </div>

      {showAdd && (
        <Overlay title="Add Zone" onClose={()=>setShowAdd(false)}>
          <Inp label="Zone Name" placeholder="Main Veggie Bed" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Sel label="Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value})} options={ZT.map(t=>({value:t.id,label:`${t.icon} ${t.label}`}))}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Inp label="Width (metres)" type="number" min="1" value={form.wM} onChange={e=>setForm({...form,wM:e.target.value})}/>
            <Inp label="Height (metres)" type="number" min="1" value={form.hM} onChange={e=>setForm({...form,hM:e.target.value})}/>
          </div>
          <div style={{fontSize:12,color:C.t2,marginBottom:12}}>Zone will be placed at top-left — drag to reposition after adding.</div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
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
function cropMeasureType(cropName) {
  const crop = CROP_MAP.get(cropName);
  if (!crop) return "plants";
  if (["Olive","Grape","Fig","Pomegranate","Peach","Plum","Cherry","Apricot",
       "Walnut","Almond","Chestnut","Quince","Persimmon","Lemon","Orange",
       "Hazelnut","Raspberry","Strawberry"].includes(cropName)) return "plants";
  if (["Wheat","Corn"].includes(cropName)) return "area";
  // Default: area for dense crops, plants for sparse
  return crop.spacing <= 15 ? "area" : "plants";
}

// Auto-calculate plant count from area (m²) and crop spacing (cm)
function plantsFromArea(cropName, areaSqm) {
  const crop = CROP_MAP.get(cropName);
  if (!crop || !areaSqm) return null;
  const spacingM = crop.spacing / 100;
  return Math.round(areaSqm / (spacingM * spacingM));
}

// Expected yield — yld is ALWAYS kg/plant.
// Area mode: convert m² to plant count via spacing, then multiply.
// Plants mode: direct multiply.
// varietyYld overrides base crop yld when a specific variety is selected.
function expectedYield(cropName, quantity, measureType, varietyYld) {
  const crop = CROP_MAP.get(cropName);
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
function plotAreaM2(plot) {
  if (!plot || plot.status === "harvested") return 0;
  if (plot.measureType === "area" && plot.qty) return +plot.qty;
  if (plot.plantCount) {
    const crop = CROP_MAP.get(plot.crop);
    if (crop) {
      const spacingM = crop.spacing / 100;
      return plot.plantCount * spacingM * spacingM;
    }
  }
  return 0;
}

// Returns {totalM2, usedM2, freeM2, pct} for a zone
function zoneSpaceStats(zone, plots, farmW, farmH) {
  const totalM2 = zoneAreaM2(zone, farmW, farmH);
  const activePlots = plots.filter(p => p.zone === zone.id && p.status !== "harvested");
  const usedM2 = activePlots.reduce((s, p) => s + plotAreaM2(p), 0);
  const freeM2 = Math.max(0, totalM2 - usedM2);
  const pct = totalM2 > 0 ? Math.min(1, usedM2 / totalM2) : 0;
  return { totalM2, usedM2: Math.round(usedM2 * 10) / 10, freeM2: Math.round(freeM2 * 10) / 10, pct };
}

// Memoizable: builds stats for ALL zones in one pass
function buildZoneSpaceMap(zones, plots, farmW, farmH) {
  const map = {};
  zones.forEach(z => { map[z.id] = zoneSpaceStats(z, plots, farmW, farmH); });
  return map;
}

function Farming({data, setData, pageData, clearPageData}) {
  const [showAdd,setShowAdd]=useState(false);
  const [selP,setSelP]=useState(null);
  const [form,setForm]=useState({crop:"",variety:"",name:"",zone:"",plantDate:"",cost:"",qty:"",measureType:""});

  // Auto-open add form when arriving from Seasonal Calendar with a specific crop
  useEffect(() => {
    if (pageData?.crop) {
      setForm(f => ({...f, crop: pageData.crop, plantDate: pageData.plantDate || ""}));
      setShowAdd(true);
      if (clearPageData) clearPageData();
    }
  }, [pageData]);
  const ci=CROP_MAP.get(form.crop);
  const vi=ci && form.variety ? (VARIETIES[ci.name]||[]).find(v=>v.name===form.variety) : null;
  const effectiveDays = vi?.days || ci?.days || 0;
  const effectiveYld = vi?.yld || ci?.yld || 3;
  const autoMeasure = ci ? cropMeasureType(ci.name) : "plants";
  const activeMeasure = form.measureType || autoMeasure;
  const plantsCalc = activeMeasure==="area" ? plantsFromArea(ci?.name, +form.qty||0) : null;
  const yieldCalc = ci && form.qty ? expectedYield(ci.name, +form.qty||0, activeMeasure, vi?.yld) : null;
  const autoH=()=>form.plantDate&&ci?new Date(new Date(form.plantDate).getTime()+effectiveDays*864e5).toISOString().slice(0,10):"";
  const vegZ=data.zones.filter(z=>["veg","orchard","herbs","greenhouse"].includes(z.type));
  const zoneSpace = useMemo(() => buildZoneSpaceMap(data.zones, data.garden.plots, data.farmW||100, data.farmH||60), [data.zones, data.garden.plots, data.farmW, data.farmH]);

  const add=()=>{
    if(!form.crop)return;
    const c=CROP_MAP.get(form.crop);
    const v=form.variety?(VARIETIES[form.crop]||[]).find(vr=>vr.name===form.variety):null;
    const displayName=form.name||(form.variety?`${form.crop} (${form.variety})`:form.crop);
    const _measure = form.measureType || (c ? cropMeasureType(c.name) : "plants");
    const _qty = +form.qty || null;
    const _plants = _qty ? (_measure==="area" ? plantsFromArea(form.crop,_qty) : _qty) : null;
    const _yieldKg = _qty ? expectedYield(form.crop, _qty, _measure, v?.yld) : null;
    const p={id:uid(),crop:form.crop,variety:form.variety||"",name:displayName,plantDate:form.plantDate,harvestDate:autoH(),status:form.plantDate?"planted":"planned",zone:form.zone,varietyNote:v?.note||"",steps:c?c.steps.map(s=>({...s,done:false})):[],qty:_qty,measureType:_measure,plantCount:_plants,expectedYieldKg:_yieldKg};
    const nd={...data,garden:{plots:[...data.garden.plots,p]},log:[...data.log,{text:`🌱 Planted ${displayName}${_plants?` (${_plants} plants)`:""}`}]};
    if(form.cost&&+form.cost>0)nd.costs={items:[...(data.costs?.items||[]),{id:uid(),type:"expense",amount:+form.cost,label:`Seeds: ${displayName}`,date:new Date().toISOString().slice(0,10),cat:"Seeds"}]};
    setData(nd);setForm({crop:"",variety:"",name:"",zone:"",plantDate:"",cost:"",qty:"",measureType:""});setShowAdd(false);
  };
  const del=id=>{setData({...data,garden:{plots:data.garden.plots.filter(p=>p.id!==id)}});setSelP(null);};
  const tog=(pid,si)=>{const plots=data.garden.plots.map(p=>{if(p.id===pid){const st=[...p.steps];st[si]={...st[si],done:!st[si].done};return{...p,steps:st};}return p;});setData({...data,garden:{plots}});};
  const harv=(plot)=>{
    const c=CROP_MAP.get(plot.crop);
    // Use stored expectedYieldKg (plants * per-plant yield), fall back to single-plant yield
    const qty = plot.expectedYieldKg || (plot.plantCount && c ? plot.plantCount * (c.yld||3) : c?.cat==="Herb"?0.5:c?.cat==="Grain"?5:c?.yld||3);
    const item={id:uid(),name:plot.crop,category:"Fresh Produce",qty,unit:"kg",source:"farm",addedDate:new Date().toISOString().slice(0,10),storageNote:c?.storage||""};
    setData({...data,garden:{plots:data.garden.plots.map(p=>p.id===plot.id?{...p,status:"harvested"}:p)},pantry:{items:[...data.pantry.items,item]},log:[...data.log,{text:`🧺 Harvested ${qty}kg ${plot.crop}`}]});
    setSelP(null);
  };
  const sp=data.garden.plots.find(p=>p.id===selP);
  const spC=sp?CROP_MAP.get(sp.crop):null;

  return (
    <div className="page-enter" style={{maxWidth:800}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div><h2 style={{fontFamily:F.head,fontSize:30,margin:0,letterSpacing:"-0.03em",fontWeight:800}}>🌱 Farming</h2><p style={{color:C.t2,fontSize:12.5,margin:"4px 0 0",fontWeight:500}}>Track your crops from seed to harvest</p></div>
        <Btn onClick={()=>setShowAdd(true)}>+ Plant Crop</Btn>
      </div>
      {(()=>{
        const active=data.garden.plots.filter(p=>p.status!=="harvested");
        const totalPlants=active.reduce((s,p)=>s+(p.plantCount||0),0);
        const totalArea=active.reduce((s,p)=>s+(p.measureType==="area"?+(p.qty||0):0),0);
        const totalYield=active.reduce((s,p)=>s+(p.expectedYieldKg||0),0);
        const ready=active.filter(p=>p.harvestDate&&new Date(p.harvestDate)<=new Date()).length;
        return (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:20}}>
            <Stat label="Active Crops" value={active.length}/>
            {totalPlants>0&&<Stat label="Total Plants" value={totalPlants} sub="across all beds"/>}
            {totalArea>0&&<Stat label="Total Area" value={`${totalArea.toFixed(0)}m²`} sub="under cultivation"/>}
            {totalYield>0&&<Stat label="Est. Yield" value={`${totalYield.toFixed(0)}kg`} sub="at harvest" color={C.green}/>}
            <Stat label="Ready" value={ready} sub="to harvest" color={C.orange}/>
          </div>
        );
      })()}
      {data.garden.plots.filter(p=>p.status!=="harvested").length===0?
        <Card style={{textAlign:"center",padding:"56px 24px",background:C.grdLight}}><div style={{fontSize:48,marginBottom:12,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.1))"}}>🌱</div><div style={{fontSize:15,fontWeight:700,color:C.text}}>Ready to grow?</div><div style={{color:C.t2,marginTop:6,fontSize:12.5,maxWidth:240,margin:"6px auto 0"}}>Tap "Plant Crop" to add your first seeds and start tracking</div></Card>:
      <div style={{display:"grid",gap:8}}>{data.garden.plots.filter(p=>p.status!=="harvested").map(p=>{
        const c=CROP_MAP.get(p.crop);
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
              <div style={{flex:1}}>
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

      {sp&&spC&&(
        <Overlay title={`${spC.emoji} ${sp.name||sp.crop}`} onClose={()=>setSelP(null)} wide>
          <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}><Pill>{sp.status}</Pill><Pill>☀ {spC.sun}</Pill><Pill>💧 {spC.waterFreq}</Pill>{sp.zone&&<Pill c={C.blue} bg="#e3f2fd">📍 {data.zones.find(z=>z.id===sp.zone)?.name}</Pill>}</div>
          {/* Quantity summary card */}
          {(sp.plantCount||sp.qty||sp.expectedYieldKg) && (
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(110px,1fr))",gap:8,marginBottom:14}}>
              {sp.plantCount&&<Card style={{background:"#e8f5e9",padding:"10px 14px"}}><div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase"}}>Plants</div><div style={{fontSize:20,fontWeight:700,color:C.green}}>{sp.plantCount}</div><div style={{fontSize:10,color:C.t2}}>estimated</div></Card>}
              {sp.qty&&sp.measureType==="area"&&<Card style={{background:"#e3f2fd",padding:"10px 14px"}}><div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase"}}>Area</div><div style={{fontSize:20,fontWeight:700,color:C.blue}}>{sp.qty}m²</div><div style={{fontSize:10,color:C.t2}}>bed size</div></Card>}
              {sp.qty&&sp.measureType==="plants"&&<Card style={{background:"#e3f2fd",padding:"10px 14px"}}><div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase"}}>Count</div><div style={{fontSize:20,fontWeight:700,color:C.blue}}>{sp.qty}</div><div style={{fontSize:10,color:C.t2}}>plants</div></Card>}
              {sp.expectedYieldKg&&<Card style={{background:"#fff3e0",padding:"10px 14px"}}><div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase"}}>Est. Yield</div><div style={{fontSize:20,fontWeight:700,color:C.orange}}>~{sp.expectedYieldKg}kg</div><div style={{fontSize:10,color:C.t2}}>at harvest</div></Card>}
              {sp.plantCount&&(() => {const c2=CROP_MAP.get(sp.crop);const space=c2?.spacing;return space?<Card style={{background:"#f3e5f5",padding:"10px 14px"}}><div style={{fontSize:10,fontWeight:700,color:C.t2,textTransform:"uppercase"}}>Spacing</div><div style={{fontSize:20,fontWeight:700,color:"#7b1fa2"}}>{space}cm</div><div style={{fontSize:10,color:C.t2}}>between plants</div></Card>:null;})()}
            </div>
          )}

          {/* Zone space for this plot */}
          {sp.zone && (() => {
            const z = data.zones.find(z => z.id === sp.zone);
            if (!z) return null;
            const spStats = zoneSpace[z.id];
            if (!spStats || spStats.totalM2 === 0) return null;
            const myArea = plotAreaM2(sp);
            const fillColor = spStats.pct >= 0.95 ? C.red : spStats.pct >= 0.7 ? C.orange : C.green;
            return (
              <Card style={{marginBottom:12, background: spStats.pct >= 0.95 ? "#fff5f5" : spStats.pct >= 0.7 ? "#fffde7" : "#f0faf0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <div style={{fontSize:12,fontWeight:700,color:fillColor}}>
                    {spStats.pct >= 0.95 ? "🔴 Zone Full" : spStats.pct >= 0.7 ? "🟡 Zone Getting Full" : "🟢 Zone Space"}
                  </div>
                  <div style={{fontSize:11,color:C.t2,fontFamily:F.mono}}>{z.name}</div>
                </div>
                {/* Progress bar */}
                <div style={{height:8,borderRadius:4,background:C.bdr,overflow:"hidden",marginBottom:6}}>
                  <div style={{height:"100%",width:`${Math.min(100,spStats.pct*100).toFixed(0)}%`,background:fillColor,borderRadius:4,transition:"width .4s"}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.t2}}>
                  <span>Used: <strong style={{color:C.text}}>{spStats.usedM2}m²</strong></span>
                  {myArea > 0 && <span>This crop: <strong style={{color:fillColor}}>{Math.round(myArea*10)/10}m²</strong></span>}
                  <span>Free: <strong style={{color:fillColor}}>{spStats.freeM2}m²</strong> of {spStats.totalM2.toFixed(0)}m²</span>
                </div>
              </Card>
            );
          })()}

          {/* Companion */}
          {sp.zone && (() => {
            const zp = data.garden.plots.filter(p => p.zone === sp.zone && p.status !== "harvested" && p.id !== sp.id).map(p => p.crop);
            const co = COMP[sp.crop];
            if (!co || zp.length === 0) return null;
            const good = zp.filter(n => co.good.includes(n));
            const bad = zp.filter(n => co.bad.includes(n));
            return (good.length > 0 || bad.length > 0) ? (
              <Card style={{marginBottom:12,background:bad.length>0?"#fff5f5":"#f0faf0"}}>
                <div style={{fontSize:12,fontWeight:700,color:C.green}}>🌱 Companions in zone</div>
                {good.length>0&&<div style={{fontSize:12,color:C.green,marginTop:4}}>✓ Good: {good.join(", ")}</div>}
                {bad.length>0&&<div style={{fontSize:12,color:C.red,marginTop:4}}>✕ Bad: {bad.join(", ")}</div>}
              </Card>
            ) : null;
          })()}
          <WaterCard waterNote={spC.waterNote}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
            <Card><div style={{fontSize:11,color:C.t2,fontWeight:600}}>PLANTED</div><div style={{fontSize:15,fontWeight:700}}>{sp.plantDate||"—"}</div></Card>
            <Card><div style={{fontSize:11,color:C.t2,fontWeight:600}}>HARVEST</div><div style={{fontSize:15,fontWeight:700}}>{sp.harvestDate||"—"}</div></Card>
          </div>
          {(()=>{const a=sp.crop;return a?<><Card style={{marginBottom:12,background:"#f0f7f4",border:"1px solid #c8e6c9"}}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}><span style={{fontSize:13,fontWeight:700,color:C.green}}>🌱 Crop Data</span>{a.pH&&<Pill c="#6d4c41" bg="#efebe9">pH {a.pH}</Pill>}</div></Card>{a.fert&&<Card style={{marginBottom:12,background:"#e8f5e9"}}><div style={{fontSize:12,fontWeight:700,color:C.green}}>🧪 Fertilizer Schedule</div><div style={{fontSize:12,marginTop:4,lineHeight:1.5}}>{a.fert}</div></Card>}{a.pests?.length>0&&<Card style={{marginBottom:12,background:"#fff3e0"}}><div style={{fontSize:12,fontWeight:700,color:C.orange}}>🐛 Pests & Solutions</div>{a.pests.slice(0,3).map((p,i)=><div key={i} style={{marginTop:4}}><strong style={{fontSize:11}}>{p.n}</strong>{p.t&&<div style={{fontSize:11,color:C.t2}}>→ {p.t}</div>}</div>)}</Card>}</>:null})()}
          <StepChecklist steps={sp.steps} plantDate={sp.plantDate} onToggle={tog} plotId={sp.id}/>
          <StorageCard storage={spC.storage}/>
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(spC.name+" growing guide complete")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#ff0000",textDecoration:"none",fontWeight:600,padding:"8px 14px",background:"#fff5f5",borderRadius:C.rs,border:"1px solid #ffcdd2",marginBottom:12}}>▶ Watch: Complete {spC.name} Growing Guide</a>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="danger" sm onClick={()=>del(sp.id)}>Delete</Btn>{sp.status!=="harvested"&&sp.harvestDate&&new Date(sp.harvestDate)<=new Date()&&<Btn v="success" onClick={()=>harv(sp)}>🧺 Harvest</Btn>}</div>
        </Overlay>
      )}

      {showAdd&&(
        <Overlay title="🌱 Plant a Crop" onClose={()=>setShowAdd(false)}>
          <Sel label="Crop" value={form.crop} onChange={e=>setForm({...form,crop:e.target.value,variety:""})} options={[{value:"",label:"Choose..."},...CROPS.map(c=>({value:c.name,label:`${c.emoji} ${c.name} — ${c.cat}`}))]}/>
          {ci && VARIETIES[ci.name] && VARIETIES[ci.name].length > 0 && (
            <Sel label="Variety / Breed" value={form.variety} onChange={e=>setForm({...form,variety:e.target.value})} options={[{value:"",label:"— Any / General —"},...VARIETIES[ci.name].map(v=>({value:v.name,label:`${v.name} — ${v.note.slice(0,50)}`}))]}/>
          )}
          {vi && <Card style={{marginBottom:10,background:"#e8f5e9",padding:12}}><div style={{fontSize:12,fontWeight:700,color:C.green}}>🧬 {vi.name}</div><div style={{fontSize:12,marginTop:4}}>{vi.note}</div>{vi.days!==ci.days&&<div style={{fontSize:11,color:C.gl,marginTop:2}}>Adjusted harvest: ~{vi.days} days (vs {ci.days} general)</div>}</Card>}
          {ci&&<Card style={{marginBottom:14,background:C.gp}}><div style={{fontSize:13}}>Harvest ~<strong>{effectiveDays}d</strong> · {ci.waterFreq} · {ci.sun} · {ci.spacing}cm</div>{COMP[ci.name]&&<div style={{fontSize:12,color:C.gl,marginTop:4}}>✓ Good with: {COMP[ci.name].good.join(", ")}{COMP[ci.name].bad.length>0?` · ✕ Bad: ${COMP[ci.name].bad.join(", ")}`:""}</div>}</Card>}
          {vegZ.length>0&&(
            <div style={{marginBottom:12}}>
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
              {form.zone && (() => {
                const z = vegZ.find(z=>z.id===form.zone);
                if (!z) return null;
                const sp = zoneSpace[z.id];
                if (!sp || sp.totalM2 === 0) return null;
                const fillColor = sp.pct>=0.95?C.red:sp.pct>=0.7?C.orange:C.green;
                return (
                  <div style={{marginTop:6}}>
                    <div style={{height:4,borderRadius:2,background:C.bdr,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.min(100,sp.pct*100).toFixed(0)}%`,background:fillColor,borderRadius:2}}/>
                    </div>
                    <div style={{fontSize:11,color:fillColor,marginTop:3,fontWeight:600}}>
                      {sp.pct>=0.95?"⚠ Zone full — consider another zone or expand this zone"
                        :`${sp.freeM2}m² available in this zone`}
                    </div>
                  </div>
                );
              })()}
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
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
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
                  {ci.spacing&&<div style={{fontSize:11,color:C.t2}}>Spacing: {ci.spacing}cm</div>}
                </div>
              </div>
            </div>
          )}

          <Inp label="Name (optional)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <Inp label="Plant Date" type="date" value={form.plantDate} onChange={e=>setForm({...form,plantDate:e.target.value})}/>
          {form.plantDate&&ci&&<div style={{fontSize:12,color:C.green,marginBottom:10}}>🧺 Harvest: {autoH()}</div>}
          <Inp label="Seed Cost (€)" type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add} dis={!form.crop}>Plant</Btn></div>
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
    const nd={...data,livestock:{animals:[...data.livestock.animals,{...form,id:uid(),count:+form.count||1}]},log:[...data.log,{text:`🐄 Added ${form.count} ${form.type}${form.breed?` (${form.breed})`:""}`}]};
    if(form.cost&&+form.cost>0)nd.costs={items:[...(data.costs?.items||[]),{id:uid(),type:"expense",amount:+form.cost,label:`${form.type}${form.breed?` ${form.breed}`:""}`,date:new Date().toISOString().slice(0,10),cat:"Animals"}]};
    setData(nd);setForm({name:"",type:"Chicken",breed:"",count:"1",cost:""});setShowAdd(false);
  };
  const del=id=>{setData({...data,livestock:{animals:data.livestock.animals.filter(a=>a.id!==id)}});setSel(null);};

  const doCollect=(animal, produce, qty)=>{
    const db=LDB[animal.type];if(!db)return;
    const p=db.out[produce];if(!p)return;
    const finalQty = qty > 0 ? qty : Math.round(p.p*animal.count*10)/10;
    setData({...data,
      pantry:{items:[...data.pantry.items,{id:uid(),name:`${animal.type} ${produce}`,category:produce==="Eggs"?"Eggs":produce==="Meat"?"Meat":"Dairy",qty:finalQty,unit:produce==="Eggs"?"eggs":"kg",source:"livestock",addedDate:new Date().toISOString().slice(0,10),storageNote:p.s}]},
      log:[...data.log,{text:`Collected ${finalQty} ${produce==="Eggs"?"eggs":produce.toLowerCase()} from ${animal.name||animal.type}`}]
    });
    setShowCollect(null);setCollectQty("");
  };

  const kill=a=>{const db=LDB[a.type];if(!db)return;const q=+kQ||1;if(q>a.count)return;const mp=db.out.Meat;if(!mp)return;const mq=Math.round(mp.p*q*10)/10;setData({...data,livestock:{animals:data.livestock.animals.map(x=>x.id===a.id?(x.count-q<=0?null:{...x,count:x.count-q}):x).filter(Boolean)},pantry:{items:[...data.pantry.items,{id:uid(),name:`${a.type} Meat`,category:"Meat",qty:mq,unit:"kg",source:"livestock",addedDate:new Date().toISOString().slice(0,10),storageNote:mp.s}]},log:[...data.log,{text:`🔪 ${q} ${a.type} → ${mq}kg`}]});setShowK(null);};
  const sa=sel?data.livestock.animals.find(a=>a.id===sel):null;const saDB=sa?LDB[sa.type]:null;

  return (
    <div className="page-enter" style={{maxWidth:800}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><div><h2 style={{fontFamily:F.head,fontSize:30,margin:0,letterSpacing:"-0.03em",fontWeight:800}}>🐄 Livestock</h2><p style={{color:C.t2,fontSize:12.5,margin:"4px 0 0",fontWeight:500}}>Manage your animals, collect produce, track care</p></div><Btn onClick={()=>setShowAdd(true)}>+ Add</Btn></div>
      <Stat label="Total" value={data.livestock.animals.reduce((s,a)=>s+a.count,0)}/>
      <div style={{marginTop:16,display:"grid",gap:8}}>{data.livestock.animals.length===0?<Card style={{textAlign:"center",padding:"56px 24px",background:C.grdLight}}><div style={{fontSize:48,marginBottom:12,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.1))"}}>🐄</div><div style={{fontSize:15,fontWeight:700,color:C.text}}>No animals yet</div><div style={{color:C.t2,marginTop:6,fontSize:12.5}}>Add chickens, goats, or any livestock to track them</div></Card>:data.livestock.animals.map(a=>{const db=LDB[a.type];return (
        <Card key={a.id}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setSel(a.id)}>
            <span style={{fontSize:28}}>{db?.e}</span><div><strong style={{fontSize:15}}>{a.name||a.type}</strong>{a.breed?<span style={{fontSize:12,color:C.t2}}> ({a.breed})</span>:null}<div style={{fontSize:12,color:C.t2}}>×{a.count} · Tap for guide</div></div>
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
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="secondary" onClick={()=>setShowCollect(null)}>Cancel</Btn>
          <Btn v="success" onClick={()=>doCollect(showCollect.animal,showCollect.produce,+collectQty||0)}>Collect → Pantry</Btn>
        </div>
      </Overlay>}

      {/* Care Guide */}
      {sa&&saDB&&<Overlay title={`${saDB.e} ${sa.name||sa.type} Care Guide`} onClose={()=>setSel(null)} wide>
        <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}><Pill>×{sa.count} head</Pill>{sa.breed&&<Pill c={C.blue} bg="#e3f2fd">{sa.breed}</Pill>}{saDB.prod.map(p=><Pill key={p} c={C.green} bg={C.gp}>{p}</Pill>)}</div>
        {sa.breed && (() => { const bi = (BREEDS[sa.type]||[]).find(b => b.name === sa.breed); return bi ? <Card style={{marginBottom:8,background:"#e3f2fd"}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>🧬 Breed: {bi.name}</div><div style={{fontSize:13,marginTop:4}}>{bi.note}</div>{bi.eggs&&<div style={{fontSize:12,color:C.green,marginTop:2}}>Egg production: ~{bi.eggs} eggs/day per hen</div>}</Card> : null; })()}
        {[{i:"🍽",t:"Feeding",v:saDB.feed,q:`${sa.type} ${sa.breed||""} feeding guide homestead`},{i:"🏠",t:"Housing",v:saDB.house,q:`${sa.type} housing coop barn build`},{i:"😴",t:"Sleeping",v:saDB.sleep,q:`${sa.type} sleeping arrangement farm`},{i:"💕",t:"Breeding",v:saDB.breed,q:`${sa.type} ${sa.breed||""} breeding guide`}].map(s=><Card key={s.t} style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.green}}>{s.i} {s.t}</div><div style={{fontSize:13,lineHeight:1.7,marginTop:4}}>{s.v}</div></Card>)}
        <Card style={{background:"#fce4ec",marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.red}}>🩹 Injuries & Treatment</div>{saDB.inj.map((j,i)=><div key={i} style={{marginTop:8}}><strong style={{fontSize:13}}>{j.n}</strong><div style={{fontSize:12,color:C.t2,marginTop:2}}>{j.t}</div></div>)}</Card>
        <Card style={{marginBottom:8,background:"#e8f5e9"}}><div style={{fontSize:12,fontWeight:700,color:C.green}}>📦 Produce & Storage</div>{Object.entries(saDB.out).map(([k,v])=><div key={k} style={{marginTop:6}}><strong style={{fontSize:12}}>{k}</strong>: ~{v.p} {v.u}<div style={{fontSize:11,color:C.t2}}>{v.s}</div></div>)}</Card>
        <Btn v="danger" sm onClick={()=>del(sa.id)}>Remove</Btn>
      </Overlay>}

      {/* Process/Kill Modal */}
      {showK&&<Overlay title={`🔪 Process ${showK.name||showK.type}`} onClose={()=>setShowK(null)}>
        <Inp label={`Qty (max ${showK.count})`} type="number" min="1" max={showK.count} value={kQ} onChange={e=>setKQ(e.target.value)}/>
        {LDB[showK.type]?.out.Meat&&<div style={{fontSize:13,marginBottom:12}}>Estimated: <strong>{Math.round(LDB[showK.type].out.Meat.p*(+kQ||1)*10)/10}kg</strong> meat</div>}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setShowK(null)}>Cancel</Btn><Btn v="danger" onClick={()=>kill(showK)}>Process</Btn></div>
      </Overlay>}

      {/* Add Animal Modal — with breed dropdown */}
      {showAdd&&<Overlay title="🐄 Add Animal" onClose={()=>setShowAdd(false)}>
        <Sel label="Animal Type" value={form.type} onChange={e=>setForm({...form,type:e.target.value,breed:""})} options={Object.entries(LDB).map(([k,v])=>({value:k,label:`${v.e} ${k} — ${v.prod.join(", ")}`}))}/>
        {breedOptions.length > 0 && (
          <Sel label="Breed" value={form.breed} onChange={e=>setForm({...form,breed:e.target.value})} options={[{value:"",label:"— Select breed —"},...breedOptions.map(b=>({value:b.name,label:b.name}))]}/>
        )}
        {selectedBreed && <Card style={{marginBottom:12,background:"#e8f5e9",padding:12}}><div style={{fontSize:12,fontWeight:700,color:C.green}}>🧬 {selectedBreed.name}</div><div style={{fontSize:12,marginTop:4}}>{selectedBreed.note}</div></Card>}
        <Inp label="Name / Label" placeholder="e.g. Layer Flock A" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Inp label="Count" type="number" min="1" value={form.count} onChange={e=>setForm({...form,count:e.target.value})}/>
          <Inp label="Cost (€)" type="number" value={form.cost} onChange={e=>setForm({...form,cost:e.target.value})}/>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></div>
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
  const eat=(item,q)=>{setData({...data,pantry:{items:data.pantry.items.map(i=>i.id===item.id?(i.qty-q<=0?null:{...i,qty:Math.round((i.qty-q)*10)/10}):i).filter(Boolean)},log:[...data.log,{text:`Ate ${q}${item.unit} ${item.name}`}]});};
  const cats=["All","Fresh Produce","Meat","Eggs","Dairy","Preserved","Grain","Other"];
  const fil=cat==="All"?data.pantry.items:data.pantry.items.filter(i=>i.category===cat);
  const itemIcon = (item) => {
    if (item.source === "farm") {
      const crop = CROP_MAP.get(item.name);
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
    <div className="page-enter" style={{maxWidth:800}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}><div><h2 style={{fontFamily:F.head,fontSize:30,margin:0,letterSpacing:"-0.03em",fontWeight:800}}>📦 Pantry</h2><p style={{color:C.t2,fontSize:12.5,margin:"4px 0 0",fontWeight:500}}>Everything you've harvested and stored</p></div><Btn v="secondary" onClick={()=>setShowAdd(true)}>+ Manual</Btn></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:10,marginBottom:16}}>
        <Stat label="Items" value={data.pantry.items.length}/><Stat label="kg" value={Math.round(data.pantry.items.filter(i=>i.unit==="kg").reduce((s,i)=>s+i.qty,0))}/>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>{cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{padding:"6px 14px",borderRadius:20,border:"none",background:cat===c?C.green:C.card,color:cat===c?"#fff":C.t2,fontSize:12,fontWeight:600,cursor:"pointer",boxShadow:cat===c?"none":C.sh}}>{c}</button>)}</div>
      {fil.length===0?<Card style={{textAlign:"center",padding:"56px 24px",background:C.grdWarm}}><div style={{fontSize:48,marginBottom:12,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.1))"}}>📦</div><div style={{fontSize:15,fontWeight:700,color:C.text}}>Pantry is empty</div><div style={{color:C.t2,marginTop:6,fontSize:12.5}}>Harvest crops or collect produce to stock up</div></Card>:
      <div style={{display:"grid",gap:6}}>{fil.map(item=>(
        <Card key={item.id}><div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>{itemIcon(item)}</span>
          <div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}><strong style={{fontSize:14}}>{item.name}</strong><Pill>{item.category}</Pill><span style={{fontSize:15,fontWeight:700}}>{item.qty} {item.unit}</span></div>
          {item.storageNote&&<div style={{fontSize:11,color:C.t2,marginTop:2}}>💡 {item.storageNote.slice(0,80)}</div>}</div>
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
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="secondary" onClick={()=>setShowEat(null)}>Cancel</Btn>
          <Btn v="success" dis={!eatQty||+eatQty<=0||+eatQty>showEat.qty} onClick={()=>{eat(showEat,+eatQty);setShowEat(null)}}>Take {eatQty} {showEat.unit}</Btn>
        </div>
      </Overlay>}

      {showAdd&&<Overlay title="Add Item" onClose={()=>setShowAdd(false)}>
        <Inp label="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <Sel label="Category" options={["Fresh Produce","Meat","Eggs","Dairy","Preserved","Grain","Other"]} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}><Inp label="Qty" type="number" value={form.qty} onChange={e=>setForm({...form,qty:e.target.value})}/><Sel label="Unit" options={["kg","lbs","L","units","eggs","jars"]} value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}/></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></div>
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
  const add=()=>{if(!form.amount||!form.label)return;setData({...data,costs:{items:[...items,{...form,id:uid(),amount:+form.amount}]}});setForm({type:"expense",amount:"",label:"",cat:"Seeds",date:new Date().toISOString().slice(0,10)});setShowAdd(false);};
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
    <div className="page-enter" style={{maxWidth:800}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div><h2 style={{fontFamily:F.head,fontSize:30,margin:0,letterSpacing:"-0.03em",fontWeight:800}}>💰 Financials</h2><p style={{color:C.t2,fontSize:12.5,margin:"4px 0 0",fontWeight:500}}>Income, expenses, and profitability</p></div>
        <Btn onClick={()=>setShowAdd(true)}>+ Add Entry</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:20}}>
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
        <Card key={i.id}><div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:18,background:i.type==="expense"?"#fce4ec":"#e8f5e9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{i.type==="expense"?"📤":"📥"}</div>
          <div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{i.label}</div><div style={{fontSize:12,color:C.t2}}>{i.date} {" "} {i.cat}</div></div>
          <div style={{fontSize:16,fontWeight:700,color:i.type==="expense"?C.red:C.green,fontFamily:F.mono}}>{i.type==="expense"?"-":"+"}{E}{i.amount.toFixed(2)}</div>
          <Btn sm v="ghost" onClick={()=>del(i.id)}>🗑</Btn>
        </div></Card>
      ))}</div>}
      {showAdd&&<Overlay title="Add Entry" onClose={()=>setShowAdd(false)}>
        <div style={{display:"flex",gap:8,marginBottom:14}}>{["expense","income"].map(t=><Card key={t} onClick={()=>setForm({...form,type:t})} active={form.type===t} style={{flex:1,textAlign:"center",cursor:"pointer"}}><div style={{fontSize:20}}>{t==="expense"?"📤":"📥"}</div><div style={{fontSize:13,fontWeight:600,marginTop:4}}>{t==="expense"?"Expense":"Income"}</div></Card>)}</div>
        <Inp label="Amount" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/>
        <Inp label="Description" value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><Sel label="Category" value={form.cat} onChange={e=>setForm({...form,cat:e.target.value})} options={["Seeds","Tools","Feed","Animals","Fuel","Infrastructure","Produce Sales","Other"]}/><Inp label="Date" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><Btn v="secondary" onClick={()=>setShowAdd(false)}>Cancel</Btn><Btn onClick={add}>Add</Btn></div>
      </Overlay>}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════ */
function Dashboard({data, setData, setPage, tasks}) {
  const [selZone,setSelZone]=useState(null);
  const [zoomedZone,setZoomedZone]=useState(null);
  const [expCrop,setExpCrop]=useState(null);
  const [expAnimal,setExpAnimal]=useState(null);
  const [wide,setWide]=useState(typeof window!=="undefined"&&window.innerWidth>=800);
  useEffect(()=>{const h=()=>setWide(window.innerWidth>=800);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  const totalKg=data.pantry.items.filter(i=>i.unit==="kg").reduce((s,i)=>s+i.qty,0);
  const costs=data.costs?.items||[];
  const {exp,inc}=useMemo(()=>{let e=0,r=0;costs.forEach(i=>i.type==="expense"?e+=i.amount:r+=i.amount);return{exp:e,inc:r};},[costs]);
  const zoneSpace = useMemo(() => buildZoneSpaceMap(data.zones, data.garden.plots, data.farmW||100, data.farmH||60), [data.zones, data.garden.plots, data.farmW, data.farmH]);

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
        const crop = CROP_MAP.get(p.crop);
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
      const crop = CROP_MAP.get(p.crop);
      if (!crop) return false;
      const harvestDate = new Date(p.plantDate).getTime() + crop.days * 864e5;
      return harvestDate - now <= 7 * 864e5;
    }).length;
    const harvestPct = activePlots.length > 0 ? readyCount / activePlots.length : 0;

    return { taskPct, growPct, harvestPct, doneSteps: doneSteps.length, totalSteps: allSteps.length, plantedCount, readyCount };
  }, [activePlots, data.zones]);

  // All three rings closed?
  const allRingsClosed = ringData.taskPct >= 1 && ringData.growPct >= 1 && ringData.harvestPct >= 1;

  return (
    <div className="page-enter" style={{maxWidth:1100}}>
      {/* ── Morning Dashboard Header ── */}
      {(()=>{
        const ap2 = data.garden.plots.filter(p=>p.status!=="harvested");
        const fp = ap2.reduce((s,p)=>s+(p.plantCount||0),0);
        const fa = ap2.reduce((s,p)=>s+(p.measureType==="area"?+(p.qty||0):0),0);
        const fy = ap2.reduce((s,p)=>s+(p.expectedYieldKg||0),0);
        const ac2 = data.livestock.animals.reduce((s,a)=>s+a.count,0);
        const urgentTasks = enrichedTasks.filter(t=>t.pri<=1).length;
        const readyToHarvest = ap2.filter(p => {
          if (!p.plantDate) return false;
          const crop = CROP_MAP.get(p.crop);
          if (!crop) return false;
          return (Date.now() - new Date(p.plantDate).getTime()) >= crop.days * 864e5;
        });
        const netVal = inc - exp;
        return (
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
              <div style={{flex:1}}>
                <h2 style={{fontFamily:F.head,fontSize:24,margin:0,letterSpacing:"-0.03em",fontWeight:800,color:C.text}}>Your Homestead</h2>
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
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {/* TODAY'S WORK */}
              <Card style={{padding:"14px 16px",background:urgentTasks>0?"linear-gradient(135deg,#fff5f5,#ffe8e8)":"linear-gradient(135deg,#f0faf0,#e8f5e8)",border:urgentTasks>0?`1px solid rgba(220,60,60,.12)`:`1px solid rgba(45,106,79,.08)`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.04em"}}>Today's Work</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:urgentTasks>0?C.red:C.text,lineHeight:1,marginTop:4}}>{enrichedTasks.length}</div>
                <div style={{fontSize:11,color:C.t2,marginTop:4}}>
                  {urgentTasks > 0 ? <span style={{color:C.red,fontWeight:700}}>{urgentTasks} urgent</span> : "tasks pending"}
                </div>
                <div style={{fontSize:10,color:C.t3,marginTop:2}}>
                  <span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:"#34c759",marginRight:4}}/>{ringData.doneSteps}/{ringData.totalSteps} done
                </div>
              </Card>

              {/* CROPS */}
              <Card style={{padding:"14px 16px",background:"linear-gradient(135deg,#f5fbf0,#edf5e5)",border:"1px solid rgba(45,106,79,.08)"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.04em"}}>Crops</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:C.text,lineHeight:1,marginTop:4}}>{ap2.length}</div>
                <div style={{fontSize:11,color:C.t2,marginTop:4}}>
                  <span style={{display:"inline-block",width:6,height:6,borderRadius:3,background:C.blue,marginRight:4}}/>{ringData.plantedCount} growing
                </div>
                {readyToHarvest.length > 0 && (
                  <div style={{fontSize:10,color:C.orange,fontWeight:700,marginTop:2}}>🌾 {readyToHarvest.length} ready to harvest!</div>
                )}
                {readyToHarvest.length === 0 && fa > 0 && (
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>{fa.toFixed(0)}m² cultivated</div>
                )}
              </Card>

              {/* FARM */}
              <Card style={{padding:"14px 16px",background:"linear-gradient(135deg,#f8faf5,#f0f4eb)",border:"1px solid rgba(45,106,79,.08)"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.04em"}}>Farm</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:C.text,lineHeight:1,marginTop:4}}>{data.zones.length}</div>
                <div style={{fontSize:11,color:C.t2,marginTop:4}}>zones · {ac2} animals</div>
                {fy > 0 && <div style={{fontSize:10,color:C.green,fontWeight:600,marginTop:2}}>Est. yield {fy.toFixed(0)}kg</div>}
                {fp > 0 && <div style={{fontSize:10,color:C.t3,marginTop:1}}>{fp.toLocaleString()} plants total</div>}
              </Card>

              {/* MONEY */}
              <Card style={{padding:"14px 16px",background:netVal>=0?"linear-gradient(135deg,#f0faf5,#e5f5ed)":"linear-gradient(135deg,#fdf5f5,#f5eaea)",border:netVal>=0?`1px solid rgba(45,106,79,.08)`:`1px solid rgba(220,60,60,.08)`}}>
                <div style={{fontSize:10,fontWeight:700,color:C.t3,textTransform:"uppercase",letterSpacing:"0.04em"}}>Money</div>
                <div style={{fontSize:28,fontWeight:800,fontFamily:F.head,color:netVal>=0?C.green:C.red,lineHeight:1,marginTop:4}}>€{netVal.toFixed(0)}</div>
                <div style={{fontSize:11,color:C.t2,marginTop:4}}>
                  {inc > 0 && <span style={{color:C.green}}>+€{inc.toFixed(0)}</span>}
                  {inc > 0 && exp > 0 && " / "}
                  {exp > 0 && <span style={{color:C.red}}>-€{exp.toFixed(0)}</span>}
                  {inc === 0 && exp === 0 && "no transactions"}
                </div>
                <div style={{fontSize:10,color:C.t3,marginTop:2}}>Pantry: {Math.round(totalKg)}kg stored</div>
              </Card>
            </div>
          </div>
        );
      })()}

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
              return (
                <div key={i}
                  onClick={() => { if (t.zoneId) setSelZone(t.zoneId); }}
                  style={{
                    display:"grid",gridTemplateColumns:"auto 1fr auto",gap:10,alignItems:"center",
                    padding:"10px 12px",marginBottom:4,
                    border:`1px solid ${isActive ? C.gm : C.bdr}`,
                    borderRadius:12,background:isActive ? "#f0faf0" : "#fcfdfb",
                    cursor:t.zoneId?"pointer":"default",
                    transition:"all .15s"
                  }}>
                  <span style={{width:9,height:9,borderRadius:"50%",background:priColor(t.pri),flexShrink:0}}/>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.emoji} {t.title}</div>
                    <div style={{fontSize:11,color:C.t2,marginTop:1}}>{t.loc}{t.daysOut > 0 ? ` · in ${t.daysOut}d` : t.daysOut === 0 && t.type !== "water" ? " · now" : ""}</div>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexShrink:0}}>
                    {t.stepIdx != null && <button onClick={e=>{e.stopPropagation();togStep(t.plotId,t.stepIdx);}} style={{background:C.green,color:"#fff",border:"none",borderRadius:6,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Done</button>}
                    {t.type==="harvest" && <button onClick={e=>{e.stopPropagation();setPage("farm");}} style={{background:C.orange,color:"#fff",border:"none",borderRadius:6,padding:"3px 7px",fontSize:10,fontWeight:700,cursor:"pointer"}}>Harvest</button>}
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
            <Card p={false} style={{overflow:"hidden"}}>
              <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{fontSize:14,fontWeight:800,fontFamily:F.head}}>
                  {azData ? `${azData.zt?.icon || ""} ${azData.zone.name}` : "Select a zone"}
                </div>
                {azData && (()=>{
                  const ss = statusStyle(azData.status);
                  return <span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:ss.bg,color:ss.color}}>{azData.status}</span>;
                })()}
              </div>

              {azData ? (
                <div style={{padding:14}}>
                  {/* Metrics row */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginBottom:14}}>
                    <div style={{border:`1px solid ${C.bdr}`,borderRadius:12,padding:"10px 12px",background:"#fff"}}>
                      <div style={{fontSize:11,color:C.t2,fontWeight:600}}>Task Load</div>
                      <div style={{fontSize:22,fontWeight:800,fontFamily:F.head}}>{azData.taskCount}</div>
                      {azData.urgentCount > 0 && <div style={{fontSize:10,color:C.red,fontWeight:600,marginTop:2}}>{azData.urgentCount} urgent</div>}
                    </div>
                    <div style={{border:`1px solid ${C.bdr}`,borderRadius:12,padding:"10px 12px",background:"#fff"}}>
                      <div style={{fontSize:11,color:C.t2,fontWeight:600}}>{azData.isAnimal ? "Animals" : "Est. Yield"}</div>
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
                  <div style={{fontSize:13}}>Click a task or zone to inspect</div>
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
                const MINI_CROP_COLORS = [
                  {r:220,g:60,b:60},{r:60,g:160,b:60},{r:60,g:100,b:200},{r:200,g:160,b:30},
                  {r:160,g:60,b:180},{r:230,g:120,b:30},{r:40,g:180,b:170},{r:200,g:80,b:140},
                  {r:100,g:140,b:60},{r:80,g:80,b:180},{r:180,g:100,b:60},{r:60,g:180,b:100},
                ];
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
                        const crop = CROP_MAP.get(p.crop);
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
            {(()=>{
              const MINI_CC = [{r:220,g:60,b:60},{r:60,g:160,b:60},{r:60,g:100,b:200},{r:200,g:160,b:30},{r:160,g:60,b:180},{r:230,g:120,b:30},{r:40,g:180,b:170},{r:200,g:80,b:140}];
              const legendMap = new Map(); let li=0;
              data.garden.plots.filter(p=>p.status!=="harvested").forEach(p=>{
                if(!legendMap.has(p.crop)){legendMap.set(p.crop,MINI_CC[li%MINI_CC.length]);li++;}
              });
              if(legendMap.size===0) return null;
              return (
                <div style={{display:"flex",flexWrap:"wrap",gap:"4px 10px",padding:"6px 0 0",alignItems:"center"}}>
                  <span style={{fontSize:10,fontWeight:700,color:C.t2}}>Crops:</span>
                  {[...legendMap.entries()].map(([name,cc])=>(
                    <div key={name} style={{display:"flex",alignItems:"center",gap:3}}>
                      <div style={{width:8,height:8,borderRadius:2,background:`rgba(${cc.r},${cc.g},${cc.b},.55)`,boxShadow:`0 0 4px rgba(${cc.r},${cc.g},${cc.b},.3)`}}/>
                      <span style={{fontSize:10,color:C.t1}}>{name}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Stats row moved to header above */}

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
    </div>
  );
}


/* ═══════════════════════════════════════════
   ENCYCLOPEDIA
   ═══════════════════════════════════════════ */
function Manuals() {
  const [s,setS]=useState("");const [sel,setSel]=useState(null);const [tab,setTab]=useState("crops");
  const fil=CROPS.filter(c=>!s||c.name.toLowerCase().includes(s.toLowerCase()));
  const mn=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const TABS=[{id:"crops",l:"🌱 Crops"},{id:"animals",l:"🐄 Animals"},{id:"preserving",l:"🫙 Preserving"},{id:"projects",l:"🔨 Projects"}];
  return (
    <div className="page-enter" style={{maxWidth:960}}>
      <h2 style={{fontFamily:F.head,fontSize:30,margin:"0 0 4px",letterSpacing:"-0.03em",fontWeight:800}}>📖 Homestead Manuals</h2>
      <p style={{color:C.t2,fontSize:13,margin:"0 0 16px",fontWeight:500}}>Everything you need to know — crops, animals, preservation, and DIY builds</p>
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>{TABS.map(t=><button key={t.id} onClick={()=>{setTab(t.id);setSel(null);setS("");}} style={{padding:"8px 20px",borderRadius:20,border:"none",background:tab===t.id?C.green:C.card,color:tab===t.id?"#fff":C.t2,fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:tab===t.id?"none":C.sh}}>{t.l}</button>)}</div>

      {tab==="crops"&&<>
        <Inp placeholder="Search crops..." value={s} onChange={e=>setS(e.target.value)}/>
        <div style={{display:"grid",gap:6,marginTop:12}}>{fil.map(c=><Card key={c.name} onClick={()=>setSel(c)} style={{borderLeft:`4px solid ${c.color}`}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:24}}>{c.emoji}</span><div style={{flex:1}}><strong>{c.name}</strong> <Pill>{c.cat}</Pill><div style={{fontSize:12,color:C.t2,marginTop:2}}>{c.sowIn} · {c.harvest} · {c.days}d</div></div><span style={{color:C.t3}}>›</span></div></Card>)}</div>
        {sel&&<Overlay title={`${sel.emoji} ${sel.name}`} onClose={()=>setSel(null)} wide>
          {(()=>{const a=sel.name;return a?<div style={{background:"#f0f7f4",borderRadius:C.rs,padding:10,marginBottom:12,border:"1px solid #c8e6c9"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4}}><span style={{fontSize:13,fontWeight:700,color:C.green}}>🌱 Crop Data</span></div></div>:null})()}
          <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}><Pill c="#fff" bg={sel.color}>{sel.cat}</Pill><Pill>☀ {sel.sun}</Pill><Pill>💧 {sel.waterFreq}</Pill>{(()=>{sel?.pH?<Pill c="#6d4c41" bg="#efebe9">pH {sel.pH}</Pill>:null})()}</div>
          <div style={{marginBottom:16}}><div style={{fontSize:11,fontFamily:F.mono,color:C.t2,marginBottom:4}}>CALENDAR</div><div style={{display:"flex",gap:2}}>{mn.map(m=>{const iS=sel.sowIn.toLowerCase().includes(m.toLowerCase());const iH=sel.harvest.toLowerCase().includes(m.toLowerCase());return <div key={m} style={{flex:1,textAlign:"center"}}><div style={{fontSize:8,color:C.t2,fontFamily:F.mono}}>{m}</div><div style={{height:14,borderRadius:3,background:iS&&iH?`linear-gradient(135deg,${C.green} 50%,${C.orange} 50%)`:iS?C.green:iH?C.orange:C.bdr,opacity:(iS||iH)?1:.25}}/></div>})}</div><div style={{display:"flex",gap:12,marginTop:4}}><span style={{fontSize:10,color:C.green}}>■ Sow</span><span style={{fontSize:10,color:C.orange}}>■ Harvest</span></div></div>
          {COMP[sel.name]&&<Card style={{marginBottom:12,background:"#e8f5e9"}}><div style={{fontSize:12,fontWeight:700,color:C.green}}>🌱 Companions</div><div style={{fontSize:12,marginTop:4}}>✓ {COMP[sel.name].good.join(", ")||"—"}{COMP[sel.name].bad.length>0?<span style={{color:C.red}}> · ✕ {COMP[sel.name].bad.join(", ")}</span>:""}</div></Card>}
          <Card style={{marginBottom:12,background:"#e3f2fd"}}><div style={{fontSize:12,fontWeight:700,color:C.blue}}>💧 Water</div><div style={{fontSize:13,marginTop:4}}>{sel.waterNote}</div></Card>
          {sel.steps?.length>0&&<div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:700,color:C.green,marginBottom:8}}>Step-by-Step Guide</div>{sel.steps.map((s,i)=><Card key={i} style={{marginBottom:4,padding:10}}><div style={{display:"flex",justifyContent:"space-between"}}><strong style={{fontSize:13}}>{s.l}</strong><span style={{fontSize:10,color:C.t2,fontFamily:F.mono}}>Day {s.d}</span></div><div style={{fontSize:12,color:C.t2,marginTop:2}}>{s.t}</div></Card>)}</div>}
          {(()=>{sel?.fert?<Card style={{marginBottom:12,background:"#e8f5e9"}}><div style={{fontSize:12,fontWeight:700,color:C.green}}>🧪 Fertilizer</div><div style={{fontSize:12,marginTop:4,lineHeight:1.6}}>{a.fert}</div></Card>:null})()}
          {(()=>{sel?.pests?.length>0?<Card style={{marginBottom:12,background:"#fff3e0"}}><div style={{fontSize:12,fontWeight:700,color:C.orange}}>🐛 Pests & Disease</div>{sel.pests.map((p,i)=><div key={i} style={{fontSize:12,marginTop:6}}><strong>{p.n}</strong>{p.t&&<div style={{fontSize:11,color:C.t2,marginTop:2}}>→ {p.t}</div>}</div>)}</Card>:null})()}
          {sel.storage&&<Card style={{marginBottom:12,background:"#fffde7"}}><div style={{fontSize:12,fontWeight:700,color:"#f57f17"}}>📦 Storage</div><div style={{fontSize:13,marginTop:4}}>{sel.storage}</div></Card>}
          <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(sel.name+" growing guide complete")}`} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#ff0000",textDecoration:"none",fontWeight:600,padding:"8px 14px",background:"#fff5f5",borderRadius:C.rs,border:"1px solid #ffcdd2",marginBottom:12}}>▶ Watch: Complete {sel.name} Growing Guide</a>
        </Overlay>}
      </>}

      {tab==="animals"&&<>
        <div style={{display:"grid",gap:8}}>{Object.entries(LDB).map(([n,db])=><Card key={n} onClick={()=>setSel({...db,name:n})} style={{cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:28}}>{db.e}</span><div style={{flex:1}}><strong style={{fontSize:15}}>{n}</strong><div style={{fontSize:12,color:C.t2}}>Produces: {db.prod.join(", ")}</div></div><span style={{color:C.t3}}>›</span></div></Card>)}</div>
        {sel?.feed&&<Overlay title={`${sel.e} ${sel.name}`} onClose={()=>setSel(null)} wide>
          {[{i:"🍽",t:"Feeding",v:sel.feed},{i:"🏠",t:"Housing",v:sel.house},{i:"😴",t:"Sleep",v:sel.sleep},{i:"💕",t:"Breeding",v:sel.breed}].map(s=><Card key={s.t} style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.green}}>{s.i} {s.t}</div><div style={{fontSize:13,lineHeight:1.7,marginTop:4}}>{s.v}</div></Card>)}
          <Card style={{background:"#fce4ec",marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.red}}>🩹 Injuries</div>{sel.inj.map((j,i)=><div key={i} style={{marginTop:6}}><strong>{j.n}</strong><div style={{fontSize:12,color:C.t2}}>{j.t}</div></div>)}</Card>
          {LIVESTOCK_CALENDAR[sel.name]&&<Card style={{marginBottom:8}}><div style={{fontSize:12,fontWeight:700,color:C.blue,marginBottom:8}}>📅 Monthly Calendar</div>{Object.entries(LIVESTOCK_CALENDAR[sel.name]).map(([m,t])=><div key={m} style={{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid #f0f0f0"}}><span style={{fontSize:11,fontWeight:700,color:C.green,width:28,flexShrink:0,fontFamily:F.mono}}>{m}</span><span style={{fontSize:11,color:C.t2,lineHeight:1.4}}>{t}</span></div>)}</Card>}
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
      <div style={{ fontSize: 13, lineHeight: 1.65, color: C.text }}>{children}</div>
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
              {sel.method.split(/(?=\d+\. |SUN DRYING:|DEHYDRATOR:|OVEN:|BLANCHING:|FRESH WHITE|RICOTTA:|EQUILIBRIUM|COLD SMOKING|REST:|WINE:|VINEGAR:|POTATOES:|CARROTS|ONIONS|CABBAGE:|SQUASH|APPLES:|SAFE ITEMS|UNSAFE)/).map((step, i) => (
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
                <div style={{ fontSize: 13, lineHeight: 1.65, color: C.text }}>{sel.tip}</div>
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
    CROPS.forEach(c => {
      const sowM = parseSowMonths(c.sowIn);
      const harM = parseHarvestMonths(c.harvest);
      const diff = getCropDifficulty(c.name);
      const planted = alreadyPlanted.includes(c.name);
      if (sowM.includes(month)) sow.push({...c, diff, planted, action: "sow"});
      if (harM.includes(month)) harvest.push({...c, diff, planted, action: "harvest"});
    });
    // Maintenance: crops planted that are growing during this month
    data.garden.plots.filter(p => p.status !== "harvested" && p.plantDate).forEach(p => {
      const crop = CROP_MAP.get(p.crop);
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
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:15,fontWeight:600}}>{c.name}</span>
            {c.planted && <Pill c={C.blue} bg="#e3f2fd">Already planted</Pill>}
          </div>
          <div style={{fontSize:12,color:C.t2,marginTop:2}}>{c.cat} · {c.days}d to harvest · {c.spacing}cm spacing</div>
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
    <div className="page-enter" style={{maxWidth:800}}>
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
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
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
        ? <Card style={{textAlign:"center",padding:"56px 24px",background:C.grdWarm}}><div style={{fontSize:48,marginBottom:12,filter:"drop-shadow(0 2px 4px rgba(0,0,0,.1))"}}>🌾</div><div style={{fontSize:15,fontWeight:700,color:C.text}}>Quiet month</div><div style={{color:C.t2,marginTop:6,fontSize:12.5}}>Nothing to {filter} in {MN_FULL[month]} — try a different filter</div></Card>
        : filtered.map(c => <CropRow key={c.name + c.action} c={c}/>)
      }

      {/* Maintenance section */}
      {filter === "sow" && results.maintain.length > 0 && (
        <div style={{marginTop:20}}>
          <div style={{fontSize:15,fontWeight:700,fontFamily:F.head,marginBottom:10}}>🔧 Maintenance Due This Month</div>
          {results.maintain.map((c, i) => (
            <Card key={i} style={{marginBottom:6,borderLeft:`3px solid ${C.blue}`}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:20}}>{c.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600}}>{c.plot.name || c.name}</div>
                  {c.pendingSteps.map((s,j) => <div key={j} style={{fontSize:12,color:C.t2,marginTop:2}}>→ {s.l}: {s.t}</div>)}
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
   BLUEPRINT DIAGRAMS — pure line SVGs
   No fill, no color, no animation. Just strokes + dimensions.
   ═══════════════════════════════════════════ */
const BP = {s:"#333",sl:"#888",sw:1.5,swl:0.7,ff:"'JetBrains Mono',monospace",fs:8,fsd:7};
function DimLine({x1,y1,x2,y2,label,offset=10,side="above"}) {
  const mx=(x1+x2)/2, my=(y1+y2)/2, vert=x1===x2;
  const ox=vert?(side==="left"?-offset:offset):0, oy=vert?0:(side==="above"?-offset:offset);
  return <g>
    <line x1={x1+ox} y1={y1+oy} x2={x2+ox} y2={y2+oy} stroke={BP.sl} strokeWidth={BP.swl}/>
    <line x1={x1} y1={y1} x2={x1+ox} y2={y1+oy} stroke={BP.sl} strokeWidth={BP.swl}/>
    <line x1={x2} y1={y2} x2={x2+ox} y2={y2+oy} stroke={BP.sl} strokeWidth={BP.swl}/>
    <text x={mx+ox} y={my+oy-(vert?0:3)} textAnchor="middle" fontSize={BP.fsd} fill={BP.sl} fontFamily={BP.ff}>{label}</text>
  </g>;
}
function StepPanel({x, y, n, label, children}) {
  return <g transform={`translate(${x},${y})`}>
    <rect x="0" y="0" width="185" height="110" rx="3" fill="none" stroke="#ddd" strokeWidth="0.5"/>
    <rect x="0" y="0" width="185" height="14" rx="3" fill="none" stroke="none"/>
    <text x="5" y="10" fontSize="7.5" fontWeight="700" fill="#555" fontFamily={BP.ff} stroke="none">STEP {n}</text>
    <text x="40" y="10" fontSize="6.5" fill="#999" fontFamily={BP.ff} stroke="none">{label}</text>
    <g transform="translate(0,14)">{children}</g>
  </g>;
}

function Blueprint({type}) {
  const wrap = (children, h=240) => (
    <div style={{background:"#fff",border:"1px solid #ddd",borderRadius:C.rs,padding:"12px",marginBottom:12}}>
      <div style={{fontSize:10,fontWeight:700,color:"#999",textTransform:"uppercase",letterSpacing:".06em",marginBottom:8}}>📐 Step-by-Step Blueprint</div>
      <svg viewBox={`0 0 390 ${h}`} style={{width:"100%",display:"block"}} fill="none" stroke={BP.s} strokeWidth={BP.sw} fontFamily={BP.ff}>
        <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={BP.sl}/></marker></defs>
        {children}
      </svg>
    </div>
  );

  if (type === "raised_bed") return wrap(<g>
    {/* Step 1: LEVEL — side view showing ground leveled, membrane laid */}
    <StepPanel x={0} y={0} n={1} label="Level ground + membrane">
      {/* Bumpy ground being flattened */}
      <polyline points="10,70 30,65 50,72 70,60 90,68 110,62 130,70 150,65 170,70" stroke={BP.sl} strokeWidth={BP.swl} strokeDasharray="3 2"/>
      <line x1="10" y1="75" x2="170" y2="75" strokeWidth="1"/>{/* flat level */}
      <text x="175" y="78" fontSize="6" fill="#999" stroke="none">leveled</text>
      {/* Membrane roll */}
      <line x1="10" y1="80" x2="120" y2="80" strokeDasharray="5 2" stroke={BP.sl}/>
      <circle cx="130" cy="80" r="8" stroke={BP.sl} strokeWidth={BP.swl}/>
      <circle cx="130" cy="80" r="3" stroke={BP.sl} strokeWidth={BP.swl}/>
      <text x="145" y="83" fontSize="6" fill="#888" stroke="none">membrane</text>
      <text x="60" y="92" textAnchor="middle" fontSize="6" fill="#999" stroke="none">overlap 10cm at seams</text>
    </StepPanel>

    {/* Step 2: BUILD FRAME — plan view rectangle with corner screws */}
    <StepPanel x={195} y={0} n={2} label="Build frame + screw corners">
      <rect x="15" y="8" width="150" height="65" rx="1"/>
      {/* Screw marks at corners */}
      {[[19,12],[19,69],[161,12],[161,69]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="2" stroke={BP.sl}/><line x1={x-3} y1={y} x2={x+3} y2={y} stroke={BP.sl} strokeWidth={BP.swl}/></g>)}
      <text x="90" y="44" textAnchor="middle" fontSize="6.5" fill="#999" stroke="none">pre-drill 2cm from end</text>
      <text x="90" y="53" textAnchor="middle" fontSize="6" fill="#aaa" stroke="none">2 screws per corner</text>
      <DimLine x1={15} y1={8} x2={165} y2={8} label="2.4m" offset={-9} side="above"/>
      <DimLine x1={165} y1={8} x2={165} y2={73} label="1.2m" offset={10} side="right"/>
    </StepPanel>

    {/* Step 3: STACK — side section showing two offset layers */}
    <StepPanel x={0} y={118} n={3} label="Stack second layer (optional)">
      {/* Bottom layer */}
      <rect x="20" y="50" width="140" height="25"/>
      {/* Top layer offset */}
      <rect x="40" y="25" width="140" height="25"/>
      {/* Offset dimension */}
      <line x1="20" y1="50" x2="40" y2="50" strokeDasharray="2 2" stroke={BP.sl}/>
      <DimLine x1={20} y1={75} x2={40} y2={75} label="30cm offset" offset={10} side="below"/>
      {/* Screws through top into bottom */}
      <line x1="70" y1="25" x2="70" y2="75" strokeDasharray="2 3" stroke={BP.sl} strokeWidth={BP.swl}/>
      <line x1="130" y1="25" x2="130" y2="75" strokeDasharray="2 3" stroke={BP.sl} strokeWidth={BP.swl}/>
      <text x="100" y="20" textAnchor="middle" fontSize="6" fill="#888" stroke="none">screw every 60cm</text>
    </StepPanel>

    {/* Step 4: FILL — cross section with soil layers */}
    <StepPanel x={195} y={118} n={4} label="Fill with soil mix">
      <rect x="20" y="20" width="145" height="60"/>
      {/* Layer lines */}
      <line x1="20" y1="42" x2="165" y2="42" strokeDasharray="3 2" stroke={BP.sl} strokeWidth={BP.swl}/>
      <line x1="20" y1="58" x2="165" y2="58" strokeDasharray="3 2" stroke={BP.sl} strokeWidth={BP.swl}/>
      {/* Layer labels */}
      <text x="92" y="34" textAnchor="middle" fontSize="6" fill="#888" stroke="none">60% topsoil</text>
      <text x="92" y="52" textAnchor="middle" fontSize="6" fill="#888" stroke="none">30% compost</text>
      <text x="92" y="68" textAnchor="middle" fontSize="6" fill="#888" stroke="none">10% perlite/sand</text>
      {/* 3cm gap at top */}
      <DimLine x1={165} y1={20} x2={165} y2={26} label="3cm" offset={12} side="right"/>
      <line x1="20" y1="26" x2="165" y2="26" strokeDasharray="2 2" stroke={BP.sl} strokeWidth={BP.swl}/>
      <text x="170" y="30" fontSize="5.5" fill="#aaa" stroke="none">rim</text>
      {/* Ground + membrane */}
      <line x1="10" y1="80" x2="175" y2="80" strokeDasharray="6 3" stroke={BP.sl}/>
      <text x="92" y="89" textAnchor="middle" fontSize="6" fill="#aaa" stroke="none">weed membrane on ground</text>
    </StepPanel>
  </g>, 240);

  if (type === "chicken_coop") return wrap(<g>
    {/* Step 1: FLOOR — raised frame on legs */}
    <StepPanel x={0} y={0} n={1} label="Floor frame, raised on blocks">
      <rect x="25" y="35" width="130" height="10"/>{/* floor frame */}
      {/* Legs */}
      {[35,80,125,145].map((x,i)=><line key={i} x1={x} y1={45} x2={x} y2={75}/>)}
      <line x1="15" y1="75" x2="165" y2="75" strokeDasharray="5 3" stroke={BP.sl}/>{/* ground */}
      <DimLine x1={25} y1={35} x2={155} y2={35} label="2.0m" offset={-10} side="above"/>
      <DimLine x1={155} y1={45} x2={155} y2={75} label="20-30cm" offset={12} side="right"/>
      <text x="90" y="85" textAnchor="middle" fontSize="6" fill="#999" stroke="none">raised = no rot, no rats</text>
    </StepPanel>

    {/* Step 2: WALLS — frame with slope */}
    <StepPanel x={195} y={0} n={2} label="Wall frames with roof slope">
      <line x1="30" y1="80" x2="30" y2="25"/>{/* back wall */}
      <line x1="150" y1="80" x2="150" y2="15"/>{/* front wall taller */}
      <line x1="30" y1="25" x2="150" y2="15"/>{/* roof slope */}
      <line x1="30" y1="80" x2="150" y2="80"/>{/* floor */}
      {/* Pop-hole opening */}
      <rect x="40" y="55" width="22" height="25" strokeDasharray="3 2"/>
      <text x="51" y="52" textAnchor="middle" fontSize="5.5" fill="#888" stroke="none">pop-hole</text>
      <DimLine x1={30} y1={80} x2={30} y2={25} label="1.5m" offset={-16} side="left"/>
      <DimLine x1={150} y1={80} x2={150} y2={15} label="1.8m" offset={12} side="right"/>
      {/* Slope arrow */}
      <text x="100" y="10" textAnchor="middle" fontSize="5.5" fill="#888" stroke="none">slope AWAY from pop-hole →</text>
    </StepPanel>

    {/* Step 3: CLADDING + VENTILATION */}
    <StepPanel x={0} y={118} n={3} label="Plywood walls + vent holes">
      <line x1="30" y1="80" x2="30" y2="20"/><line x1="150" y1="80" x2="150" y2="12"/>
      <line x1="30" y1="20" x2="150" y2="12"/><line x1="30" y1="80" x2="150" y2="80"/>
      {/* Vent holes near roofline */}
      <rect x="45" y="25" width="22" height="10" rx="1" strokeDasharray="3 2" stroke={BP.sl}/>
      <rect x="115" y="18" width="22" height="10" rx="1" strokeDasharray="3 2" stroke={BP.sl}/>
      <text x="90" y="42" textAnchor="middle" fontSize="6" fill="#888" stroke="none">15×30cm each</text>
      <text x="90" y="52" textAnchor="middle" fontSize="5.5" fill="#888" stroke="none">on OPPOSITE walls</text>
      <text x="90" y="62" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">hardware cloth, not chicken wire</text>
      {/* Arrow showing airflow */}
      <line x1="45" y1="30" x2="115" y2="23" stroke={BP.sl} strokeWidth={BP.swl} strokeDasharray="2 3" markerEnd="url(#arr)"/>
      <text x="80" y="18" textAnchor="middle" fontSize="5" fill="#aaa" stroke="none">cross ventilation</text>
    </StepPanel>

    {/* Step 4: PERCHES — interior section */}
    <StepPanel x={195} y={118} n={4} label="Perches: 40mm poles">
      <rect x="20" y="10" width="140" height="80" rx="1" strokeDasharray="4 2" stroke={BP.sl} strokeWidth={BP.swl}/>
      {/* Two perch levels */}
      <line x1="50" y1="50" x2="140" y2="50" strokeWidth="2"/>
      <line x1="50" y1="30" x2="140" y2="30" strokeWidth="2"/>
      <DimLine x1={45} y1={90} x2={45} y2={50} label="60cm" offset={-18} side="left"/>
      <DimLine x1={45} y1={90} x2={45} y2={30} label="90cm" offset={-30} side="left"/>
      <text x="95" y="68" textAnchor="middle" fontSize="6" fill="#888" stroke="none">25cm per bird</text>
      <text x="95" y="78" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">flat side up</text>
      <line x1="20" y1="90" x2="160" y2="90" strokeDasharray="3 2" stroke={BP.sl}/>{/* floor ref */}
    </StepPanel>

    {/* Step 5: NESTING */}
    <StepPanel x={0} y={236} n={5} label="Nesting boxes: 1 per 3-4 hens">
      {/* Wall reference */}
      <line x1="20" y1="10" x2="20" y2="85" stroke={BP.sl} strokeDasharray="4 2"/>
      {/* Two nesting boxes */}
      <rect x="25" y="28" width="30" height="30"/><rect x="60" y="28" width="30" height="30"/>
      {/* Angled roofs */}
      <line x1="25" y1="28" x2="55" y2="22"/><line x1="60" y1="28" x2="90" y2="22"/>
      {/* Lip at front */}
      <line x1="55" y1="53" x2="55" y2="58"/><line x1="90" y1="53" x2="90" y2="58"/>
      <DimLine x1={25} y1={58} x2={55} y2={58} label="30cm" offset={10} side="below"/>
      <DimLine x1={20} y1={85} x2={20} y2={28} label="60cm up" offset={-20} side="left"/>
      <text x="120" y="35" fontSize="6" fill="#888" stroke="none">angled roof</text>
      <text x="120" y="45" fontSize="5.5" fill="#999" stroke="none">prevents roosting</text>
      <text x="120" y="55" fontSize="5.5" fill="#999" stroke="none">on top</text>
      <line x1="20" y1="85" x2="160" y2="85" strokeDasharray="5 3" stroke={BP.sl}/>{/* floor */}
    </StepPanel>

    {/* Step 6: RUN */}
    <StepPanel x={195} y={236} n={6} label="Run: hardware cloth, buried">
      {/* Coop box */}
      <rect x="10" y="20" width="40" height="50"/><text x="30" y="50" textAnchor="middle" fontSize="6" fill="#888" stroke="none">coop</text>
      {/* Run area */}
      <rect x="50" y="20" width="100" height="50" strokeDasharray="3 2"/>
      {/* Mesh pattern */}
      {[65,80,95,110,125,140].map((x,i)=><line key={i} x1={x} y1="20" x2={x} y2="70" stroke={BP.sl} strokeWidth="0.3"/>)}
      {[30,40,50,60].map((y,i)=><line key={i} x1="50" y1={y} x2="150" y2={y} stroke={BP.sl} strokeWidth="0.3"/>)}
      <text x="100" y="85" textAnchor="middle" fontSize="6" fill="#888" stroke="none">1m² per bird minimum</text>
      {/* Buried apron */}
      <line x1="10" y1="70" x2="170" y2="70" strokeDasharray="5 3" stroke={BP.sl}/>
      <line x1="150" y1="70" x2="170" y2="80" strokeDasharray="3 2" stroke={BP.sl}/>
      <text x="170" y="85" fontSize="5" fill="#999" stroke="none">30cm</text>
      <text x="170" y="91" fontSize="5" fill="#999" stroke="none">apron</text>
    </StepPanel>

    {/* Step 7: SECURITY */}
    <StepPanel x={97} y={354} n={7} label="Two-step predator latch">
      {/* Door frame */}
      <rect x="40" y="10" width="50" height="75"/>
      {/* Latch detail — two-step */}
      <rect x="92" y="35" width="40" height="25" rx="2"/>
      <line x1="100" y1="40" x2="100" y2="55" strokeWidth="2"/>{/* lift bar */}
      <line x1="100" y1="47" x2="120" y2="47"/>{/* slide bar */}
      <circle cx="124" cy="47" r="3"/>{/* catch */}
      <text x="112" y="32" textAnchor="middle" fontSize="6" fill="#888" stroke="none">1. lift</text>
      <text x="112" y="68" textAnchor="middle" fontSize="6" fill="#888" stroke="none">2. slide</text>
      <text x="90" y="82" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">raccoons can't do both</text>
    </StepPanel>
  </g>, 470);

  if (type === "compost_bin") return wrap(<g>
    {/* Step 1: SITE — plan view with context */}
    <StepPanel x={0} y={0} n={1} label="Site: shade, bare soil, near garden">
      {/* Garden bed reference */}
      <rect x="110" y="15" width="65" height="40" rx="2" strokeDasharray="4 2" stroke={BP.sl}/>
      <text x="142" y="40" textAnchor="middle" fontSize="6" fill="#aaa" stroke="none">garden</text>
      {/* Compost site */}
      <rect x="20" y="25" width="55" height="55" rx="1" strokeDasharray="3 2"/>
      <text x="47" y="55" textAnchor="middle" fontSize="6.5" fill="#888" stroke="none">compost</text>
      {/* Path between */}
      <line x1="75" y1="52" x2="110" y2="40" stroke={BP.sl} strokeWidth={BP.swl} strokeDasharray="2 3" markerEnd="url(#arr)"/>
      <text x="92" y="50" fontSize="5" fill="#999" stroke="none">short wheelbarrow run</text>
      {/* Shade indicator */}
      <text x="30" y="18" fontSize="7" fill="#888" stroke="none">◐ partial shade</text>
      {/* Drainage arrow */}
      <line x1="47" y1="80" x2="47" y2="90" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <text x="75" y="90" fontSize="5.5" fill="#999" stroke="none">drainage away</text>
    </StepPanel>

    {/* Step 2: BUILD BAYS — plan with 3 U-shapes */}
    <StepPanel x={195} y={0} n={2} label="3 bays from 9 pallets">
      <rect x="10" y="15" width="50" height="55"/><rect x="65" y="15" width="50" height="55"/><rect x="120" y="15" width="50" height="55"/>
      <text x="35" y="47" textAnchor="middle" fontSize={BP.fsd} fill="#888" stroke="none">1</text>
      <text x="90" y="47" textAnchor="middle" fontSize={BP.fsd} fill="#888" stroke="none">2</text>
      <text x="145" y="47" textAnchor="middle" fontSize={BP.fsd} fill="#888" stroke="none">3</text>
      {/* Flow arrows */}
      <line x1="55" y1="42" x2="65" y2="42" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <line x1="110" y1="42" x2="120" y2="42" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <text x="35" y="62" textAnchor="middle" fontSize="5" fill="#aaa" stroke="none">fresh</text>
      <text x="90" y="62" textAnchor="middle" fontSize="5" fill="#aaa" stroke="none">cooking</text>
      <text x="145" y="62" textAnchor="middle" fontSize="5" fill="#aaa" stroke="none">done</text>
      <DimLine x1={10} y1={15} x2={60} y2={15} label="1m" offset={-10} side="above"/>
      <DimLine x1={170} y1={15} x2={170} y2={70} label="1m" offset={10} side="right"/>
      <text x="90" y="82" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">shared walls save pallets</text>
    </StepPanel>

    {/* Step 3: FRONT ACCESS — removable slats detail */}
    <StepPanel x={0} y={118} n={3} label="Removable front slats">
      {/* Side cutaway of one bay */}
      <line x1="30" y1="15" x2="30" y2="80"/><line x1="130" y1="15" x2="130" y2="80"/>{/* side walls */}
      {/* Vertical runners */}
      <line x1="33" y1="15" x2="33" y2="80" strokeWidth="2.5"/>
      <line x1="127" y1="15" x2="127" y2="80" strokeWidth="2.5"/>
      {/* Horizontal removable planks */}
      {[25,38,51,64,77].map((y,i)=><line key={i} x1="33" y1={y} x2="127" y2={y} strokeDasharray="4 2"/>)}
      {/* Arrow showing sliding in/out */}
      <line x1="80" y1="77" x2="80" y2="88" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <text x="95" y="88" fontSize="5.5" fill="#888" stroke="none">slide out</text>
      <text x="80" y="8" textAnchor="middle" fontSize="6" fill="#888" stroke="none">front view</text>
      <text x="150" y="40" fontSize="5.5" fill="#999" stroke="none">planks slide</text>
      <text x="150" y="49" fontSize="5.5" fill="#999" stroke="none">between</text>
      <text x="150" y="58" fontSize="5.5" fill="#999" stroke="none">runners</text>
    </StepPanel>

    {/* Step 4: LINE — wire mesh inside pallet */}
    <StepPanel x={195} y={118} n={4} label="Line with wire mesh (optional)">
      {/* Pallet cross-section */}
      <rect x="20" y="15" width="10" height="70"/>{/* pallet plank */}
      <rect x="45" y="15" width="10" height="70"/>{/* pallet plank */}
      <rect x="70" y="15" width="10" height="70"/>{/* pallet plank */}
      {/* Wire mesh behind */}
      <line x1="15" y1="15" x2="15" y2="85" strokeDasharray="2 2" stroke={BP.sl}/>
      {[20,30,40,50,60,70,80].map((y,i)=><line key={i} x1="12" y1={y} x2="82" y2={y} stroke={BP.sl} strokeWidth="0.3"/>)}
      {/* Staples */}
      <text x="35" y="10" fontSize="6" fill="#888" stroke="none">staple gun</text>
      {[25,50,75].map((y,i)=><g key={i}><line x1="17" y1={y} x2="20" y2={y-2} stroke={BP.sl}/><line x1="17" y1={y} x2="20" y2={y+2} stroke={BP.sl}/></g>)}
      <text x="100" y="40" fontSize="6" fill="#888" stroke="none">mesh prevents</text>
      <text x="100" y="50" fontSize="6" fill="#888" stroke="none">material falling</text>
      <text x="100" y="60" fontSize="6" fill="#888" stroke="none">through gaps</text>
      <text x="100" y="80" fontSize="5.5" fill="#aaa" stroke="none">cross-section</text>
    </StepPanel>
  </g>, 240);

  if (type === "rain_barrel") return wrap(<g>
    {/* Step 1: PLATFORM */}
    <StepPanel x={0} y={0} n={1} label="Blocks 2-high, level, near pipe">
      <rect x="50" y="55" width="30" height="15" stroke={BP.sl}/><rect x="90" y="55" width="30" height="15" stroke={BP.sl}/>
      <rect x="50" y="40" width="30" height="15" stroke={BP.sl}/><rect x="90" y="40" width="30" height="15" stroke={BP.sl}/>
      <line x1="40" y1="70" x2="130" y2="70" strokeDasharray="5 3" stroke={BP.sl}/>
      {/* Level indicator */}
      <line x1="45" y1="38" x2="125" y2="38" stroke={BP.sl} strokeWidth={BP.swl}/>
      <text x="135" y="41" fontSize="5.5" fill="#888" stroke="none">level!</text>
      {/* Paving slab underneath */}
      <rect x="40" y="70" width="90" height="6" stroke={BP.sl} strokeDasharray="3 2"/>
      <text x="85" y="85" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">paving slab on soft ground</text>
      <text x="85" y="30" textAnchor="middle" fontSize="6" fill="#888" stroke="none">200L = 200kg!</text>
    </StepPanel>

    {/* Step 2: DIVERTER */}
    <StepPanel x={195} y={0} n={2} label="Cut downpipe, install diverter">
      <line x1="100" y1="5" x2="100" y2="35"/>{/* pipe above */}
      <line x1="100" y1="55" x2="100" y2="85" strokeDasharray="3 2" stroke={BP.sl}/>{/* pipe below continues */}
      {/* Cut mark */}
      <line x1="92" y1="37" x2="108" y2="33" strokeWidth="2" stroke={BP.sl}/>
      <text x="115" y="38" fontSize="6" fill="#888" stroke="none">hacksaw cut</text>
      {/* Diverter angle */}
      <line x1="100" y1="40" x2="65" y2="55" strokeWidth="2"/>
      <text x="55" y="50" textAnchor="end" fontSize="5.5" fill="#888" stroke="none">to barrel →</text>
      <text x="100" y="93" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">pipe continues to drain</text>
    </StepPanel>

    {/* Step 3: TAP */}
    <StepPanel x={0} y={118} n={3} label="Drill 5cm from bottom, add tap">
      {/* Barrel wall section */}
      <line x1="50" y1="10" x2="50" y2="85" strokeWidth="3"/>{/* barrel wall */}
      <text x="35" y="50" textAnchor="end" fontSize="6" fill="#aaa" stroke="none">barrel</text>
      <text x="35" y="58" textAnchor="end" fontSize="6" fill="#aaa" stroke="none">wall</text>
      {/* Tap assembly */}
      <circle cx="60" cy="72" r="6" stroke={BP.sl}/>{/* washer inside */}
      <line x1="56" y1="72" x2="50" y2="72" strokeWidth="2"/>
      <circle cx="42" cy="72" r="4" stroke={BP.sl} strokeWidth={BP.swl}/>{/* washer outside */}
      <line x1="66" y1="72" x2="100" y2="72" strokeWidth="2"/>{/* tap pipe */}
      <line x1="100" y1="67" x2="100" y2="77"/>{/* tap handle */}
      <text x="80" y="62" textAnchor="middle" fontSize="5.5" fill="#888" stroke="none">washers both sides</text>
      <DimLine x1={50} y1={85} x2={50} y2={72} label="5cm up" offset={-20} side="left"/>
      <text x="100" y="90" fontSize="5.5" fill="#999" stroke="none">sediment settles below tap</text>
      <line x1="50" y1="85" x2="120" y2="85" strokeDasharray="4 2" stroke={BP.sl}/>{/* bottom ref */}
    </StepPanel>

    {/* Step 4: SCREEN */}
    <StepPanel x={195} y={118} n={4} label="Mesh screen on lid opening">
      {/* Barrel top (plan view) */}
      <ellipse cx="85" cy="45" rx="55" ry="20"/>
      {/* Opening with mesh */}
      <ellipse cx="85" cy="45" rx="20" ry="8" strokeDasharray="2 2"/>
      {/* Mesh crosshatch */}
      {[-15,-8,0,8,15].map((dx,i)=><line key={i} x1={85+dx} y1="38" x2={85+dx} y2="52" stroke={BP.sl} strokeWidth="0.3"/>)}
      {[40,45,50].map((y,i)=><line key={i} x1="65" y1={y} x2="105" y2={y} stroke={BP.sl} strokeWidth="0.3"/>)}
      <text x="85" y="70" textAnchor="middle" fontSize="6" fill="#888" stroke="none">downpipe enters here</text>
      <text x="85" y="80" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">mosquitoes breed in 7 days</text>
      <text x="85" y="88" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">without mesh</text>
      <text x="85" y="18" textAnchor="middle" fontSize="6" fill="#888" stroke="none">top view</text>
    </StepPanel>
  </g>, 240);

  if (type === "fencing") return wrap(<g>
    {/* Step 1: PLAN — stakes with string */}
    <StepPanel x={0} y={0} n={1} label="Mark posts with stakes + string">
      {/* Stakes */}
      {[20,55,90,125,160].map((x,i)=><g key={i}><line x1={x} y1="45" x2={x} y2="70"/><line x1={x-3} y1="50" x2={x+3} y2="50" stroke={BP.sl} strokeWidth={BP.swl}/></g>)}
      {/* String line */}
      <line x1="20" y1="45" x2="160" y2="45" strokeDasharray="3 3" stroke={BP.sl}/>
      <DimLine x1={20} y1={70} x2={55} y2={70} label="2–2.5m" offset={12} side="below"/>
      <text x="90" y="38" textAnchor="middle" fontSize="6" fill="#888" stroke="none">string line for straight</text>
      <text x="20" y="90" fontSize="5.5" fill="#999" stroke="none">walk line first: note slopes, rocks, wet spots</text>
    </StepPanel>

    {/* Step 2: CORNERS FIRST — deep post with brace */}
    <StepPanel x={195} y={0} n={2} label="Corners: 60cm deep + brace 45°">
      <line x1="60" y1="10" x2="60" y2="75" strokeWidth="3"/>{/* corner post */}
      <line x1="60" y1="75" x2="60" y2="90" strokeDasharray="3 2"/>{/* below ground */}
      <line x1="30" y1="75" x2="170" y2="75" strokeDasharray="5 3" stroke={BP.sl}/>
      {/* Concrete around base */}
      <rect x="52" y="73" width="16" height="17" rx="1" strokeDasharray="3 2" stroke={BP.sl}/>
      <text x="80" y="85" fontSize="5.5" fill="#888" stroke="none">postcrete</text>
      {/* Diagonal brace */}
      <line x1="60" y1="30" x2="120" y2="75"/>
      <text x="100" y="48" fontSize="6" fill="#888" stroke="none" transform="rotate(-42,100,48)">brace 45°</text>
      <DimLine x1={60} y1={75} x2={60} y2={90} label="60cm" offset={-18} side="left"/>
      <text x="60" y="6" textAnchor="middle" fontSize="6" fill="#888" stroke="none">strainer post</text>
    </StepPanel>

    {/* Step 3: INTERMEDIATES — rammed earth */}
    <StepPanel x={0} y={118} n={3} label="Intermediates: rammed earth layers">
      <line x1="80" y1="10" x2="80" y2="60"/>{/* post above ground */}
      <line x1="80" y1="60" x2="80" y2="88" strokeDasharray="3 2"/>{/* below */}
      <line x1="30" y1="60" x2="150" y2="60" strokeDasharray="5 3" stroke={BP.sl}/>
      {/* Earth layers around post */}
      {[65,72,79,86].map((y,i)=><g key={i}>
        <line x1="72" y1={y} x2="88" y2={y} stroke={BP.sl} strokeWidth={BP.swl}/>
        <text x="95" y={y+3} fontSize="4.5" fill="#aaa" stroke="none">tamp</text>
      </g>)}
      <text x="120" y="75" fontSize="5.5" fill="#888" stroke="none">10cm layers</text>
      <text x="120" y="84" fontSize="5.5" fill="#999" stroke="none">each tamped</text>
      <text x="120" y="92" fontSize="5.5" fill="#999" stroke="none">hard</text>
    </StepPanel>

    {/* Step 4: MESH — unrolling from corner */}
    <StepPanel x={195} y={118} n={4} label="Mesh: tension FROM corners">
      {/* Posts */}
      <line x1="20" y1="15" x2="20" y2="70" strokeWidth="3"/>{/* corner */}
      {[60,100,140].map((x,i)=><line key={i} x1={x} y1="20" x2={x} y2="70"/>)}
      {/* Mesh lines */}
      {[30,40,50,60].map((y,i)=><line key={i} x1="20" y1={y} x2="140" y2={y} stroke={BP.sl} strokeWidth="0.4"/>)}
      {/* Tension direction arrow */}
      <line x1="30" y1="80" x2="130" y2="80" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <text x="80" y="92" textAnchor="middle" fontSize="5.5" fill="#888" stroke="none">tension direction →</text>
      {/* Staple marks */}
      {[20,60,100,140].map((x,i)=>{return [30,45,60].map((y,j)=><text key={i+"-"+j} x={x} y={y} textAnchor="middle" fontSize="5" fill={BP.sl} stroke="none">⌐</text>);})}
      <text x="160" y="50" fontSize="5.5" fill="#999" stroke="none">staple</text>
    </StepPanel>
  </g>, 240);

  if (type === "tool_shed") return wrap(<g>
    {/* Step 1: FOUNDATION — pier grid plan */}
    <StepPanel x={0} y={0} n={1} label="12 pier blocks in 3×4 grid">
      {[0,1,2,3].map((c)=>[0,1,2].map((r)=>{const x=25+c*40,y=15+r*25;return <rect key={c+"-"+r} x={x} y={y} width="12" height="12" rx="1" stroke={BP.sl}/>;}))}
      <text x="90" y="86" textAnchor="middle" fontSize="6" fill="#888" stroke="none">plan view — all must be level</text>
      <DimLine x1={25} y1={15} x2={185} y2={15} label="~2.5m" offset={-10} side="above"/>
    </StepPanel>

    {/* Step 2: FLOOR — frame on piers with joists */}
    <StepPanel x={195} y={0} n={2} label="Floor frame + joists every 40cm">
      {/* Piers */}
      {[25,70,115,155].map((x,i)=><rect key={i} x={x} y="68" width="10" height="8" stroke={BP.sl}/>)}
      {/* Main frame */}
      <rect x="20" y="52" width="150" height="16" rx="1"/>
      {/* Joists */}
      {[40,60,80,100,120,140].map((x,i)=><line key={i} x1={x} y1="52" x2={x} y2="68" strokeDasharray="2 2" stroke={BP.sl} strokeWidth={BP.swl}/>)}
      <text x="95" y="48" textAnchor="middle" fontSize="6" fill="#888" stroke="none">treated timber frame</text>
      <text x="95" y="85" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">joist every 40cm</text>
      <text x="95" y="35" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">side view</text>
    </StepPanel>

    {/* Step 3: WALLS — frame flat then tilt up */}
    <StepPanel x={0} y={118} n={3} label="Frame on floor → tilt up">
      {/* Frame lying flat */}
      <rect x="15" y="60" width="70" height="6" rx="0.5" strokeDasharray="3 2"/>
      <text x="50" y="55" textAnchor="middle" fontSize="5.5" fill="#888" stroke="none">frame flat</text>
      {/* Curved arrow showing tilt */}
      <path d="M 85,63 Q 100,30 105,20" fill="none" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      {/* Frame standing */}
      <line x1="110" y1="20" x2="110" y2="75" strokeWidth="2"/>
      <line x1="115" y1="20" x2="150" y2="12"/>{/* angle to shorter back */}
      <line x1="150" y1="12" x2="150" y2="75" strokeWidth="2"/>
      <DimLine x1={110} y1={75} x2={110} y2={20} label="2.2m" offset={-14} side="left"/>
      <text x="155" y="45" fontSize="5.5" fill="#888" stroke="none">1.8m</text>
      <text x="70" y="80" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">get a helper!</text>
    </StepPanel>

    {/* Step 4: CLADDING — overlap pattern */}
    <StepPanel x={195} y={118} n={4} label="Cladding: bottom up, overlap down">
      {/* Wall section */}
      <line x1="40" y1="10" x2="40" y2="85"/><line x1="140" y1="10" x2="140" y2="85"/>
      {/* Overlapping boards — fish scale pattern */}
      {[75,62,49,36,23,10].map((y,i)=><g key={i}><line x1="40" y1={y} x2="140" y2={y}/><line x1="40" y1={y} x2="40" y2={y-3} stroke={BP.sl} strokeWidth={BP.swl}/></g>)}
      {/* Rain arrow showing water running off */}
      <line x1="110" y1="20" x2="115" y2="35" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <line x1="115" y1="37" x2="118" y2="50" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <text x="148" y="40" fontSize="5.5" fill="#888" stroke="none">rain runs</text>
      <text x="148" y="49" fontSize="5.5" fill="#888" stroke="none">off overlaps</text>
      <text x="90" y="92" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">start from bottom</text>
    </StepPanel>

    {/* Step 5: ROOF */}
    <StepPanel x={0} y={236} n={5} label="Roof: min 15° pitch, 10cm overhang">
      <line x1="20" y1="70" x2="20" y2="30"/><line x1="160" y1="70" x2="160" y2="45"/>{/* walls */}
      {/* Rafters */}
      {[30,55,80,105,130,155].map((x,i)=>{const y1=30+(x-20)*(15/140);return <line key={i} x1={x} y1={y1} x2={x} y2="70" strokeDasharray="3 2" stroke={BP.sl} strokeWidth={BP.swl}/>;})}
      {/* Roof line with overhang */}
      <line x1="10" y1="28" x2="170" y2="47" strokeWidth="2"/>
      <text x="90" y="22" textAnchor="middle" fontSize="6" fill="#888" stroke="none">≥15° pitch</text>
      {/* Overhang marks */}
      <DimLine x1={10} y1={28} x2={20} y2={30} label="10cm" offset={-12} side="above"/>
      <line x1="20" y1="70" x2="160" y2="70" strokeDasharray="3 2" stroke={BP.sl}/>
      <text x="90" y="82" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">felt + corrugated sheets</text>
    </StepPanel>

    {/* Step 6: FINISH — door + pegboard */}
    <StepPanel x={195} y={236} n={6} label="Door, pegboard, hooks">
      {/* Wall outline */}
      <rect x="20" y="10" width="140" height="75" rx="1" strokeDasharray="4 2" stroke={BP.sl}/>
      {/* Door */}
      <rect x="30" y="20" width="40" height="65"/>
      <circle cx="64" cy="55" r="2.5" stroke={BP.sl}/>{/* handle */}
      {/* Hasp */}
      <line x1="70" y1="52" x2="78" y2="52" strokeWidth="2" stroke={BP.sl}/>
      <circle cx="80" cy="52" r="2" stroke={BP.sl}/>
      {/* Pegboard area */}
      <rect x="85" y="20" width="60" height="40" strokeDasharray="3 2" stroke={BP.sl}/>
      {/* Tool silhouettes on pegboard */}
      <line x1="95" y1="25" x2="95" y2="45" stroke={BP.sl} strokeWidth={BP.swl}/>{/* handle */}
      <line x1="92" y1="25" x2="98" y2="25" stroke={BP.sl} strokeWidth={BP.swl}/>{/* head */}
      <line x1="110" y1="25" x2="110" y2="50" stroke={BP.sl} strokeWidth={BP.swl}/>
      <line x1="125" y1="25" x2="125" y2="40" stroke={BP.sl} strokeWidth={BP.swl}/>
      <line x1="122" y1="25" x2="128" y2="25" stroke={BP.sl} strokeWidth={BP.swl}/>
      <text x="115" y="66" textAnchor="middle" fontSize="5.5" fill="#888" stroke="none">pegboard</text>
      {/* Shelves */}
      <line x1="85" y1="68" x2="145" y2="68" strokeWidth="1.5"/>
      <text x="115" y="78" textAnchor="middle" fontSize="5" fill="#999" stroke="none">shelf</text>
    </StepPanel>
  </g>, 355);

  if (type === "cold_frame") return wrap(<g>
    {/* Step 1: BUILD BOX — trapezoid with dims */}
    <StepPanel x={0} y={0} n={1} label="Trapezoid box, slope faces south">
      <line x1="30" y1="80" x2="30" y2="40"/>{/* front wall */}
      <line x1="155" y1="80" x2="155" y2="20"/>{/* back wall */}
      <line x1="30" y1="80" x2="155" y2="80"/>{/* bottom */}
      <line x1="30" y1="40" x2="155" y2="20"/>{/* top slope */}
      <DimLine x1={30} y1={80} x2={30} y2={40} label="25cm" offset={-18} side="left"/>
      <DimLine x1={155} y1={80} x2={155} y2={20} label="40cm" offset={12} side="right"/>
      {/* Sun arrow */}
      <line x1="60" y1="10" x2="80" y2="28" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <line x1="90" y1="8" x2="105" y2="22" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <text x="75" y="6" textAnchor="middle" fontSize="6" fill="#888" stroke="none">☀ south</text>
      <text x="92" y="90" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">angle ≈ your latitude (35–45°)</text>
    </StepPanel>

    {/* Step 2: LID — hinged at back */}
    <StepPanel x={195} y={0} n={2} label="Hinge lid at back edge">
      <line x1="30" y1="75" x2="30" y2="45"/><line x1="150" y1="75" x2="150" y2="25"/>
      <line x1="30" y1="75" x2="150" y2="75"/>
      {/* Closed lid */}
      <line x1="30" y1="45" x2="150" y2="25" strokeWidth="2"/>
      {/* Hinge symbol */}
      <circle cx="150" cy="25" r="4" stroke={BP.sl}/>
      <text x="160" y="22" fontSize="5.5" fill="#888" stroke="none">hinge</text>
      {/* Overhang at front */}
      <line x1="25" y1="46" x2="30" y2="45" strokeWidth="2"/>
      <text x="15" y="42" textAnchor="end" fontSize="5.5" fill="#888" stroke="none">2-3cm</text>
      <text x="15" y="49" textAnchor="end" fontSize="5" fill="#999" stroke="none">overhang</text>
      <text x="90" y="88" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">glass or polycarbonate</text>
    </StepPanel>

    {/* Step 3: VENTILATION — prop stick 3 positions */}
    <StepPanel x={0} y={118} n={3} label="Prop stick: 3 notch positions">
      {/* Frame side */}
      <line x1="20" y1="80" x2="20" y2="50"/><line x1="20" y1="80" x2="160" y2="80"/>
      {/* Lid: 3 positions shown */}
      <line x1="20" y1="50" x2="160" y2="35" strokeDasharray="4 2" stroke={BP.sl}/>{/* closed */}
      <line x1="20" y1="47" x2="160" y2="28"/>{/* cracked 5cm */}
      <line x1="20" y1="38" x2="160" y2="15" strokeDasharray="4 2" stroke={BP.sl}/>{/* full open */}
      {/* Prop stick lines */}
      <line x1="60" y1="80" x2="60" y2="47" stroke={BP.sl} strokeWidth={BP.swl}/>{/* short */}
      <line x1="80" y1="80" x2="80" y2="38" strokeDasharray="3 2" stroke={BP.sl} strokeWidth={BP.swl}/>{/* medium */}
      <text x="68" y="92" textAnchor="middle" fontSize="5.5" fill="#888" stroke="none">cracked 5cm</text>
      <text x="120" y="25" fontSize="5.5" fill="#888" stroke="none">half open</text>
      <text x="120" y="12" fontSize="5.5" fill="#888" stroke="none">full open</text>
      <text x="100" y="55" fontSize="5.5" fill="#999" stroke="none">open above 15°C!</text>
    </StepPanel>

    {/* Step 4: SITE — against wall with heat */}
    <StepPanel x={195} y={118} n={4} label="Against south wall, dug in 10cm">
      {/* Wall */}
      <line x1="155" y1="5" x2="155" y2="85" strokeWidth="4" stroke={BP.sl}/>
      <text x="165" y="45" fontSize="5.5" fill="#aaa" stroke="none" transform="rotate(90,165,45)">south wall</text>
      {/* Cold frame against wall */}
      <line x1="40" y1="72" x2="40" y2="55"/><line x1="145" y1="72" x2="145" y2="38"/>
      <line x1="40" y1="55" x2="145" y2="38"/>{/* lid */}
      <line x1="40" y1="72" x2="145" y2="72"/>
      {/* Ground line */}
      <line x1="10" y1="68" x2="160" y2="68" strokeDasharray="5 3" stroke={BP.sl}/>
      {/* Dug in */}
      <DimLine x1={40} y1={68} x2={40} y2={72} label="10cm" offset={-16} side="left"/>
      {/* Heat arrows from wall */}
      <line x1="150" y1="50" x2="140" y2="50" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <line x1="150" y1="60" x2="140" y2="60" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <text x="100" y="85" textAnchor="middle" fontSize="5.5" fill="#888" stroke="none">wall stores + radiates heat</text>
      <text x="100" y="93" textAnchor="middle" fontSize="5" fill="#999" stroke="none">paint inside back white</text>
    </StepPanel>
  </g>, 240);

  if (type === "drip_irrigation") return wrap(<g>
    {/* Step 1: CONNECT — schematic chain */}
    <StepPanel x={0} y={0} n={1} label="Tap → reducer → filter → hose">
      <circle cx="20" cy="45" r="8"/><text x="20" y="48" textAnchor="middle" fontSize="5" fill="#888" stroke="none">tap</text>
      <line x1="28" y1="45" x2="42" y2="45"/>
      <rect x="42" y="38" width="22" height="14" rx="2"/><text x="53" y="48" textAnchor="middle" fontSize="4.5" fill="#888" stroke="none">reduce</text>
      <line x1="64" y1="45" x2="76" y2="45"/>
      <rect x="76" y="38" width="22" height="14" rx="2"/><text x="87" y="48" textAnchor="middle" fontSize="4.5" fill="#888" stroke="none">filter</text>
      <line x1="98" y1="45" x2="110" y2="45"/>
      <line x1="110" y1="45" x2="170" y2="45" strokeWidth="2"/>
      <text x="140" y="40" fontSize="5.5" fill="#888" stroke="none">16mm main</text>
      <text x="90" y="68" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">mains = 3–4 bar → reduce to 1–1.5 bar</text>
      <text x="90" y="78" textAnchor="middle" fontSize="5" fill="#999" stroke="none">thread tape on all joints</text>
    </StepPanel>

    {/* Step 2: LAY HOSE — plan view along bed */}
    <StepPanel x={195} y={0} n={2} label="Hose along bed edge, on top">
      {/* Bed outline */}
      <rect x="15" y="15" width="150" height="60" rx="2" strokeDasharray="4 2" stroke={BP.sl}/>
      <text x="90" y="50" textAnchor="middle" fontSize="6" fill="#aaa" stroke="none">bed</text>
      {/* Main hose along edge */}
      <line x1="20" y1="20" x2="20" y2="70" strokeWidth="2.5"/>
      <text x="8" y="45" textAnchor="middle" fontSize="5" fill="#888" stroke="none" transform="rotate(-90,8,45)">main hose</text>
      {/* Laterals branching */}
      <line x1="20" y1="30" x2="155" y2="30" strokeWidth="1.5"/>
      <line x1="20" y1="50" x2="155" y2="50" strokeWidth="1.5"/>
      <line x1="20" y1="70" x2="155" y2="70" strokeWidth="1.5"/>
      <text x="90" y="85" textAnchor="middle" fontSize="5.5" fill="#999" stroke="none">ON TOP of mulch, not under</text>
    </StepPanel>

    {/* Step 3: EMITTERS — punch + insert detail */}
    <StepPanel x={0} y={118} n={3} label="Punch hole, push in emitter">
      {/* Hose cross-section */}
      <line x1="20" y1="45" x2="165" y2="45" strokeWidth="5"/>
      {/* Punch tool */}
      <line x1="60" y1="20" x2="60" y2="40" strokeWidth="1.5"/>
      <circle cx="60" cy="17" r="3" stroke={BP.sl}/>{/* handle */}
      <text x="75" y="22" fontSize="5.5" fill="#888" stroke="none">punch tool</text>
      {/* Installed emitters */}
      {[95,120,145].map((x,i)=><g key={i}>
        <circle cx={x} cy="45" r="3.5"/>
        <line x1={x} y1="49" x2={x} y2="60" strokeDasharray="2 2" stroke={BP.sl} strokeWidth={BP.swl}/>
        <text x={x} y="66" textAnchor="middle" fontSize="4" fill="#aaa" stroke="none">drip</text>
      </g>)}
      <text x="120" y="78" textAnchor="middle" fontSize="5.5" fill="#888" stroke="none">2L/hr standard · 4L/hr for tomatoes</text>
      <text x="120" y="88" textAnchor="middle" fontSize="5" fill="#999" stroke="none">one emitter per plant</text>
    </StepPanel>

    {/* Step 4: CAP ENDS — fold-back detail */}
    <StepPanel x={195} y={118} n={4} label="Cap ends — fold back for flushing">
      {/* Hose coming in */}
      <line x1="10" y1="45" x2="80" y2="45" strokeWidth="3"/>
      {/* Fold back */}
      <path d="M 80,45 Q 95,45 95,55 Q 95,65 80,65" fill="none" strokeWidth="3"/>
      <line x1="80" y1="65" x2="60" y2="65" strokeWidth="3"/>
      {/* Clamp */}
      <rect x="65" y="40" width="8" height="30" rx="1" strokeDasharray="3 2" stroke={BP.sl}/>
      <text x="58" y="38" textAnchor="end" fontSize="5.5" fill="#888" stroke="none">figure-8</text>
      <text x="58" y="80" textAnchor="end" fontSize="5.5" fill="#888" stroke="none">clamp</text>
      {/* Open for flushing */}
      <line x1="110" y1="45" x2="165" y2="45" strokeWidth="3" strokeDasharray="4 2"/>
      <line x1="155" y1="45" x2="170" y2="55" stroke={BP.sl} strokeWidth={BP.swl} markerEnd="url(#arr)"/>
      <text x="150" y="65" fontSize="5.5" fill="#888" stroke="none">open to</text>
      <text x="150" y="73" fontSize="5.5" fill="#888" stroke="none">flush monthly</text>
    </StepPanel>
  </g>, 240);

  return null;
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
      <div style={{ fontSize: 13, lineHeight: 1.65, color: C.text }}>{children}</div>
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
                <div style={{ fontSize: 13, lineHeight: 1.65, color: C.text }}>{sel.tip}</div>
              </div>
            )}
          </Overlay>
        );
      })()}
    </div>
  );
}

const NAV=[{id:"home",l:"Home",e:"🏠"},{id:"tasks",l:"Tasks",e:"📋"},{id:"setup",l:"Farm Layout",e:"🗺"},{id:"farm",l:"Farming",e:"🌱"},{id:"live",l:"Livestock",e:"🐄"},{id:"season",l:"Seasonal",e:"🗓"},{id:"pantry",l:"Pantry",e:"📦"},{id:"fin",l:"Financials",e:"💰"},{id:"manuals",l:"Manuals",e:"📖"},{id:"feedback",l:"Give Feedback",e:"💬"}];

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
  componentDidCatch(error, info) { console.error("Homestead Error:", error, info); }
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
                    a.download = `homestead-emergency-backup-${new Date().toISOString().slice(0,10)}.json`;
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
  // Bootstrap gamification state from existing data
  const totalHarvests = data.garden.plots.filter(p => p.status === "harvested").length;
  const totalPlants = data.garden.plots.length;
  const totalLogEntries = data.log.length;
  return {
    ...data,
    gamify: {
      ...DEF.gamify,
      totalHarvests,
      totalPlants,
      totalLogEntries,
      lastActiveDate: totalLogEntries > 0 ? new Date().toISOString().slice(0,10) : null,
    }
  };
}

// Update streak + badge state after any data change that includes a log entry
function updateGamify(data) {
  const g = data.gamify || DEF.gamify;
  const today = new Date().toISOString().slice(0,10);
  let streak = g.streak;
  let bestStreak = g.bestStreak;
  const totalLogEntries = data.log.length;
  const totalHarvests = data.garden.plots.filter(p => p.status === "harvested").length;
  const totalPlants = data.garden.plots.length;

  // Update streak
  if (g.lastActiveDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0,10);
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

function AppInner() {
  // Lazy initializer — loads data synchronously, no loading flash
  const initData = () => {
    const d = DB.load();
    let initial = d ? {...DEF,...d,log:d.log||[],costs:d.costs||{items:[]}} : DEF;
    initial = migrateZones(initial);
    initial = migrateGamify(initial);
    return initial;
  };

  const [page,setPageRaw]=useState(() => {
    try { const p = localStorage.getItem("hfm_page"); return (p && p !== "setup") ? p : "home"; } catch(e) { return "home"; }
  });
  const [pageData,setPageData]=useState(null);
  const [data,dispatchData]=useReducer(dataReducer, null, initData);
  const [mob,setMob]=useState(false);
  const [isMob,setIsMob]=useState(typeof window !== "undefined" ? window.innerWidth < 700 : false);
  const [saveStatus,setSaveStatus]=useState("");
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
    const check = () => setIsMob(window.innerWidth < 700);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Flush pending save on tab close / navigate away
  useEffect(() => {
    const flush = () => DB.flush();
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

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
      a.download = `homestead-backup-${new Date().toISOString().slice(0,10)}.json`;
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
        const merged = migrateGamify(migrateZones({...DEF, ...d, log: d.log||[], costs: d.costs||{items:[]}}));
        setData(merged);
      } catch(err) { alert("Invalid backup file: " + err.message); }
    };
    reader.readAsText(file);
  }, [setData]);

  // Auto-redirect to setup ONLY on very first visit
  useEffect(()=>{
    if(!data.setupDone && data.zones.length===0) setPageRaw("setup");
  },[data.setupDone, data.zones.length]);

  // Compute tasks ONCE — passed down to Dashboard + TaskQueue
  const tasks = useMemo(() => buildTaskQueue(data), [data]);
  const taskCount = useMemo(() => tasks.filter(t => t.pri <= 2).length, [tasks]);

  const pg = () => {
    switch(page) {
      case "setup": return <Setup data={data} setData={setData}/>;
      case "tasks": return <TaskQueue data={data} setData={setData} setPage={setPage} tasks={tasks}/>;
      case "farm": return <Farming data={data} setData={setData} pageData={pageData} clearPageData={() => setPageData(null)}/>;
      case "season": return <SeasonalCalendar data={data} setPage={setPage}/>;
      case "live": return <Livestock data={data} setData={setData}/>;
      case "pantry": return <Pantry data={data} setData={setData}/>;
      case "fin": return <Financials data={data} setData={setData}/>;
      case "manuals": return <Manuals/>;
      case "feedback": return <FeedbackSurvey setPage={setPage}/>;
      default: return <Dashboard data={data} setData={setData} setPage={setPage} tasks={tasks}/>;
    }
  };

  return (
    <>
      {/* Fonts loaded via system fallback for offline use */}
      <div style={{display:"flex",height:"100vh",fontFamily:F.body,background:C.bg,color:C.text,overflow:"hidden",letterSpacing:"0.005em"}}>
        <nav style={{width:220,minWidth:220,background:C.card,borderRight:`1px solid ${C.bdr}`,display:"flex",flexDirection:"column",padding:"0",position:isMob?"fixed":"relative",left:isMob?(mob?0:-240):0,top:0,bottom:0,zIndex:500,transition:"left .3s cubic-bezier(.25,.46,.45,.94)",boxShadow:isMob?C.shXL:"none"}}>
          {/* Premium brand header */}
          <div style={{padding:"24px 20px 20px",marginBottom:4,background:C.grdHero,borderRadius:"0 0 20px 0"}}>
            <div style={{fontSize:21,fontFamily:F.head,fontWeight:800,color:"#fff",letterSpacing:"-0.02em"}}>🌾 Your Homestead</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:3,fontWeight:500}}>Farm Manager</div>
            {/* save indicator removed — saves silently */}
          </div>
          <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:2}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{setPage(n.id);setMob(false)}} className="nav-item" style={{display:"flex",alignItems:"center",gap:11,padding:"10px 14px",border:"none",background:page===n.id?C.gp:"transparent",color:page===n.id?C.green:C.t2,cursor:"pointer",fontSize:13.5,fontFamily:F.body,fontWeight:page===n.id?600:500,textAlign:"left",width:"100%",borderRadius:10,borderLeft:page===n.id?`3px solid ${C.green}`:"3px solid transparent",position:"relative",letterSpacing:"0.01em"}}>
              <span style={{fontSize:17,width:24,textAlign:"center",filter:page===n.id?"none":"grayscale(30%)",transition:"filter .2s"}}>{n.e}</span>{n.l}
              {n.id==="home"&&taskCount>0&&<span style={{position:"absolute",right:10,background:"linear-gradient(135deg, #ef4444, #dc2626)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,minWidth:18,textAlign:"center",boxShadow:"0 2px 6px rgba(239,68,68,.3)"}}>{taskCount}</span>}
              {n.id==="tasks"&&taskCount>0&&<span style={{position:"absolute",right:10,background:"linear-gradient(135deg, #f59e0b, #d97706)",color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:10,boxShadow:"0 2px 6px rgba(245,158,11,.3)"}}>{taskCount}</span>}
            </button>
          ))}
          </div>
          <div style={{flex:1}}/>
          {/* Backup controls */}
          <div style={{padding:"10px 14px",borderTop:`1px solid ${C.bdr}`,margin:"0 10px"}}>
            <button onClick={exportData} style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 10px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:11.5,fontFamily:F.body,fontWeight:500,borderRadius:8,transition:"all .2s"}} title="Download farm data as JSON backup">
              <span style={{fontSize:14}}>💾</span> Export Backup
            </button>
            <label style={{display:"flex",alignItems:"center",gap:7,width:"100%",padding:"7px 10px",border:"none",background:"transparent",color:C.t2,cursor:"pointer",fontSize:11.5,fontFamily:F.body,fontWeight:500,borderRadius:8,transition:"all .2s"}} title="Restore from a JSON backup file">
              <span style={{fontSize:14}}>📂</span> Import Backup
              <input type="file" accept=".json" onChange={e => { if(e.target.files[0]) importData(e.target.files[0]); e.target.value=""; }} style={{display:"none"}}/>
            </label>
          </div>
          <div style={{padding:"10px 24px 18px",fontSize:10.5,color:C.t3,fontWeight:500}}>{CROPS.length} crops · {Object.keys(LDB).length} animals</div>
          {isOffline&&<div style={{padding:"8px 20px",fontSize:11,fontWeight:600,color:"#ea580c",background:"linear-gradient(135deg, #fff7ed, #fef3c7)",textAlign:"center",borderRadius:8,margin:"0 10px 10px"}}>📡 Offline — data saved locally</div>}
        </nav>
        {mob&&isMob&&<div onClick={()=>setMob(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.3)",backdropFilter:"blur(4px)",WebkitBackdropFilter:"blur(4px)",zIndex:499,transition:"all .3s"}}/>}
        <main style={{flex:1,overflow:"auto",padding:isMob?"16px":"32px 36px",paddingBottom:80,background:C.bg}}>
          {isMob&&<button onClick={()=>setMob(!mob)} style={{border:"none",background:C.card,fontSize:20,cursor:"pointer",marginBottom:16,width:42,height:42,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:C.sh,transition:"all .2s"}}>☰</button>}
          {pg()}
        </main>
      </div>
      {showFeedbackPrompt && <FeedbackPrompt onOpen={() => { setShowFeedbackPrompt(false); setPage("feedback"); }} onDismiss={() => { setShowFeedbackPrompt(false); try { localStorage.setItem("hfm_feedback_dismissed", "true"); } catch(e) {} }}/>}
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

  const modules = ["Dashboard","Tasks","Farm Layout","Farming","Seasonal Calendar","Livestock","Pantry","Financials","Manuals","AI Assistant"];

  const update = (key, val) => setAnswers(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    const subject = encodeURIComponent("Homestead App Feedback");
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
        <button onClick={() => setPage("home")} style={{padding:"10px 24px",background:C.grd,color:"#fff",border:"none",borderRadius:12,fontSize:14,fontWeight:600,cursor:"pointer",fontFamily:F.body}}>Back to Dashboard</button>
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
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12,fontFamily:F.head}}>1. Which module do you use the most?</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {modules.map(m => (
            <button key={m} onClick={() => update("module", m)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${answers.module === m ? C.green : C.bdr}`,background:answers.module === m ? C.gp : C.bg,color:answers.module === m ? C.green : C.t2,fontSize:13,fontWeight:answers.module === m ? 600 : 500,cursor:"pointer",fontFamily:F.body,transition:"all .2s"}}>{m}</button>
          ))}
        </div>
      </div>

      {/* Q2: Confusion */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12,fontFamily:F.head}}>2. What confused you in the first 5 minutes?</div>
        <textarea value={answers.confusion} onChange={e => update("confusion", e.target.value)} placeholder="e.g. I didn't know where to start, the layout was unclear..." rows={3} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:12,fontSize:13,fontFamily:F.body,resize:"vertical",outline:"none",background:C.bg,boxSizing:"border-box"}}/>
      </div>

      {/* Q3: Missing feature */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12,fontFamily:F.head}}>3. What feature is missing that you'd really want?</div>
        <textarea value={answers.missing} onChange={e => update("missing", e.target.value)} placeholder="e.g. Weather integration, community forum, export to PDF..." rows={3} style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.bdr}`,borderRadius:12,fontSize:13,fontFamily:F.body,resize:"vertical",outline:"none",background:C.bg,boxSizing:"border-box"}}/>
      </div>

      {/* Q4: Willingness to pay */}
      <div style={{background:C.card,borderRadius:C.r,padding:24,marginBottom:16,boxShadow:C.sh,border:`1px solid ${C.bdr}`}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:12,fontFamily:F.head}}>4. Would you pay for this app?</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {["No, must be free","Maybe, if it had more features","Yes, $4.99/mo sounds fair","Yes, I'd pay $9.99/mo for a pro version"].map(opt => (
            <button key={opt} onClick={() => update("pay", opt)} style={{padding:"7px 14px",borderRadius:20,border:`1.5px solid ${answers.pay === opt ? C.green : C.bdr}`,background:answers.pay === opt ? C.gp : C.bg,color:answers.pay === opt ? C.green : C.t2,fontSize:13,fontWeight:answers.pay === opt ? 600 : 500,cursor:"pointer",fontFamily:F.body,transition:"all .2s",textAlign:"left"}}>{opt}</button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button onClick={handleSubmit} style={{width:"100%",padding:"14px",background:C.grd,color:"#fff",border:"none",borderRadius:14,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:F.head,boxShadow:"0 4px 16px rgba(45,106,79,.3)",transition:"transform .2s",marginBottom:12}}>
        Send Feedback via Email
      </button>
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
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:700,color:C.text,fontFamily:F.head,marginBottom:4}}>How's it going?</div>
          <p style={{fontSize:13,color:C.t2,lineHeight:1.5,margin:0}}>You've been using Homestead for a week! We'd love your feedback — it takes just 1 minute.</p>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={onOpen} style={{padding:"8px 16px",background:C.grd,color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:F.body}}>Give Feedback</button>
            <button onClick={onDismiss} style={{padding:"8px 16px",background:"transparent",color:C.t2,border:`1px solid ${C.bdr}`,borderRadius:10,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:F.body}}>Maybe Later</button>
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
    return CROPS.find(c => t.includes(c.name.toLowerCase())) || CROPS.find(c => c.name.toLowerCase().includes(t));
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
    const varieties = VARIETIES[c.name] || [];
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
    const cal = LIVESTOCK_CALENDAR[name];
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
    const sowNow = CROPS.filter(c => {
      const months = c.sowIn.toLowerCase();
      return MN_SHORT[month] && months.includes(MN_SHORT[month].toLowerCase());
    });
    const harvestNow = CROPS.filter(c => {
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
        const c = CROP_MAP.get(p.crop);
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
        const c = CROP_MAP.get(p.crop);
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
    const easyCrops = CROPS.filter(c => getCropDifficulty(c.name).l === "Easy").slice(0, 6);
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
    let r = `All ${CROPS.length} Crops in Database\n\n`;
    const byCat = {};
    CROPS.forEach(c => { if (!byCat[c.cat]) byCat[c.cat] = []; byCat[c.cat].push(c); });
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
      `I have data on ${CROPS.length} crops, ${Object.keys(LDB).length} animals, ${Object.keys(PRESERVATION).length} preservation methods, and ${Object.keys(VARIETIES).length > 0 ? Object.values(VARIETIES).flat().length : 0} varieties. All offline!`;
  }

  // ── FALLBACK: Try to find any matching content ──
  // Search crop names, animal names, preservation names
  const allNames = [...CROPS.map(c => ({name: c.name, type: "crop", emoji: c.emoji})),
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

  return `I didn't find a specific answer for "${query}" in my database.\n\nTry asking about:\n- A specific crop: "How to grow tomatoes"\n- An animal: "Chicken care"\n- Seasonal advice: "What to plant now"\n- Your farm: "My farm status"\n- Tasks: "What should I do today"\n\nI have ${CROPS.length} crops and ${Object.keys(LDB).length} animals in my offline knowledge base!`;
}

// ── Build suggestion catalog from all database entries ──
const AI_SUGGESTIONS = (() => {
  const s = [];
  // Crop suggestions — each crop gets multiple query variants
  CROPS.forEach(c => {
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
    if (LIVESTOCK_CALENDAR[name]) s.push({e:db.e, q:`${name} monthly calendar`, cat:"Calendar", keys:[name.toLowerCase(),"calendar","month","schedule"]});
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
})();

function AIAssistant({data}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([
    {role:"assistant", content:`Hi! I'm your farm assistant. I know everything about the ${CROPS.length} crops and ${Object.keys(LDB).length} animals in your database — and I work offline!\n\nStart typing a crop or animal name and pick from the dropdown, or tap a quick prompt below.`}
  ]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selIdx, setSelIdx] = useState(-1);
  const scrollRef = useRef(null);
  const sugRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs, open]);

  // Filter suggestions as user types
  useEffect(() => {
    const q = input.trim().toLowerCase();
    if (q.length < 2) { setSuggestions([]); setSelIdx(-1); return; }
    const words = q.split(/\s+/);
    const scored = AI_SUGGESTIONS.map(s => {
      let score = 0;
      // Exact name match at start of any key
      if (s.keys.some(k => k.startsWith(q))) score += 10;
      // Partial match on any key
      else if (s.keys.some(k => k.includes(q))) score += 6;
      // Word-level matches
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
    // Deduplicate by query text, keep top 8
    const seen = new Set();
    const unique = [];
    for (const s of scored) {
      if (!seen.has(s.q) && unique.length < 8) { seen.add(s.q); unique.push(s); }
    }
    setSuggestions(unique);
    setSelIdx(-1);
  }, [input]);

  const sendQuery = (text) => {
    if (!text.trim()) return;
    const reply = farmKnowledgeEngine(text, data);
    setMsgs(prev => [...prev, {role:"user", content: text}, {role:"assistant", content: reply}]);
    setInput("");
    setSuggestions([]);
    setSelIdx(-1);
  };

  const send = () => sendQuery(input.trim());

  const handleKeyDown = (e) => {
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") { e.preventDefault(); setSelIdx(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setSelIdx(i => Math.max(i - 1, -1)); return; }
      if (e.key === "Enter" && !e.shiftKey && selIdx >= 0) { e.preventDefault(); sendQuery(suggestions[selIdx].q); return; }
      if (e.key === "Tab" && selIdx >= 0) { e.preventDefault(); setInput(suggestions[selIdx].q); setSuggestions([]); return; }
      if (e.key === "Escape") { setSuggestions([]); setSelIdx(-1); return; }
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
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,borderRadius:18,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🌾</div>
              <div>
                <div style={{fontSize:15,fontWeight:700,color:"#fff",fontFamily:F.head}}>Farm Assistant</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.7)"}}>Offline · {CROPS.length} crops · {Object.keys(LDB).length} animals</div>
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
                    <div style={{flex:1,minWidth:0}}>
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
                onChange={e=>setInput(e.target.value)}
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
                style={{flexShrink:0,width:34,height:34,borderRadius:17,background:!input.trim()?"#ccc":C.green,border:"none",cursor:!input.trim()?"default":"pointer",color:"#fff",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}
              >➤</button>
            </div>
            <div style={{fontSize:10,color:C.t3,textAlign:"center",marginTop:5}}>Type 2+ letters to see suggestions · Works offline</div>
          </div>
        </div>
      )}
    </>
  );
}


