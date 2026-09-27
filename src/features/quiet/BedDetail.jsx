import PlantingControls from "./PlantingControls";
import { planPlanting, plantingInput } from "./planting-plan";
import { useState } from "react";
import { zoneGeometry, bedLength, bedRows, layoutPlots, growthOf, STAGES, axisOf } from "./farm-model";
import { todayLocalKey } from "../../lib/utils";
import { rCM, getRegionalVarieties } from "../../lib/regional";
import PlantArt from "./PlantArt";
import BedPlan from "./BedPlan";
import { expectedYield } from "../../lib/farm-calc";
export default function BedDetail({ zone: rawZone, data, setData, onPlot, highlightId }) {
  const zone = zoneGeometry(rawZone, data.farmW, data.farmH);
  const plots = layoutPlots(zone, data.garden?.plots || []),
    rows = bedRows(zone),
    crops = rCM(data.region);
  const keyCrops = [...new Set(plots.filter((p) => p.status !== "harvested").map((p) => p.crop).filter(Boolean))].slice(0, 4);
  const [editId, setEditId] = useState(null),
    [draft, setDraft] = useState({});
  const editing = plots.find((p) => p.id === editId),
    editCrop = editing ? crops.get(editing.crop) : null,
    input = editing ? plantingInput(draft, editCrop, zone) : draft,
    plan = editing ? planPlanting(zone, data.garden.plots, input, editCrop, editId) : null;
  const yieldKg = editing
    ? (plan.yieldFactor ?? 1) *
      expectedYield(
        editing.crop,
        plan.count,
        "plants",
        getRegionalVarieties(editing.crop, data.region).find((v) => v.name === editing.variety)?.yld,
        data.region,
      )
    : 0;
  function save() {
    if (plan.error) return;
    setData({
      ...data,
      garden: {
        ...data.garden,
        plots: data.garden.plots.map((p) =>
          p.id === editId
            ? {
                ...p,
                layout: plan.layout,
                plantCount: plan.count,
                qty: plan.count,
                measureType: "plants",
                expectedYieldKg: Math.round(yieldKg * 10) / 10,
                plantingPattern: plan.layout.pattern,
              }
            : p,
        ),
      },
    });
    setEditId(null);
  }
  return (
    <section className="q-bed-detail">
      <div className="q-row q-between">
        <div>
          <div className="q-eyebrow">A closer look</div>
          <h3>
            {zone.type === "orchard"
              ? "Orchard planting"
              : `${plots.some((p) => p.layout.version === 2) ? plots.filter((p) => p.layout.pattern !== "scatter").reduce((n, p) => n + p.layout.rowCount, 0) : rows} rows · ${bedLength(zone)} m long`}
          </h3>
        </div>
        <span className="q-pill">Top view</span>
      </div>
      <p>Explore your planting layout.{onPlot && " Tap a planting for its care guide."}</p>
      <BedPlan zone={zone} plots={data.garden?.plots || []} crops={crops} onPlot={onPlot} highlightId={highlightId} />
      {/* the stage key shows the bed's own crops — one row per crop planted here */}
      {(keyCrops.length ? keyCrops : [zone.type === "orchard" ? "Fig" : "Tomato"]).map((crop) => (
        <div className="q-stage-key" key={crop} aria-label={`Growth stages of ${crop}`}>
          {keyCrops.length > 1 && <b className="q-stage-key-crop">{crop}</b>}
          {STAGES.slice(1).map((label, i) => (
            <div key={label}>
              <PlantArt crop={crop} stage={i + 1} size={32} />
              <small>{label}</small>
            </div>
          ))}
        </div>
      ))}
      {plots.map((p) => {
        const stage = growthOf(p, crops.get(p.crop), todayLocalKey());
        return (
          <article className="q-plant-entry" key={p.id}>
            <PlantArt crop={p.crop} stage={stage.index} size={56} />
            <div className="q-grow">
              <strong>{p.name || p.crop}</strong>
              <p>
                {p.layout.pattern === "scatter"
                  ? "Scattered trees"
                  : `${p.layout.rowCount} ${p.layout.version === 2 ? axisOf(zone, p.layout) + " " : ""}rows · ${p.layout.lengthM} m`}{" "}
                · {p.plantCount || "Unrecorded"} plants
                {p.layout.spacingCM ? ` · ${p.layout.spacingCM} cm apart` : ""} ·{" "}
                {p.layout.pattern === "offset"
                  ? "Biointensive grid"
                  : p.layout.pattern === "scatter"
                    ? "Natural arrangement"
                    : "Straight rows"}
              </p>
              <small>
                {stage.label} · {stage.estimated ? "estimated from planting date" : "observed"}
                {p.observedStageDate ? ` ${p.observedStageDate}` : ""}
              </small>
              {p.inferred && (
                <small className="q-warning">Suggested row position. Confirm your real layout below.</small>
              )}
              {p.outside && (
                <small className="q-warning">
                  This planting extends outside the recorded bed. Edit its rows.
                </small>
              )}
              {setData && (
                <div className="q-row q-wrap">
                  <button
                    className="q-text-button"
                    onClick={() => {
                      setEditId(p.id);
                      setDraft({
                        ...p.layout,
                        axis: axisOf(zone, p.layout),
                        mode: "plants",
                        startM: undefined,
                        plantCount: p.plantCount || 1,
                      });
                    }}
                  >
                    Edit spacing & layout
                  </button>
                  <label className="q-stage-select">
                    Growth stage
                    <select
                      aria-label={`Observed stage for ${p.name || p.crop}`}
                      value={p.observedStage ?? ""}
                      onChange={(e) =>
                        setData({
                          ...data,
                          garden: {
                            ...data.garden,
                            plots: data.garden.plots.map((a) =>
                              a.id === p.id
                                ? {
                                    ...a,
                                    observedStage: e.target.value === "" ? null : +e.target.value,
                                    observedStageDate: e.target.value ? todayLocalKey() : null,
                                  }
                                : a,
                            ),
                          },
                        })
                      }
                    >
                      <option value="">Use estimate</option>
                      {STAGES.slice(1).map((l, i) => (
                        <option value={i + 1} key={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          </article>
        );
      })}
      {editId && (
        <div className="q-inset">
          <h3>Edit planting layout</h3>
          <PlantingControls
            value={input}
            onChange={setDraft}
            plan={plan}
            crop={crops.get(editing.crop)}
            zone={zone}
            yieldKg={Math.round(yieldKg * 10) / 10}
            plots={data.garden.plots}
            crops={crops}
            editId={editId}
          />
          <div className="q-row">
            <button className="q-button" disabled={!!plan.error} onClick={save}>
              Save layout
            </button>
            <button className="q-secondary" onClick={() => setEditId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
