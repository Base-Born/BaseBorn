export type SpaceBackgroundQuality = "low" | "medium" | "high";

export type StarLayerConfig = {
  id: "far" | "mid" | "near" | "dust";
  parallax: number;
  densityPerMegapixel: number;
  radius: readonly [number, number];
  alpha: readonly [number, number];
  colors: readonly string[];
  twinkle: number;
  trail: number;
};

export const SPACE_BACKGROUND_CONFIG = {
  seed: 0x5baceb0b,
  sectorSize: 960,
  maxCachedSectors: 128,
  maxDevicePixelRatio: 2,
  background: "#020408",
  backgroundEdge: "#010205",
  movementReferenceSpeed: 260,
  motionSmoothing: 7.5,
  trailStartSpeed: 22,
  warpTrailPixels: 74,
  qualityDensity: { low: 0.62, medium: 1, high: 1.32 } satisfies Record<SpaceBackgroundQuality, number>,
  layers: [
    { id: "far", parallax: 0.055, densityPerMegapixel: 122, radius: [0.35, 0.85], alpha: [0.18, 0.52], colors: ["#eaf3ff", "#d9e8ff", "#d8f7ff"], twinkle: 0.08, trail: 0.05 },
    { id: "mid", parallax: 0.16, densityPerMegapixel: 68, radius: [0.55, 1.2], alpha: [0.28, 0.7], colors: ["#f5f8ff", "#d7edff", "#d9ddff", "#d7fff8"], twinkle: 0.13, trail: 0.24 },
    { id: "near", parallax: 0.34, densityPerMegapixel: 30, radius: [0.8, 1.65], alpha: [0.42, 0.88], colors: ["#ffffff", "#dff5ff", "#e5e2ff", "#dcfff5"], twinkle: 0.16, trail: 0.7 },
    { id: "dust", parallax: 0.52, densityPerMegapixel: 34, radius: [0.3, 0.7], alpha: [0.12, 0.32], colors: ["#ccefff", "#e5eaff"], twinkle: 0, trail: 1 },
  ] satisfies readonly StarLayerConfig[],
} as const;

export function getSpaceBackgroundQuality(): SpaceBackgroundQuality {
  const saved = globalThis.localStorage?.getItem("baseborn.spaceQuality");
  return saved === "low" || saved === "high" ? saved : "medium";
}
