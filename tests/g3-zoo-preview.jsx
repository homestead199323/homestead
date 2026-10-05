import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import GroveScene from "../src/features/grove/GroveScene";
import { fixture } from "./fixture";
import "../src/index.css";
import "../src/features/quiet/quiet.css";
// Every animal species in the 3D engine, in one paddock and one coop, for a close look at the models.
const zone = (id, type, name, xM, yM, wM, hM, extra = {}) => ({ id, type, name, xM, yM, wM, hM, rowCount: 5, ...extra });
const zones = [
  zone("field", "pasture", "Big paddock", 2, 2, 30, 16),
  zone("coop", "coop", "Coop", 2, 20, 7, 5),
  zone("barn", "barn", "Barn", 12, 20, 8, 5),
];
const data = { ...fixture, farmW: 36, farmH: 30, profile: { ...fixture.profile, environment: "farm" }, zones, garden: { plots: [] }, ornaments: [], mapLines: [],
  livestock: { animals: [
    { id: "cows", type: "Cow", zone: "field", count: 3 }, { id: "horse", type: "Horse", zone: "field", count: 2 }, { id: "donkey", type: "Donkey", zone: "field", count: 1 },
    { id: "alpaca", type: "Alpaca", zone: "field", count: 2 }, { id: "pig", type: "Pig", zone: "field", count: 2 },
    { id: "hens", type: "Chicken", zone: "coop", count: 5 }, { id: "ducks", type: "Duck", zone: "coop", count: 2 }, { id: "geese", type: "Goose", zone: "coop", count: 2 },
    { id: "turkey", type: "Turkey", zone: "barn", count: 2 }, { id: "quail", type: "Quail", zone: "barn", count: 3 }, { id: "gf", type: "Guinea Fowl", zone: "barn", count: 2 }, { id: "rab", type: "Rabbit", zone: "barn", count: 3 },
  ] } };
export default function Preview() { const [d, setD] = useState(data); return <main style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}><GroveScene data={d} setData={setD} /></main>; }
createRoot(document.getElementById("root")).render(<Preview />);
