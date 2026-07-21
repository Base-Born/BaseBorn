import { MAP_CONFIG } from "./data/mapConfig";
import type { StatKey } from "./data/stats";
import { buildCumulativeXPTable } from "./systems/XPSystem";

export const ARENA_SIZE = MAP_CONFIG.worldWidth;
export const MAX_LEVEL = 100;
export const MAX_STAT_POINTS = 33;
export const STAT_MAX = 14;

export const TUNING = {
  playerBaseHealth: 120,
  playerBaseSpeed: 250,
  baseDamage: 14,
  baseProjectileSpeed: 620,
  baseFireDelay: 0.34,
  projectileLifetime: 1.6,
  miningLaserRange: 1500,
  botCount: 14,
  botRespawnMinDelay: 2.8,
  botRespawnMaxDelay: 6.2,
  cameraLerp: 0.1,
};

export const STAT_SCALING: Record<StatKey, number> = {
  autonomousRepair: 0.35,
  maxHealth: 0.08,
  bulletPenetration: 0.12,
  bodyDamage: 0.1,
  movementSpeed: 0.05,
  bulletSpeed: 0.06,
  bulletDamage: 0.08,
  reloadSpeed: 0.06,
};

export const XP_BY_LEVEL = buildCumulativeXPTable(MAX_LEVEL + 1);

export function totalUpgradePointsForLevel(level: number) {
  return Math.max(0, Math.min(MAX_STAT_POINTS, Math.min(MAX_LEVEL, Math.floor(level)) - 1));
}
