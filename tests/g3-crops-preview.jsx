import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GroveScene from "../src/features/grove/GroveScene";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";
// Every crop family of the 3D engine at every stage, one crop per row, for a close look at the plant models.
const CROPS = ["Tomato", "Pepper (Sweet)", "Eggplant", "Potato", "Lettuce", "Spinach", "Swiss Chard", "Kale", "Cabbage", "Broccoli", "Cauliflower", "Brussels Sprouts", "Carrot", "Beetroot", "Radish", "Fennel", "Onion", "Leek", "Pumpkin", "Zucchini", "Cucumber", "Watermelon", "Bean (Dry)", "Pea", "Broad Bean", "Corn", "Wheat", "Sunflower", "Lavender", "Rosemary", "Chamomile", "Basil", "Strawberry", "Raspberry", "Grape", "Asparagus", "Rhubarb", "Artichoke"];
const zone = (id, type, name, xM, yM, wM, hM, extra = {}) => ({ id, type, name, xM, yM, wM, hM, rowCount: 1, ...extra });
const zones = [];
const plots = [];
CROPS.forEach((crop, i) => {
  const col = i % 8, row = Math.floor(i / 8), x = 1 + col * 5.2, y = 1 + row * 4.4;
  [5, 3].forEach((stage, k) => {
    const id = `b${i}-${k}`; zones.push(zone(id, "veg", `${crop} ${stage === 5 ? "harvest" : "growing"}`, x, y + k * 2.1, 4.6, 1.5, { rowAxis: "horizontal" }));
    plots.push({ id: "p" + id, zone: id, crop, status: "planted", plantDate: "2026-06-01", observedStage: stage, plantCount: 6, layout: { startRow: 1, rowCount: 1, pattern: "rows", lengthM: 4.6, spacingCM: 70, version: 1 } });
  });
});
const data = { ...fixture, farmW: 44, farmH: 24, profile: { ...fixture.profile, environment: "farm" }, zones, garden: { plots }, livestock: { animals: [] }, ornaments: [], mapLines: [] };
export default function Preview() { const [d, setD] = useState(data); return <main style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}><GroveScene data={d} setData={setD} /></main>; }
createRoot(document.getElementById("root")).render(<Preview />);
