import { POULTRY_SPECIES, GRAZER_SPECIES } from "../../../data/livestock";

export const PLANT_ZONE_TYPES = new Set(["veg", "orchard", "herbs", "greenhouse", "raised", "container"]);

export function isPlantZone(type) {
  return PLANT_ZONE_TYPES.has(type);
}

export function zoneRadius(type) {
  if (type === "raised" || type === "container") return 10;
  if (type === "orchard" || type === "water" || type === "herbs" || type === "pasture") return 24;
  if (type === "greenhouse" || type === "house") return 16;
  if (type === "storage" || type === "compost") return 10;
  return 14;
}

export function zoneSurfaceStyle(type) {
  const base = {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    border: "1px solid rgba(24,44,27,.13)",
    boxShadow: "inset 0 1px rgba(255,255,255,.22), inset 0 -12px 20px rgba(26,34,21,.08)",
  };

  if (type === "veg") {
    return {
      ...base,
      background:
        "linear-gradient(90deg, rgba(83,54,31,.17) 1px, transparent 1px), linear-gradient(0deg, rgba(83,54,31,.13) 1px, transparent 1px), linear-gradient(135deg, #a17a4d, #88643b)",
      backgroundSize: "34px 33px, 34px 33px, 100% 100%",
    };
  }
  if (type === "orchard") {
    return {
      ...base,
      background:
        "radial-gradient(circle at 18px 18px, rgba(75,111,37,.48) 0 12px, transparent 13px), linear-gradient(135deg, #90aa55, #7b984b)",
      backgroundSize: "44px 40px, 100% 100%",
    };
  }
  if (type === "herbs") {
    return {
      ...base,
      background:
        "radial-gradient(circle at 16px 15px, rgba(76,120,43,.44) 0 9px, transparent 10px), linear-gradient(135deg, #83a14b, #719345)",
      backgroundSize: "30px 28px, 100% 100%",
    };
  }
  if (type === "greenhouse") {
    return {
      ...base,
      background:
        "linear-gradient(90deg, rgba(255,255,255,.45) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,.38) 1px, transparent 1px), linear-gradient(135deg, #d6e6dc, #a7bfb0)",
      backgroundSize: "26px 26px, 26px 26px, 100% 100%",
    };
  }
  if (type === "house") {
    return {
      ...base,
      background: "linear-gradient(135deg, #c69b6b, #a7794e)",
    };
  }
  if (type === "barn") {
    return {
      ...base,
      background:
        "linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(135deg, #9b7958, #806247)",
      backgroundSize: "22px 100%, 100% 100%",
    };
  }
  if (type === "storage") {
    return {
      ...base,
      background:
        "linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(135deg, #8e8374, #73695f)",
      backgroundSize: "18px 100%, 100% 100%",
    };
  }
  if (type === "water") {
    return {
      ...base,
      background: "radial-gradient(circle at 32% 30%, rgba(255,255,255,.34), transparent 30%), linear-gradient(135deg, #83bdc8, #5a99ad)",
    };
  }
  if (type === "compost") {
    return {
      ...base,
      background: "linear-gradient(135deg, #8c7657, #6f6149)",
    };
  }
  if (type === "raised") {
    return {
      ...base,
      background:
        "linear-gradient(90deg, rgba(83,54,31,.15) 1px, transparent 1px), linear-gradient(135deg, #9c7247, #855f38)",
      backgroundSize: "22px 100%, 100% 100%",
      boxShadow: "inset 0 0 0 4px #8a6a45, inset 0 1px rgba(255,255,255,.18)",
    };
  }
  if (type === "container") {
    return {
      ...base,
      background:
        "radial-gradient(circle at 15px 14px, #b5623f 0 8px, #8f4a2e 8px 9px, transparent 10px), linear-gradient(135deg, #caa06a, #b28a55)",
      backgroundSize: "30px 28px, 100% 100%",
    };
  }
  if (type === "pasture") {
    return {
      ...base,
      background:
        "radial-gradient(circle at 15px 14px, rgba(93,130,55,.24) 0 5px, transparent 6px), linear-gradient(135deg, #a8bf7d, #8faf68)",
      backgroundSize: "34px 31px, 100% 100%",
    };
  }

  return {
    ...base,
    background: "linear-gradient(135deg, #aebf7b, #829b60)",
  };
}

export function mapBackgroundStyle(env) {
  /* Stage 4 (brief §6–7): ground per environment. Default/farm unchanged. */
  if (env === "balcony") {
    return {
      background:
        "repeating-linear-gradient(180deg, rgba(80,50,20,.14) 0 2px, transparent 2px 26px), linear-gradient(160deg, #cfa873 0%, #b9925f 100%)",
    };
  }
  if (env === "backyard") {
    return {
      background:
        "repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 42px, transparent 42px 84px), linear-gradient(160deg, #93bd60 0%, #7ba84e 100%)",
    };
  }
  return {
    background:
      "radial-gradient(circle at 18% 12%, rgba(255,255,225,.20) 0 1px, transparent 2px), linear-gradient(160deg, #c3cf9b 0%, #a6ba7e 100%)",
    backgroundSize: "38px 38px, 100% 100%",
  };
}

export function mapVignetteStyle() {
  return {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 0 0, rgba(42,74,39,.10), transparent 31%), radial-gradient(circle at 100% 100%, rgba(42,73,36,.09), transparent 34%)",
    pointerEvents: "none",
    zIndex: 1,
  };
}

/* ── Crop growth-stage design tokens (CropStagePatch v3 + legends) ── */
export const STAGE_STYLE = {
  just_planted: {
    label: "Planted",
    bg: "rgba(243,232,206,.93)",
    border: "rgba(166,138,86,.45)",
    ring: "#b08d57",
    text: "#6b5635",
  },
  growing: {
    label: "Growing",
    bg: "rgba(224,239,215,.93)",
    border: "rgba(86,140,96,.5)",
    ring: "#3f8f5f",
    text: "#2f6644",
  },
  ready: {
    label: "Ready",
    bg: "rgba(252,236,205,.96)",
    border: "rgba(214,138,42,.7)",
    ring: "#e08a2e",
    text: "#9a5f14",
    glow: "0 0 12px rgba(224,138,46,.4)",
  },
};

/* Capacity → color for the zone fill-% pill */
export function zoneFillColor(pct) {
  if (pct >= 95) return "#c84b42";
  if (pct >= 70) return "#e08a2e";
  return "#3f8f5f";
}

/* Which species live in a barn/pasture zone. Animals aren't zone-linked
   in data (v1), so this mirrors the housing rule used on the dashboard:
   poultry + rabbits → barn/coop, grazers + pigs → pasture. */
const BARN_EXTRA = new Set(["Rabbit"]);
export function zoneAnimalGroups(zone, animals) {
  if (!zone || (zone.type !== "barn" && zone.type !== "pasture")) return [];
  const list = Array.isArray(animals) ? animals : [];
  const match = list.filter(a => a && (zone.type === "barn"
    ? (POULTRY_SPECIES.has(a.type) || BARN_EXTRA.has(a.type))
    : (GRAZER_SPECIES.has(a.type) || a.type === "Pig")));
  const byType = {};
  match.forEach(a => { byType[a.type] = (byType[a.type] || 0) + (a.count || 0); });
  return Object.entries(byType)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));
}
