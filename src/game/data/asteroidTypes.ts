import { MAP_CONFIG } from "./mapConfig";
import type { EtherType } from "./etherTypes";
import type { Vec2 } from "../types";
import { getAsteroidQualityWeightsForRegion, getLootRegionByDistance, selectAsteroidQualityForPosition } from "../systems/LootDistributionSystem";
import { ASTEROID_QUALITY_BALANCE, ASTEROID_SIZE_BALANCE } from "./resourceBalance";

export type AsteroidSizeTier =
  | "pebble" | "small" | "standard" | "large" | "massive"
  | "giant" | "colossal" | "titan" | "moonlet" | "worldstone";

export type AsteroidQuality = "common" | "uncommon" | "rare" | "epic" | "legendary" | "unique";
export type AsteroidRegion = "outer" | "mid" | "inner" | "center";
export type AsteroidTypeId = AsteroidQuality;

export type AsteroidSizeConfig = {
  id: AsteroidSizeTier;
  label: string;
  radiusRange: [number, number];
  multiplier: number;
  miningResistanceMultiplier: number;
  rewardMultiplier: number;
  respawnMultiplier: number;
};

export type AsteroidQualityConfig = {
  id: AsteroidQuality;
  label: string;
  etherType: EtherType;
  healthMultiplier: number;
  xpMultiplier: number;
  etherMultiplier: number;
  miningResistance: number;
  requiredMiningPower: number;
  respawnSeconds: number;
  color: string;
  strokeColor: string;
  glowColor: string;
  glowStrength: number;
};

export type AsteroidTypeConfig = AsteroidQualityConfig;

export const BASE_ASTEROID_HEALTH = 30;
export const BASE_ASTEROID_XP = 8;
export const BASE_ASTEROID_ETHER = 8;
export const BASE_ASTEROID_SCORE = 10;

export const ASTEROID_SIZES: AsteroidSizeConfig[] = [
  { id: "pebble", label: "Pebble", radiusRange: [14, 18], multiplier: 0.45, miningResistanceMultiplier: 0.75, rewardMultiplier: 0.75, respawnMultiplier: 0.7 },
  { id: "small", label: "Small", radiusRange: [19, 25], multiplier: 0.75, miningResistanceMultiplier: 0.9, rewardMultiplier: 1, respawnMultiplier: 0.85 },
  { id: "standard", label: "Standard", radiusRange: [26, 34], multiplier: 1.1, miningResistanceMultiplier: 1, rewardMultiplier: 1.6, respawnMultiplier: 1 },
  { id: "large", label: "Large", radiusRange: [35, 46], multiplier: 2, miningResistanceMultiplier: 1.15, rewardMultiplier: 2.6, respawnMultiplier: 1.25 },
  { id: "massive", label: "Massive", radiusRange: [47, 60], multiplier: 3.7, miningResistanceMultiplier: 1.35, rewardMultiplier: 4, respawnMultiplier: 1.5 },
  { id: "giant", label: "Giant", radiusRange: [61, 78], multiplier: 6.5, miningResistanceMultiplier: 1.6, rewardMultiplier: 6, respawnMultiplier: 1.9 },
  { id: "colossal", label: "Colossal", radiusRange: [79, 100], multiplier: 11, miningResistanceMultiplier: 1.95, rewardMultiplier: 9, respawnMultiplier: 2.3 },
  { id: "titan", label: "Titan", radiusRange: [101, 128], multiplier: 18, miningResistanceMultiplier: 2.35, rewardMultiplier: 13, respawnMultiplier: 2.8 },
  { id: "moonlet", label: "Moonlet", radiusRange: [129, 165], multiplier: 30, miningResistanceMultiplier: 2.8, rewardMultiplier: 19, respawnMultiplier: 3.4 },
  { id: "worldstone", label: "Worldstone", radiusRange: [166, 220], multiplier: 48, miningResistanceMultiplier: 3.25, rewardMultiplier: 28, respawnMultiplier: 4.2 },
];

export const ASTEROID_QUALITIES: AsteroidQualityConfig[] = [
  { id: "common", label: "Common", etherType: "rawEther", healthMultiplier: 1, xpMultiplier: 1, etherMultiplier: 1, miningResistance: 1, requiredMiningPower: 1, respawnSeconds: 28, color: "#8f98a3", strokeColor: "#d4dbe2", glowColor: "rgba(212, 219, 226, .2)", glowStrength: 3 },
  { id: "uncommon", label: "Uncommon", etherType: "refinedEther", healthMultiplier: 1.8, xpMultiplier: 2.5, etherMultiplier: 2.25, miningResistance: 1.4, requiredMiningPower: 2, respawnSeconds: 48, color: "#41a866", strokeColor: "#8fedaa", glowColor: "rgba(118, 220, 146, .28)", glowStrength: 4 },
  { id: "rare", label: "Rare", etherType: "chargedEther", healthMultiplier: 3.2, xpMultiplier: 6, etherMultiplier: 5, miningResistance: 2.1, requiredMiningPower: 4, respawnSeconds: 80, color: "#447dde", strokeColor: "#9cc4ff", glowColor: "rgba(104, 167, 255, .3)", glowStrength: 5 },
  { id: "epic", label: "Epic", etherType: "radiantEther", healthMultiplier: 6, xpMultiplier: 14, etherMultiplier: 11, miningResistance: 3.5, requiredMiningPower: 7, respawnSeconds: 150, color: "#8b63d8", strokeColor: "#c9b6ff", glowColor: "rgba(181, 140, 255, .3)", glowStrength: 6 },
  { id: "legendary", label: "Legendary", etherType: "primalEther", healthMultiplier: 11, xpMultiplier: 35, etherMultiplier: 26, miningResistance: 6, requiredMiningPower: 11, respawnSeconds: 330, color: "#d8a928", strokeColor: "#ffe18a", glowColor: "rgba(255, 209, 102, .32)", glowStrength: 7 },
  { id: "unique", label: "Core", etherType: "coreEther", healthMultiplier: 22, xpMultiplier: 90, etherMultiplier: 65, miningResistance: 10, requiredMiningPower: 16, respawnSeconds: 750, color: "#d76838", strokeColor: "#ffb083", glowColor: "rgba(255, 147, 92, .34)", glowStrength: 8 },
];

