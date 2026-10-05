import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GroveScene from "../src/features/grove/GroveScene";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";
// A balcony: containers, a herb trough and a raised planter on a stone floor — no hedge, no trees, no fence posts.
const zone = (id, type, name, xM, yM, wM, hM, extra = {}) => ({ id, type, name, xM, yM, wM, hM, rowCount: 2, ...extra });
const zones = [zone("pots", "container", "Pots", .5, .5, 4, 3), zone("herbs", "herbs", "Herb trough", 5.5, .5, 5, 1.2), zone("raised", "raised", "Planter", 5.5, 2.6, 5, 1.4)];
const plot = (crop, z, start, rowCount, count) => ({ id: z + "-" + start, zone: z, crop, status: "planted", plantDate: "2026-05-01", observedStage: 5, plantCount: count, layout: { startRow: start, rowCount, pattern: "rows", lengthM: zones.find((a) => a.id === z).wM } });
const data = { ...fixture, farmW: 11, farmH: 4.5, profile: { ...fixture.profile, environment: "balcony" }, zones, garden: { plots: [plot("Tomato", "pots", 1, 2, 6), plot("Basil", "herbs", 1, 2, 12), plot("Strawberry", "raised", 1, 2, 10)] }, livestock: { animals: [] }, ornaments: [{ id: "bn", type: "bench", xM: 2.5, yM: 4 }, { id: "hp", type: "hangpot", xM: 10, yM: 4.2 }], mapLines: [] };
export default function Preview() { const [d, setD] = useState(data); return <main style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}><GroveScene data={d} setData={setD} /></main>; }
createRoot(document.getElementById("root")).render(<Preview />);
