import { useId, useState, useRef, useEffect } from "react";
import { Plus, Minus, Maximize2 } from "lucide-react";
import { AerialDefs, CropCrown, Fence } from "../grove/AerialArtwork";
import { plantedRows, plantPosition } from "../grove/aerial-layout";
import { growthOf, layoutPlots, bedRows } from "./farm-model";
import { plantingRows } from "./planting-plan";
import { todayLocalKey } from "../../lib/utils";

const MAX_PER_ROW = 150;

// Close-up of one bed in metres. Modern plantings draw every recorded plant at its real position,
// in the row direction chosen for that planting; older plantings keep their even row layout.
export default function BedPlan({ zone, plots, crops, onPlot, highlightId, fit = false }) {
  const id = useId().replace(/:/g, ""),
    [zoom, setZoom] = useState(1),
    [width, setWidth] = useState(360),
    container = useRef(null);
  useEffect(() => {
    const o = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    o.observe(container.current);
    return () => o.disconnect();
  }, []);
  const orchard = zone.type === "orchard",
    zoneVertical = zone.rowAxis === "vertical";
  const active = layoutPlots(zone, plots);
  const modern = active.filter((p) => p.layout.version === 2 && p.layout.pattern !== "scatter");
  const scatter = active.filter((p) => p.layout.pattern === "scatter");
  const legacy = plantedRows(zone, plots).filter((r) => r.planting && r.planting.layout.version !== 2);
  const w = zone.wM,
    h = zone.hM,
    gap = (zoneVertical ? w : h) / bedRows(zone);
  const smallest = Math.min(
    gap,
    ...modern.map((p) => Math.min(p.layout.spacingCM, p.layout.rowSpacingCM) / 100),
  );
  const baseWidth = fit ? width : Math.max(width, Math.min(3000, (w / Math.max(0.03, smallest)) * 14));
  const unit = w / baseWidth / zoom,
    font = unit * 11,
    gutter = orchard ? 0.1 : unit * 34;
  const stageOf = (p) => growthOf(p, crops.get(p.crop), todayLocalKey()).index;
  const link = (p) =>
    onPlot
      ? {
          role: "button",
          tabIndex: 0,
          className: "q-bed-row-link",
          onClick: () => onPlot(p.id),
          onKeyDown: (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onPlot(p.id);
            }
          },
        }
      : {};
  function label(text, x, y) {
    return (
      <g transform={`translate(${x} ${y})`} pointerEvents="none">
        <rect
          x={-font * 1.3}
          y={-font * 0.8}
          width={font * 2.6}
          height={font * 1.6}
          rx={font * 0.4}
          fill="#fff"
          stroke="#bbc5b6"
          strokeWidth={unit}
        />
        <text
          className="q-row-number"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#203e2b"
          fontSize={font}
          fontWeight="700"
        >
          {text}
        </text>
      </g>
    );
  }
  return (
    <>
      <div ref={container} className="q-bed-plan-scroll">
        <svg
          className="q-bed-plan"
          style={{ width: baseWidth * zoom }}
          viewBox={`${-gutter} -.12 ${w + gutter + 0.12} ${h + gutter + 0.12}`}
          aria-label={`${zone.name}: ${w} by ${h} metres`}
        >
          <AerialDefs id={id} />
          <rect
            width={w}
            height={h}
            fill={`url(#${id}-${orchard ? "meadow" : "soil"})`}
            stroke={`url(#${id}-wood)`}
            strokeWidth=".1"
          />
          {modern.map((p) => {
            const stage = stageOf(p),
              rows = plantingRows(zone, p),
              hl = highlightId === p.id;
            return (
              <g
                key={p.id}
                aria-label={`${p.crop}: ${rows.length} rows, ${p.plantCount} plants`}
                {...link(p)}
              >
                {rows.map((row, i) => {
                  const band = Math.min(0.6, row.gapM * 0.75),
                    size = Math.min(row.gapM * 0.95, row.pitchM * 0.95, 0.85);
                  const pts =
                    row.points.length > MAX_PER_ROW
                      ? Array.from(
                          { length: MAX_PER_ROW },
                          (_, j) => row.points[Math.floor(((j + 0.5) * row.points.length) / MAX_PER_ROW)],
                        )
                      : row.points;
                  return (
                    <g key={i}>
                      <rect
                        x={row.vertical ? row.atM - band / 2 : row.fromM}
                        y={row.vertical ? row.fromM : row.atM - band / 2}
                        width={row.vertical ? band : row.toM - row.fromM}
                        height={row.vertical ? row.toM - row.fromM : band}
                        fill={hl ? "#fff6c9" : "#21150e"}
                        fillOpacity={hl ? 0.28 : 0.2}
                      />
                      {pts.map((q, j) => (
                        <CropCrown
                          key={j}
                          crop={p.crop}
                          stage={stage}
                          x={q.xM}
                          y={q.yM}
                          size={size}
                          id={id}
                          seed={i * 103 + j}
                        />
                      ))}
                      {(row.gapM >= font * 2.8 || i === 0 || i === rows.length - 1) &&
                        (row.vertical
                          ? label(String(i + 1), row.atM, h + gutter / 2)
                          : label(String(i + 1), -gutter / 2, row.atM))}
                    </g>
                  );
                })}
              </g>
            );
          })}
          {legacy.map((row) => {
            const p = row.planting,
              stage = stageOf(p),
              along = zoneVertical ? h : w,
              at = row.atM ?? (row.number - 0.5) * gap,
              edge = Math.min(0.1, along * 0.05),
              length = (along - edge * 2) * row.fraction,
              count = Math.min(MAX_PER_ROW, row.count),
              size = Math.min(gap * 0.9, length / Math.max(1, row.count), orchard ? 3 : 0.85);
            return (
              <g key={`legacy-${row.number}`} {...link(p)}>
                {!orchard && (
                  <path
                    d={
                      zoneVertical
                        ? `M${at} ${edge}v${along - edge * 2}`
                        : `M${edge} ${at}h${along - edge * 2}`
                    }
                    stroke="#21150e"
                    strokeOpacity=".2"
                    strokeWidth={gap * 0.75}
                  />
                )}
                {Array.from({ length: count }, (_, j) => {
                  const pos = edge + plantPosition(row, j, count) * length;
                  return (
                    <CropCrown
                      key={j}
                      crop={p.crop}
                      stage={stage}
                      x={zoneVertical ? at : pos}
                      y={zoneVertical ? pos : at}
                      size={size}
                      id={id}
                      seed={row.number * 103 + j}
                    />
                  );
                })}
                {!orchard &&
                  (zoneVertical
                    ? label(String(p.layout.startRow + row.rowOffset), at, h + gutter / 2)
                    : label(String(p.layout.startRow + row.rowOffset), -gutter / 2, at))}
              </g>
            );
          })}
          {scatter.map((p) => (
            <g key={p.id} aria-label={`${p.crop}, ${p.plantCount} scattered trees`} {...link(p)}>
              {p.layout.points.map((q, i) => (
                <CropCrown
                  key={i}
                  crop={p.crop}
                  stage={stageOf(p)}
                  x={q.xM}
                  y={q.yM}
                  size={Math.min(4, (p.layout.spacingCM / 100) * 0.8)}
                  id={id}
                />
              ))}
            </g>
          ))}
          {orchard && <Fence w={w} h={h} id={id} gate pickets />}
        </svg>
      </div>
      <div className="q-row q-between q-bed-plan-tools">
        <small>
          One {orchard ? "tree" : "plant"} per symbol · {w} × {h} m
        </small>
        <div className="q-row">
          <button
            className="q-icon"
            aria-label="Zoom out bed"
            disabled={zoom === 1}
            onClick={() => setZoom(Math.max(1, zoom - 0.5))}
          >
            <Minus size={15} />
          </button>
          <button className="q-icon" aria-label="Reset bed zoom" onClick={() => setZoom(1)}>
            <Maximize2 size={15} />
          </button>
          <button
            className="q-icon"
            aria-label="Zoom in bed"
            disabled={zoom === 4}
            onClick={() => setZoom(Math.min(4, zoom + 0.5))}
          >
            <Plus size={15} />
          </button>
        </div>
      </div>
      {[...modern, ...legacy.map((r) => r.planting)].some((p) =>
        plantingRows(zone, p).some((r) => r.points.length > MAX_PER_ROW),
      ) && (
        <small>
          Rows with more than {MAX_PER_ROW} plants show an even sample; counts and yields use every plant.
        </small>
      )}
    </>
  );
}