export const ASTEROID_SIZE_BY_ID = Object.fromEntries(ASTEROID_SIZES.map((size) => [size.id, size])) as Record<AsteroidSizeTier, AsteroidSizeConfig>;
export const ASTEROID_QUALITY_BY_ID = Object.fromEntries(ASTEROID_QUALITIES.map((quality) => [quality.id, quality])) as Record<AsteroidQuality, AsteroidQualityConfig>;
export const ASTEROID_TYPE_BY_ID = ASTEROID_QUALITY_BY_ID;
export const ASTEROID_TYPES = ASTEROID_QUALITIES;

export const ASTEROID_QUALITY_WEIGHTS: Record<AsteroidRegion, Record<AsteroidQuality, number>> = {
  outer: getAsteroidQualityWeightsForRegion("outer"),
  mid: getAsteroidQualityWeightsForRegion("mid"),
  inner: getAsteroidQualityWeightsForRegion("inner"),
  center: getAsteroidQualityWeightsForRegion("center"),
};

export const ASTEROID_SIZE_WEIGHTS: Record<AsteroidSizeTier, number> = {
  pebble: 22,
  small: 20,
  standard: 18,
  large: 14,
  massive: 10,
  giant: 7,
  colossal: 4,
  titan: 2.5,
  moonlet: 1.5,
  worldstone: 1,
};

export function getAsteroidRegionForPosition(pos: Vec2): AsteroidRegion {
  return getLootRegionByDistance(pos.x, pos.y, MAP_CONFIG);
}

function pickWeighted<T extends string>(random: () => number, entries: Array<[T, number]>, fallback: T): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [id, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return id;
  }
  return fallback;
}

export function pickAsteroidQuality(random: () => number, region: AsteroidRegion): AsteroidQuality {
  return pickWeighted(random, Object.entries(ASTEROID_QUALITY_WEIGHTS[region]) as Array<[AsteroidQuality, number]>, "common");
}

export function pickAsteroidQualityForPosition(random: () => number, pos: Vec2): AsteroidQuality {
  return selectAsteroidQualityForPosition(pos.x, pos.y, MAP_CONFIG, random);
}

export function pickAsteroidSize(random: () => number): AsteroidSizeTier {
  return pickWeighted(random, Object.entries(ASTEROID_SIZE_WEIGHTS) as Array<[AsteroidSizeTier, number]>, "standard");
}

export function pickAsteroidType(random: () => number, region: AsteroidRegion): AsteroidTypeId {
  return pickAsteroidQuality(random, region);
}

export function getAsteroidComputedValues(sizeTier: AsteroidSizeTier, quality: AsteroidQuality) {
  const size = ASTEROID_SIZE_BY_ID[sizeTier];
  const qualityConfig = ASTEROID_QUALITY_BY_ID[quality];
  return {
    maxHealth: Math.round(BASE_ASTEROID_HEALTH * ASTEROID_SIZE_BALANCE[sizeTier].healthMultiplier * ASTEROID_QUALITY_BALANCE[quality].healthMultiplier),
    xpReward: Math.round(BASE_ASTEROID_XP * ASTEROID_SIZE_BALANCE[sizeTier].rewardMultiplier * ASTEROID_QUALITY_BALANCE[quality].xpMultiplier),
    etherReward: Math.round(BASE_ASTEROID_ETHER * ASTEROID_SIZE_BALANCE[sizeTier].rewardMultiplier * ASTEROID_QUALITY_BALANCE[quality].etherMultiplier),
    scoreReward: Math.round(BASE_ASTEROID_SCORE * ASTEROID_SIZE_BALANCE[sizeTier].rewardMultiplier * ASTEROID_QUALITY_BALANCE[quality].scoreMultiplier),
    miningResistance: Number((ASTEROID_QUALITY_BALANCE[quality].miningResistance * size.miningResistanceMultiplier).toFixed(2)),
    requiredMiningPower: ASTEROID_QUALITY_BALANCE[quality].requiredMiningPower,
    respawnSeconds: ((ASTEROID_QUALITY_BALANCE[quality].respawnSecondsRange[0] + ASTEROID_QUALITY_BALANCE[quality].respawnSecondsRange[1]) / 2) * size.respawnMultiplier,
  };
}
