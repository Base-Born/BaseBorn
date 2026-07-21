import { getBaseFrameUpgradeMultiplier, getBaseShipFrame } from "../data/baseShipFrames";
import type { StatKey } from "../data/stats";

export type NumericCoreStats = Record<StatKey, number>;

export const NORMAL_STAT_MAX = 10;
export const HYPER_STAT_MAX = 10;
export const TOTAL_STAT_MAX = NORMAL_STAT_MAX + HYPER_STAT_MAX;

export function getNormalStatLevel(stats: NumericCoreStats, key: StatKey) {
  return Math.max(0, Math.min(NORMAL_STAT_MAX, Math.floor(stats[key] ?? 0)));
}

export function getHyperStatLevel(stats: NumericCoreStats, key: StatKey) {
  return Math.max(0, Math.min(HYPER_STAT_MAX, Math.floor((stats[key] ?? 0) - NORMAL_STAT_MAX)));
}

export function getTotalEffectiveStatLevel(stats: NumericCoreStats, key: StatKey) {
  return getNormalStatLevel(stats, key) + getHyperStatLevel(stats, key);
}

export function isStatNormalMaxed(stats: NumericCoreStats, key: StatKey) {
  return getNormalStatLevel(stats, key) >= NORMAL_STAT_MAX;
}

export function isStatHyperUnlockedForLevel(stats: NumericCoreStats, key: StatKey, playerLevel: number) {
  return isStatNormalMaxed(stats, key) && playerLevel >= 50;
}

export function isStatHyperUnlocked(stats: NumericCoreStats, key: StatKey) {
  return isStatNormalMaxed(stats, key);
}

export function isStatFullyMaxed(stats: NumericCoreStats, key: StatKey) {
  return getHyperStatLevel(stats, key) >= HYPER_STAT_MAX;
}

export function getHyperUpgradeLevelRequirement(nextHyperLevel: number) {
  if (nextHyperLevel <= 2) return 50;
  if (nextHyperLevel <= 4) return 60;
  if (nextHyperLevel <= 6) return 70;
  if (nextHyperLevel <= 8) return 85;
  return 100;
}

function frameScale(frameId: string, key: StatKey) {
  return getBaseFrameUpgradeMultiplier(getBaseShipFrame(frameId), key);
}

function statMultiplier(stats: NumericCoreStats, key: StatKey, normalStep: number, hyperStep: number, frameId: string) {
  const scale = frameScale(frameId, key);
  return 1 + getNormalStatLevel(stats, key) * normalStep * scale + getHyperStatLevel(stats, key) * hyperStep * scale;
}

function flatValue(stats: NumericCoreStats, key: StatKey, normalStep: number, hyperStep: number, frameId: string) {
  const scale = frameScale(frameId, key);
  return getNormalStatLevel(stats, key) * normalStep * scale + getHyperStatLevel(stats, key) * hyperStep * scale;
}

export function getEffectivePlayerStats(stats: NumericCoreStats, baseFrameId = "balanced") {
  const frame = getBaseShipFrame(baseFrameId);
  const repairDelayReduction = flatValue(stats, "autonomousRepair", 100, 180, baseFrameId);
  const movementNormal = getNormalStatLevel(stats, "movementSpeed");
  const movementHyper = getHyperStatLevel(stats, "movementSpeed");
  const movementScale = frameScale(baseFrameId, "movementSpeed");

  return {
    autonomousRepair: {
      regenFlat: flatValue(stats, "autonomousRepair", 0.5, 0.9, baseFrameId),
      delayMs: Math.max(1200, 4000 - repairDelayReduction),
    },
    maxHealth: {
      multiplier: statMultiplier(stats, "maxHealth", 0.08, 0.12, baseFrameId) * frame.statBias.healthMultiplier,
    },
    maxShield: {
      multiplier: frame.statBias.shieldMultiplier,
      regenPerSecond: 2,
      regenDelayMs: 4200,
    },
    bodyDamage: {
      damageMultiplier: statMultiplier(stats, "bodyDamage", 0.1, 0.16, baseFrameId) * frame.statBias.bodyDamageMultiplier,
      resistance: Math.min(0.62, flatValue(stats, "bodyDamage", 0.02, 0.03, baseFrameId)),
    },
    movementSpeed: {
      movementMultiplier: statMultiplier(stats, "movementSpeed", 0.05, 0.07, baseFrameId) * frame.statBias.movementMultiplier,
      accelerationMultiplier: (1 + movementNormal * 0.04 * movementScale + movementHyper * 0.06 * movementScale) * frame.statBias.accelerationMultiplier,
      thrusterVisualScale: calculateThrusterVisualScale(stats, baseFrameId),
      thrusterTrailLength: calculateThrusterTrailLength(stats, baseFrameId),
      thrusterGlowIntensity: calculateThrusterGlowIntensity(stats, baseFrameId),
    },
    bulletSpeed: {
      projectileMultiplier: statMultiplier(stats, "bulletSpeed", 0.06, 0.09, baseFrameId),
      droneMultiplier: statMultiplier(stats, "bulletSpeed", 0.05, 0.08, baseFrameId),
    },
    bulletPenetration: {
      projectileDurability: statMultiplier(stats, "bulletPenetration", 0.12, 0.18, baseFrameId),
      droneHealthMultiplier: statMultiplier(stats, "bulletPenetration", 0.08, 0.12, baseFrameId),
    },
    bulletDamage: {
      projectileMultiplier: statMultiplier(stats, "bulletDamage", 0.08, 0.13, baseFrameId),
      droneDamageMultiplier: statMultiplier(stats, "bulletDamage", 0.08, 0.13, baseFrameId),
    },
    reloadSpeed: {
      reloadMultiplier: statMultiplier(stats, "reloadSpeed", 0.06, 0.09, baseFrameId),
    },
  };
}

export function calculateThrusterVisualScale(stats: NumericCoreStats, _baseFrameId = "balanced") {
  return 1 + getNormalStatLevel(stats, "movementSpeed") * 0.035 + getHyperStatLevel(stats, "movementSpeed") * 0.06;
}

export function calculateThrusterTrailLength(stats: NumericCoreStats, _baseFrameId = "balanced") {
  return 1 + getNormalStatLevel(stats, "movementSpeed") * 0.045 + getHyperStatLevel(stats, "movementSpeed") * 0.075;
}

export function calculateThrusterGlowIntensity(stats: NumericCoreStats, _baseFrameId = "balanced") {
  return 1 + getNormalStatLevel(stats, "movementSpeed") * 0.035 + getHyperStatLevel(stats, "movementSpeed") * 0.07;
}
