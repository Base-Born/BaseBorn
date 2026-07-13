import type { AsteroidQuality, AsteroidRegion } from "../data/asteroidTypes";
import { ZONE_ASTEROID_QUALITY_WEIGHTS } from "../data/resourceBalance";
import { LOOT_REGION_CONFIG, LOOT_REGION_ORDER, type LootRegionId } from "../data/lootRegionConfig";
import type { MapConfig } from "../data/mapConfig";

export const LOOT_QUALITY_WEIGHTS: Record<AsteroidRegion, Record<AsteroidQuality, number>> = {
  outer: ZONE_ASTEROID_QUALITY_WEIGHTS.outer,
  mid: ZONE_ASTEROID_QUALITY_WEIGHTS.mid,
  inner: ZONE_ASTEROID_QUALITY_WEIGHTS.inner,
  center: ZONE_ASTEROID_QUALITY_WEIGHTS.center,
};

export function getNormalizedDistanceFromCenter(x: number, y: number, mapConfig: MapConfig) {
  const dx = (x - mapConfig.centerX) / mapConfig.halfWidth;
  const dy = (y - mapConfig.centerY) / mapConfig.halfHeight;
  return Math.max(0, Math.min(1, Math.hypot(dx, dy) / Math.sqrt(2)));
}

export function getLootRegionByDistance(x: number, y: number, mapConfig: MapConfig): AsteroidRegion {
  const normalized = getNormalizedDistanceFromCenter(x, y, mapConfig);
  return LOOT_REGION_ORDER.find((region) => normalized <= LOOT_REGION_CONFIG[region].maxDistance) ?? "outer";
}

export function getAsteroidQualityWeightsForRegion(region: AsteroidRegion) {
  return LOOT_QUALITY_WEIGHTS[region];
}

function pickWeightedQuality(weights: Record<AsteroidQuality, number>, random: () => number) {
  const entries = Object.entries(weights) as Array<[AsteroidQuality, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [quality, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return quality;
  }
  return "common";
}

export function selectAsteroidQualityForPosition(x: number, y: number, mapConfig: MapConfig, random: () => number = Math.random) {
  const region = getLootRegionByDistance(x, y, mapConfig);
  return pickWeightedQuality(getAsteroidQualityWeightsForRegion(region), random);
}

export function getLootRegionConfigForPosition(x: number, y: number, mapConfig: MapConfig) {
  return LOOT_REGION_CONFIG[getLootRegionByDistance(x, y, mapConfig) as LootRegionId];
}

export function getCurrentZoneStatusText(pos: { x: number; y: number }, mapConfig: MapConfig) {
  const config = getLootRegionConfigForPosition(pos.x, pos.y, mapConfig);
  if (config.id === "center") return `${config.displayName} - ${config.lootDescription} / PvP`;
  return `${config.pvpEnabled ? "PvP" : "PvE"} ${config.displayName}`;
}

export function getZoneNotificationText(region: AsteroidRegion) {
  if (region === "outer") return "Safe Zone - PvP Disabled";
  if (region === "mid") return "PvP Zone Entered";
  if (region === "inner") return "High-Risk PvP Zone";
  return "Center Belt - Best Ether / PvP Enabled";
}
