export const PLANT_ZONE_TYPES = new Set(["veg", "orchard", "herbs", "greenhouse"]);

export function isPlantZone(type) {
  return PLANT_ZONE_TYPES.has(type);
}

export function zoneRadius(type) {
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

export function mapBackgroundStyle() {
  return {
    background:
      "radial-gradient(circle at 18% 12%, rgba(255,255,210,.34) 0 1px, transparent 2px), radial-gradient(circle at 74% 22%, rgba(255,237,180,.24) 0 1px, transparent 2px), linear-gradient(135deg, #b8c586, #829b60)",
    backgroundSize: "34px 34px, 47px 43px, 100% 100%",
  };
}

export function mapVignetteStyle() {
  return {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 0 0, rgba(42,74,39,.18), transparent 31%), radial-gradient(circle at 100% 100%, rgba(42,73,36,.16), transparent 34%)",
    pointerEvents: "none",
    zIndex: 1,
  };
}
