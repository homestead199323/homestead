import { spacingGuide, plantDensity } from "../../data/spacing.js";
import BedPlan from "./BedPlan";

const PATTERNS = [
  ["rows", "Straight rows", "Plants line up across rows."],
  ["offset", "Biointensive grid", "Offset rows; every plant the same distance apart."],
];

function GridIcon({ offset, vertical }) {
  return (
    <svg viewBox="0 0 92 44" aria-hidden="true">
      {Array.from({ length: 3 }, (_, r) =>
        Array.from({ length: 5 }, (_, c) => {
          const along = 10 + c * 16 + (offset && r % 2 ? 8 : 0),
            across = 7 + r * 15;
          return vertical ? (
            <circle key={`${r}-${c}`} cx={30 + r * 15} cy={4 + (along / 92) * 40} r="3.2" />
          ) : (
            <circle key={`${r}-${c}`} cx={along} cy={across} r="3.6" />
          );
        }),
      )}
    </svg>
  );
}

/**
 * `value` is the planting form after plantingInput() defaults; edits are sent back through onChange.
 * Either the plant count or the row count drives the plan; the other is filled in from it.
 */
export default function PlantingControls({
  value,
  onChange,
  plan,
  crop,
  zone,
  yieldKg,
  plots,
  crops,
  editId,
}) {
  const orchard = zone?.type === "orchard",
    scatter = value.pattern === "scatter",
    byRows = value.mode === "rows" && !scatter,
    vertical = value.axis === "vertical";
  const update = (patch) => onChange({ ...value, ...patch, startM: undefined, alongStartM: undefined });
  const guide = spacingGuide(crop, value.pattern === "offset" ? "offset" : "rows");
  const alongMax = zone ? (vertical ? zone.hM : zone.wM) : 0;
  const density = scatter ? 0 : plantDensity(value.spacingCM, value.rowSpacingCM);
  const factor = plan?.yieldFactor ?? 1;
  return (
    <section className="q-inset q-planting-controls">
      {orchard && (
        <fieldset className="q-pattern-picker">
          <legend>Tree layout</legend>
          <div className="q-row" role="group">
            <button
              type="button"
              className="q-secondary"
              aria-pressed={scatter}
              onClick={() =>
                update({ pattern: "scatter", mode: "plants", spacingCM: undefined, rowSpacingCM: undefined })
              }
            >
              Scattered (natural)
            </button>
            <button
              type="button"
              className="q-secondary"
              aria-pressed={!scatter}
              onClick={() => update({ pattern: "rows", spacingCM: undefined, rowSpacingCM: undefined })}
            >
              In rows
            </button>
          </div>
        </fieldset>
      )}
      {!scatter && (
        <>
          <fieldset className="q-pattern-picker">
            <legend>Row direction</legend>
            <div className="q-grid2">
              {[
                ["horizontal", "Horizontal", "Rows run left–right on the map."],
                ["vertical", "Vertical", "Long streaks top–bottom on the map."],
              ].map(([key, label, description]) => (
                <label key={key} className={value.axis === key ? "is-selected" : ""}>
                  <input
                    type="radio"
                    name="planting-axis"
                    value={key}
                    checked={value.axis === key}
                    onChange={() => update({ axis: key, lengthM: undefined })}
                  />
                  <GridIcon vertical={key === "vertical"} offset={value.pattern === "offset"} />
                  <strong>{label}</strong>
                  <small>{description}</small>
                </label>
              ))}
            </div>
          </fieldset>
          {!orchard && (
            <fieldset className="q-pattern-picker">
              <legend>Planting grid</legend>
              <div className="q-grid2">
                {PATTERNS.map(([key, label, description]) => (
                  <label key={key} className={value.pattern === key ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="planting-pattern"
                      value={key}
                      checked={value.pattern === key}
                      onChange={() => update({ pattern: key, spacingCM: undefined, rowSpacingCM: undefined })}
                    />
                    <GridIcon offset={key === "offset"} vertical={vertical} />
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </>
      )}
      <div className="q-grid2">
        <label>
          {orchard ? "Trees" : "Plants"}
          <input
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={byRows ? plan?.count || "" : (value.plantCount ?? "")}
            onChange={(e) => update({ mode: "plants", plantCount: e.target.value })}
          />
        </label>
        {!scatter && (
          <label>
            Rows
            <input
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              value={byRows ? (value.rowCount ?? "") : plan?.rows || ""}
              onChange={(e) => update({ mode: "rows", rowCount: e.target.value })}
            />
          </label>
        )}
      </div>
      <small>
        {scatter
          ? "Trees are placed naturally, keeping the spacing below from every other tree."
          : "Enter plants or rows — the other fills in from the row length and spacing."}
      </small>
      <div className="q-grid2">
        <label>
          {scatter
            ? "Space between trees (cm)"
            : value.pattern === "offset"
              ? "Plant spacing (cm, all directions)"
              : "In-row spacing (cm)"}
          <input
            type="number"
            min="1"
            step="0.5"
            value={value.spacingCM}
            onChange={(e) =>
              update({
                spacingCM: e.target.value,
                rowSpacingCM: value.pattern === "offset" ? undefined : value.rowSpacingCM,
              })
            }
          />
        </label>
        {!scatter && (
          <label>
            Between rows (cm)
            <input
              type="number"
              min="1"
              step="0.5"
              value={value.rowSpacingCM}
              onChange={(e) => update({ rowSpacingCM: e.target.value })}
            />
          </label>
        )}
        {!scatter && (
          <label>
            Row length (m)
            <input
              type="number"
              min="0.3"
              step="0.1"
              max={alongMax}
              value={value.lengthM ?? plan?.layout?.lengthM ?? alongMax}
              onChange={(e) => update({ lengthM: e.target.value })}
            />
          </label>
        )}
      </div>
      <p className="q-spacing-guide">
        Guide for {crop?.name}:{" "}
        {scatter
          ? `${crop?.spacing} cm between trees`
          : value.pattern === "offset"
            ? `${guide.hexCM} cm biointensive spacing (rows ${guide.rowCM} cm apart)`
            : `${guide.inRowCM} cm in the row, ${guide.rowCM} cm between rows`}
        {(String(value.spacingCM) !== String(scatter ? crop?.spacing : guide.inRowCM) ||
          (!scatter && String(value.rowSpacingCM) !== String(guide.rowCM))) && (
          <>
            {" · "}
            <button
              type="button"
              className="q-text-button"
              onClick={() => update({ spacingCM: undefined, rowSpacingCM: undefined })}
            >
              Use guide
            </button>
          </>
        )}
      </p>
      {scatter && (
        <button
          type="button"
          className="q-text-button"
          onClick={() => update({ seed: String(Date.now() % 100000) })}
        >
          Shuffle tree positions
        </button>
      )}
      <div role="status" className="q-planting-summary">
        <strong>
          {plan?.count || 0} {orchard ? "trees" : "plants"}
          {!scatter && ` · ${plan?.rows || 0} rows`}
          {density > 0 && ` · ${density >= 10 ? Math.round(density) : density.toFixed(1)} per m²`}
        </strong>
        {yieldKg != null && <span>Estimated harvest: ~{yieldKg} kg</span>}
      </div>
      {factor < 1 && !plan?.error && (
        <p className="q-warning">
          Closer than the biointensive guide: each plant is estimated at {Math.round(factor * 100)}% of its
          usual yield, so extra plants won’t raise the total. Widen spacing to give each plant its full share.
        </p>
      )}
      {plan?.shortened && (
        <small>Rows shortened to {plan.layout.lengthM} m to fit the free space in this bed.</small>
      )}
      {plan?.error && <p className="q-warning">{plan.error}</p>}
      {plots && crops && zone && (
        <div className="q-planting-preview">
          <small>{plan?.error ? "Current bed" : "Preview — the new planting is highlighted"}</small>
          <BedPlan
            zone={zone}
            crops={crops}
            highlightId="__preview"
            fit
            plots={
              plan && !plan.error
                ? [
                    ...plots.filter((p) => p.id !== editId),
                    {
                      id: "__preview",
                      zone: zone.id,
                      crop: crop.name,
                      plantCount: plan.count,
                      layout: plan.layout,
                      status: "planned",
                    },
                  ]
                : plots
            }
          />
        </div>
      )}
    </section>
  );
}
