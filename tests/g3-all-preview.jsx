import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GroveScene from "../src/features/grove/GroveScene";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";
// Exercises every zone type, oval shapes, drawn fences/gates, ornaments and a clay roof in the 3D engine.
const zone = (id, type, name, xM, yM, wM, hM, extra = {}) => ({ id, type, name, xM, yM, wM, hM, rowCount: 5, ...extra });
const zones = [
  zone("home", "house", "Clay-roof house", 2, 2, 8, 6, { color: "clay" }),
  zone("nursery", "nursery", "Seedling nursery", 13, 2, 7, 5),
  zone("pond", "water", "Oval pond", 23, 2, 8, 6, { shape: "oval" }),
  zone("field", "pasture", "Round paddock", 33, 1, 12, 9, { shape: "oval" }),
  zone("coop", "barn", "Small coop", 2, 11, 3.5, 2.5),
  zone("store", "storage", "Store", 8, 11, 3, 2.5),
  zone("veg", "veg", "Rows", 13, 10, 8, 5, { rowAxis: "vertical" }),
  zone("herbs", "herbs", "Herbs", 23, 11, 5, 3),
  zone("pots", "container", "Empty pots", 30, 12, 3, 3),
  zone("compost", "compost", "Compost", 35, 12, 3, 2),
  zone("hives", "beehive", "Hives", 40, 12, 4, 3),
  zone("gh", "greenhouse", "Tall greenhouse", 2, 16, 5, 9),
  zone("raised", "raised", "Raised", 9, 17, 6, 3),
  zone("orchard", "orchard", "Orchard", 17, 16, 10, 8),
];
const plot = (crop, z, start, rowCount, count) => ({ id: z + "-" + start, zone: z, crop, status: "planted", plantDate: "2026-01-01", observedStage: 4, plantCount: count, layout: { startRow: start, rowCount, pattern: "rows", lengthM: zones.find((a) => a.id === z).wM } });
const data = { ...fixture, farmW: 46, farmH: 26, profile: { ...fixture.profile, environment: "farm" }, zones,
  garden: { plots: [plot("Olive", "orchard", 1, 3, 12), plot("Carrot", "veg", 1, 4, 60), plot("Rosemary", "herbs", 1, 2, 20), plot("Tomato", "gh", 1, 3, 30), plot("Lettuce", "raised", 1, 3, 30)] },
  livestock: { animals: [{ id: "goats", type: "Goat", zone: "field", count: 4 }, { id: "hens", type: "Chicken", zone: "coop", count: 4 }] },
  ornaments: [{ id: "t1", type: "tree", xM: 28, yM: 20 }, { id: "sh", type: "shed", xM: 31, yM: 20 }, { id: "rk", type: "rock", xM: 34, yM: 21 }, { id: "bn", type: "bench", xM: 36, yM: 21 }, { id: "wp", type: "woodpile", xM: 38, yM: 21 }, { id: "hb", type: "haybale", xM: 40, yM: 20 }],
  mapLines: [{ id: "f1", kind: "fence", points: [{ xM: 30, yM: 16 }, { xM: 44, yM: 16 }, { xM: 44, yM: 24 }] }, { id: "g1", kind: "gate", points: [{ xM: 44, yM: 24 }, { xM: 44, yM: 25.5 }] }, { id: "p1", kind: "path", points: [{ xM: 30, yM: 17 }, { xM: 43, yM: 23 }] }] };
export default function Preview() { const [d, setD] = useState(data); return <main style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}><GroveScene data={d} setData={setD} /></main>; }
createRoot(document.getElementById("root")).render(<Preview />);
