import type { AsteroidQuality } from "./asteroidTypes";
import type { MapConfig } from "./mapConfig";
import type { Vec2 } from "../types";

export type AsteroidBeltType = "outer_sparse_belt" | "station_resource_belt" | "mid_conflict_belt" | "inner_rich_belt" | "core_ether_belt";

export type AsteroidBelt = {
  id: string;
  name: string;
  type: AsteroidBeltType;
  center: Vec2;
  minRadiusFromCenter: number;
  maxRadiusFromCenter: number;
  angleStart: number;
  angleEnd: number;
  densityMultiplier: number;
  qualityDistribution: Record<AsteroidQuality, number>;
  minimapColor: string;
  visibleOnMinimap: boolean;
  dangerLevel: number;
  fieldNoiseSeed: number;
  spawnCountRange: [number, number];
};

export const OPEN_SPACE_QUALITY_DISTRIBUTION: Record<AsteroidQuality, number> = {
  common: 90,
  uncommon: 9,
  rare: 1,
  epic: 0,
  legendary: 0,
  unique: 0,
};

export const OPEN_SPACE_SPAWN_COUNT_RANGE: [number, number] = [0, 3];

export function generateAsteroidBelts(mapConfig: MapConfig): AsteroidBelt[] {
  const maxRadius = Math.hypot(mapConfig.halfWidth, mapConfig.halfHeight);
  const r = (normalized: number) => maxRadius * normalized;
  return [
    {
      id: "outer-north-stream",
      name: "Outer Sparse Belt",
      type: "outer_sparse_belt",
      center: { x: mapConfig.centerX, y: mapConfig.centerY },
      minRadiusFromCenter: r(0.78),
      maxRadiusFromCenter: r(0.91),
      angleStart: -2.9,
      angleEnd: -0.35,
      densityMultiplier: 0.72,
      qualityDistribution: { common: 78, uncommon: 19, rare: 3, epic: 0, legendary: 0, unique: 0 },
      minimapColor: "rgba(118, 191, 135, 0.18)",
      visibleOnMinimap: true,
      dangerLevel: 1,
      fieldNoiseSeed: 11,
      spawnCountRange: [16, 28],
    },
    {
      id: "station-resource-ring",
      name: "Station Resource Belt",
      type: "station_resource_belt",
      center: { x: mapConfig.centerX, y: mapConfig.centerY },
      minRadiusFromCenter: r(0.55),
      maxRadiusFromCenter: r(0.82),
      angleStart: -Math.PI,
      angleEnd: Math.PI,
      densityMultiplier: 1,
      qualityDistribution: { common: 58, uncommon: 30, rare: 10, epic: 2, legendary: 0, unique: 0 },
      minimapColor: "rgba(90, 166, 200, 0.16)",
      visibleOnMinimap: true,
      dangerLevel: 2,
      fieldNoiseSeed: 23,
      spawnCountRange: [24, 40],
    },
    {
      id: "mid-conflict-arc",
      name: "Mid Conflict Belt",
      type: "mid_conflict_belt",
      center: { x: mapConfig.centerX, y: mapConfig.centerY },
      minRadiusFromCenter: r(0.34),
      maxRadiusFromCenter: r(0.55),
      angleStart: -0.25,
      angleEnd: 2.75,
      densityMultiplier: 1.16,
      qualityDistribution: { common: 28, uncommon: 36, rare: 26, epic: 9, legendary: 1, unique: 0 },
      minimapColor: "rgba(120, 146, 207, 0.18)",
      visibleOnMinimap: true,
      dangerLevel: 3,
      fieldNoiseSeed: 37,
      spawnCountRange: [30, 50],
    },
    {
      id: "inner-rich-belt",
      name: "Inner Rich Belt",
      type: "inner_rich_belt",
      center: { x: mapConfig.centerX, y: mapConfig.centerY },
      minRadiusFromCenter: r(0.17),
      maxRadiusFromCenter: r(0.34),
      angleStart: -2.45,
      angleEnd: 2.2,
      densityMultiplier: 1.32,
      qualityDistribution: { common: 5, uncommon: 17, rare: 34, epic: 32, legendary: 11, unique: 1 },
      minimapColor: "rgba(198, 168, 77, 0.16)",
      visibleOnMinimap: true,
      dangerLevel: 4,
      fieldNoiseSeed: 53,
      spawnCountRange: [36, 60],
    },
    {
      id: "core-ether-belt",
      name: "Core Ether Belt",
      type: "core_ether_belt",
      center: { x: mapConfig.centerX, y: mapConfig.centerY },
      minRadiusFromCenter: r(0.035),
      maxRadiusFromCenter: r(0.12),
      angleStart: -Math.PI,
      angleEnd: Math.PI,
      densityMultiplier: 1.5,
      qualityDistribution: { common: 0, uncommon: 3, rare: 15, epic: 42, legendary: 32, unique: 8 },
      minimapColor: "rgba(200, 132, 85, 0.22)",
      visibleOnMinimap: true,
      dangerLevel: 5,
      fieldNoiseSeed: 71,
      spawnCountRange: [44, 72],
    },
  ];
}

export const ASTEROID_BELTS = generateAsteroidBelts({
  worldWidth: 1000000,
  worldHeight: 1000000,
  halfWidth: 500000,
  halfHeight: 500000,
  centerX: 0,
  centerY: 0,
  sectorCount: 4,
  planetCount: 0,
  centerZoneRadius: 45000,
  asteroidBeltInnerRadius: 17500,
  asteroidBeltOuterRadius: 42500,
  minimapSize: 320,
});

function normalizeAngle(angle: number) {
  let next = angle;
  while (next < -Math.PI) next += Math.PI * 2;
  while (next > Math.PI) next -= Math.PI * 2;
  return next;
}

function angleInArc(angle: number, start: number, end: number) {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(start);
  const e = normalizeAngle(end);
  if (s <= e) return a >= s && a <= e;
  return a >= s || a <= e;
}

export function isPositionInsideAsteroidBelt(position: Vec2, belt: AsteroidBelt) {
  const dx = position.x - belt.center.x;
  const dy = position.y - belt.center.y;
  const radius = Math.hypot(dx, dy);
  if (radius < belt.minRadiusFromCenter || radius > belt.maxRadiusFromCenter) return false;
  return angleInArc(Math.atan2(dy, dx), belt.angleStart, belt.angleEnd);
}

export function getAsteroidBeltsAtPosition(position: Vec2, belts = ASTEROID_BELTS) {
  return belts.filter((belt) => isPositionInsideAsteroidBelt(position, belt));
}

export function getBestAsteroidBeltAtPosition(position: Vec2, belts = ASTEROID_BELTS) {
  return getAsteroidBeltsAtPosition(position, belts).sort((a, b) => b.dangerLevel - a.dangerLevel || b.densityMultiplier - a.densityMultiplier)[0] ?? null;
}

export function getAsteroidDensityMultiplierForPosition(position: Vec2) {
  return getBestAsteroidBeltAtPosition(position)?.densityMultiplier ?? 0.08;
}

export function getAsteroidQualityDistributionForPosition(position: Vec2) {
  return getBestAsteroidBeltAtPosition(position)?.qualityDistribution ?? OPEN_SPACE_QUALITY_DISTRIBUTION;
}

export function worldToBeltDistance(position: Vec2, belt: AsteroidBelt) {
  const radius = Math.hypot(position.x - belt.center.x, position.y - belt.center.y);
  if (radius < belt.minRadiusFromCenter) return belt.minRadiusFromCenter - radius;
  if (radius > belt.maxRadiusFromCenter) return radius - belt.maxRadiusFromCenter;
  return 0;
}
