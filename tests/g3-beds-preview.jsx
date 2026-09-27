import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GroveScene from "../src/features/grove/GroveScene";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";
// A market-garden layout: three blocks of narrow numbered raised beds, the case where labels must sit
// unambiguously on their own bed.
const zone = (id, type, name, xM, yM, wM, hM, extra = {}) => ({ id, type, name, xM, yM, wM, hM, rowCount: 1, ...extra });
const zones = [zone("barn", "barn", "Barn", 1, 1, 9, 7), zone("gh", "greenhouse", "Greenhouse", 12, 1, 6, 8)];

[[1, 11], [20, 1], [20, 14]].forEach(([bx, by], blk) => { for (let i = 0; i < 6; i++) { zones.push(zone(`b${blk}-${i}`, "raised", String(i + 1), bx + i * 1.8, by, 1.2, 10, { rowAxis: "vertical" })); } });
const crops = ["Lettuce", "Carrot", "Cabbage", "Onion", "Basil", "Tomato"];
const plots = zones.filter((z) => z.type === "raised").map((z, i) => ({ id: "p" + z.id, zone: z.id, crop: crops[i % 6], status: "planted", plantDate: "2026-06-01", observedStage: i % 3 === 0 ? null : (i % 5) + 1, plantCount: 40, layout: { startRow: 1, rowCount: 1, pattern: "rows", lengthM: 10, spacingCM: 25, version: 1 } }));
const data = { ...fixture, farmW: 32, farmH: 26, profile: { ...fixture.profile, environment: "farm" }, zones, garden: { plots }, livestock: { animals: [{ id: "hens", type: "Chicken", zone: "barn", count: 5 }] }, ornaments: [], mapLines: [] };
if (typeof window !== "undefined") window.__fixtures = { beds: data };
export default function Preview() { const [d, setD] = useState(data); return <main style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}><GroveScene data={d} setData={setD} /></main>; }
createRoot(document.getElementById("root")).render(<Preview />);
