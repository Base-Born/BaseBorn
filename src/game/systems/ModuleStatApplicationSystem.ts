import type { Player } from "../entities/Player";
import { getEffectivePlayerStats } from "./StatScalingSystem";

export const MIN_MODULE_FIRE_DELAY = 0.06;

export function getEffectiveModuleStats(player: Player) {
  const effective = getEffectivePlayerStats(player.stats, player.baseFrameId);
  return {
    projectileSpeedMultiplier: effective.bulletSpeed.projectileMultiplier,
    droneSpeedMultiplier: effective.bulletSpeed.droneMultiplier,
    damageMultiplier: effective.bulletDamage.projectileMultiplier,
    droneDamageMultiplier: effective.bulletDamage.droneDamageMultiplier,
    reloadMultiplier: effective.reloadSpeed.reloadMultiplier,
  };
}

export function calculateReloadDelay(baseDelay: number, reloadMultiplier: number) {
  return clampModuleFireRate(baseDelay / Math.max(0.01, reloadMultiplier));
}

export function clampModuleFireRate(delay: number) {
  return Math.max(MIN_MODULE_FIRE_DELAY, delay);
}

export function calculateProjectileModuleStats(player: Player, base: { speed: number; damage: number; delay: number }) {
  const moduleStats = getEffectiveModuleStats(player);
  return {
    speed: base.speed * moduleStats.projectileSpeedMultiplier,
    damage: base.damage * moduleStats.damageMultiplier,
    delay: calculateReloadDelay(base.delay, moduleStats.reloadMultiplier),
  };
}

export function calculateDroneModuleStats(player: Player, base: { speed: number; maxSpeed: number; damage: number; respawnDelay: number }) {
  const moduleStats = getEffectiveModuleStats(player);
  return {
    speed: base.speed * moduleStats.droneSpeedMultiplier,
    maxSpeed: base.maxSpeed * moduleStats.droneSpeedMultiplier,
    damage: base.damage * moduleStats.droneDamageMultiplier,
    respawnDelay: Math.max(0.45, base.respawnDelay / moduleStats.reloadMultiplier),
  };
}

export const applyUpgradeStatsToWeaponModule = calculateProjectileModuleStats;
export const applyUpgradeStatsToDroneModule = calculateDroneModuleStats;
